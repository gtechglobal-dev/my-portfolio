import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findOne } from './store.js';
import { hashToken, type ClientDoc, type InvitationDoc, type ProjectDoc } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gtech-global-secret-key-change-in-production';

export type AdminRole = 'super_admin' | 'sales' | 'project_manager' | 'technical';

export interface AdminIdentity { username: string; role: AdminRole; name?: string; }
export interface ClientIdentity { clientId: string; projectId?: string; role: 'client'; email: string; }
export interface InviteIdentity { invitationId: string; projectId: string; type: 'teacher' | 'class_teacher'; }

export interface AuthRequest extends Request {
  admin?: AdminIdentity;
  client?: ClientIdentity;
  invite?: InviteIdentity;
}

export function signAdmin(identity: AdminIdentity): string {
  return jwt.sign(identity, JWT_SECRET, { expiresIn: '24h' });
}

export function signClient(identity: ClientIdentity): string {
  return jwt.sign(identity, JWT_SECRET, { expiresIn: '7d' });
}

export function decode(token: string): any | null {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

export function requireDb(_req: Request, res: Response, next: NextFunction) {
  next();
}

export function adminAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? decode(token) : null;
  if (!payload || (payload.role !== 'client' && !payload.username)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (payload.role === 'client') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  req.admin = { username: payload.username, role: payload.role || 'super_admin', name: payload.name };
  next();
}

export function adminRoles(...roles: AdminRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.admin) return res.status(401).json({ error: 'Authentication required' });
    if (req.admin.role !== 'super_admin' && !roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function clientAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? decode(token) : null;
  if (!payload || payload.role !== 'client' || !payload.clientId) {
    return res.status(401).json({ error: 'Client authentication required' });
  }
  req.client = { clientId: payload.clientId, projectId: payload.projectId, role: 'client', email: payload.email };
  next();
}

export async function inviteAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers['x-invite-token'] as string | undefined;
  const queryToken = req.query.token as string | undefined;
  const token = header || queryToken;
  if (!token) return res.status(401).json({ error: 'Invitation token required' });
  const invite = await findOne<InvitationDoc>('sc_invitations', { tokenHash: hashToken(token) });
  if (!invite || invite.revokedAt || new Date(invite.expiresAt).getTime() < Date.now()) {
    return res.status(401).json({ error: 'Invitation invalid or expired' });
  }
  req.invite = { invitationId: invite.id, projectId: invite.projectId, type: invite.type };
  next();
}

export async function verifyClientCredentials(email: string, password: string): Promise<ClientDoc | null> {
  const client = await findOne<ClientDoc>('sc_clients', { email: email.toLowerCase().trim() });
  if (!client || !bcrypt.compareSync(password, client.passwordHash)) return null;
  return client;
}

export async function assertProjectAccess(clientId: string, projectId: string): Promise<ProjectDoc | null> {
  const project = await findOne<ProjectDoc>('sc_projects', { id: projectId, clientId });
  return project;
}

export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isDbConnected } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gtech-global-secret-key-change-in-production';

export interface SchoolAuthRequest extends Request {
  school?: { id: string; name: string; adminUserId?: string; adminName?: string; returnUrl?: string };
}

export function generateMarketplaceToken(payload: object, expiresIn = '24h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyCustomerToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireDb(_req: Request, res: Response, next: NextFunction) {
  if (!isDbConnected()) return res.status(503).json({ error: 'Service temporarily unavailable' });
  next();
}

export function authenticateSchool(req: SchoolAuthRequest, res: Response, next: NextFunction) {
  const header = req.headers['x-school-api-key'];
  const key = typeof header === 'string' ? header : '';
  if (!key) return res.status(401).json({ error: 'School API key required' });
  import('./store.js').then(async ({ getSchoolByApiKeyHash }) => {
    const { hashApiKey } = await import('./types.js');
    const school = await getSchoolByApiKeyHash(hashApiKey(key));
    if (!school) return res.status(401).json({ error: 'Invalid or revoked school credentials' });
    req.school = {
      id: school.id,
      name: school.name,
    };
    await import('./store.js').then(({ putSchoolIntegration }) =>
      putSchoolIntegration({ ...school, lastConnectedAt: new Date().toISOString() }),
    );
    next();
  }).catch(() => res.status(500).json({ error: 'Authentication error' }));
}

export async function resolveLaunchToken(token: string, consume = false): Promise<{ school: any; tokenHash: string } | null> {
  const { getLaunchToken, markLaunchTokenUsed } = await import('./store.js');
  const { hashToken } = await import('./types.js');
  const hash = hashToken(token);
  const record = await getLaunchToken(hash);
  if (!record) return null;
  if (new Date(record.expiresAt).getTime() < Date.now()) return null;
  if (record.usedAt) return null;
  if (consume) {
    const used = await markLaunchTokenUsed(hash);
    if (!used) return null;
  }
  return {
    tokenHash: hash,
    school: {
      id: record.schoolId,
      name: record.schoolName,
      adminUserId: record.adminUserId,
      adminName: record.adminName,
      returnUrl: record.returnUrl,
    },
  };
}

import { Router, Request, Response } from 'express';
import { findOne, insert, update, logActivity, notify } from '../schools/store.js';
import { makeId, hashToken, type InvitationDoc, type SubmissionDoc, type ProjectDoc } from '../schools/types.js';

const router = Router();

async function validInvite(token: string): Promise<InvitationDoc | null> {
  const invite = await findOne<InvitationDoc>('sc_invitations', { tokenHash: hashToken(token) });
  if (!invite || invite.revokedAt || new Date(invite.expiresAt).getTime() < Date.now()) return null;
  return invite;
}

router.get('/:token', async (req: Request, res: Response) => {
  const invite = await validInvite(req.params.token);
  if (!invite) return res.status(404).json({ error: 'Invitation not found or expired' });
  const project = await findOne<ProjectDoc>('sc_projects', { id: invite.projectId });
  res.json({
    type: invite.type,
    label: invite.label,
    schoolName: project?.schoolName || 'School',
    expiresAt: invite.expiresAt,
    status: invite.status,
  });
});

router.post('/:token/submit', async (req: Request, res: Response) => {
  const invite = await validInvite(req.params.token);
  if (!invite) return res.status(404).json({ error: 'Invitation not found or expired' });
  const data = req.body.data || req.body;
  if (!data.fullName || !data.email) return res.status(400).json({ error: 'Full name and email are required.' });
  if (invite.type === 'teacher') {
    if (!data.subjects || !data.classes) return res.status(400).json({ error: 'Subjects and classes are required.' });
  } else {
    if (!data.className || !data.studentCount) return res.status(400).json({ error: 'Class name and student count are required.' });
  }
  const now = new Date().toISOString();
  const submission: SubmissionDoc = {
    id: makeId(), projectId: invite.projectId, invitationId: invite.id,
    type: invite.type, data, status: 'submitted', createdAt: now, updatedAt: now,
  };
  await insert('sc_submissions', submission);
  await update<InvitationDoc>('sc_invitations', 'id', invite.id, { status: 'submitted', usedAt: now });
  await logActivity({ projectId: invite.projectId, actor: String(data.email), action: 'invitation.submitted', detail: invite.label || invite.type });
  await notify({ audience: 'admin', title: 'Onboarding form submitted', message: `${invite.type} · ${data.fullName}`, type: 'onboarding' });
  res.status(201).json({ success: true, submissionId: submission.id });
});

export default router;

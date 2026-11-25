import { Router, Request, Response } from 'express';
import { findOne, insert, update, logActivity, notify } from '../schools/store.js';
import {
  makeId, hashToken, type InvitationDoc, type SubmissionDoc, type ProjectDoc,
  type ClientDoc, type ClassDoc, type ParentSubmissionDoc,
} from '../schools/types.js';

const router = Router();

async function validInvite(token: string): Promise<InvitationDoc | null> {
  const invite = await findOne<InvitationDoc>('sc_invitations', { tokenHash: hashToken(token) });
  if (!invite || invite.revokedAt || new Date(invite.expiresAt).getTime() < Date.now()) return null;
  return invite;
}

async function validClass(token: string): Promise<ClassDoc | null> {
  const cls = await findOne<ClassDoc>('sc_classes', { inviteTokenHash: hashToken(token) });
  if (!cls || cls.status !== 'active') return null;
  const expiresAt = (cls as any).expiresAt as string | undefined;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return null;
  return cls;
}

router.get('/class/:token', async (req: Request, res: Response) => {
  const cls = await validClass(req.params.token);
  if (!cls) return res.status(404).json({ error: 'Class invitation not found or closed' });
  const project = cls.projectId ? await findOne<ProjectDoc>('sc_projects', { id: cls.projectId }) : null;
  const client = project?.clientId ? await findOne<ClientDoc>('sc_clients', { id: project.clientId }) : null;
  res.json({
    schoolName: cls.schoolName || project?.schoolName || client?.schoolName || 'School',
    schoolLogo: client?.logo || '',
    className: cls.name,
    arm: cls.arm,
    headTeacherName: cls.headTeacherName,
    subjects: cls.subjects || [],
    expiresAt: (cls as any).expiresAt || '',
    status: cls.status,
  });
});

router.post('/class/:token/submit', async (req: Request, res: Response) => {
  const cls = await validClass(req.params.token);
  if (!cls) return res.status(404).json({ error: 'Class invitation not found or closed' });
  const headTeacher = req.body.headTeacher || {};
  const fullName = String(headTeacher.fullName || '').trim();
  const email = String(headTeacher.email || '').trim();
  if (!fullName || !email) return res.status(400).json({ error: 'Head teacher full name and email are required.' });
  const studentsInput = Array.isArray(req.body.students) ? req.body.students : [];
  if (!studentsInput.length || studentsInput.some((student: any) => !student?.studentName || !student?.parentName || !student?.parentPhone)) {
    return res.status(400).json({ error: 'Each student needs a name, parent name and parent phone number.' });
  }
  const students = studentsInput.map((student: any) => ({
    studentName: String(student.studentName).trim(),
    className: String(student.className || cls.name || '').trim() || cls.name,
    arm: student.arm !== undefined ? String(student.arm) : cls.arm,
    gender: student.gender !== undefined ? String(student.gender) : undefined,
    dateOfBirth: student.dateOfBirth !== undefined ? String(student.dateOfBirth) : undefined,
    parentName: String(student.parentName).trim(),
    relationship: student.relationship !== undefined ? String(student.relationship) : undefined,
    parentPhone: String(student.parentPhone).trim(),
    parentEmail: student.parentEmail !== undefined ? String(student.parentEmail) : undefined,
    address: student.address !== undefined ? String(student.address) : undefined,
    subjects: Array.isArray(student.subjects) ? student.subjects.map(String) : undefined,
  }));
  const now = new Date().toISOString();
  const project = cls.projectId ? await findOne<ProjectDoc>('sc_projects', { id: cls.projectId }) : null;
  const client = project?.clientId ? await findOne<ClientDoc>('sc_clients', { id: project.clientId }) : null;
  const submission: ParentSubmissionDoc = {
    id: makeId(), projectId: cls.projectId, classId: cls.id,
    className: cls.name, arm: cls.arm,
    headTeacher: { fullName, email, phone: headTeacher.phone !== undefined ? String(headTeacher.phone) : undefined },
    students, status: 'submitted', createdAt: now, updatedAt: now,
  };
  (submission as any).clientId = client?.id;
  await insert('sc_parent_submissions', submission);
  await update<ClassDoc>('sc_classes', 'id', cls.id, { status: 'closed', updatedAt: now });
  await notify({
    clientId: client?.id, projectId: cls.projectId, audience: 'admin',
    title: 'Class teacher submission received',
    message: `${cls.schoolName || project?.schoolName || 'School'} · ${cls.name} ${cls.arm || ''}`,
    type: 'onboarding',
  });
  await logActivity({ clientId: client?.id, projectId: cls.projectId, actor: email, action: 'class_invite.submitted', detail: `${cls.name} ${cls.arm || ''}` });
  const compatible: SubmissionDoc = {
    id: makeId(), projectId: cls.projectId, invitationId: cls.id, type: 'class_teacher',
    data: { fullName, email, phone: headTeacher.phone, className: cls.name, arm: cls.arm, students },
    status: 'submitted', createdAt: now, updatedAt: now,
  };
  (compatible as any).clientId = client?.id;
  await insert('sc_submissions', compatible);
  res.status(201).json({ success: true, submissionId: submission.id });
});

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

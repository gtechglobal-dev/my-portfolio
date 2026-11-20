import { Router, Request, Response } from 'express';
import {
  findAll, findOne, insert, update, getSettings, logActivity, notify, progressFor,
} from '../schools/store.js';
import {
  makeId, makeSecureToken, hashToken, type ClientDoc, type ProjectDoc, type MilestoneDoc,
  type PaymentDoc, type OnboardingDoc, type NotificationDoc, type IssueDoc, type MessageDoc,
  type DocumentDoc, type FileDoc, type StudentImportDoc, type HandoverDoc, type TrainingDoc, stageIndex, projectPaymentAmount,
  DOCUMENT_CATEGORIES, validateFileUpload, safeFileName, parseCsv,
} from '../schools/types.js';
import { clientAuth, type AuthRequest } from '../schools/auth.js';
import { getSchoolIntegration, putLaunchToken } from '../marketplace/store.js';
import { initializePaystack } from '../marketplace/payment.js';
import { makeReference } from '../marketplace/types.js';

const router = Router();
router.use(clientAuth);

async function context(req: AuthRequest): Promise<{ client: ClientDoc; project: ProjectDoc | null } | null> {
  const client = await findOne<ClientDoc>('sc_clients', { id: req.client!.clientId });
  if (!client) return null;
  const project = client.projectId ? await findOne<ProjectDoc>('sc_projects', { id: client.projectId, clientId: client.id }) : null;
  return { client, project };
}

function decodeUpload(data: unknown): Buffer | null {
  if (typeof data !== 'string') return null;
  const value = data.includes(',') && data.startsWith('data:') ? data.slice(data.indexOf(',') + 1) : data;
  const cleaned = value.replace(/\s/g, '');
  if (!cleaned || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) return null;
  return Buffer.from(cleaned, 'base64');
}

router.get('/overview', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx) return res.status(404).json({ error: 'Client account not found' });
  const { client, project } = ctx;
  const milestones = project ? await findAll<MilestoneDoc>('sc_milestones', { projectId: project.id }, { sortOrder: 1 }) : [];
  const payments = project ? await findAll<PaymentDoc>('sc_payments', { projectId: project.id }) : [];
  const notifications = await findAll<NotificationDoc>('sc_notifications', { clientId: client.id }, { createdAt: -1 }, 50);
  const documents = project ? await findAll<DocumentDoc>('sc_documents', { projectId: project.id, clientVisible: true }) : [];
  const issues = project ? await findAll<IssueDoc>('sc_issues', { projectId: project.id }) : [];
  const trainings = project ? await findAll<TrainingDoc>('sc_trainings', { projectId: project.id }) : [];
  const handover = project ? await findOne<HandoverDoc>('sc_handovers', { projectId: project.id }) : null;
  res.json({
    client: { id: client.id, reference: client.reference, schoolName: client.schoolName, contactName: client.contactName, email: client.email },
    project: project ? { ...project, progress: progressFor(project.id, milestones) } : null,
    milestones,
    payments,
    notifications,
    documents,
    issues,
    trainings,
    handover,
  });
});

router.get('/notifications', async (req: AuthRequest, res: Response) => {
  const notifications = await findAll<NotificationDoc>('sc_notifications', { clientId: req.client!.clientId }, { createdAt: -1 }, 100);
  res.json({ notifications });
});

router.patch('/notifications/:id/read', async (req: AuthRequest, res: Response) => {
  const note = await findOne<NotificationDoc>('sc_notifications', { id: req.params.id, clientId: req.client!.clientId });
  if (!note) return res.status(404).json({ error: 'Notification not found' });
  const updated = await update<NotificationDoc>('sc_notifications', 'id', note.id, { read: true });
  res.json({ notification: updated });
});

router.get('/onboarding', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  res.json({ submissions: await findAll<OnboardingDoc>('sc_onboarding', { projectId: ctx.project.id }) });
});

router.post('/onboarding/:section', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const section = req.params.section;
  if (!['school_profile', 'class_subject', 'staff', 'student_import'].includes(section)) {
    return res.status(400).json({ error: 'Invalid onboarding section' });
  }
  const existing = await findOne<OnboardingDoc>('sc_onboarding', { projectId: ctx.project.id, section });
  const doc: OnboardingDoc = {
    id: existing?.id || makeId(),
    projectId: ctx.project.id,
    section: section as OnboardingDoc['section'],
    data: req.body.data || {},
    status: req.body.submit === true ? 'submitted' : 'draft',
    notes: existing?.notes,
    submittedAt: req.body.submit === true ? new Date().toISOString() : existing?.submittedAt,
    reviewedBy: undefined,
    updatedAt: new Date().toISOString(),
  };
  if (doc.status === 'submitted' && !req.body.submit) doc.status = 'draft';
  if (existing) await update<OnboardingDoc>('sc_onboarding', 'id', existing.id, doc);
  else await insert('sc_onboarding', doc);
  await logActivity({ clientId: ctx.client.id, projectId: ctx.project.id, actor: ctx.client.email, action: `onboarding.${doc.status}`, detail: section });
  if (doc.status === 'submitted') {
    await notify({ audience: 'admin', title: 'Onboarding form submitted', message: `${ctx.project.schoolName} · ${section}`, type: 'onboarding' });
  }
  res.json({ submission: doc });
});

router.post('/student-imports', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const fileName = safeFileName(req.body.fileName);
  const content = String(req.body.content || '');
  if (!content) return res.status(400).json({ error: 'CSV content is required.' });
  const settings = await getSettings();
  if (Buffer.byteLength(content) > Number(settings.fileRestrictions.maxBytes || 5 * 1024 * 1024)) {
    return res.status(400).json({ error: 'CSV file exceeds the configured size limit.' });
  }
  const parsed = parseCsv(content);
  const doc: StudentImportDoc = {
    id: makeId(), projectId: ctx.project.id, fileName, rowCount: parsed.rows.length,
    errors: parsed.errors, status: parsed.errors.length ? 'rejected' : 'preview',
    uploadedBy: ctx.client.email, createdAt: new Date().toISOString(),
  };
  await insert('sc_student_imports', doc);
  await logActivity({ clientId: ctx.client.id, projectId: ctx.project.id, actor: ctx.client.email, action: 'student_import.preview', detail: `${fileName} · ${doc.rowCount} rows` });
  res.status(201).json({ import: doc, headers: parsed.headers, rows: parsed.rows.slice(0, 20) });
});

router.post('/issues', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  if (!title || !description) return res.status(400).json({ error: 'Title and description are required.' });
  const severity = ['low', 'medium', 'high', 'critical'].includes(req.body.severity) ? req.body.severity : 'medium';
  const doc: IssueDoc = {
    id: makeId(), projectId: ctx.project.id, title, description,
    module: String(req.body.module || ''), severity,
    screenshot: req.body.screenshot, status: 'submitted',
    createdBy: ctx.client.email, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await insert('sc_issues', doc);
  await notify({ audience: 'admin', title: 'New issue reported', message: `${ctx.project.schoolName} · ${title}`, type: 'issue' });
  res.status(201).json({ issue: doc });
});

router.post('/messages', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Message is required.' });
  const doc: MessageDoc = {
    id: makeId(), projectId: ctx.project.id, senderId: ctx.client.id,
    senderName: ctx.client.contactName, senderRole: 'client',
    message, read: false, createdAt: new Date().toISOString(),
  };
  await insert('sc_messages', doc);
  await notify({ audience: 'admin', title: 'New client message', message: `${ctx.project.schoolName} · ${message.slice(0, 120)}`, type: 'message' });
  res.status(201).json({ message: doc });
});

router.get('/messages', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.json({ messages: [] });
  res.json({ messages: await findAll<MessageDoc>('sc_messages', { projectId: ctx.project.id }) });
});

router.get('/documents', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.json({ documents: [] });
  res.json({ documents: await findAll<DocumentDoc>('sc_documents', { projectId: ctx.project.id, clientVisible: true }) });
});

router.post('/documents/upload', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const { title, fileName, mimeType, category } = req.body || {};
  const binary = decodeUpload(req.body?.data);
  if (!title || !fileName || !mimeType || !binary || !binary.length) {
    return res.status(400).json({ error: 'Title, file name, type and file data are required.' });
  }
  const docCategory = DOCUMENT_CATEGORIES.includes(category as any) ? category : 'other';
  const settings = await getSettings();
  const problem = validateFileUpload(settings, String(mimeType), binary.length);
  if (problem) return res.status(400).json({ error: problem });
  const now = new Date().toISOString();
  const documentId = makeId();
  const fileId = makeId();
  const file: FileDoc = {
    id: fileId, projectId: ctx.project.id, documentId, fileName: safeFileName(fileName),
    mimeType: String(mimeType), size: binary.length, data: binary.toString('base64'),
    uploadedBy: ctx.client.email, createdAt: now,
  };
  const doc: DocumentDoc = {
    id: documentId, projectId: ctx.project.id, category: docCategory, title: String(title),
    fileId, fileName: file.fileName, mimeType: file.mimeType, size: file.size,
    url: `/api/schools/client/documents/${documentId}/file`,
    uploadedBy: ctx.client.email, clientVisible: true, createdAt: now,
  };
  await insert('sc_files', file);
  await insert('sc_documents', doc);
  await logActivity({ clientId: ctx.client.id, projectId: ctx.project.id, actor: ctx.client.email, action: 'document.uploaded', detail: file.fileName });
  res.status(201).json({ document: doc });
});

router.get('/documents/:id/file', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const doc = await findOne<DocumentDoc>('sc_documents', { id: req.params.id, projectId: ctx.project.id, clientVisible: true });
  if (!doc?.fileId) return res.status(404).json({ error: 'File not found' });
  const file = await findOne<FileDoc>('sc_files', { id: doc.fileId, documentId: doc.id });
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(file.fileName)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(Buffer.from(file.data, 'base64'));
});

router.get('/payments', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.json({ payments: [] });
  res.json({ payments: await findAll<PaymentDoc>('sc_payments', { projectId: ctx.project.id }) });
});

router.post('/payments/initiate', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const type = ['deposit', 'milestone', 'final'].includes(req.body.type) ? req.body.type : 'deposit';
  const outstanding = Math.max(0, ctx.project.cost - ctx.project.totalPaid);
  if (outstanding <= 0) return res.status(409).json({ error: 'This project has already been paid in full.' });
  const settings = await getSettings();
  const amount = projectPaymentAmount(ctx.project.cost, ctx.project.totalPaid, type as PaymentDoc['type'], settings.depositPercent);
  if (amount <= 0) return res.status(409).json({ error: 'This project has already been paid in full.' });
  const now = new Date().toISOString();
  const payment: PaymentDoc = {
    id: makeId(), projectId: ctx.project.id, clientId: ctx.client.id,
    reference: makeReference('SCH'), paystackReference: makeReference('PSK'),
    amount, currency: 'NGN',
    description: type === 'deposit' ? 'Initial project payment' : type === 'final' ? 'Final project payment' : 'Milestone payment',
    type: type as PaymentDoc['type'], status: 'pending', createdAt: now, updatedAt: now,
  };
  await insert('sc_payments', payment);
  try {
    const publicUrl = process.env.SCHOOL_CLIENT_PUBLIC_URL || process.env.MARKETPLACE_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || process.env.CORS_ORIGIN || `${req.protocol}://${req.get('host')}`;
    const init = await initializePaystack({
      id: payment.id, reference: payment.reference,
      customer: { name: ctx.client.contactName, email: ctx.client.email, phone: ctx.client.phone },
      items: [], quantity: 1, unitPrice: amount, subtotal: amount, total: amount, currency: 'NGN',
      schoolId: null, schoolName: ctx.project.schoolName,
      payment: { status: 'pending', provider: 'paystack', reference: payment.paystackReference, amount, owner: 'GTECH_GLOBAL', receivingAccount: 'GTECH_GLOBAL_PAYSTACK' },
      status: 'awaiting_payment', fulfilment: { status: 'pending' },
      createdAt: now, updatedAt: now,
    } as any, ctx.client.email, publicUrl ? `${publicUrl}/client-portal?payment=${encodeURIComponent(payment.reference)}` : undefined);
    payment.accessCode = init.access_code;
    payment.authorizationUrl = init.authorization_url;
    await update('sc_payments', 'id', payment.id, { accessCode: init.access_code, authorizationUrl: init.authorization_url, updatedAt: new Date().toISOString() });
    await logActivity({ clientId: ctx.client.id, projectId: ctx.project.id, actor: ctx.client.email, action: 'payment.initiated', detail: `${payment.reference} · ${amount}` });
    res.json({ authorizationUrl: init.authorization_url, reference: payment.reference, paystackReference: payment.paystackReference, amount, callbackUrl: publicUrl ? `${publicUrl}/client-portal?payment=${encodeURIComponent(payment.reference)}` : undefined });
  } catch (err: any) {
    await update('sc_payments', 'id', payment.id, { status: 'failed', gatewayResponse: err.message, updatedAt: new Date().toISOString() });
    res.status(502).json({ error: err.message === 'PAYSTACK_NOT_CONFIGURED' ? 'Payments are not configured.' : 'Could not start payment. Please try again.' });
  }
});

router.post('/marketplace/launch-token', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.client.marketplaceIntegrationId) return res.status(404).json({ error: 'Marketplace integration is not active yet.' });
  const integration = await getSchoolIntegration(ctx.client.marketplaceIntegrationId);
  if (!integration?.active) return res.status(403).json({ error: 'Marketplace integration is inactive.' });
  const token = makeSecureToken('gtm');
  await putLaunchToken({
    id: makeId(), tokenHash: hashToken(token), schoolId: integration.id,
    schoolName: ctx.client.schoolName, adminUserId: ctx.client.id,
    adminName: ctx.client.contactName, returnUrl: ctx.project?.deploymentUrl || req.body.returnUrl,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), createdAt: new Date().toISOString(),
  });
  await logActivity({ clientId: ctx.client.id, projectId: ctx.project?.id, actor: ctx.client.email, action: 'marketplace.launch_token_issued', detail: ctx.client.schoolName });
  res.status(201).json({ token, marketplaceUrl: `/marketplace?token=${encodeURIComponent(token)}`, expiresInDays: 30 });
});

router.post('/final-approval', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  if (req.body.approved !== true || !String(req.body.name || '').trim()) {
    return res.status(400).json({ error: 'Approval confirmation and name are required.' });
  }
  const stage = stageIndex(ctx.project.stage) < stageIndex('handover') ? 'handover' : ctx.project.stage;
  const updated = await update<ProjectDoc>('sc_projects', 'id', ctx.project.id, {
    finalApproval: {
      approved: true, at: new Date().toISOString(),
      name: String(req.body.name).trim(), note: req.body.note ? String(req.body.note) : undefined,
    },
    stage,
    updatedAt: new Date().toISOString(),
  });
  await logActivity({ clientId: ctx.client.id, projectId: ctx.project.id, actor: ctx.client.email, action: 'project.final_approval', detail: String(req.body.name) });
  await notify({ audience: 'admin', title: 'Final approval given', message: ctx.project.schoolName, type: 'project' });
  res.json({ project: updated });
});

router.post('/handover/acknowledge', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const handover = await findOne<HandoverDoc>('sc_handovers', { projectId: ctx.project.id });
  if (!handover) return res.status(404).json({ error: 'Handover not found' });
  const updated = await update<HandoverDoc>('sc_handovers', 'id', handover.id, {
    status: 'acknowledged', acknowledgedBy: ctx.client.contactName,
    acknowledgedAt: new Date().toISOString(), feedback: req.body.feedback ? String(req.body.feedback) : undefined,
  });
  await update<ProjectDoc>('sc_projects', 'id', ctx.project.id, { stage: 'completed', status: 'completed', updatedAt: new Date().toISOString() });
  await logActivity({ clientId: ctx.client.id, projectId: ctx.project.id, actor: ctx.client.email, action: 'handover.acknowledged', detail: ctx.project.schoolName });
  res.json({ handover: updated });
});

export default router;

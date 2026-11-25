import { Router, Request, Response } from 'express';
import {
  findAll, findOne, insert, update, getSettings, logActivity, notify, progressFor, removeMany,
} from '../schools/store.js';
import {
  makeId, makeSecureToken, hashToken, type ClientDoc, type ProjectDoc, type MilestoneDoc,
  type PaymentDoc, type OnboardingDoc, type NotificationDoc, type IssueDoc, type MessageDoc,
  type DocumentDoc, type FileDoc, type StudentImportDoc, type HandoverDoc, type TrainingDoc, type AgreementDoc,
  type ClassDoc, type ParentSubmissionDoc, stageIndex, projectPaymentAmount,
  DOCUMENT_CATEGORIES, validateFileUpload, safeFileName, parseCsv,
} from '../schools/types.js';
import { clientAuth, assertProjectAccess, type AuthRequest } from '../schools/auth.js';
import PDFDocument from 'pdfkit';
import { sendTelegramVoice, telegramBotUrl, telegramConfigured } from '../services/telegram.js';
import { getSchoolIntegration, putLaunchToken, putSchoolIntegration } from '../marketplace/store.js';
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

function schoolPublicUrl(): string {
  return String(process.env.MARKETPLACE_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
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

router.patch('/school-name', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx) return res.status(404).json({ error: 'School account not found' });
  const schoolName = String(req.body.schoolName || '').trim();
  if (!schoolName) return res.status(400).json({ error: 'School name is required.' });
  await update<ClientDoc>('sc_clients', 'id', ctx.client.id, { schoolName, updatedAt: new Date().toISOString() });
  if (ctx.project) await update<ProjectDoc>('sc_projects', 'id', ctx.project.id, { schoolName, updatedAt: new Date().toISOString() });
  res.json({ success: true, schoolName });
});

router.get('/integration', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.client.marketplaceIntegrationId) return res.status(404).json({ error: 'PIN integration is not provisioned yet.' });
  const integration = await getSchoolIntegration(ctx.client.marketplaceIntegrationId);
  if (!integration) return res.status(404).json({ error: 'PIN integration not found.' });
  res.json({
    schoolId: integration.id,
    apiKey: integration.apiKeyPlain || '',
    deliverySecret: integration.deliverySecret || '',
    deliveryWebhookUrl: integration.deliveryWebhookUrl || '',
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
  if (!['school_profile', 'site_request', 'class_subject', 'staff', 'student_import'].includes(section)) {
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
  if (section === 'site_request' && ctx.client.marketplaceIntegrationId) {
    const integration = await getSchoolIntegration(ctx.client.marketplaceIntegrationId);
    const webhook = String((req.body.data || {}).deliveryWebhookUrl || '').trim();
    if (integration && webhook) {
      await putSchoolIntegration({ ...integration, name: ctx.client.schoolName, deliveryWebhookUrl: webhook });
    }
  }
  await logActivity({ clientId: ctx.client.id, projectId: ctx.project.id, actor: ctx.client.email, action: `onboarding.${doc.status}`, detail: section });
  if (doc.status === 'submitted') {
    await notify({ audience: 'admin', title: 'Onboarding form submitted', message: `${ctx.project.schoolName} · ${section}`, type: 'onboarding' });
  }
  res.json({ submission: doc });
});

router.get('/agreement/current', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx) return res.status(404).json({ error: 'School account not found' });
  const agreements = await findAll<AgreementDoc>('sc_agreements', { clientId: ctx.client.id });
  const agreement = agreements.find((a) => a.status === 'pending') || agreements[0] || null;
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  const settings = await getSettings();
  res.json({ agreement, brand: settings.brand, contact: settings.contact, privacyPolicy: settings.privacyPolicy });
});

router.post('/agreement/current/accept', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx) return res.status(404).json({ error: 'School account not found' });
  const agreements = await findAll<AgreementDoc>('sc_agreements', { clientId: ctx.client.id });
  const agreement = agreements.find((a) => a.status === 'pending');
  if (!agreement) return res.status(409).json({ error: 'Agreement unavailable or already accepted' });
  if (req.body.confirmed !== true || !req.body.legalName || !req.body.position) {
    return res.status(400).json({ error: 'Legal name, position and confirmation are required.' });
  }
  const updated = await update<AgreementDoc>('sc_agreements', 'id', agreement.id, {
    status: 'accepted',
    acceptance: {
      legalName: String(req.body.legalName), position: String(req.body.position), confirmed: true,
      at: new Date().toISOString(), ip: req.ip, userAgent: req.headers['user-agent'],
    },
    updatedAt: new Date().toISOString(),
  });
  if (ctx.project && stageIndex(ctx.project.stage) < stageIndex('onboarding')) {
    await update<ProjectDoc>('sc_projects', 'id', ctx.project.id, { stage: 'onboarding', updatedAt: new Date().toISOString() });
  }
  await logActivity({ clientId: ctx.client.id, projectId: ctx.project?.id, actor: String(req.body.legalName), action: 'agreement.accepted', detail: agreement.reference });
  await notify({ audience: 'admin', title: 'Agreement accepted', message: `${ctx.client.schoolName} · ${agreement.reference}`, type: 'agreement' });
  res.json({ success: true, agreement: updated });
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

router.get('/classes', async (req: AuthRequest, res: Response) => {
  const projectId = req.client!.projectId;
  if (!projectId) return res.json({ classes: [] });
  const project = await assertProjectAccess(req.client!.clientId, projectId);
  if (!project) return res.status(403).json({ error: 'Project access denied' });
  res.json({ classes: await findAll<ClassDoc>('sc_classes', { projectId: project.id }) });
});

router.post('/classes', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const name = String(req.body.name || '').trim();
  const arm = String(req.body.arm || '').trim();
  if (!name || !arm) return res.status(400).json({ error: 'Class name and arm are required.' });
  const token = makeSecureToken('cls');
  const inviteUrl = `${schoolPublicUrl()}/school-management/class-invite/${token}`;
  const now = new Date().toISOString();
  const doc: ClassDoc = {
    id: makeId(), projectId: ctx.project.id,
    schoolName: ctx.project.schoolName || ctx.client.schoolName,
    name, arm,
    level: req.body.level !== undefined ? String(req.body.level || '') : undefined,
    headTeacherName: req.body.headTeacherName !== undefined ? String(req.body.headTeacherName || '') : undefined,
    headTeacherEmail: req.body.headTeacherEmail !== undefined ? String(req.body.headTeacherEmail || '') : undefined,
    headTeacherPhone: req.body.headTeacherPhone !== undefined ? String(req.body.headTeacherPhone || '') : undefined,
    subjects: asStringList(req.body.subjects),
    inviteToken: token, inviteTokenHash: hashToken(token), inviteUrl,
    status: 'active', createdBy: req.client!.clientId, createdAt: now, updatedAt: now,
  };
  (doc as any).expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
  (doc as any).clientId = ctx.client.id;
  await insert('sc_classes', doc);
  await logActivity({ clientId: ctx.client.id, projectId: ctx.project.id, actor: ctx.client.email, action: 'class.created', detail: `${name} ${arm}` });
  res.status(201).json({ classDoc: doc, inviteUrl, token });
});

router.patch('/classes/:id', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const cls = await findOne<ClassDoc>('sc_classes', { id: req.params.id, projectId: ctx.project.id });
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const patch: Partial<ClassDoc> = { updatedAt: new Date().toISOString() };
  for (const key of ['name', 'arm', 'level', 'headTeacherName', 'headTeacherEmail', 'headTeacherPhone']) {
    if (req.body[key] !== undefined) (patch as any)[key] = String(req.body[key] || '');
  }
  if (req.body.subjects !== undefined) patch.subjects = asStringList(req.body.subjects);
  if (req.body.status === 'active' || req.body.status === 'closed') patch.status = req.body.status;
  const updated = await update<ClassDoc>('sc_classes', 'id', cls.id, patch);
  res.json({ classDoc: updated });
});

router.delete('/classes/:id', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const cls = await findOne<ClassDoc>('sc_classes', { id: req.params.id, projectId: ctx.project.id });
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  await removeMany('sc_parent_submissions', { projectId: ctx.project.id, classId: cls.id });
  await removeMany('sc_classes', { id: cls.id, projectId: ctx.project.id });
  await logActivity({ clientId: ctx.client.id, projectId: ctx.project.id, actor: ctx.client.email, action: 'class.deleted', detail: `${cls.name} ${cls.arm || ''}` });
  res.json({ success: true });
});

router.post('/classes/:id/link', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const cls = await findOne<ClassDoc>('sc_classes', { id: req.params.id, projectId: ctx.project.id });
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const token = makeSecureToken('cls');
  const inviteUrl = `${schoolPublicUrl()}/school-management/class-invite/${token}`;
  const patch: Partial<ClassDoc> = {
    inviteToken: token, inviteTokenHash: hashToken(token), inviteUrl,
    status: 'active', updatedAt: new Date().toISOString(),
  };
  (patch as any).expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
  await update<ClassDoc>('sc_classes', 'id', cls.id, patch);
  await logActivity({ clientId: ctx.client.id, projectId: ctx.project.id, actor: ctx.client.email, action: 'class.link_regenerated', detail: cls.name });
  res.json({ inviteUrl, token });
});

router.get('/submissions', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.json({ submissions: [] });
  res.json({ submissions: await findAll<ParentSubmissionDoc>('sc_parent_submissions', { projectId: ctx.project.id }) });
});

router.delete('/account', async (req: AuthRequest, res: Response) => {
  const clientId = req.client!.clientId;
  try {
    const projects = await findAll<ProjectDoc>('sc_projects', { clientId });
    const projectIds = projects.map((project) => project.id);
    if (req.client!.projectId && !projectIds.includes(req.client!.projectId)) projectIds.push(req.client!.projectId);
    const collections = [
      'sc_clients', 'sc_projects', 'sc_agreements', 'sc_onboarding', 'sc_classes',
      'sc_parent_submissions', 'sc_invitations', 'sc_submissions', 'sc_documents',
      'sc_files', 'sc_notifications', 'sc_messages', 'sc_issues', 'sc_trainings',
      'sc_handovers', 'sc_activity', 'sc_marketplace_integrations',
    ];
    await Promise.all(collections.map((name) => removeMany(name, {
      $or: [{ clientId }, ...(projectIds.length ? [{ projectId: { $in: projectIds } }] : [])],
    } as Record<string, unknown>)));
  } catch {}
  res.json({ success: true });
});

router.get('/telegram/status', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx) return res.status(404).json({ error: 'School account not found' });
  const settings = await getSettings();
  const username = String(settings.telegramBotUsername || process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
  const botUrl = telegramBotUrl() || (username ? `https://t.me/${username}` : '');
  res.json({
    connected: Boolean(ctx.client.telegramChatId && ctx.client.telegramEnabled),
    chatId: ctx.client.telegramChatId,
    botUsername: username,
    botUrl,
    client: { id: ctx.client.id, email: ctx.client.email, schoolName: ctx.client.schoolName },
  });
});

router.patch('/telegram', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx) return res.status(404).json({ error: 'School account not found' });
  const rawChatId = req.body?.telegramChatId;
  const telegramChatId = rawChatId === undefined || rawChatId === null ? undefined : String(rawChatId).trim();
  const telegramEnabled = req.body?.telegramEnabled === undefined ? undefined : Boolean(req.body.telegramEnabled);
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (telegramChatId !== undefined) patch.telegramChatId = telegramChatId;
  if (telegramEnabled !== undefined) patch.telegramEnabled = telegramEnabled;
  const client = await update<ClientDoc>('sc_clients', 'id', ctx.client.id, patch as any);
  if (!client) return res.status(404).json({ error: 'School account not found' });
  res.json({
    connected: Boolean(client.telegramChatId && client.telegramEnabled !== false),
    chatId: client.telegramChatId,
    client: { id: client.id, email: client.email, schoolName: client.schoolName, telegramChatId: client.telegramChatId, telegramEnabled: client.telegramEnabled },
  });
});

router.post('/telegram/bind-code', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx) return res.status(404).json({ error: 'School account not found' });
  const settings = await getSettings();
  const username = String(settings.telegramBotUsername || process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
  const derivedUrl = telegramBotUrl() || (username ? `https://t.me/${username}` : '');
  const configured = telegramConfigured() && Boolean(derivedUrl);
  const code = makeSecureToken('tg');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await update<ClientDoc>('sc_clients', 'id', ctx.client.id, {
    telegramBindCodeHash: hashToken(code), telegramBindCodeExpiresAt: expiresAt,
    updatedAt: new Date().toISOString(),
  } as any);
  if (!configured) return res.json({ code, botUrl: '', expiresAt, error: 'Telegram bot is not configured.' });
  res.json({ code, botUrl: derivedUrl, botUsername: username, expiresAt });
});

router.post('/messages/voice', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const { fileName, mimeType } = req.body || {};
  const binary = decodeUpload(req.body?.data);
  if (!fileName || !mimeType || !binary || !binary.length) {
    return res.status(400).json({ error: 'File name, type and file data are required.' });
  }
  const settings = await getSettings();
  const problem = validateFileUpload(settings, String(mimeType), binary.length);
  if (problem) return res.status(400).json({ error: problem });
  const now = new Date().toISOString();
  const documentId = makeId();
  const fileId = makeId();
  const safe = safeFileName(String(fileName));
  const caption = String(req.body.caption || '').trim();
  const file: FileDoc = {
    id: fileId, projectId: ctx.project.id, documentId, fileName: safe,
    mimeType: String(mimeType), size: binary.length, data: binary.toString('base64'),
    uploadedBy: ctx.client.email, createdAt: now,
  };
  const document: DocumentDoc = {
    id: documentId, projectId: ctx.project.id, category: 'other', title: caption || safe,
    fileId, fileName: safe, mimeType: String(mimeType), size: binary.length,
    url: `/api/schools/client/documents/${documentId}/file`,
    uploadedBy: ctx.client.email, clientVisible: true, createdAt: now,
  };
  const message: MessageDoc = {
    id: makeId(), projectId: ctx.project.id, senderId: ctx.client.id,
    senderName: ctx.client.contactName, senderRole: 'client',
    message: caption || 'Voice note', read: false, channel: 'portal',
    voiceFileId: fileId, documentId, fileName: safe, mimeType: String(mimeType), createdAt: now,
  };
  await insert('sc_files', file);
  await insert('sc_documents', document);
  await insert('sc_messages', message);
  if (ctx.client.telegramChatId && ctx.client.telegramEnabled) {
    try { await sendTelegramVoice(ctx.client.telegramChatId, binary, safe, caption || undefined); } catch {}
  }
  await notify({ audience: 'admin', title: 'New client voice note', message: `${ctx.project.schoolName} · ${caption || 'Voice note'}`.slice(0, 160), type: 'message' });
  res.status(201).json({ message });
});

router.get('/messages/:id/voice', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const message = await findOne<MessageDoc>('sc_messages', { id: req.params.id, projectId: ctx.project.id });
  if (!message?.voiceFileId) return res.status(404).json({ error: 'Voice note not found' });
  const file = await findOne<FileDoc>('sc_files', { id: message.voiceFileId, documentId: message.documentId });
  if (!file) return res.status(404).json({ error: 'Voice note not found' });
  res.setHeader('Content-Type', file.mimeType || message.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${safeFileName(file.fileName)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(Buffer.from(file.data, 'base64'));
});

router.get('/payments/:id/receipt.pdf', async (req: AuthRequest, res: Response) => {
  const ctx = await context(req);
  if (!ctx?.project) return res.status(404).json({ error: 'No active project' });
  const payment = await findOne<PaymentDoc>('sc_payments', {
    id: req.params.id, projectId: ctx.project.id, clientId: ctx.client.id,
  });
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  const documents = await findAll<DocumentDoc>('sc_documents', { projectId: ctx.project.id, category: 'receipt' });
  const receipt = documents.find((doc) => doc.title.includes(payment.reference)) || null;
  const pdf = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(`receipt-${payment.reference}.pdf`)}"`);
  pdf.pipe(res);
  pdf.fontSize(22).font('Helvetica-Bold').fillColor('#111827').text('Payment Receipt');
  pdf.moveDown(0.5);
  pdf.fontSize(10).font('Helvetica').fillColor('#374151');
  pdf.text(`School: ${ctx.project.schoolName}`);
  pdf.text(`Reference: ${payment.reference}`);
  pdf.text(`Receipt number: ${payment.receiptNumber || '—'}`);
  pdf.text(`Payment: ${payment.description}`);
  pdf.text(`Amount: NGN ${payment.amount.toLocaleString()}`);
  pdf.text(`Status: ${payment.status}`);
  pdf.text(`Paid on: ${payment.paidAt || '—'}`);
  if (receipt?.content) {
    pdf.moveDown(1);
    pdf.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text('Receipt details');
    pdf.moveDown(0.5);
    pdf.fontSize(10).font('Helvetica').fillColor('#374151').text(receipt.content);
  }
  pdf.end();
});

export default router;

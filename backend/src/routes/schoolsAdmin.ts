import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import {
  findAll, findOne, insert, update, getSettings, getPackages, upsert, logActivity, notify, progressFor,
} from '../schools/store.js';
import {
  makeId, makeSecureToken, hashToken, type ApplicationDoc, type ClientDoc, type ProposalDoc,
  type AgreementDoc, type ProjectDoc, type MilestoneDoc, type PackageDoc, type FaqDoc,
  type InvitationDoc, type SettingsDoc, type IssueDoc, type TrainingDoc, type HandoverDoc,
  type DocumentDoc, type FileDoc, APPLICATION_STATUSES, PROJECT_STAGES,
  DOCUMENT_CATEGORIES, validateFileUpload, safeFileName,
} from '../schools/types.js';
import { adminAuth, adminRoles, type AuthRequest } from '../schools/auth.js';
import { generateApiKey, hashApiKey } from '../marketplace/types.js';
import { putSchoolIntegration, putLaunchToken } from '../marketplace/store.js';

const router = Router();
router.use(adminAuth);

const actor = (req: AuthRequest) => req.admin?.username || 'admin';

function decodeUpload(data: unknown): Buffer | null {
  if (typeof data !== 'string') return null;
  const value = data.includes(',') && data.startsWith('data:') ? data.slice(data.indexOf(',') + 1) : data;
  const cleaned = value.replace(/\s/g, '');
  if (!cleaned || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) return null;
  return Buffer.from(cleaned, 'base64');
}

router.get('/overview', async (_req: Request, res: Response) => {
  const apps = await findAll<ApplicationDoc>('sc_applications');
  const projects = await findAll<ProjectDoc>('sc_projects');
  const payments = await findAll<any>('sc_payments');
  const confirmed = payments.filter((p) => p.status === 'success');
  const byStatus: Record<string, number> = {};
  for (const s of APPLICATION_STATUSES) byStatus[s] = apps.filter((a) => a.status === s).length;
  res.json({
    totalApplications: apps.length,
    byStatus,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    completedProjects: projects.filter((p) => p.status === 'completed').length,
    totalProjectValue: projects.reduce((s, p) => s + p.cost, 0),
    totalPaymentsReceived: confirmed.reduce((s, p) => s + p.amount, 0),
    outstanding: projects.reduce((s, p) => s + Math.max(0, p.cost - p.totalPaid), 0),
    recentApplications: apps.slice(0, 8),
  });
});

router.get('/applications', async (req: Request, res: Response) => {
  let list = await findAll<ApplicationDoc>('sc_applications');
  const { status, from, to, search } = req.query as Record<string, string>;
  if (status) list = list.filter((a) => a.status === status);
  if (from) list = list.filter((a) => a.createdAt >= from);
  if (to) list = list.filter((a) => a.createdAt <= to);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((a) => a.school.name.toLowerCase().includes(q) || a.reference.toLowerCase().includes(q) || a.applicant.email.includes(q));
  }
  res.json({ applications: list });
});

router.get('/applications/:id', async (req: Request, res: Response) => {
  const application = await findOne<ApplicationDoc>('sc_applications', { id: req.params.id })
    || await findOne<ApplicationDoc>('sc_applications', { reference: req.params.id });
  if (!application) return res.status(404).json({ error: 'Application not found' });
  const activity = await findAll('sc_activity', { applicationId: application.id });
  const proposals = await findAll<ProposalDoc>('sc_proposals', { applicationId: application.id });
  const agreements = await findAll<AgreementDoc>('sc_agreements', { applicationId: application.id });
  const project = application.projectId ? await findOne<ProjectDoc>('sc_projects', { id: application.projectId }) : null;
  res.json({ application, activity, proposals, agreements, project, whatsappUrl: `https://wa.me/${(await getSettings()).contact.whatsapp.replace(/\D/g, '')}` });
});

router.patch('/applications/:id', async (req: AuthRequest, res: Response) => {
  const application = await findOne<ApplicationDoc>('sc_applications', { id: req.params.id });
  if (!application) return res.status(404).json({ error: 'Application not found' });
  const patch: any = {};
  for (const key of ['status', 'assignedTo', 'internalNotes', 'consultation']) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }
  patch.updatedAt = new Date().toISOString();
  const updated = await update<ApplicationDoc>('sc_applications', 'id', application.id, patch);
  await logActivity({ applicationId: application.id, actor: actor(req), action: 'application.updated', detail: JSON.stringify(patch) });
  if (patch.status && patch.status !== application.status) {
    await notify({ clientId: application.clientId, audience: 'client', title: 'Application status updated', message: `Your application is now: ${patch.status.replace(/_/g, ' ')}.`, type: 'status' });
  }
  res.json({ application: updated });
});

router.post('/applications/:id/convert', adminRoles('super_admin', 'sales'), async (req: AuthRequest, res: Response) => {
  const application = await findOne<ApplicationDoc>('sc_applications', { id: req.params.id });
  if (!application) return res.status(404).json({ error: 'Application not found' });
  if (application.clientId) return res.status(409).json({ error: 'Application already converted', clientId: application.clientId });
  const now = new Date().toISOString();
  const tempPassword = randomBytes(9).toString('base64url');
  const clientRef = await (await import('../schools/store.js')).nextRef('GTECH-CLI', 'sc_clients');
  const client: ClientDoc = {
    id: makeId(), applicationId: application.id, reference: clientRef,
    schoolName: application.school.name, contactName: application.applicant.fullName,
    email: application.applicant.email, phone: application.applicant.whatsapp,
    passwordHash: bcrypt.hashSync(tempPassword, 10), createdAt: now, updatedAt: now,
  };
  await insert('sc_clients', client);
  const projectRef = await (await import('../schools/store.js')).nextRef('GTECH-SCH', 'sc_projects');
  const project: ProjectDoc = {
    id: makeId(), reference: projectRef, applicationId: application.id, clientId: client.id,
    schoolName: application.school.name, packageName: req.body.packageName || '',
    cost: Number(req.body.cost) || 0, totalPaid: 0, stage: 'application', status: 'active',
    startDate: now, expectedCompletion: req.body.expectedCompletion,
    createdAt: now, updatedAt: now,
  };
  await insert('sc_projects', project);
  const settings = await getSettings();
  for (const [i, m] of settings.defaultMilestones.entries()) {
    await insert<MilestoneDoc>('sc_milestones', {
      id: makeId(), projectId: project.id, title: m.title, weight: m.weight,
      status: i === 0 ? 'in_progress' : 'pending', sortOrder: i, createdAt: now, updatedAt: now,
    });
  }
  await update('sc_clients', 'id', client.id, { projectId: project.id });
  await update('sc_applications', 'id', application.id, { status: 'converted', clientId: client.id, projectId: project.id, updatedAt: now });
  await logActivity({ applicationId: application.id, projectId: project.id, actor: actor(req), action: 'application.converted', detail: `${clientRef} / ${projectRef}` });
  await notify({ clientId: client.id, projectId: project.id, audience: 'client', title: 'Your project has been created', message: `Project ${projectRef}. Portal credentials: ${client.email} / temporary password ${tempPassword}`, type: 'project' });
  res.status(201).json({ client: { id: client.id, reference: client.reference, email: client.email, temporaryPassword: tempPassword }, project });
});

router.get('/clients', async (_req: Request, res: Response) => {
  const clients = await findAll<ClientDoc>('sc_clients');
  const projects = await findAll<ProjectDoc>('sc_projects');
  const integrations = await findAll<any>('mp_school_integrations');
  res.json({ clients: clients.map((c) => {
    const p = projects.find((x) => x.clientId === c.id);
    const integration = integrations.find((i) => i.id === c.marketplaceIntegrationId);
    return {
      ...c, passwordHash: undefined, project: p ? { reference: p.reference, stage: p.stage, status: p.status } : null,
      marketplace: integration ? { active: integration.active, lastConnectedAt: integration.lastConnectedAt } : null,
    };
  }) });
});

router.post('/clients/:id/marketplace/connect', adminRoles('super_admin'), async (req: AuthRequest, res: Response) => {
  const client = await findOne<ClientDoc>('sc_clients', { id: req.params.id });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (client.marketplaceIntegrationId) return res.status(409).json({ error: 'Already connected' });
  const apiKey = generateApiKey('gts');
  const integration = {
    id: makeId(), name: client.schoolName, apiKeyHash: hashApiKey(apiKey), prefix: 'gts',
    active: true, permissions: ['launch', 'verify', 'sync'], createdAt: new Date().toISOString(),
    clientId: client.id, projectId: client.projectId,
  };
  await putSchoolIntegration(integration as any);
  await update('sc_clients', 'id', client.id, { marketplaceIntegrationId: integration.id, marketplaceApiKeyHash: integration.apiKeyHash, updatedAt: new Date().toISOString() });
  if (client.projectId) await update('sc_projects', 'id', client.projectId, { marketplaceIntegrationId: integration.id, updatedAt: new Date().toISOString() });
  await logActivity({ clientId: client.id, projectId: client.projectId, actor: actor(req), action: 'marketplace.connected', detail: client.schoolName });
  res.status(201).json({ integrationId: integration.id, apiKey });
});

router.post('/clients/:id/marketplace/rotate', adminRoles('super_admin'), async (req: AuthRequest, res: Response) => {
  const client = await findOne<ClientDoc>('sc_clients', { id: req.params.id });
  if (!client?.marketplaceIntegrationId) return res.status(404).json({ error: 'Integration not found' });
  const apiKey = generateApiKey('gts');
  const { getSchoolIntegration } = await import('../marketplace/store.js');
  const integration = await getSchoolIntegration(client.marketplaceIntegrationId);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });
  await putSchoolIntegration({ ...integration, apiKeyHash: hashApiKey(apiKey), rotatedAt: new Date().toISOString() });
  await update('sc_clients', 'id', client.id, { marketplaceApiKeyHash: hashApiKey(apiKey) });
  await logActivity({ clientId: client.id, projectId: client.projectId, actor: actor(req), action: 'marketplace.api_key_rotated', detail: client.schoolName });
  res.json({ apiKey });
});

router.post('/clients/:id/marketplace/launch-token', adminRoles('super_admin'), async (req: AuthRequest, res: Response) => {
  const client = await findOne<ClientDoc>('sc_clients', { id: req.params.id });
  if (!client?.marketplaceIntegrationId) return res.status(404).json({ error: 'Connect the marketplace integration first.' });
  const project = client.projectId ? await findOne<ProjectDoc>('sc_projects', { id: client.projectId }) : null;
  const token = makeSecureToken('gtm');
  await putLaunchToken({
    id: makeId(),
    tokenHash: hashToken(token),
    schoolId: client.marketplaceIntegrationId,
    schoolName: client.schoolName,
    adminUserId: client.id,
    adminName: req.body.adminName || client.contactName,
    returnUrl: req.body.returnUrl || project?.deploymentUrl,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  });
  await logActivity({ clientId: client.id, projectId: client.projectId, actor: actor(req), action: 'marketplace.launch_token_issued', detail: client.schoolName });
  res.status(201).json({ token, marketplaceUrl: `/marketplace?token=${encodeURIComponent(token)}`, expiresInDays: 30 });
});

router.post('/clients/:id/reset-password', adminRoles('super_admin'), async (req: AuthRequest, res: Response) => {
  const client = await findOne<ClientDoc>('sc_clients', { id: req.params.id });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const temporaryPassword = randomBytes(9).toString('base64url');
  await update('sc_clients', 'id', client.id, { passwordHash: bcrypt.hashSync(temporaryPassword, 10), updatedAt: new Date().toISOString() });
  await notify({ clientId: client.id, projectId: client.projectId, audience: 'client', title: 'Portal password reset', message: `Your temporary password is ${temporaryPassword}`, type: 'security' });
  await logActivity({ clientId: client.id, projectId: client.projectId, actor: actor(req), action: 'client.password_reset', detail: client.email });
  res.json({ temporaryPassword });
});

router.get('/proposals', async (_req: Request, res: Response) => res.json({ proposals: await findAll<ProposalDoc>('sc_proposals') }));

router.post('/proposals', adminRoles('super_admin', 'sales'), async (req: AuthRequest, res: Response) => {
  const application = await findOne<ApplicationDoc>('sc_applications', { id: req.body.applicationId });
  if (!application) return res.status(404).json({ error: 'Application not found' });
  const version = (await findAll<ProposalDoc>('sc_proposals', { applicationId: application.id })).length + 1;
  const clientToken = makeSecureToken('prop');
  const now = new Date().toISOString();
  const proposal: ProposalDoc = {
    id: makeId(), reference: await (await import('../schools/store.js')).nextRef('GTECH-PRP', 'sc_proposals'),
    applicationId: application.id, clientId: application.clientId, version,
    schoolName: application.school.name, applicantName: application.applicant.fullName,
    packageId: req.body.packageId, packageName: req.body.packageName || '',
    modules: req.body.modules || application.services,
    addOns: req.body.addOns || [], hosting: req.body.hosting || '',
    domain: req.body.domain || '', customisation: req.body.customisation || '',
    timeline: req.body.timeline || '', training: req.body.training || '', support: req.body.support || '',
    amount: Number(req.body.amount) || 0, paymentStructure: req.body.paymentStructure || '',
    validUntil: req.body.validUntil || new Date(Date.now() + 30 * 86400000).toISOString(),
    terms: req.body.terms || '', status: 'draft', clientToken, clientTokenHash: hashToken(clientToken),
    createdBy: actor(req), createdAt: now, updatedAt: now,
  };
  await insert('sc_proposals', proposal);
  await logActivity({ applicationId: application.id, actor: actor(req), action: 'proposal.created', detail: proposal.reference });
  res.status(201).json({ proposal, clientUrl: `/proposal/${clientToken}` });
});

router.patch('/proposals/:id', async (req: AuthRequest, res: Response) => {
  const proposal = await findOne<ProposalDoc>('sc_proposals', { id: req.params.id });
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
  if (proposal.status === 'accepted') return res.status(409).json({ error: 'Accepted proposals cannot be edited. Create a revision.' });
  const patch = { ...req.body, updatedAt: new Date().toISOString(), id: proposal.id };
  delete (patch as any).clientTokenHash;
  const updated = await update<ProposalDoc>('sc_proposals', 'id', proposal.id, patch);
  await logActivity({ applicationId: proposal.applicationId, actor: actor(req), action: 'proposal.updated', detail: proposal.reference });
  res.json({ proposal: updated });
});

router.post('/proposals/:id/send', async (req: AuthRequest, res: Response) => {
  const proposal = await findOne<ProposalDoc>('sc_proposals', { id: req.params.id });
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
  await update('sc_proposals', 'id', proposal.id, { status: 'sent', updatedAt: new Date().toISOString() });
  await update('sc_applications', 'id', proposal.applicationId, { status: 'proposal_sent', updatedAt: new Date().toISOString() });
  await notify({ clientId: proposal.clientId, audience: 'client', title: 'Your proposal is ready', message: `Proposal ${proposal.reference} is available for review.`, type: 'proposal' });
  await logActivity({ applicationId: proposal.applicationId, actor: actor(req), action: 'proposal.sent', detail: proposal.reference });
  res.json({ clientUrl: `/proposal/${proposal.clientToken}` });
});

router.get('/agreements', async (_req: Request, res: Response) => res.json({ agreements: await findAll<AgreementDoc>('sc_agreements') }));

router.post('/agreements', adminRoles('super_admin'), async (req: AuthRequest, res: Response) => {
  const application = await findOne<ApplicationDoc>('sc_applications', { id: req.body.applicationId });
  if (!application) return res.status(404).json({ error: 'Application not found' });
  const version = (await findAll<AgreementDoc>('sc_agreements', { applicationId: application.id })).length + 1;
  const clientToken = makeSecureToken('agr');
  const accepted = await findOne<AgreementDoc>('sc_agreements', { applicationId: application.id, status: 'accepted' });
  if (accepted) return res.status(409).json({ error: 'An accepted agreement exists. Create a new version.' });
  const now = new Date().toISOString();
  const agreement: AgreementDoc = {
    id: makeId(), reference: await (await import('../schools/store.js')).nextRef('GTECH-AGR', 'sc_agreements'),
    applicationId: application.id, clientId: application.clientId, version,
    projectDescription: req.body.projectDescription || '', scopeIncluded: req.body.scopeIncluded || [],
    scopeExcluded: req.body.scopeExcluded || [], amount: Number(req.body.amount) || 0,
    milestones: req.body.milestones || [], timeline: req.body.timeline || '',
    responsibilities: req.body.responsibilities || { gtech: '', school: '' },
    hostingDomain: req.body.hostingDomain || '', dataOwnership: req.body.dataOwnership || '',
    softwareLicence: req.body.softwareLicence || '', confidentiality: req.body.confidentiality || '',
    dataProcessing: req.body.dataProcessing || '', maintenance: req.body.maintenance || '',
    cancellation: req.body.cancellation || '', refundPolicy: req.body.refundPolicy || '',
    disputeResolution: req.body.disputeResolution || '', additionalTerms: req.body.additionalTerms || '',
    content: req.body.content || '', status: 'pending', clientToken, clientTokenHash: hashToken(clientToken),
    createdBy: actor(req), createdAt: now, updatedAt: now,
  };
  await insert('sc_agreements', agreement);
  await notify({ clientId: agreement.clientId, audience: 'client', title: 'Development agreement requires acceptance', message: `Agreement ${agreement.reference} is ready.`, type: 'agreement' });
  await logActivity({ applicationId: application.id, actor: actor(req), action: 'agreement.created', detail: agreement.reference });
  res.status(201).json({ agreement, clientUrl: `/agreement/${clientToken}` });
});

router.get('/projects', async (_req: Request, res: Response) => {
  const projects = await findAll<ProjectDoc>('sc_projects');
  const milestones = await findAll<MilestoneDoc>('sc_milestones');
  res.json({ projects: projects.map((p) => ({ ...p, progress: progressFor(p.id, milestones) })) });
});

router.get('/projects/:id', async (req: Request, res: Response) => {
  const project = await findOne<ProjectDoc>('sc_projects', { id: req.params.id });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const milestones = await findAll<MilestoneDoc>('sc_milestones', { projectId: project.id }, { sortOrder: 1 });
  const payments = await findAll('sc_payments', { projectId: project.id });
  const activity = await findAll('sc_activity', { projectId: project.id });
  const issues = await findAll('sc_issues', { projectId: project.id });
  const integrations = await findAll<any>('mp_school_integrations', { clientId: project.clientId });
  res.json({ project, progress: progressFor(project.id, milestones), milestones, payments, activity, issues, integration: integrations[0] || null });
});

router.patch('/projects/:id', async (req: AuthRequest, res: Response) => {
  const project = await findOne<ProjectDoc>('sc_projects', { id: req.params.id });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const allowed = ['stage', 'status', 'projectManager', 'expectedCompletion', 'testingUrl', 'deploymentUrl', 'finalApproval'];
  const patch: any = {};
  for (const key of allowed) if (req.body[key] !== undefined) patch[key] = req.body[key];
  patch.updatedAt = new Date().toISOString();
  const updated = await update<ProjectDoc>('sc_projects', 'id', project.id, patch);
  await logActivity({ projectId: project.id, actor: actor(req), action: 'project.updated', detail: JSON.stringify(patch) });
  await notify({ clientId: project.clientId, projectId: project.id, audience: 'client', title: 'Project updated', message: `Project stage: ${patch.stage || project.stage}`, type: 'project' });
  res.json({ project: updated });
});

router.post('/projects/:id/milestones', async (req: AuthRequest, res: Response) => {
  const project = await findOne<ProjectDoc>('sc_projects', { id: req.params.id });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const milestones = await findAll<MilestoneDoc>('sc_milestones', { projectId: project.id });
  const total = milestones.reduce((s, m) => s + m.weight, 0) + Number(req.body.weight || 0);
  if (total > 100) return res.status(400).json({ error: `Total milestone weight would exceed 100% (currently ${total - Number(req.body.weight || 0)}%).` });
  const doc: MilestoneDoc = {
    id: makeId(), projectId: project.id, title: String(req.body.title), description: req.body.description,
    weight: Number(req.body.weight) || 0, status: 'pending', assignedTo: req.body.assignedTo,
    deadline: req.body.deadline, sortOrder: milestones.length, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await insert('sc_milestones', doc);
  await logActivity({ projectId: project.id, actor: actor(req), action: 'milestone.created', detail: doc.title });
  res.status(201).json({ milestone: doc });
});

router.patch('/milestones/:id', async (req: AuthRequest, res: Response) => {
  const milestone = await findOne<MilestoneDoc>('sc_milestones', { id: req.params.id });
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
  const patch: any = {};
  for (const key of ['title', 'description', 'weight', 'status', 'assignedTo', 'deadline', 'notes']) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }
  if (patch.status === 'completed') patch.completedAt = new Date().toISOString();
  patch.updatedAt = new Date().toISOString();
  const updated = await update<MilestoneDoc>('sc_milestones', 'id', milestone.id, patch);
  const project = await findOne<ProjectDoc>('sc_projects', { id: milestone.projectId });
  const milestones = await findAll<MilestoneDoc>('sc_milestones', { projectId: milestone.projectId });
  await logActivity({ projectId: milestone.projectId, actor: actor(req), action: 'milestone.updated', detail: `${milestone.title}: ${patch.status || ''}` });
  if (project) await notify({ clientId: project.clientId, projectId: project.id, audience: 'client', title: 'Milestone updated', message: `${milestone.title} — ${patch.status || milestone.status}`, type: 'milestone' });
  res.json({ milestone: updated, progress: progressFor(milestone.projectId, milestones) });
});

router.get('/payments', async (_req: Request, res: Response) => res.json({ payments: await findAll('sc_payments') }));

router.get('/onboarding/:projectId', async (req: Request, res: Response) => {
  res.json({
    submissions: await findAll('sc_onboarding', { projectId: req.params.projectId }),
    invitations: await findAll('sc_invitations', { projectId: req.params.projectId }),
    teacherSubmissions: await findAll('sc_submissions', { projectId: req.params.projectId }),
    studentImports: await findAll('sc_student_imports', { projectId: req.params.projectId }),
  });
});

router.post('/invitations', async (req: AuthRequest, res: Response) => {
  const project = await findOne<ProjectDoc>('sc_projects', { id: req.body.projectId });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const token = makeSecureToken('inv');
  const invite: InvitationDoc = {
    id: makeId(), projectId: project.id, type: req.body.type === 'class_teacher' ? 'class_teacher' : 'teacher',
    label: req.body.label, email: req.body.email, token, tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(), status: 'pending', createdAt: new Date().toISOString(),
  };
  await insert('sc_invitations', invite);
  await logActivity({ projectId: project.id, actor: actor(req), action: 'invitation.created', detail: invite.label || invite.type });
  res.status(201).json({ invitation: { ...invite, token: undefined }, inviteUrl: `/invite/${token}` });
});

router.get('/issues', async (_req: Request, res: Response) => res.json({ issues: await findAll<IssueDoc>('sc_issues') }));
router.patch('/issues/:id', async (req: AuthRequest, res: Response) => {
  const issue = await findOne<IssueDoc>('sc_issues', { id: req.params.id });
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  const patch: any = { updatedAt: new Date().toISOString() };
  for (const key of ['status', 'response', 'clientConfirmed']) if (req.body[key] !== undefined) patch[key] = req.body[key];
  const updated = await update<IssueDoc>('sc_issues', 'id', issue.id, patch);
  const project = await findOne<ProjectDoc>('sc_projects', { id: issue.projectId });
  if (project) await notify({ clientId: project.clientId, projectId: project.id, audience: 'client', title: 'Issue updated', message: `${issue.title} — ${patch.status || issue.status}`, type: 'issue' });
  res.json({ issue: updated });
});

router.get('/trainings', async (_req: Request, res: Response) => res.json({ trainings: await findAll<TrainingDoc>('sc_trainings') }));
router.post('/trainings', async (req: AuthRequest, res: Response) => {
  const doc: TrainingDoc = {
    id: makeId(), projectId: req.body.projectId, title: req.body.title, date: req.body.date,
    time: req.body.time, method: req.body.method, linkOrVenue: req.body.linkOrVenue,
    targetStaff: req.body.targetStaff, materials: req.body.materials, createdAt: new Date().toISOString(),
  };
  await insert('sc_trainings', doc);
  const project = await findOne<ProjectDoc>('sc_projects', { id: doc.projectId });
  if (project) await notify({ clientId: project.clientId, projectId: project.id, audience: 'client', title: 'Training scheduled', message: doc.title, type: 'training' });
  res.status(201).json({ training: doc });
});

router.get('/handovers', async (_req: Request, res: Response) => res.json({ handovers: await findAll<HandoverDoc>('sc_handovers') }));
router.post('/handovers', async (req: AuthRequest, res: Response) => {
  const existing = await findOne<HandoverDoc>('sc_handovers', { projectId: req.body.projectId });
  if (existing) return res.status(409).json({ error: 'Handover already exists' });
  const doc: HandoverDoc = {
    id: makeId(), projectId: req.body.projectId, documents: req.body.documents || [],
    status: 'delivered', createdAt: new Date().toISOString(),
  };
  await insert('sc_handovers', doc);
  const project = await findOne<ProjectDoc>('sc_projects', { id: doc.projectId });
  if (project) await notify({ clientId: project.clientId, projectId: project.id, audience: 'client', title: 'Handover documents ready', message: 'Please review and acknowledge receipt.', type: 'handover' });
  res.status(201).json({ handover: doc });
});

router.get('/documents', async (req: Request, res: Response) => {
  const filter = req.query.projectId ? { projectId: String(req.query.projectId) } : {};
  res.json({ documents: await findAll<DocumentDoc>('sc_documents', filter) });
});

router.post('/documents', async (req: AuthRequest, res: Response) => {
  const doc: DocumentDoc = {
    id: makeId(), projectId: req.body.projectId, category: req.body.category || 'other',
    title: req.body.title, url: req.body.url, content: req.body.content,
    uploadedBy: actor(req), clientVisible: req.body.clientVisible !== false, createdAt: new Date().toISOString(),
  };
  await insert('sc_documents', doc);
  res.status(201).json({ document: doc });
});

router.post('/documents/upload', adminRoles('super_admin', 'project_manager', 'technical'), async (req: AuthRequest, res: Response) => {
  const project = await findOne<ProjectDoc>('sc_projects', { id: req.body.projectId });
  if (!project) return res.status(404).json({ error: 'Project not found' });
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
  const clientVisible = req.body.clientVisible !== false;
  const file: FileDoc = {
    id: fileId, projectId: project.id, documentId, fileName: safeFileName(fileName),
    mimeType: String(mimeType), size: binary.length, data: binary.toString('base64'),
    uploadedBy: actor(req), createdAt: now,
  };
  const doc: DocumentDoc = {
    id: documentId, projectId: project.id, category: docCategory, title: String(title),
    fileId, fileName: file.fileName, mimeType: file.mimeType, size: file.size,
    url: `/api/schools/admin/documents/${documentId}/file`,
    uploadedBy: actor(req), clientVisible, createdAt: now,
  };
  await insert('sc_files', file);
  await insert('sc_documents', doc);
  await logActivity({ clientId: project.clientId, projectId: project.id, actor: actor(req), action: 'document.uploaded', detail: file.fileName });
  if (clientVisible) await notify({ clientId: project.clientId, projectId: project.id, audience: 'client', title: 'New document available', message: doc.title, type: 'document' });
  res.status(201).json({ document: doc });
});

router.get('/documents/:id/file', adminRoles('super_admin', 'project_manager', 'technical'), async (req: Request, res: Response) => {
  const doc = await findOne<DocumentDoc>('sc_documents', { id: req.params.id });
  if (!doc?.fileId) return res.status(404).json({ error: 'File not found' });
  const file = await findOne<FileDoc>('sc_files', { id: doc.fileId, documentId: doc.id });
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(file.fileName)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(Buffer.from(file.data, 'base64'));
});

router.get('/packages', async (_req: Request, res: Response) => res.json({ packages: await getPackages() }));
router.post('/packages', async (req: AuthRequest, res: Response) => {
  const now = new Date().toISOString();
  const doc: PackageDoc = {
    id: makeId(), name: req.body.name, slug: String(req.body.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: req.body.description || '', included: req.body.included || [], excluded: req.body.excluded || [],
    price: req.body.price === '' || req.body.price == null ? null : Number(req.body.price),
    priceLabel: req.body.priceLabel, implementation: req.body.implementation || '',
    addOns: req.body.addOns || [], active: req.body.active !== false, featured: !!req.body.featured,
    sortOrder: Number(req.body.sortOrder) || 0, createdAt: now, updatedAt: now,
  };
  await upsert('sc_packages', 'id', doc);
  res.status(201).json({ package: doc });
});
router.patch('/packages/:id', async (req: Request, res: Response) => {
  const doc = await findOne<PackageDoc>('sc_packages', { id: req.params.id });
  if (!doc) return res.status(404).json({ error: 'Package not found' });
  const updated = await update<PackageDoc>('sc_packages', 'id', doc.id, { ...req.body, updatedAt: new Date().toISOString() });
  res.json({ package: updated });
});

router.get('/faqs', async (_req: Request, res: Response) => res.json({ faqs: await findAll<FaqDoc>('sc_faqs', {}, { sortOrder: 1 }) }));
router.post('/faqs', async (req: Request, res: Response) => {
  const doc: FaqDoc = { id: makeId(), question: req.body.question, answer: req.body.answer, sortOrder: Number(req.body.sortOrder) || 0, active: req.body.active !== false };
  await upsert('sc_faqs', 'id', doc);
  res.status(201).json({ faq: doc });
});
router.patch('/faqs/:id', async (req: Request, res: Response) => {
  const updated = await update<FaqDoc>('sc_faqs', 'id', req.params.id, req.body);
  res.json({ faq: updated });
});

router.get('/settings', async (_req: Request, res: Response) => {
  const settings = await getSettings();
  res.json({ settings: { ...settings, paymentSecretsConfigured: !!process.env.PAYSTACK_SECRET_KEY } });
});
router.patch('/settings', adminRoles('super_admin'), async (req: AuthRequest, res: Response) => {
  const settings = await getSettings();
  const patch = { ...req.body, id: 'global', updatedAt: new Date().toISOString() };
  delete (patch as any).PAYSTACK_SECRET_KEY;
  delete (patch as any).paystackSecretKey;
  const updated = await upsert<SettingsDoc>('sc_settings', 'id', { ...settings, ...patch });
  res.json({ settings: updated });
});

router.get('/reports', async (_req: Request, res: Response) => {
  const apps = await findAll<ApplicationDoc>('sc_applications');
  const projects = await findAll<ProjectDoc>('sc_projects');
  const payments = await findAll<any>('sc_payments');
  const won = apps.filter((a) => ['accepted', 'converted'].includes(a.status)).length;
  const revenue = payments.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0);
  const sources: Record<string, number> = {};
  for (const a of apps) {
    const src = a.source?.utmSource || 'direct';
    sources[src] = (sources[src] || 0) + 1;
  }
  const completed = projects.filter((p) => p.status === 'completed');
  const avgDays = completed.length
    ? Math.round(completed.reduce((s, p) => s + (new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()) / 86400000, 0) / completed.length)
    : 0;
  res.json({
    totalApplications: apps.length, conversionRate: apps.length ? Math.round((won / apps.length) * 100) : 0,
    proposalsSent: (await findAll('sc_proposals')).filter((p: any) => p.status !== 'draft').length,
    acceptedProposals: (await findAll('sc_proposals')).filter((p: any) => p.status === 'accepted').length,
    projectsWon: projects.length, totalProjectValue: projects.reduce((s, p) => s + p.cost, 0),
    verifiedRevenue: revenue, outstanding: projects.reduce((s, p) => s + Math.max(0, p.cost - p.totalPaid), 0),
    activeProjects: projects.filter((p) => p.status === 'active').length,
    completedProjects: completed.length, cancelledProjects: projects.filter((p) => p.status === 'cancelled').length,
    averageCompletionDays: avgDays, sources,
  });
});

export default router;

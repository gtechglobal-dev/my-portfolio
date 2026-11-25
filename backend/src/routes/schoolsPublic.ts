import { Router, Request, Response } from 'express';
import {
  findAll, findOne, insert, update, nextRef, getPackages, getFaqs, getSettings,
  logActivity, notify,
} from '../schools/store.js';
import {
  makeId, hashToken, CONSENT_VERSION, type ApplicationDoc, type ProposalDoc,
  type AgreementDoc, type ClientDoc, type ProjectDoc, type MilestoneDoc, type OnboardingDoc,
} from '../schools/types.js';
import { rateLimit } from '../marketplace/rateLimit.js';
import { signClient, verifyClientCredentials, whatsappLink, clientAuth, type AuthRequest } from '../schools/auth.js';
import {
  createSchoolAccount, createOAuthState, exchangeGoogleCode, googleAuthUrl,
  googleOauthConfigured, publicOrigin, verifyOAuthState,
} from '../schools/selfService.js';
import bcrypt from 'bcryptjs';

const router = Router();

router.get('/config', async (_req: Request, res: Response) => {
  const settings = await getSettings();
  res.json({
    contact: settings.contact,
    brand: settings.brand,
    packages: await getPackages(true),
    faqs: await getFaqs(),
    privacyPolicy: settings.privacyPolicy,
    terms: settings.terms,
    onboardingVideo: settings.onboardingVideo || {
      title: 'GTECH Global School Management demo',
      description: 'Please watch our short demo of what we will be building together.',
      landscapeUrl: '',
      portraitUrl: '',
      posterUrl: '',
      downloads: [],
    },
    guidelineVideos: settings.guidelineVideos || [],
    telegramBotUsername: settings.telegramBotUsername || '',
  });
});

router.post('/applications', rateLimit(10, 60 * 60 * 1000, 'school-application'), async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const required = [
      b.applicant?.fullName, b.applicant?.position, b.applicant?.email, b.applicant?.whatsapp,
      b.school?.name, b.school?.address, b.school?.state, b.school?.lga, b.school?.email, b.school?.phone,
      b.profile?.challenges,
    ];
    if (required.some((v) => !v || !String(v).trim())) {
      return res.status(400).json({ error: 'Please complete all required fields.' });
    }
    if (!Array.isArray(b.services) || b.services.length === 0) {
      return res.status(400).json({ error: 'Select at least one service required.' });
    }
    if (b.consent?.accepted !== true) {
      return res.status(400).json({ error: 'Consent is required before submitting.' });
    }
    const existing = await findOne<ApplicationDoc>('sc_applications', { 'applicant.email': String(b.applicant.email).toLowerCase().trim() });
    if (existing && Date.now() - new Date(existing.createdAt).getTime() < 24 * 60 * 60 * 1000) {
      return res.status(409).json({ error: 'An application was already submitted with this email recently.', reference: existing.reference });
    }
    const now = new Date().toISOString();
    const reference = await nextRef('GTECH-APP', 'sc_applications');
    const application: ApplicationDoc = {
      id: makeId(),
      reference,
      applicant: {
        fullName: String(b.applicant.fullName).trim(),
        position: String(b.applicant.position).trim(),
        email: String(b.applicant.email).toLowerCase().trim(),
        whatsapp: String(b.applicant.whatsapp).trim(),
        altPhone: b.applicant.altPhone ? String(b.applicant.altPhone).trim() : undefined,
      },
      school: {
        name: String(b.school.name).trim(), address: String(b.school.address).trim(),
        state: String(b.school.state).trim(), lga: String(b.school.lga).trim(),
        email: String(b.school.email).toLowerCase().trim(), phone: String(b.school.phone).trim(),
        website: b.school.website ? String(b.school.website).trim() : undefined,
        type: String(b.school.type || ''),
      },
      profile: {
        studentCount: String(b.profile.studentCount || ''), teacherCount: String(b.profile.teacherCount || ''),
        staffCount: String(b.profile.staffCount || ''), classes: String(b.profile.classes || ''),
        existingSoftware: b.profile.existingSoftware ? String(b.profile.existingSoftware) : undefined,
        challenges: String(b.profile.challenges).trim(),
      },
      services: b.services.map(String),
      implementation: {
        preference: String(b.implementation?.preference || 'discuss'),
        budget: b.implementation?.budget ? String(b.implementation.budget) : undefined,
      },
      additional: {
        requirements: b.additional?.requirements ? String(b.additional.requirements) : undefined,
        consultationMethod: b.additional?.consultationMethod ? String(b.additional.consultationMethod) : undefined,
        consultationDate: b.additional?.consultationDate ? String(b.additional.consultationDate) : undefined,
      },
      consent: { accepted: true, version: CONSENT_VERSION, timestamp: now },
      source: {
        utmSource: b.source?.utmSource, utmMedium: b.source?.utmMedium,
        utmCampaign: b.source?.utmCampaign, referrer: b.source?.referrer,
        landingPage: b.source?.landingPage,
      },
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };
    await insert('sc_applications', application);
    await logActivity({ applicationId: application.id, actor: 'public', action: 'application.submitted', detail: reference });
    await notify({ audience: 'admin', title: 'New school application', message: `${application.school.name} (${reference})`, type: 'application' });
    const settings = await getSettings();
    const wa = whatsappLink(settings.contact.whatsapp, `Hello Gtech Global. I submitted an application of interest for your school management system. My application reference is ${reference}.`);
    res.status(201).json({ reference, schoolName: application.school.name, submittedAt: now, whatsappUrl: wa });
  } catch (err: any) {
    res.status(err.message === 'DB_UNAVAILABLE' ? 503 : 500).json({ error: 'Unable to submit application. Please try again.' });
  }
});

router.post('/client/login', async (req: Request, res: Response) => {
  const client = await verifyClientCredentials(String(req.body.email || ''), String(req.body.password || ''));
  if (!client) return res.status(401).json({ error: 'Invalid email or password' });
  const project = client.projectId ? await findOne<ProjectDoc>('sc_projects', { id: client.projectId }) : null;
  res.json({
    token: signClient({ clientId: client.id, projectId: client.projectId, role: 'client', email: client.email }),
    schoolName: client.schoolName,
    reference: client.reference,
    stage: project?.stage,
  });
});

router.post('/auth/register', rateLimit(10, 60 * 60 * 1000, 'school-signup'), async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');
    const contactName = String(req.body.contactName || '').trim();
    const schoolName = String(req.body.schoolName || '').trim();
    const phone = String(req.body.phone || '').trim();
    const logo = typeof req.body.logo === 'string' ? req.body.logo : '';
    if (!email || !password || !contactName || !schoolName || !phone) {
      return res.status(400).json({ error: 'Full name, school name, email, password and phone number are required.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (phone.replace(/\D/g, '').length < 7) return res.status(400).json({ error: 'Enter a valid phone number. WhatsApp is preferred.' });
    if (password.length < 8) return res.status(400).json({ error: 'Use at least 8 characters for your password.' });
    if (logo) {
      if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo)) {
        return res.status(400).json({ error: 'Upload a PNG, JPG or WEBP school logo.' });
      }
      if (Buffer.from(logo.split(',')[1] || '', 'base64').length > 2 * 1024 * 1024) {
        return res.status(400).json({ error: 'School logo must be 2MB or smaller.' });
      }
    }
    const account = await createSchoolAccount({
      email, password, contactName, schoolName, phone, logo,
    });
    res.status(201).json({
      token: signClient({ clientId: account.client.id, projectId: account.project.id, role: 'client', email: account.client.email }),
      client: account.client,
      project: account.project,
      agreement: account.agreement,
      credentials: account.credentials,
    });
  } catch (err: any) {
    if (err.message === 'EMAIL_IN_USE') return res.status(409).json({ error: 'An account already exists for this email. Sign in instead.' });
    res.status(err.message === 'DB_UNAVAILABLE' ? 503 : 500).json({ error: 'Could not create your school account. Please try again.' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  const client = await verifyClientCredentials(String(req.body.email || ''), String(req.body.password || ''));
  if (!client) return res.status(401).json({ error: 'Invalid email or password' });
  const project = client.projectId ? await findOne<ProjectDoc>('sc_projects', { id: client.projectId }) : null;
  res.json({
    token: signClient({ clientId: client.id, projectId: client.projectId, role: 'client', email: client.email }),
    client,
    project,
    credentials: client.marketplaceIntegrationId ? { schoolId: client.marketplaceIntegrationId } : null,
    stage: project?.stage,
  });
});

router.get('/auth/me', clientAuth, async (req: AuthRequest, res: Response) => {
  const client = await findOne<ClientDoc>('sc_clients', { id: req.client!.clientId });
  if (!client) return res.status(404).json({ error: 'School account not found' });
  const project = client.projectId ? await findOne<ProjectDoc>('sc_projects', { id: client.projectId }) : null;
  const [onboarding, agreements] = await Promise.all([
    project ? findAll<OnboardingDoc>('sc_onboarding', { projectId: project.id }) : Promise.resolve([]),
    findAll<AgreementDoc>('sc_agreements', { clientId: client.id }),
  ]);
  res.json({
    client,
    project,
    onboarding,
    agreement: agreements.find((a) => a.status === 'pending') || agreements[0] || null,
    credentials: client.marketplaceIntegrationId ? { schoolId: client.marketplaceIntegrationId } : null,
  });
});

router.get('/auth/google/start', (_req: Request, res: Response) => {
  if (!googleOauthConfigured()) {
    return res.status(503).json({ error: 'Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the Gtech backend.' });
  }
  res.redirect(googleAuthUrl(createOAuthState()));
});

router.get('/auth/google/callback', async (req: Request, res: Response) => {
  const state = String(req.query.state || '');
  const code = String(req.query.code || '');
  const frontend = publicOrigin();
  if (!verifyOAuthState(state) || !code) {
    return res.redirect(`${frontend}/school-management?authError=${encodeURIComponent('Google sign-in was cancelled or expired.')}`);
  }
  try {
    const google = await exchangeGoogleCode(code);
    if (!google) throw new Error('GOOGLE_VERIFY_FAILED');
    let client = await findOne<ClientDoc>('sc_clients', { email: google.email });
    let account: Awaited<ReturnType<typeof createSchoolAccount>> | null = null;
    if (!client) {
      account = await createSchoolAccount({
        email: google.email,
        contactName: google.name,
        schoolName: `${google.name}'s School`,
        authProvider: 'google',
        googleSub: google.sub,
        emailVerified: true,
      });
      client = account.client;
    }
    const project = client.projectId ? await findOne<ProjectDoc>('sc_projects', { id: client.projectId }) : null;
    const token = signClient({ clientId: client.id, projectId: client.projectId, role: 'client', email: client.email });
    if (account?.credentials) {
      res.cookie('gtech_school_setup', encodeURIComponent(JSON.stringify(account.credentials)), {
        httpOnly: true, sameSite: 'lax', secure: frontend.startsWith('https://'), maxAge: 10 * 60 * 1000,
      });
    }
    res.redirect(`${frontend}/school-management?auth=${encodeURIComponent(token)}&stage=${encodeURIComponent(project?.stage || '')}`);
  } catch {
    res.redirect(`${frontend}/school-management?authError=${encodeURIComponent('Google sign-in could not be completed.')}`);
  }
});

router.get('/proposal/:token', async (req: Request, res: Response) => {
  const proposal = await findOne<ProposalDoc>('sc_proposals', { clientTokenHash: hashToken(req.params.token) });
  if (!proposal || !['sent', 'revision_requested', 'accepted'].includes(proposal.status)) {
    return res.status(404).json({ error: 'Proposal not found or unavailable' });
  }
  const settings = await getSettings();
  res.json({ proposal, brand: settings.brand, contact: settings.contact });
});

router.post('/proposal/:token/respond', async (req: Request, res: Response) => {
  const proposal = await findOne<ProposalDoc>('sc_proposals', { clientTokenHash: hashToken(req.params.token) });
  if (!proposal || proposal.status === 'draft') return res.status(404).json({ error: 'Proposal unavailable' });
  if (proposal.status === 'accepted') return res.status(409).json({ error: 'This proposal has already been accepted.' });
  const action = String(req.body.action || '');
  if (!['accept', 'request_changes', 'decline'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  if (action === 'accept' && !req.body.name) return res.status(400).json({ error: 'Enter your full name to accept.' });
  const status = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'revision_requested';
  const updated = await update<ProposalDoc>('sc_proposals', 'id', proposal.id, {
    status,
    clientResponse: { action, note: req.body.note ? String(req.body.note) : undefined, at: new Date().toISOString(), name: req.body.name ? String(req.body.name) : undefined },
    updatedAt: new Date().toISOString(),
  });
  await logActivity({ applicationId: proposal.applicationId, actor: req.body.name || 'client', action: `proposal.${action}`, detail: proposal.reference });
  await notify({ audience: 'admin', title: `Proposal ${action.replace('_', ' ')}`, message: `${proposal.schoolName} · ${proposal.reference}`, type: 'proposal' });
  if (action === 'accept' && proposal.clientId) {
    await update('sc_applications', 'id', proposal.applicationId, { status: 'accepted', updatedAt: new Date().toISOString() });
  }
  res.json({ success: true, status, proposal: updated });
});

router.get('/agreement/:token', async (req: Request, res: Response) => {
  const agreement = await findOne<AgreementDoc>('sc_agreements', { clientTokenHash: hashToken(req.params.token) });
  if (!agreement || !['pending'].includes(agreement.status)) {
    return res.status(404).json({ error: 'Agreement not found or already accepted' });
  }
  const settings = await getSettings();
  res.json({ agreement, brand: settings.brand, contact: settings.contact, privacyPolicy: settings.privacyPolicy });
});

router.post('/agreement/:token/accept', async (req: Request, res: Response) => {
  const agreement = await findOne<AgreementDoc>('sc_agreements', { clientTokenHash: hashToken(req.params.token) });
  if (!agreement || agreement.status !== 'pending') return res.status(409).json({ error: 'Agreement unavailable or already accepted' });
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
  await logActivity({ applicationId: agreement.applicationId, actor: String(req.body.legalName), action: 'agreement.accepted', detail: agreement.reference });
  await notify({ audience: 'admin', title: 'Agreement accepted', message: `${agreement.reference} awaits initial payment`, type: 'agreement' });
  res.json({ success: true, agreement: updated });
});

export default router;

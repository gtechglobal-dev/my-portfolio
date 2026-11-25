import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  findOne, insert, nextRef, getSettings, logActivity, notify,
} from './store.js';
import {
  makeId, makeSecureToken, hashToken, CONSENT_VERSION,
  type ApplicationDoc, type AgreementDoc, type ClientDoc, type ProjectDoc, type SettingsDoc,
} from './types.js';
import {
  generateApiKey, hashApiKey, makeId as makeMarketplaceId,
  type SchoolIntegrationDoc,
} from '../marketplace/types.js';
import { putSchoolIntegration } from '../marketplace/store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gtech-global-secret-key-change-in-production';

export interface SchoolAccountInput {
  email: string;
  contactName: string;
  schoolName: string;
  password?: string;
  phone?: string;
  logo?: string;
  authProvider?: 'password' | 'google';
  googleSub?: string;
  emailVerified?: boolean;
}

export interface SchoolAccountResult {
  client: ClientDoc;
  project: ProjectDoc;
  agreement: AgreementDoc;
  credentials: { schoolId: string; apiKey: string; deliverySecret: string };
}

export function publicOrigin(): string {
  return String(
    process.env.SCHOOL_CLIENT_PUBLIC_URL
    || process.env.MARKETPLACE_PUBLIC_URL
    || process.env.RENDER_EXTERNAL_URL
    || 'http://localhost:5174',
  ).replace(/\/+$/, '');
}

export function googleOauthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(): string {
  return process.env.GOOGLE_CALLBACK_URL || `${publicOrigin()}/api/schools/public/auth/google/callback`;
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function createOAuthState(): string {
  return jwt.sign(
    { purpose: 'school-google-oauth', nonce: makeSecureToken('state') },
    JWT_SECRET,
    { expiresIn: '10m' },
  );
}

export function verifyOAuthState(state: unknown): boolean {
  if (typeof state !== 'string' || !state) return false;
  try {
    const payload = jwt.verify(state, JWT_SECRET) as { purpose?: string };
    return payload.purpose === 'school-google-oauth';
  } catch {
    return false;
  }
}

export async function exchangeGoogleCode(code: string): Promise<{
  email: string;
  name: string;
  sub: string;
  emailVerified: boolean;
} | null> {
  if (!googleOauthConfigured()) return null;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: googleRedirectUri(),
      grant_type: 'authorization_code',
    }).toString(),
  });
  const tokenData = await tokenResponse.json() as { access_token?: string };
  if (!tokenResponse.ok || !tokenData.access_token) return null;

  const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = await userResponse.json() as {
    email?: string; name?: string; sub?: string; email_verified?: boolean;
  };
  if (!userResponse.ok || !user.email || !user.sub || user.email_verified === false) return null;
  return {
    email: user.email.toLowerCase().trim(),
    name: String(user.name || user.email.split('@')[0] || 'School Admin').trim(),
    sub: user.sub,
    emailVerified: true,
  };
}

export async function createSchoolAccount(input: SchoolAccountInput): Promise<SchoolAccountResult> {
  const email = input.email.toLowerCase().trim();
  const existing = await findOne<ClientDoc>('sc_clients', { email });
  if (existing) throw new Error('EMAIL_IN_USE');

  const now = new Date().toISOString();
  const settings = await getSettings() as SettingsDoc;
  const application: ApplicationDoc = {
    id: makeId(),
    reference: await nextRef('GTECH-APP', 'sc_applications'),
    applicant: {
      fullName: input.contactName,
      position: 'School Administrator',
      email,
      whatsapp: input.phone || '',
    },
    school: {
      name: input.schoolName,
      address: '',
      state: '',
      lga: '',
      email,
      phone: input.phone || '',
      type: '',
    },
    profile: {
      studentCount: '',
      teacherCount: '',
      staffCount: '',
      classes: '',
      challenges: '',
    },
    services: ['School website', 'School management system'],
    implementation: { preference: 'discuss' },
    additional: {},
    consent: { accepted: true, version: CONSENT_VERSION, timestamp: now },
    source: { landingPage: '/school-management' },
    status: 'converted',
    createdAt: now,
    updatedAt: now,
  };

  const apiKey = generateApiKey('gts');
  const deliverySecret = makeSecureToken('gtds');
  const integration: SchoolIntegrationDoc = {
    id: makeMarketplaceId(),
    name: input.schoolName,
    apiKeyHash: hashApiKey(apiKey),
    apiKeyPlain: apiKey,
    prefix: 'gts',
    active: true,
    permissions: ['launch', 'verify', 'sync', 'purchase'],
    deliveryWebhookUrl: process.env.SCHOOL_PIN_DELIVERY_WEBHOOK || undefined,
    deliverySecret,
    createdAt: now,
  };

  const project: ProjectDoc = {
    id: makeId(),
    reference: await nextRef('GTECH-PRJ', 'sc_projects'),
    applicationId: application.id,
    clientId: '',
    schoolName: input.schoolName,
    packageName: 'School Website & Management System',
    cost: 0,
    totalPaid: 0,
    stage: 'agreement',
    status: 'active',
    startDate: now,
    createdAt: now,
    updatedAt: now,
  };

  const client: ClientDoc = {
    id: makeId(),
    applicationId: application.id,
    reference: application.reference,
    schoolName: input.schoolName,
    contactName: input.contactName,
    email,
    phone: input.phone,
    logo: input.logo,
    passwordHash: input.password ? bcrypt.hashSync(input.password, 10) : bcrypt.hashSync(makeSecureToken('oauth'), 10),
    projectId: project.id,
    marketplaceIntegrationId: integration.id,
    marketplaceApiKeyHash: integration.apiKeyHash,
    authProvider: input.authProvider || 'password',
    googleSub: input.googleSub,
    emailVerified: input.emailVerified || false,
    createdAt: now,
    updatedAt: now,
  };

  project.clientId = client.id;
  application.clientId = client.id;
  application.projectId = project.id;

  const agreementToken = makeSecureToken('agr');
  const agreement: AgreementDoc = {
    id: makeId(),
    reference: await nextRef('GTECH-AGR', 'sc_agreements'),
    applicationId: application.id,
    clientId: client.id,
    version: 1,
    projectDescription: `Design, customization and deployment of a school website and management system for ${input.schoolName}.`,
    scopeIncluded: [
      'School profile and branding collection',
      'Customized school website based on the Greatpath platform',
      'Result PIN purchasing integration with Gtech Global',
      'Deployment and handover',
    ],
    scopeExcluded: ['Custom mobile application', 'Third-party ERP integration'],
    amount: 0,
    milestones: [],
    timeline: 'To be confirmed after onboarding',
    responsibilities: {
      gtech: 'Build, configure, test and deploy the school platform.',
      school: 'Provide accurate school information, branding assets and approvals.',
    },
    hostingDomain: 'To be confirmed',
    dataOwnership: 'The school owns all school, staff and student data entered into its platform.',
    softwareLicence: 'The platform is licensed to the school for its internal use.',
    confidentiality: 'Both parties will keep non-public information confidential.',
    dataProcessing: 'School data is processed only to deliver and support the platform.',
    maintenance: 'Maintenance and support terms will be confirmed in the project proposal.',
    cancellation: 'Either party may cancel by written notice before deployment.',
    refundPolicy: 'Payments are non-refundable once implementation work has begun.',
    disputeResolution: 'Disputes will be resolved amicably before any formal action.',
    additionalTerms: '',
    content: `SCHOOL: ${input.schoolName}\nADMINISTRATOR: ${input.contactName}\n\n${settings.agreementTemplate || settings.terms || 'By accepting this agreement, the school authorizes Gtech Global to build and deploy its customized school platform.'}`,
    status: 'pending',
    clientToken: agreementToken,
    clientTokenHash: hashToken(agreementToken),
    createdBy: 'self_service',
    createdAt: now,
    updatedAt: now,
  };

  await putSchoolIntegration(integration);
  await insert('sc_applications', application);
  await insert('sc_clients', client);
  await insert('sc_projects', project);
  await insert('sc_agreements', agreement);
  await insert('sc_onboarding', {
    id: makeId(),
    projectId: project.id,
    section: 'school_profile',
    data: { schoolName: input.schoolName, contactName: input.contactName, email, phone: input.phone || '', logo: input.logo || '' },
    status: 'draft',
    updatedAt: now,
  });
  await logActivity({
    clientId: client.id,
    projectId: project.id,
    applicationId: application.id,
    actor: email,
    action: 'school_account.created',
    detail: `${input.schoolName} · ${application.reference}`,
  });
  await notify({
    audience: 'admin',
    title: 'New School Management signup',
    message: `${input.schoolName} · ${email}`,
    type: 'school',
  });

  return {
    client,
    project,
    agreement,
    credentials: { schoolId: integration.id, apiKey, deliverySecret },
  };
}

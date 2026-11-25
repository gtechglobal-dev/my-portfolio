import { randomBytes, randomUUID, createHash } from 'crypto';

export const CONSENT_VERSION = '1.0';

export type ApplicationStatus =
  | 'new' | 'under_review' | 'contacted' | 'consultation_scheduled'
  | 'consultation_completed' | 'proposal_preparation' | 'proposal_sent'
  | 'awaiting_acceptance' | 'accepted' | 'rejected' | 'converted';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'new', 'under_review', 'contacted', 'consultation_scheduled',
  'consultation_completed', 'proposal_preparation', 'proposal_sent',
  'awaiting_acceptance', 'accepted', 'rejected', 'converted',
];

export interface ApplicationDoc {
  id: string;
  reference: string;
  applicant: {
    fullName: string; position: string; email: string; whatsapp: string; altPhone?: string;
  };
  school: {
    name: string; address: string; state: string; lga: string; email: string;
    phone: string; website?: string; type: string;
  };
  profile: {
    studentCount: string; teacherCount: string; staffCount: string; classes: string;
    existingSoftware?: string; challenges: string;
  };
  services: string[];
  implementation: { preference: string; budget?: string };
  additional: { requirements?: string; consultationMethod?: string; consultationDate?: string };
  consent: { accepted: boolean; version: string; timestamp: string };
  source: { utmSource?: string; utmMedium?: string; utmCampaign?: string; referrer?: string; landingPage?: string };
  status: ApplicationStatus;
  assignedTo?: string;
  clientId?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackageDoc {
  id: string;
  name: string;
  slug: string;
  description: string;
  included: string[];
  excluded: string[];
  price: number | null;
  priceLabel?: string;
  implementation: string;
  addOns: { name: string; price: number | null }[];
  active: boolean;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FaqDoc {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
}

export interface ClientDoc {
  id: string;
  applicationId: string;
  reference: string;
  schoolName: string;
  contactName: string;
  email: string;
  phone?: string;
  logo?: string;
  passwordHash: string;
  projectId?: string;
  marketplaceIntegrationId?: string;
  marketplaceApiKeyHash?: string;
  authProvider?: 'password' | 'google';
  googleSub?: string;
  emailVerified?: boolean;
  telegramChatId?: string;
  telegramEnabled?: boolean;
  telegramBindCodeHash?: string;
  telegramBindCodeExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalDoc {
  id: string;
  reference: string;
  applicationId: string;
  clientId?: string;
  version: number;
  schoolName: string;
  applicantName: string;
  packageId?: string;
  packageName: string;
  modules: string[];
  addOns: { name: string; price: number | null; included: boolean }[];
  hosting: string;
  domain: string;
  customisation: string;
  timeline: string;
  training: string;
  support: string;
  amount: number;
  paymentStructure: string;
  validUntil: string;
  terms: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'revision_requested' | 'revision_pending';
  clientToken: string;
  clientTokenHash: string;
  clientResponse?: { action: string; note?: string; at: string; name?: string };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementDoc {
  id: string;
  reference: string;
  applicationId: string;
  clientId?: string;
  version: number;
  projectDescription: string;
  scopeIncluded: string[];
  scopeExcluded: string[];
  amount: number;
  milestones: { description: string; amount: number; due?: string }[];
  timeline: string;
  responsibilities: { gtech: string; school: string };
  hostingDomain: string;
  dataOwnership: string;
  softwareLicence: string;
  confidentiality: string;
  dataProcessing: string;
  maintenance: string;
  cancellation: string;
  refundPolicy: string;
  disputeResolution: string;
  additionalTerms: string;
  content: string;
  status: 'draft' | 'pending' | 'accepted' | 'superseded';
  clientToken: string;
  clientTokenHash: string;
  acceptance?: {
    legalName: string; position: string; confirmed: boolean; at: string; ip?: string; userAgent?: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStage =
  | 'application' | 'consultation' | 'proposal' | 'agreement' | 'initial_payment'
  | 'onboarding' | 'development' | 'testing' | 'training' | 'deployment' | 'handover' | 'completed';

export const PROJECT_STAGES: ProjectStage[] = [
  'application', 'consultation', 'proposal', 'agreement', 'initial_payment',
  'onboarding', 'development', 'testing', 'training', 'deployment', 'handover', 'completed',
];

export interface ProjectDoc {
  id: string;
  reference: string;
  applicationId: string;
  clientId: string;
  proposalId?: string;
  agreementId?: string;
  schoolName: string;
  packageName: string;
  projectManager?: string;
  cost: number;
  totalPaid: number;
  stage: ProjectStage;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate: string;
  expectedCompletion?: string;
  testingUrl?: string;
  deploymentUrl?: string;
  finalApproval?: { approved: boolean; at: string; name: string; note?: string };
  marketplaceIntegrationId?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneDoc {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  weight: number;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignedTo?: string;
  deadline?: string;
  completedAt?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDoc {
  id: string;
  projectId: string;
  clientId: string;
  reference: string;
  paystackReference: string;
  amount: number;
  currency: 'NGN';
  description: string;
  type: 'deposit' | 'milestone' | 'final';
  status: 'pending' | 'success' | 'failed' | 'abandoned';
  gatewayResponse?: string;
  paidAt?: string;
  webhookEventId?: string;
  accessCode?: string;
  authorizationUrl?: string;
  receiptNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingDoc {
  id: string;
  projectId: string;
  section: 'school_profile' | 'class_subject' | 'staff' | 'student_import';
  data: Record<string, unknown>;
  status: 'draft' | 'submitted' | 'approved' | 'correction_requested';
  notes?: string;
  submittedAt?: string;
  reviewedBy?: string;
  updatedAt: string;
}

export interface InvitationDoc {
  id: string;
  projectId: string;
  type: 'teacher' | 'class_teacher';
  label?: string;
  email?: string;
  token: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  revokedAt?: string;
  status: 'pending' | 'submitted' | 'approved' | 'correction_requested';
  createdAt: string;
}

export interface SubmissionDoc {
  id: string;
  projectId: string;
  invitationId: string;
  type: 'teacher' | 'class_teacher';
  data: Record<string, unknown>;
  status: 'submitted' | 'approved' | 'correction_requested';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentImportDoc {
  id: string;
  projectId: string;
  fileName: string;
  rowCount: number;
  errors: string[];
  status: 'preview' | 'imported' | 'rejected';
  uploadedBy: string;
  createdAt: string;
}

export interface DocumentDoc {
  id: string;
  projectId: string;
  category: 'proposal' | 'agreement' | 'receipt' | 'onboarding' | 'project' | 'handover' | 'other';
  title: string;
  url?: string;
  content?: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  uploadedBy: string;
  clientVisible: boolean;
  createdAt: string;
}

export interface FileDoc {
  id: string;
  projectId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  size: number;
  data: string;
  uploadedBy: string;
  createdAt: string;
}

export interface NotificationDoc {
  id: string;
  projectId?: string;
  clientId?: string;
  audience: 'client' | 'admin';
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface MessageDoc {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'admin' | 'telegram';
  message: string;
  read: boolean;
  channel?: 'portal' | 'telegram' | 'paystack';
  voiceFileId?: string;
  fileName?: string;
  mimeType?: string;
  documentId?: string;
  createdAt: string;
}

export interface IssueDoc {
  id: string;
  projectId: string;
  title: string;
  description: string;
  module: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  screenshot?: string;
  status: 'submitted' | 'under_review' | 'in_progress' | 'resolved' | 'awaiting_client' | 'closed';
  response?: string;
  clientConfirmed?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingDoc {
  id: string;
  projectId: string;
  title: string;
  date: string;
  time: string;
  method: string;
  linkOrVenue: string;
  targetStaff: string;
  materials?: string;
  createdAt: string;
}

export interface HandoverDoc {
  id: string;
  projectId: string;
  documents: { title: string; url?: string; content?: string }[];
  status: 'pending' | 'delivered' | 'acknowledged';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  feedback?: string;
  createdAt: string;
}

export interface ClassDoc {
  id: string;
  projectId: string;
  schoolName: string;
  name: string;
  arm?: string;
  level?: string;
  headTeacherName?: string;
  headTeacherEmail?: string;
  headTeacherPhone?: string;
  subjects: string[];
  inviteToken: string;
  inviteTokenHash: string;
  inviteUrl?: string;
  status: 'active' | 'closed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParentSubmissionDoc {
  id: string;
  projectId: string;
  classId: string;
  className: string;
  arm?: string;
  headTeacher: { fullName: string; email: string; phone?: string };
  students: Array<{ studentName: string; className: string; arm?: string; gender?: string; dateOfBirth?: string; parentName: string; relationship?: string; parentPhone: string; parentEmail?: string; address?: string; subjects?: string[] }>;
  status: 'submitted' | 'approved' | 'correction_requested';
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDoc {
  id: string;
  projectId?: string;
  applicationId?: string;
  clientId?: string;
  actor: string;
  action: string;
  detail?: string;
  createdAt: string;
}

export interface SettingsDoc {
  id: 'global';
  contact: { email: string; phone: string; whatsapp: string; address?: string };
  brand: { name: string; tagline: string; logo?: string };
  privacyPolicy: string;
  terms: string;
  agreementTemplate: string;
  onboardingVideo?: {
    title?: string;
    description?: string;
    landscapeUrl?: string;
    portraitUrl?: string;
    posterUrl?: string;
    downloads?: { label?: string; quality?: string; url: string }[];
  };
  guidelineVideos: { id: string; title: string; url: string; description?: string; posterUrl?: string; type: 'file' | 'youtube' }[];
  telegramBotUsername?: string;
  depositPercent: number;
  finalPercent: number;
  defaultMilestones: { title: string; weight: number }[];
  fileRestrictions: { maxBytes: number; allowedTypes: string[] };
  updatedAt: string;
}

export const DOCUMENT_CATEGORIES = ['proposal', 'agreement', 'receipt', 'onboarding', 'project', 'handover', 'other'] as const;

export function validateFileUpload(settings: SettingsDoc | null, mimeType: string, bytes: number): string | null {
  const maxBytes = Number(settings?.fileRestrictions?.maxBytes) || 5 * 1024 * 1024;
  const allowedTypes = Array.isArray(settings?.fileRestrictions?.allowedTypes) && settings.fileRestrictions.allowedTypes.length
    ? settings.fileRestrictions.allowedTypes
    : ['image/jpeg', 'image/png', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a'];
  if (!allowedTypes.includes(mimeType)) return `File type ${mimeType || 'unknown'} is not allowed.`;
  if (bytes > maxBytes) return `File exceeds the ${Math.round(maxBytes / 1024 / 1024)}MB limit.`;
  return null;
}

export function safeFileName(name: string): string {
  return String(name || 'download').replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').slice(0, 180) || 'download';
}

export function parseCsv(text: string): { headers: string[]; rows: string[][]; errors: string[] } {
  const value = String(text || '').replace(/^\uFEFF/, '');
  const all: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (quoted) {
      if (char === '"' && value[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); all.push(row); row = []; field = ''; }
    else if (char !== '\r') field += char;
  }
  if (field.length || row.length) { row.push(field); all.push(row); }
  const headers = (all[0] || []).map((cell) => cell.trim()).filter(Boolean);
  const rows = all.slice(1).map((cells) => cells.map((cell) => cell.trim())).filter((cells) => cells.some(Boolean)).slice(0, 10000);
  const errors: string[] = [];
  if (!headers.length) errors.push('No header row was found.');
  const seen = new Set<string>();
  for (const header of headers) {
    const key = header.toLowerCase();
    if (seen.has(key)) errors.push(`Duplicate column: ${header}`);
    seen.add(key);
  }
  const badRows = rows.slice(0, 20).filter((cells) => cells.length !== headers.length).length;
  if (badRows) errors.push(`${badRows} of the first 20 rows do not match the ${headers.length} header columns.`);
  return { headers, rows, errors };
}

export function makeId(): string { return randomUUID(); }

export function nextSequenceRef(prefix: string, seq: number, year = new Date().getFullYear()): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

export function makeSecureToken(prefix = 'inv'): string {
  return `${prefix}_${randomBytes(24).toString('hex')}`;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function stageIndex(stage: ProjectStage): number { return PROJECT_STAGES.indexOf(stage); }

export function projectPaymentAmount(
  cost: number,
  totalPaid: number,
  type: 'deposit' | 'milestone' | 'final',
  depositPercent = 40,
): number {
  const outstanding = Math.max(0, Math.round(cost - totalPaid));
  if (outstanding <= 0) return 0;
  if (type === 'deposit' && totalPaid <= 0) {
    return Math.min(outstanding, Math.max(1, Math.round((cost * depositPercent) / 100)));
  }
  return outstanding;
}

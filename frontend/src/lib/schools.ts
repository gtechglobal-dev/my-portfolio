import { apiUrl } from './api';

const API = apiUrl('/api/schools');
export const ADMIN_TOKEN_KEY = 'admin_token';
export const CLIENT_TOKEN_KEY = 'gtech_client_token';

export interface PublicConfig {
  contact: { email: string; phone: string; whatsapp: string; address?: string };
  brand: { name: string; tagline: string; logo?: string };
  packages: Package[];
  faqs: Faq[];
  privacyPolicy: string;
  terms: string;
  onboardingVideo?: {
    title?: string;
    description?: string;
    landscapeUrl?: string;
    portraitUrl?: string;
    posterUrl?: string;
    downloads?: { label?: string; quality?: string; url: string }[];
  };
  guidelineVideos?: Array<{ id: string; title: string; url: string; description?: string; posterUrl?: string; type: 'file' | 'youtube' }>;
  telegramBotUsername?: string;
}

export interface Package {
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
}

export interface Faq { id: string; question: string; answer: string; sortOrder: number; active: boolean; }

export interface ClassDoc {
  id: string;
  projectId: string;
  schoolName: string;
  name: string;
  arm: string;
  level?: string;
  headTeacherName?: string;
  headTeacherEmail?: string;
  headTeacherPhone?: string;
  subjects: string[];
  inviteToken: string;
  inviteUrl?: string;
  status: string;
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
  students: Array<{
    studentName: string;
    className: string;
    arm?: string;
    gender?: string;
    dateOfBirth?: string;
    parentName: string;
    relationship?: string;
    parentPhone: string;
    parentEmail?: string;
    address?: string;
    subjects?: string[];
  }>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSchoolGroup {
  client: any;
  project?: any;
  agreements: any[];
  onboarding: any[];
  classes: ClassDoc[];
  submissions: ParentSubmissionDoc[];
  payments: any[];
  messages: any[];
}

export interface TelegramBind {
  code?: string;
  botUrl?: string;
  botUsername?: string;
  expiresAt?: string;
  connected?: boolean;
  client?: { id: string; telegramChatId?: string; telegramEnabled?: boolean; [key: string]: any };
  [key: string]: any;
}

export interface ApplicationPayload {
  applicant: { fullName: string; position: string; email: string; whatsapp: string; altPhone?: string };
  school: { name: string; address: string; state: string; lga: string; email: string; phone: string; website?: string; type: string };
  profile: { studentCount: string; teacherCount: string; staffCount: string; classes: string; existingSoftware?: string; challenges: string };
  services: string[];
  implementation: { preference: string; budget?: string };
  additional?: { requirements?: string; consultationMethod?: string; consultationDate?: string };
  consent: { accepted: boolean; version: string };
  source?: Record<string, string | undefined>;
}

async function request<T = any>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('The school API returned an invalid response. Check that the backend is deployed and reachable.');
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Unexpected response from the school API.');
  }
  return data as T;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

async function downloadSchoolFile(path: string, fileName: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Could not download the file.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = fileName;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getPublicConfig() { return request<PublicConfig>('/public/config'); }

export function submitApplication(payload: ApplicationPayload) {
  return request<{ reference: string; schoolName: string; submittedAt: string; whatsappUrl: string }>('/public/applications', {
    method: 'POST', body: JSON.stringify(payload),
  });
}

export function clientLogin(email: string, password: string) {
  return request<{ token: string; schoolName: string; reference: string; stage?: string }>('/public/client/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
}

export interface SchoolSession {
  token: string;
  client?: any;
  project?: any;
  agreement?: any;
  credentials?: { schoolId: string; apiKey?: string; deliverySecret?: string };
  onboarding?: any[];
  stage?: string;
}

export function schoolRegister(payload: { contactName: string; schoolName: string; email: string; password: string; phone: string; logo?: string }) {
  return request<SchoolSession>('/public/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export function schoolLogin(email: string, password: string) {
  return request<SchoolSession>('/public/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function schoolMe() { return request<SchoolSession>('/public/auth/me', {}, getClientToken()); }

export function schoolAgreement() { return request<any>('/client/agreement/current', {}, getClientToken()); }

export function acceptSchoolAgreement(payload: { legalName: string; position: string; confirmed: boolean }) {
  return request<any>('/client/agreement/current/accept', { method: 'POST', body: JSON.stringify(payload) }, getClientToken());
}

export function getProposal(token: string) { return request<any>(`/public/proposal/${encodeURIComponent(token)}`); }
export function respondProposal(token: string, payload: any) {
  return request<any>(`/public/proposal/${encodeURIComponent(token)}/respond`, { method: 'POST', body: JSON.stringify(payload) });
}
export function getAgreement(token: string) { return request<any>(`/public/agreement/${encodeURIComponent(token)}`); }
export function acceptAgreement(token: string, payload: any) {
  return request<any>(`/public/agreement/${encodeURIComponent(token)}/accept`, { method: 'POST', body: JSON.stringify(payload) });
}

export function getAdminToken() { return localStorage.getItem(ADMIN_TOKEN_KEY) || undefined; }
function admin<T = any>(path: string, options: RequestInit = {}) { return request<T>(`/admin${path}`, options, getAdminToken()); }

export const adminApi = {
  overview: () => admin('/overview'),
  applications: () => admin<{ applications: any[] }>('/applications'),
  application: (id: string) => admin(`/applications/${encodeURIComponent(id)}`),
  updateApplication: (id: string, patch: any) => admin(`/applications/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  convertApplication: (id: string, payload: any) => admin(`/applications/${encodeURIComponent(id)}/convert`, { method: 'POST', body: JSON.stringify(payload) }),
  clients: () => admin<{ clients: any[] }>('/clients'),
  connectMarketplace: (id: string) => admin(`/clients/${encodeURIComponent(id)}/marketplace/connect`, { method: 'POST' }),
  rotateMarketplaceKey: (id: string) => admin(`/clients/${encodeURIComponent(id)}/marketplace/rotate`, { method: 'POST' }),
  issueLaunchToken: (id: string, payload: any = {}) => admin(`/clients/${encodeURIComponent(id)}/marketplace/launch-token`, { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (id: string) => admin(`/clients/${encodeURIComponent(id)}/reset-password`, { method: 'POST' }),
  proposals: () => admin<{ proposals: any[] }>('/proposals'),
  createProposal: (payload: any) => admin('/proposals', { method: 'POST', body: JSON.stringify(payload) }),
  sendProposal: (id: string) => admin(`/proposals/${encodeURIComponent(id)}/send`, { method: 'POST' }),
  agreements: () => admin<{ agreements: any[] }>('/agreements'),
  createAgreement: (payload: any) => admin('/agreements', { method: 'POST', body: JSON.stringify(payload) }),
  projects: () => admin<{ projects: any[] }>('/projects'),
  project: (id: string) => admin(`/projects/${encodeURIComponent(id)}`),
  updateProject: (id: string, patch: any) => admin(`/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  updateMilestone: (id: string, patch: any) => admin(`/milestones/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  payments: () => admin<{ payments: any[] }>('/payments'),
  onboarding: (projectId: string) => admin(`/onboarding/${encodeURIComponent(projectId)}`),
  invite: (payload: any) => admin('/invitations', { method: 'POST', body: JSON.stringify(payload) }),
  issues: () => admin<{ issues: any[] }>('/issues'),
  updateIssue: (id: string, patch: any) => admin(`/issues/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  trainings: () => admin<{ trainings: any[] }>('/trainings'),
  createTraining: (payload: any) => admin('/trainings', { method: 'POST', body: JSON.stringify(payload) }),
  handovers: () => admin<{ handovers: any[] }>('/handovers'),
  createHandover: (payload: any) => admin('/handovers', { method: 'POST', body: JSON.stringify(payload) }),
  documents: () => admin<{ documents: any[] }>('/documents'),
  uploadDocument: (payload: any) => admin('/documents/upload', { method: 'POST', body: JSON.stringify(payload) }),
  packages: () => admin<{ packages: Package[] }>('/packages'),
  savePackage: (payload: any) => admin('/packages', { method: 'POST', body: JSON.stringify(payload) }),
  faqs: () => admin<{ faqs: Faq[] }>('/faqs'),
  saveFaq: (payload: any) => admin('/faqs', { method: 'POST', body: JSON.stringify(payload) }),
  settings: () => admin<{ settings: any }>('/settings'),
  saveSettings: (payload: any) => admin('/settings', { method: 'PATCH', body: JSON.stringify(payload) }),
  reports: () => admin('/reports'),
};

export function getClientToken() { return localStorage.getItem(CLIENT_TOKEN_KEY) || undefined; }
export function setClientToken(token: string) { localStorage.setItem(CLIENT_TOKEN_KEY, token); }
export function clearClientToken() { localStorage.removeItem(CLIENT_TOKEN_KEY); }
function client<T = any>(path: string, options: RequestInit = {}) { return request<T>(`/client${path}`, options, getClientToken()); }

export const clientApi = {
  overview: () => client('/overview'),
  notifications: () => client('/notifications'),
  readNotification: (id: string) => client(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  onboarding: () => client('/onboarding'),
  saveOnboarding: (section: string, data: any, submit = false) => client(`/onboarding/${section}`, { method: 'POST', body: JSON.stringify({ data, submit }) }),
  updateSchoolName: (schoolName: string) => client('/school-name', { method: 'PATCH', body: JSON.stringify({ schoolName }) }),
  integration: () => client<{ schoolId: string; apiKey: string; deliverySecret: string; deliveryWebhookUrl: string }>('/integration'),
  importStudents: (fileName: string, content: string) => client('/student-imports', { method: 'POST', body: JSON.stringify({ fileName, content }) }),
  payments: () => client('/payments'),
  initiatePayment: (type: 'deposit' | 'milestone' | 'final') => client('/payments/initiate', { method: 'POST', body: JSON.stringify({ type }) }),
  issueLaunchToken: () => client('/marketplace/launch-token', { method: 'POST' }),
  createIssue: (payload: any) => client('/issues', { method: 'POST', body: JSON.stringify(payload) }),
  messages: () => client('/messages'),
  sendMessage: (message: string) => client('/messages', { method: 'POST', body: JSON.stringify({ message }) }),
  documents: () => client('/documents'),
  uploadDocument: (payload: any) => client('/documents/upload', { method: 'POST', body: JSON.stringify(payload) }),
  finalApproval: (payload: any) => client('/final-approval', { method: 'POST', body: JSON.stringify(payload) }),
  acknowledgeHandover: (feedback?: string) => client('/handover/acknowledge', { method: 'POST', body: JSON.stringify({ feedback }) }),
};

export function getVoiceUrl(messageId: string) {
  return apiUrl(`/api/schools/client/messages/${encodeURIComponent(messageId)}/voice`);
}

async function fetchVoiceBlob(messageId: string): Promise<string> {
  const token = getClientToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(getVoiceUrl(messageId), { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Could not load the voice note.');
  }
  return URL.createObjectURL(await res.blob());
}

export const schoolsApi = {
  getAdminSchools: () => admin<{ groups: AdminSchoolGroup[]; schools?: AdminSchoolGroup[] }>('/schools'),
  updateAgreement: (id: string, patch: { content?: string; schoolName?: string; status?: string; additionalTerms?: string }) =>
    admin(`/agreements/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  adminGetMessages: (projectId?: string) => admin<{ messages: any[] }>(`/messages${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
  adminSendMessage: (projectId: string, message: string) =>
    admin('/messages', { method: 'POST', body: JSON.stringify({ projectId, message }) }),
  markMessageRead: (id: string) => admin(`/messages/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  updateClientTelegram: (clientId: string, payload: { telegramChatId?: string; telegramEnabled?: boolean }) =>
    admin(`/clients/${encodeURIComponent(clientId)}/telegram`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getClientClasses: () => client<{ classes: ClassDoc[] }>('/classes'),
  createClass: (payload: any) => client('/classes', { method: 'POST', body: JSON.stringify(payload) }),
  updateClass: (id: string, payload: any) => client(`/classes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteClass: (id: string) => client(`/classes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createClassLink: (id: string) => client(`/classes/${encodeURIComponent(id)}/link`, { method: 'POST' }),
  getClientSubmissions: () => client<{ submissions: ParentSubmissionDoc[] }>('/submissions'),
  deleteAccount: () => client('/account', { method: 'DELETE' }),
  getTelegramStatus: () => client<TelegramBind>('/telegram/status'),
  createTelegramBindCode: () => client<TelegramBind>('/telegram/bind-code', { method: 'POST' }),
  updateTelegram: (payload: { telegramChatId?: string; telegramEnabled?: boolean }) =>
    client<TelegramBind>('/telegram', { method: 'PATCH', body: JSON.stringify(payload) }),
  sendVoice: (payload: { fileName: string; mimeType: string; data: string; caption?: string }) =>
    client('/messages/voice', { method: 'POST', body: JSON.stringify(payload) }),
  getVoiceUrl,
  fetchVoiceBlob,
  downloadReceipt: (paymentId: string, fileName?: string) =>
    downloadSchoolFile(`/client/payments/${encodeURIComponent(paymentId)}/receipt.pdf`, fileName || `receipt-${paymentId}.pdf`, getClientToken()),
  getClassInvite: (token: string) => request<any>(`/invite/class/${encodeURIComponent(token)}`),
  submitClassInvite: (token: string, payload: any) =>
    request<any>(`/invite/class/${encodeURIComponent(token)}/submit`, { method: 'POST', body: JSON.stringify(payload) }),
  getMessages: () => client<{ messages: any[] }>('/messages'),
  sendMessage: (message: string) => client('/messages', { method: 'POST', body: JSON.stringify({ message }) }),
  uploadDocument: (payload: { title?: string; fileName: string; mimeType: string; data: string; category?: string }) =>
    client('/documents/upload', { method: 'POST', body: JSON.stringify({ title: payload.title || payload.fileName, ...payload }) }),
  updateSettings: (payload: any) => admin('/settings', { method: 'PATCH', body: JSON.stringify(payload) }),
};

export function downloadClientDocument(id: string, fileName: string) {
  return downloadSchoolFile(`/client/documents/${encodeURIComponent(id)}/file`, fileName, getClientToken());
}

export function downloadAdminDocument(id: string, fileName: string) {
  return downloadSchoolFile(`/admin/documents/${encodeURIComponent(id)}/file`, fileName, getAdminToken());
}

export function verifySchoolPayment(reference: string) {
  return request<any>('/payments/verify', { method: 'POST', body: JSON.stringify({ reference }) });
}

export function getInvite(token: string) { return request<any>(`/invite/${encodeURIComponent(token)}`); }
export function submitInvite(token: string, data: any) {
  return request<any>(`/invite/${encodeURIComponent(token)}/submit`, { method: 'POST', body: JSON.stringify({ data }) });
}

export function stageLabel(stage?: string) {
  return (stage || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function money(amount: number) {
  return `₦${Number(amount || 0).toLocaleString('en-NG')}`;
}

export function dateLabel(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

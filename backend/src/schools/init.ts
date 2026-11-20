import { getDb, isDbConnected } from '../db.js';
import { ensureSchoolIndexes, findAll, upsert } from './store.js';
import { makeId, type PackageDoc, type FaqDoc, type SettingsDoc } from './types.js';

const PACKAGES: Omit<PackageDoc, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Essential School System', slug: 'essential-school-system',
    description: 'A focused digital foundation for schools that need reliable records, results and communication without unnecessary complexity.',
    included: ['Student records', 'Class and subject setup', 'Staff accounts', 'Term and session management', 'Basic result management', 'Parent and student portal', 'Email support'],
    excluded: ['Exam PIN engine', 'Custom integrations', 'On-site training', 'Dedicated hosting'],
    price: null, priceLabel: 'Request a quote', implementation: 'Implementation fee is quoted after consultation.',
    addOns: [{ name: 'Data migration', price: null }], active: true, featured: false, sortOrder: 1,
  },
  {
    name: 'Complete School System', slug: 'complete-school-system',
    description: 'A full school management platform covering administration, academics, result workflow and parent engagement.',
    included: ['Everything in Essential', 'Attendance and timetable', 'Fee records', 'Exam PIN engine integration', 'Result checker', 'Rostering and class teachers', 'Onboarding support', 'Staff training'],
    excluded: ['Custom mobile app', 'Third-party ERP integration'],
    price: null, priceLabel: 'Request a quote', implementation: 'Implementation fee depends on school size and data readiness.',
    addOns: [{ name: 'Custom branding', price: null }, { name: 'SMS notifications', price: null }],
    active: true, featured: true, sortOrder: 2,
  },
  {
    name: 'Enterprise School Platform', slug: 'enterprise-school-platform',
    description: 'A tailored platform for multi-campus schools and groups that need advanced workflow, reporting and integration.',
    included: ['Everything in Complete', 'Multi-campus support', 'Custom roles and approvals', 'Advanced analytics', 'API integrations', 'Dedicated deployment', 'Priority support'],
    excluded: [],
    price: null, priceLabel: 'Talk to us', implementation: 'Scoped and quoted after a detailed requirements session.',
    addOns: [{ name: 'Custom module development', price: null }, { name: 'Dedicated hosting', price: null }],
    active: true, featured: false, sortOrder: 3,
  },
];

const FAQS: Omit<FaqDoc, 'id'>[] = [
  { question: 'Do I need technical knowledge to apply?', answer: 'No. Tell us about your school and what you need. Our team will guide you through consultation, requirements and implementation.', sortOrder: 1, active: true },
  { question: 'How is the project price decided?', answer: 'We review your school size, modules, data migration needs and deployment requirements, then issue a formal proposal. Prices are never guessed or shown as fake figures.', sortOrder: 2, active: true },
  { question: 'Can we choose our own modules?', answer: 'Yes. The application form lets you select the services you need. The final scope is confirmed in your proposal and agreement before payment.', sortOrder: 3, active: true },
  { question: 'How does payment work?', answer: 'Payments are made securely through Paystack after the proposal and agreement are accepted. Every payment is verified server-side and recorded in your client portal.', sortOrder: 4, active: true },
  { question: 'Will our data be secure?', answer: 'Client records are isolated by school and project. Public forms do not expose private records, portal access is authenticated and payment secrets remain server-side.', sortOrder: 5, active: true },
];

export async function initSchoolClients(): Promise<void> {
  if (!isDbConnected()) return;
  const db = getDb();
  if (!db) return;
  await ensureSchoolIndexes(db);
  if ((await findAll('sc_packages')).length === 0) {
    for (const pkg of PACKAGES) {
      const now = new Date().toISOString();
      await upsert('sc_packages', 'id', { id: makeId(), ...pkg, createdAt: now, updatedAt: now });
    }
  }
  if ((await findAll('sc_faqs')).length === 0) {
    for (const faq of FAQS) await upsert('sc_faqs', 'id', { id: makeId(), ...faq });
  }
  const settings: SettingsDoc = {
    id: 'global',
    contact: { email: 'gtechglobal.dev@gmail.com', phone: '+2347054867749', whatsapp: '2347054867749' },
    brand: { name: 'Gtech Global', tagline: 'Your Ideas. Our Digital Solutions.' },
    privacyPolicy: 'We collect only the information needed to assess, propose and deliver your school project. We do not sell applicant or student data.',
    terms: 'Project scope, pricing, timelines and support terms are defined in the accepted proposal and development agreement.',
    agreementTemplate: '',
    depositPercent: 40,
    finalPercent: 60,
    defaultMilestones: [
      { title: 'Initial payment confirmed', weight: 8 },
      { title: 'School information collection', weight: 7 },
      { title: 'School configuration', weight: 10 },
      { title: 'Branding', weight: 7 },
      { title: 'Database configuration', weight: 8 },
      { title: 'Development', weight: 25 },
      { title: 'Internal testing', weight: 8 },
      { title: 'Client testing', weight: 7 },
      { title: 'Corrections', weight: 5 },
      { title: 'Staff training', weight: 5 },
      { title: 'Final payment', weight: 5 },
      { title: 'Production deployment', weight: 4 },
      { title: 'Handover', weight: 1 },
    ],
    fileRestrictions: { maxBytes: 5 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] },
    updatedAt: new Date().toISOString(),
  };
  await upsert('sc_settings', 'id', settings);
}

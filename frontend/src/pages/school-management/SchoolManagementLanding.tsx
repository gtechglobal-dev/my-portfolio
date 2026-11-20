import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, GraduationCap, ClipboardList, FileText, CreditCard,
  Settings2, FlaskConical, Users, Rocket, Handshake, Lock, MessageCircle,
  ChevronDown, CheckCircle2, Building2,
} from 'lucide-react';
import { getPublicConfig, money, type PublicConfig } from '../../lib/schools';

const SERVICES = [
  'Student records', 'Class and subject setup', 'Staff management', 'Attendance',
  'Timetable', 'Result management', 'Exam PIN engine', 'Result checker',
  'Fee records', 'Parent and student portal', 'SMS/WhatsApp notifications', 'Reporting',
];

const STEPS = [
  { icon: ClipboardList, title: 'Apply', text: 'Tell us about your school and the systems you need.' },
  { icon: MessageCircle, title: 'Consult', text: 'We review your application and discuss scope and readiness.' },
  { icon: FileText, title: 'Proposal', text: 'Receive a clear proposal with modules, timeline and price.' },
  { icon: Handshake, title: 'Agree', text: 'Accept the agreement and make your initial payment securely.' },
  { icon: Settings2, title: 'Onboard', text: 'Submit school, staff and class information through guided forms.' },
  { icon: FlaskConical, title: 'Build & test', text: 'Follow progress, report issues and approve each milestone.' },
  { icon: Users, title: 'Train', text: 'Train your staff with scheduled sessions and materials.' },
  { icon: Rocket, title: 'Deploy', text: 'Go live, hand over documents and receive ongoing support.' },
];

export default function SchoolManagementLanding() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    getPublicConfig()
      .then((data) => {
        if (!Array.isArray(data.packages) || !Array.isArray(data.faqs)) {
          throw new Error('School configuration is incomplete. Check the API deployment.');
        }
        setConfig(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  const whatsapp = config?.contact?.whatsapp || '2347054867749';

  return (
    <div className="min-h-screen bg-ink text-[#f5f5f5]">
      <section className="relative overflow-hidden pt-28 pb-20 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.16),transparent_42%),radial-gradient(circle_at_85%_40%,rgba(255,122,47,0.10),transparent_38%)]" />
        <div className="container relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs mb-6">
              <GraduationCap className="w-3.5 h-3.5" /> School management systems by Gtech Global
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Run your school with a system built around <span className="text-[#a855f7]">your reality.</span>
            </h1>
            <p className="text-muted text-base md:text-lg max-w-2xl leading-relaxed mb-8">
              From student records and results to exam PINs, reporting and parent communication, we help schools plan, build, test and launch digital systems that fit the way they work.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/school-management/apply" className="btn btn-primary">
                Apply for a school system <ArrowRight className="w-4 h-4" />
              </Link>
              <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Hello Gtech Global, I would like to discuss a school management system.')}`} target="_blank" rel="noreferrer" className="btn btn-outline">
                <MessageCircle className="w-4 h-4" /> Ask a question
              </a>
              <Link to="/client-portal" className="btn btn-outline">Client portal</Link>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-xs text-muted">
              <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-400" /> Isolated school data</span>
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified Paystack payments</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No fake prices or commitments</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container px-6 py-16 border-t border-white/[0.06]">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold">From application to handover</h2>
          <p className="text-muted text-sm mt-2">Every stage is tracked in your client portal.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="card p-5">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                <step.icon className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-[10px] text-violet-400 font-semibold mb-1">STEP {i + 1}</div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-xs text-muted leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container px-6 py-16 border-t border-white/[0.06]">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Systems we can build</h2>
            <p className="text-muted text-sm mt-2">Select the modules you need in the application form.</p>
          </div>
          <Building2 className="w-8 h-8 text-violet-400/60" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SERVICES.map((service) => (
            <div key={service} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface border border-white/[0.06] text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {service}
            </div>
          ))}
        </div>
      </section>

      <section className="container px-6 py-16 border-t border-white/[0.06]">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold">Implementation options</h2>
          <p className="text-muted text-sm mt-2">Final pricing is confirmed in your proposal after consultation.</p>
        </div>
        {error && <p className="text-center text-red-400 text-sm">{error}</p>}
        {!config && !error && <p className="text-center text-muted text-sm">Loading options...</p>}
        <div className="grid md:grid-cols-3 gap-5">
          {(config?.packages || []).map((pkg) => (
            <div key={pkg.id} className={`card p-6 flex flex-col ${pkg.featured ? 'border-violet-500/40' : ''}`}>
              {pkg.featured && <span className="text-[10px] uppercase tracking-wider text-violet-400 mb-2">Recommended</span>}
              <h3 className="text-lg font-bold mb-2">{pkg.name}</h3>
              <p className="text-xs text-muted leading-relaxed mb-5 flex-1">{pkg.description}</p>
              <div className="text-2xl font-bold mb-5">{pkg.price ? money(pkg.price) : (pkg.priceLabel || 'Request a quote')}</div>
              <ul className="space-y-2 mb-5">
                {pkg.included.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-muted">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-faint mb-4">{pkg.implementation}</p>
              <Link to="/school-management/apply" className="btn btn-outline w-full mt-auto">Apply with this option</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="container px-6 py-16 border-t border-white/[0.06]">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold">Frequently asked questions</h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-2">
          {(config?.faqs || []).map((faq, i) => (
            <div key={faq.id} className="card overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-4 p-5 text-left">
                <span className="font-medium text-sm">{faq.question}</span>
                <ChevronDown className={`w-4 h-4 text-violet-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && <p className="px-5 pb-5 text-sm text-muted leading-relaxed">{faq.answer}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="container px-6 py-16 border-t border-white/[0.06]">
        <div className="card p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-violet-600/10 to-orange-500/5">
          <div>
            <h2 className="text-xl font-bold mb-2">Ready to start?</h2>
            <p className="text-sm text-muted">Tell us about your school. We will take it from there.</p>
          </div>
          <Link to="/school-management/apply" className="btn btn-primary">
            Start application <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

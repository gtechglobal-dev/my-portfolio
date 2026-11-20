import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, MessageCircle } from 'lucide-react';
import { submitApplication, type ApplicationPayload } from '../../lib/schools';

const SERVICES = [
  'Student records', 'Class and subject setup', 'Staff management', 'Attendance',
  'Timetable', 'Result management', 'Exam PIN engine', 'Result checker',
  'Fee records', 'Parent and student portal', 'SMS/WhatsApp notifications', 'Reporting',
];

type Group = 'applicant' | 'school' | 'profile' | 'implementation' | 'additional';

export default function ApplicationForm() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<any>({
    applicant: { fullName: '', position: '', email: '', whatsapp: '', altPhone: '' },
    school: { name: '', address: '', state: '', lga: '', email: '', phone: '', website: '', type: '' },
    profile: { studentCount: '', teacherCount: '', staffCount: '', classes: '', existingSoftware: '', challenges: '' },
    services: [] as string[],
    implementation: { preference: 'discuss', budget: '' },
    additional: { requirements: '', consultationMethod: '', consultationDate: '' },
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reference: string; whatsappUrl: string } | null>(null);

  function set(group: Group, key: string, value: string) {
    setForm((prev: any) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
  }

  function toggleService(service: string) {
    setForm((prev: any) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s: string) => s !== service)
        : [...prev.services, service],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.services.length === 0) return setError('Select at least one service requirement.');
    if (!consent) return setError('Please accept the consent statement before submitting.');
    setLoading(true);
    try {
      const payload: ApplicationPayload = {
        ...form,
        consent: { accepted: true, version: '1.0' },
        source: {
          utmSource: searchParams.get('utm_source') || undefined,
          utmMedium: searchParams.get('utm_medium') || undefined,
          utmCampaign: searchParams.get('utm_campaign') || undefined,
          referrer: document.referrer || undefined,
          landingPage: window.location.pathname,
        },
      };
      const data = await submitApplication(payload);
      setResult({ reference: data.reference, whatsappUrl: data.whatsappUrl });
    } catch (err: any) {
      setError(err.message || 'Could not submit your application.');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-6 py-24">
        <div className="card p-8 max-w-xl w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Application submitted</h1>
          <p className="text-sm text-muted leading-relaxed mb-5">
            Thank you. Your application reference is <strong className="text-white">{result.reference}</strong>. Keep it safe — our team will use it when contacting you.
          </p>
          <a href={result.whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
            <MessageCircle className="w-4 h-4" /> Continue on WhatsApp
          </a>
          <div className="mt-5">
            <Link to="/school-management" className="text-sm text-muted hover:text-white transition">Back to school systems</Link>
          </div>
        </div>
      </div>
    );
  }

  const input = 'w-full px-4 py-3 rounded-lg bg-surface border border-white/[0.08] text-white text-sm placeholder-faint focus:border-violet-500/50 focus:outline-none transition';
  const label = 'block text-xs text-muted mb-1.5';

  return (
    <div className="min-h-screen bg-ink text-[#f5f5f5] py-28 px-6">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">School system application</h1>
          <p className="text-sm text-muted max-w-2xl leading-relaxed">
            Tell us about your school. This form is the official starting point for consultation, proposal and project onboarding. Fields marked * are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="card p-6">
            <h2 className="font-semibold mb-5">1. Your details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={label}>Full name *</label><input required className={input} value={form.applicant.fullName} onChange={(e) => set('applicant', 'fullName', e.target.value)} /></div>
              <div><label className={label}>Position *</label><input required className={input} value={form.applicant.position} onChange={(e) => set('applicant', 'position', e.target.value)} /></div>
              <div><label className={label}>Email *</label><input required type="email" className={input} value={form.applicant.email} onChange={(e) => set('applicant', 'email', e.target.value)} /></div>
              <div><label className={label}>WhatsApp number *</label><input required className={input} value={form.applicant.whatsapp} onChange={(e) => set('applicant', 'whatsapp', e.target.value)} /></div>
              <div><label className={label}>Alternative phone</label><input className={input} value={form.applicant.altPhone} onChange={(e) => set('applicant', 'altPhone', e.target.value)} /></div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-semibold mb-5">2. School information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className={label}>School name *</label><input required className={input} value={form.school.name} onChange={(e) => set('school', 'name', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={label}>School address *</label><input required className={input} value={form.school.address} onChange={(e) => set('school', 'address', e.target.value)} /></div>
              <div><label className={label}>State *</label><input required className={input} value={form.school.state} onChange={(e) => set('school', 'state', e.target.value)} /></div>
              <div><label className={label}>Local government area *</label><input required className={input} value={form.school.lga} onChange={(e) => set('school', 'lga', e.target.value)} /></div>
              <div><label className={label}>School email *</label><input required type="email" className={input} value={form.school.email} onChange={(e) => set('school', 'email', e.target.value)} /></div>
              <div><label className={label}>School phone *</label><input required className={input} value={form.school.phone} onChange={(e) => set('school', 'phone', e.target.value)} /></div>
              <div><label className={label}>School type</label><input className={input} placeholder="e.g. private secondary" value={form.school.type} onChange={(e) => set('school', 'type', e.target.value)} /></div>
              <div><label className={label}>Website</label><input className={input} value={form.school.website} onChange={(e) => set('school', 'website', e.target.value)} /></div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-semibold mb-5">3. School profile</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={label}>Approximate number of students</label><input className={input} value={form.profile.studentCount} onChange={(e) => set('profile', 'studentCount', e.target.value)} /></div>
              <div><label className={label}>Approximate number of teachers</label><input className={input} value={form.profile.teacherCount} onChange={(e) => set('profile', 'teacherCount', e.target.value)} /></div>
              <div><label className={label}>Approximate number of other staff</label><input className={input} value={form.profile.staffCount} onChange={(e) => set('profile', 'staffCount', e.target.value)} /></div>
              <div><label className={label}>Number of classes/arms</label><input className={input} value={form.profile.classes} onChange={(e) => set('profile', 'classes', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={label}>Existing software or system</label><input className={input} value={form.profile.existingSoftware} onChange={(e) => set('profile', 'existingSoftware', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={label}>Main challenges you want to solve *</label><textarea required rows={4} className={input} value={form.profile.challenges} onChange={(e) => set('profile', 'challenges', e.target.value)} /></div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-semibold mb-2">4. Services required *</h2>
            <p className="text-xs text-muted mb-5">Select all that apply.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SERVICES.map((service) => {
                const active = form.services.includes(service);
                return (
                  <button type="button" key={service} onClick={() => toggleService(service)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-left text-xs transition ${
                      active ? 'border-violet-500/50 bg-violet-500/10 text-white' : 'border-white/[0.08] bg-surface text-muted hover:border-white/20'
                    }`}>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${active ? 'border-violet-400 bg-violet-500' : 'border-white/20'}`}>
                      {active && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </span>
                    {service}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-semibold mb-5">5. Implementation preferences</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Preferred approach</label>
                <select className={input} value={form.implementation.preference} onChange={(e) => set('implementation', 'preference', e.target.value)}>
                  <option value="discuss">Let us discuss</option>
                  <option value="phase">Phased implementation</option>
                  <option value="full">Full implementation at once</option>
                </select>
              </div>
              <div><label className={label}>Budget range (optional)</label><input className={input} value={form.implementation.budget} onChange={(e) => set('implementation', 'budget', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={label}>Other requirements</label><textarea rows={3} className={input} value={form.additional.requirements} onChange={(e) => set('additional', 'requirements', e.target.value)} /></div>
              <div><label className={label}>Preferred consultation method</label><input className={input} value={form.additional.consultationMethod} onChange={(e) => set('additional', 'consultationMethod', e.target.value)} /></div>
              <div><label className={label}>Preferred consultation date</label><input type="date" className={input} value={form.additional.consultationDate} onChange={(e) => set('additional', 'consultationDate', e.target.value)} /></div>
            </div>
          </section>

          <section className="card p-6">
            <label className="flex items-start gap-3 text-xs text-muted leading-relaxed cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-violet-500" />
              <span>
                I confirm that the information provided is accurate and I consent to Gtech Global using it to assess, contact and deliver the requested school system. I understand that final scope and pricing are confirmed in a formal proposal and agreement.
              </span>
            </label>
          </section>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Submitting...' : 'Submit application'} {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
            <span className="flex items-center gap-2 text-xs text-faint"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Your information is used only for this project enquiry.</span>
          </div>
        </form>
      </div>
    </div>
  );
}

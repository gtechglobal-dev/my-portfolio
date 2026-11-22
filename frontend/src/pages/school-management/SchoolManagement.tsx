import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff,
  FileText, GraduationCap, Loader2, Lock, Mail, Phone, ShieldCheck, Sparkles, UserRound,
} from 'lucide-react';
import {
  acceptSchoolAgreement, clientApi, clearClientToken, getClientToken,
  schoolAgreement, schoolGoogleStartUrl, schoolLogin, schoolMe, schoolRegister,
  setClientToken,
} from '../../lib/schools';

type Mode = 'signin' | 'signup';

const emptyProfile = {
  schoolName: '', contactName: '', phone: '', schoolEmail: '', schoolPhone: '',
  address: '', state: '', lga: '', studentCount: '', teacherCount: '', challenges: '',
};
const emptySite = {
  siteType: 'School website with management system',
  brandColors: '',
  pages: ['Home', 'About', 'Results', 'News', 'Contact'],
  deliveryWebhookUrl: '',
  timeline: '',
  notes: '',
};

function progressFor(session: any): number {
  const docs: any[] = session?.onboarding || [];
  const profile = docs.find((d) => d.section === 'school_profile' && d.status === 'submitted');
  const site = docs.find((d) => d.section === 'site_request' && d.status === 'submitted');
  const agreement = session?.agreement;
  if (!profile) return 0;
  if (!site) return 1;
  if (agreement?.status !== 'accepted') return 2;
  return 3;
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}{required ? ' *' : ''}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#a855f7] focus:bg-white/[0.06]"
      />
    </label>
  );
}

function PasswordField({ label, value, onChange, placeholder, required = false }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}{required ? ' *' : ''}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={label.toLowerCase().includes('confirm') ? 'new-password' : 'current-password'}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 pr-11 text-sm text-white outline-none transition focus:border-[#a855f7] focus:bg-white/[0.06]"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted transition hover:text-white"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

export default function SchoolManagement() {
  const [mode, setMode] = useState<Mode>('signup');
  const [form, setForm] = useState({ contactName: '', schoolName: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [session, setSession] = useState<any>(null);
  const [welcome, setWelcome] = useState<'signup' | 'signin' | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(emptyProfile);
  const [site, setSite] = useState(emptySite);
  const [agreement, setAgreement] = useState<any>(null);
  const [integration, setIntegration] = useState<any>(null);
  const [accept, setAccept] = useState({ legalName: '', position: '', confirmed: false });
  const [authChecking, setAuthChecking] = useState(Boolean(getClientToken()));

  const refresh = useCallback(async () => {
    const token = getClientToken();
    if (!token) return null;
    try {
      const data = await schoolMe();
      setSession(data);
      setWelcome(null);
      const next = progressFor(data);
      setStep(next);
      const profileDoc = (data.onboarding || []).find((d: any) => d.section === 'school_profile');
      if (profileDoc?.data) setProfile((current) => ({ ...current, ...profileDoc.data }));
      const siteDoc = (data.onboarding || []).find((d: any) => d.section === 'site_request');
      if (siteDoc?.data) setSite((current) => ({ ...current, ...siteDoc.data }));
      return data;
    } catch {
      clearClientToken();
      setSession(null);
      setError('Your session expired. Sign in again.');
      return null;
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    const authError = params.get('authError');
    if (authError) setError(authError);
    if (auth) {
      setClientToken(auth);
      window.history.replaceState({}, '', window.location.pathname);
    }
    refresh();
  }, [refresh]);

  const accent = useMemo(() => step >= 3 ? '#34d399' : '#a855f7', [step]);

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (mode === 'signup') {
      if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 7) {
        setError('Enter a valid phone number. WhatsApp is preferred.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    setBusy(true);
    try {
      const data = mode === 'signup'
        ? await schoolRegister({
          contactName: form.contactName,
          schoolName: form.schoolName,
          email: form.email,
          password: form.password,
          phone: form.phone,
        })
        : await schoolLogin(form.email, form.password);
      setClientToken(data.token);
      setSession(data);
      setWelcome(mode);
      const profileDoc = (data.onboarding || []).find((d: any) => d.section === 'school_profile');
      if (profileDoc?.data) setProfile((current) => ({ ...current, ...profileDoc.data }));
      setStep(progressFor(data));
      setForm({ contactName: '', schoolName: '', email: '', password: '', confirmPassword: '', phone: '' });
    } catch (err: any) {
      setError(err.message || 'Unable to continue.');
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await clientApi.saveOnboarding('school_profile', profile, true);
      await clientApi.updateSchoolName(profile.schoolName);
      const data = await refresh();
      setStep(Math.max(1, progressFor(data || session)));
    } catch (err: any) {
      setError(err.message || 'Could not save school profile.');
    } finally {
      setBusy(false);
    }
  }

  async function saveSite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await clientApi.saveOnboarding('site_request', site, true);
      const data = await refresh();
      setStep(Math.max(2, progressFor(data || session)));
    } catch (err: any) {
      setError(err.message || 'Could not save website details.');
    } finally {
      setBusy(false);
    }
  }

  async function loadAgreement() {
    setBusy(true);
    setError('');
    try {
      const data = await schoolAgreement();
      setAgreement(data.agreement);
    } catch (err: any) {
      setError(err.message || 'Could not load agreement.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (step === 2 && !agreement) loadAgreement();
  }, [step, agreement]);

  useEffect(() => {
    if (step === 3 && !integration) {
      clientApi.integration().then(setIntegration).catch(() => {});
    }
  }, [step, integration]);

  async function submitAgreement(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await acceptSchoolAgreement(accept);
      const data = await refresh();
      setStep(progressFor(data || session));
    } catch (err: any) {
      setError(err.message || 'Could not accept agreement.');
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    clearClientToken();
    setSession(null);
    setWelcome(null);
    setStep(0);
    setError('');
  }

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070708] text-white">
        <Loader2 className="h-7 w-7 animate-spin text-[#a855f7]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#070708] text-white">
        <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Link to="/" className="mb-6 inline-flex items-center gap-2 text-xs text-muted transition hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back to Gtech home
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-1 text-xs font-semibold text-[#d8b4fe]">
              <Sparkles className="h-3.5 w-3.5" /> School Management
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
              Onboard your school. Launch its own platform.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted">
              Create your School Management account, complete your school profile, request your customized
              website and accept the build agreement in one place. Exam PIN ordering is handled securely
              through Gtech Global.
            </p>
            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Building2, title: 'School profile', text: 'Tell us about your school.' },
                { icon: GraduationCap, title: 'Website request', text: 'Choose your pages and branding.' },
                { icon: ShieldCheck, title: 'Agreement', text: 'Approve the build scope.' },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <item.icon className="h-5 w-5 text-[#a855f7]" />
                  <p className="mt-3 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111113] p-6 shadow-2xl shadow-black/40 sm:p-8">
            <div className="mb-6 flex rounded-lg bg-white/[0.04] p-1">
              {(['signup', 'signin'] as Mode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { setMode(item); setError(''); }}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${mode === item ? 'bg-[#a855f7] text-black' : 'text-muted hover:text-white'}`}
                >
                  {item === 'signup' ? 'Create account' : 'Sign in'}
                </button>
              ))}
            </div>

            <a
              href={schoolGoogleStartUrl()}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.07]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#4285F4]">G</span>
              Continue with Google
            </a>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-faint">
              <span className="h-px flex-1 bg-white/10" /> or with email <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={submitAuth} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <Field label="Your full name" value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} placeholder="Admin name" required />
                  <Field label="School name" value={form.schoolName} onChange={(v) => setForm({ ...form, schoolName: v })} placeholder="Greatpath Academy" required />
                  <Field label="Phone number (WhatsApp preferred)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+234 801 234 5678" required />
                </>
              )}
              <Field label="Email address" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="admin@school.edu.ng" required />
              <PasswordField label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="At least 8 characters" required />
              {mode === 'signup' && <PasswordField label="Confirm password" value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} placeholder="Re-enter password" required />}
              {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
              <button type="submit" disabled={busy} className="btn btn-primary w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {mode === 'signup' ? 'Create School Management account' : 'Sign in to School Management'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (welcome) {
    const details = [
      { icon: Building2, label: 'School', value: session.client?.schoolName || '—' },
      { icon: UserRound, label: 'Administrator', value: session.client?.contactName || '—' },
      { icon: Mail, label: 'Email', value: session.client?.email || '—' },
      { icon: Phone, label: 'Phone / WhatsApp', value: session.client?.phone || '—' },
    ];
    return (
      <div className="min-h-screen bg-[#070708] text-white">
        <header className="border-b border-white/[0.06]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#a855f7]/15 text-[#a855f7]"><Building2 className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-bold">School Management</p>
                <p className="text-xs text-muted">{session.client?.schoolName || 'Your school'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-muted transition hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" /> Gtech home
              </Link>
              <button onClick={signOut} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-muted transition hover:text-white">Sign out</button>
            </div>
          </div>
        </header>
        <main className="mx-auto flex min-h-[calc(100vh-74px)] max-w-3xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-white/10 bg-[#111113] p-7 shadow-2xl shadow-black/40 sm:p-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> {welcome === 'signup' ? 'Account created' : 'Signed in'}
            </span>
            <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">
              {welcome === 'signup'
                ? `Welcome, ${session.client?.schoolName || 'your school'}.`
                : `Welcome back, ${session.client?.contactName || 'there'}.`}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted">
              Your School Management account is active. Confirm the details below, then continue to complete
              your school profile, website request and agreement.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {details.map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#a855f7]" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-faint">{item.label}</p>
                    <p className="mt-1 truncate text-sm font-medium text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
            <button
              type="button"
              onClick={() => { setWelcome(null); setStep(progressFor(session)); }}
              className="btn btn-primary mt-8 w-full"
            >
              Continue onboarding <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  const steps = ['School profile', 'Website request', 'Agreement', 'Complete'];

  return (
    <div className="min-h-screen bg-[#070708] text-white">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#a855f7]/15 text-[#a855f7]"><Building2 className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-bold">School Management</p>
              <p className="text-xs text-muted">{session.client?.schoolName || 'Your school'}</p>
              <p className="mt-0.5 text-[11px] text-faint">Signed in as {session.client?.contactName || session.client?.email || 'administrator'}</p>
            </div>
          </div>
          <button onClick={signOut} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-muted transition hover:text-white">Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 grid gap-2 sm:grid-cols-4">
          {steps.map((label, index) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
                style={{ borderColor: index <= step ? accent : 'rgba(255,255,255,0.12)', background: index < step ? accent : 'transparent', color: index < step ? '#050505' : index === step ? accent : '#6b7280' }}
              >
                {index < step ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className={`text-xs font-medium ${index === step ? 'text-white' : 'text-muted'}`}>{label}</span>
            </div>
          ))}
        </div>

        {error && <p className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        {step === 0 && (
          <form onSubmit={saveProfile} className="rounded-2xl border border-white/10 bg-[#111113] p-6 sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <Building2 className="h-6 w-6 text-[#a855f7]" />
              <div>
                <h2 className="text-xl font-bold">School profile</h2>
                <p className="text-xs text-muted">This information configures your school platform.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="School name" value={profile.schoolName} onChange={(v) => setProfile({ ...profile, schoolName: v })} required />
              <Field label="Administrator name" value={profile.contactName} onChange={(v) => setProfile({ ...profile, contactName: v })} required />
              <Field label="School email" value={profile.schoolEmail} onChange={(v) => setProfile({ ...profile, schoolEmail: v })} />
              <Field label="School phone" value={profile.schoolPhone} onChange={(v) => setProfile({ ...profile, schoolPhone: v })} />
              <Field label="Address" value={profile.address} onChange={(v) => setProfile({ ...profile, address: v })} />
              <Field label="State" value={profile.state} onChange={(v) => setProfile({ ...profile, state: v })} />
              <Field label="LGA" value={profile.lga} onChange={(v) => setProfile({ ...profile, lga: v })} />
              <Field label="Student count" value={profile.studentCount} onChange={(v) => setProfile({ ...profile, studentCount: v })} />
              <Field label="Teacher count" value={profile.teacherCount} onChange={(v) => setProfile({ ...profile, teacherCount: v })} />
              <Field label="Main challenge" value={profile.challenges} onChange={(v) => setProfile({ ...profile, challenges: v })} placeholder="What should the platform solve first?" />
            </div>
            <div className="mt-8 flex justify-end">
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} Save and continue
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={saveSite} className="rounded-2xl border border-white/10 bg-[#111113] p-6 sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-[#a855f7]" />
              <div>
                <h2 className="text-xl font-bold">Website & customization request</h2>
                <p className="text-xs text-muted">Tell us how your school platform should look and work.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Platform type" value={site.siteType} onChange={(v) => setSite({ ...site, siteType: v })} />
              <Field label="Brand colors" value={site.brandColors} onChange={(v) => setSite({ ...site, brandColors: v })} placeholder="Green and gold" />
              <Field label="Preferred timeline" value={site.timeline} onChange={(v) => setSite({ ...site, timeline: v })} placeholder="Before next term" />
              <Field label="PIN delivery webhook" value={site.deliveryWebhookUrl} onChange={(v) => setSite({ ...site, deliveryWebhookUrl: v })} placeholder="https://school.example.com/api/result-pins/gtech-delivery" />
            </div>
            <div className="mt-5">
              <span className="mb-2 block text-xs font-medium text-muted">Requested pages</span>
              <div className="flex flex-wrap gap-2">
                {['Home', 'About', 'Results', 'News', 'Events', 'Staff', 'Contact', 'Parent portal'].map((page) => {
                  const active = site.pages.includes(page);
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setSite({ ...site, pages: active ? site.pages.filter((p) => p !== page) : [...site.pages, page] })}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${active ? 'border-[#a855f7] bg-[#a855f7]/15 text-white' : 'border-white/10 text-muted hover:text-white'}`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-5">
              <span className="mb-1.5 block text-xs font-medium text-muted">Additional notes</span>
              <textarea
                value={site.notes}
                onChange={(event) => setSite({ ...site, notes: event.target.value })}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#a855f7]"
                placeholder="Any modules, pages or changes you want..."
              />
            </div>
            <div className="mt-8 flex justify-between">
              <button type="button" onClick={() => setStep(0)} className="btn btn-outline"><ChevronLeft className="h-4 w-4" /> Back</button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} Save and continue
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitAgreement} className="rounded-2xl border border-white/10 bg-[#111113] p-6 sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <FileText className="h-6 w-6 text-[#a855f7]" />
              <div>
                <h2 className="text-xl font-bold">Build agreement</h2>
                <p className="text-xs text-muted">Review and accept before implementation begins.</p>
              </div>
            </div>
            <div className="max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/30 p-5 text-xs leading-6 text-muted">
              <h3 className="mb-3 text-sm font-bold text-white">{agreement?.reference || 'School platform build agreement'}</h3>
              <p>{agreement?.content || 'Gtech Global will build, configure and deploy your customized school platform.'}</p>
              <div className="mt-4 grid gap-2">
                {(agreement?.scopeIncluded || []).map((item: string) => <p key={item}>• {item}</p>)}
              </div>
              <p className="mt-4">{agreement?.dataOwnership}</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Legal name" value={accept.legalName} onChange={(v) => setAccept({ ...accept, legalName: v })} required />
              <Field label="Position" value={accept.position} onChange={(v) => setAccept({ ...accept, position: v })} required />
            </div>
            <label className="mt-5 flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-xs text-muted">
              <input type="checkbox" checked={accept.confirmed} onChange={(event) => setAccept({ ...accept, confirmed: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#a855f7]" />
              I confirm that I am authorized to accept this agreement on behalf of the school.
            </label>
            <div className="mt-8 flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="btn btn-outline"><ChevronLeft className="h-4 w-4" /> Back</button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Accept agreement
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h2 className="mt-4 text-2xl font-bold">School Management setup complete</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
              Your school profile, website request and agreement have been submitted. Gtech Global will now
              build and deploy your customized school platform.
            </p>
            <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
              {[
                { label: 'School ID', value: integration?.schoolId || session.credentials?.schoolId || session.client?.marketplaceIntegrationId || '' },
                { label: 'Marketplace API key', value: integration?.apiKey || session.credentials?.apiKey || '' },
                { label: 'Delivery secret', value: integration?.deliverySecret || session.credentials?.deliverySecret || '' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs text-muted">{item.label}</p>
                  <p className="mt-1 break-all font-mono text-xs text-white">{item.value || 'Provisioned'}</p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-xs leading-6 text-muted">
              Copy these values into the school backend as GTECH_SCHOOL_ID, GTECH_MARKETPLACE_API_KEY and GTECH_DELIVERY_SECRET.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href="/client-portal" className="btn btn-primary"><UserRound className="h-4 w-4" /> Open client portal</a>
              <button onClick={refresh} className="btn btn-outline"><ShieldCheck className="h-4 w-4" /> Refresh status</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

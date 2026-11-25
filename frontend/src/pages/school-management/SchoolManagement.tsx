import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Copy, Download, Eye, EyeOff, FileText, GraduationCap, Loader2, Lock, Mail, Phone,
  PlayCircle, RefreshCw, ShieldCheck, Sparkles, UploadCloud, UserRound, Video,
} from 'lucide-react';
import ChatBox from '../../components/ChatBox';
import {
  acceptSchoolAgreement, clientApi, clearClientToken, fileToDataUrl, getClientToken,
  getPublicConfig, schoolAgreement, schoolLogin, schoolMe, schoolRegister, setClientToken,
  schoolsApi, type PublicConfig,
} from '../../lib/schools';

type Mode = 'signin' | 'signup';
type Interest = 'none' | 'interested' | 'not';

const emptyProfile = {
  schoolName: '', contactName: '', phone: '', schoolEmail: '', schoolPhone: '',
  address: '', state: '', lga: '', studentCount: '', teacherCount: '', challenges: '',
  proprietorRemark: '', vision: '', mission: '', logo: '',
};
const emptySite = {
  siteType: 'School website with management system',
  brandColors: '',
  pages: ['Home', 'About', 'Results', 'News', 'Contact'],
  deliveryWebhookUrl: '',
  timeline: '',
  notes: '',
};

const tableCellStyle = { border: '1px solid #dce6f7', padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap' } as const;

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

function youtubeEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    let id = '';
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') id = parsed.searchParams.get('v') || '';
      else if (parsed.pathname.startsWith('/embed/') || parsed.pathname.startsWith('/shorts/')) id = parsed.pathname.split('/')[2] || '';
    } else if (host === 'youtu.be') {
      id = parsed.pathname.slice(1);
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return '';
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return '';
  }
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false, textarea = false, rows = 4 }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <label className="sm-field">
      <span className="sm-field-label">{label}{required ? ' *' : ''}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="sm-input sm-textarea"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="sm-input"
        />
      )}
    </label>
  );
}

function PasswordField({ label, value, onChange, placeholder, required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="sm-field">
      <span className="sm-field-label">{label}{required ? ' *' : ''}</span>
      <span className="sm-password-wrap">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={label.toLowerCase().includes('confirm') ? 'new-password' : 'current-password'}
          className="sm-input sm-password-input"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="sm-password-toggle"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

function BrandMark({ logo, small = false }: { logo?: string; small?: boolean }) {
  if (logo) return <img src={logo} alt="School logo" className={small ? 'sm-logo sm-logo-small' : 'sm-logo'} />;
  return (
    <span className={small ? 'sm-logo sm-logo-small sm-logo-fallback' : 'sm-logo sm-logo-fallback'}>
      <Building2 className={small ? 'h-4 w-4' : 'h-5 w-5'} />
    </span>
  );
}

function Header({ name, logo, email, onSignOut }: { name?: string; logo?: string; email?: string; onSignOut?: () => void }) {
  return (
    <header className="sm-header">
      <div className="sm-header-inner">
        <div className="sm-brand">
          <BrandMark logo={logo} small />
          <div>
            <p className="sm-brand-title">GTECH Global School Management</p>
            <p className="sm-brand-subtitle">{name || email || 'Onboarding system'}</p>
          </div>
        </div>
        <div className="sm-header-actions">
          <Link to="/" className="sm-btn-ghost"><ArrowLeft className="h-3.5 w-3.5" /> Gtech home</Link>
          {onSignOut && <button type="button" onClick={onSignOut} className="sm-btn-ghost">Sign out</button>}
        </div>
      </div>
    </header>
  );
}

export default function SchoolManagement() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [mode, setMode] = useState<Mode>('signup');
  const [form, setForm] = useState({ contactName: '', schoolName: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [logo, setLogo] = useState('');
  const [logoName, setLogoName] = useState('');
  const [session, setSession] = useState<any>(null);
  const [welcome, setWelcome] = useState<'signup' | 'signin' | null>(null);
  const [interest, setInterest] = useState<Interest>('none');
  const [videoFinished, setVideoFinished] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(emptyProfile);
  const [site, setSite] = useState(emptySite);
  const [agreement, setAgreement] = useState<any>(null);
  const [integration, setIntegration] = useState<any>(null);
  const [accept, setAccept] = useState({ legalName: '', position: '', confirmed: false });
  const [authChecking, setAuthChecking] = useState(Boolean(getClientToken()));
  const [classes, setClasses] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [className, setClassName] = useState('');
  const [arm, setArm] = useState('');
  const [level, setLevel] = useState('');
  const [headTeacherName, setHeadTeacherName] = useState('');
  const [headTeacherEmail, setHeadTeacherEmail] = useState('');
  const [subjects, setSubjects] = useState('');

  const loadWorkspace = useCallback(async () => {
    if (!getClientToken()) return;
    const [classData, submissionData, paymentData] = await Promise.all([
      schoolsApi.getClientClasses().catch(() => ({ classes: [] as any[] })),
      schoolsApi.getClientSubmissions().catch(() => ({ submissions: [] as any[] })),
      clientApi.payments().catch(() => ({ payments: [] as any[] })),
    ]);
    setClasses(Array.isArray(classData?.classes) ? classData.classes : []);
    setSubmissions(Array.isArray(submissionData?.submissions) ? submissionData.submissions : []);
    setPayments(Array.isArray(paymentData?.payments) ? paymentData.payments : []);
  }, []);

  const refresh = useCallback(async (showWelcome = false) => {
    const token = getClientToken();
    if (!token) {
      setAuthChecking(false);
      return null;
    }
    try {
      const data = await schoolMe();
      setSession(data);
      void loadWorkspace();
      setWelcome(showWelcome ? 'signin' : null);
      const next = progressFor(data);
      setStep(next);
      const profileDoc = (data.onboarding || []).find((d: any) => d.section === 'school_profile');
      const siteDoc = (data.onboarding || []).find((d: any) => d.section === 'site_request');
      setProfile((current) => ({
        ...current,
        schoolName: data.client?.schoolName || current.schoolName,
        contactName: data.client?.contactName || current.contactName,
        logo: data.client?.logo || current.logo,
        ...(profileDoc?.data || {}),
      }));
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
  }, [loadWorkspace]);

  useEffect(() => {
    getPublicConfig().then(setConfig).catch(() => setConfig({} as PublicConfig));
  }, []);

  useEffect(() => {
    if (!config) return;
    const onboardingVideo = config.onboardingVideo;
    setVideoFinished(!onboardingVideo?.landscapeUrl && !onboardingVideo?.portraitUrl);
  }, [config]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    const authError = params.get('authError');
    let showWelcome = false;
    if (authError) setError(authError);
    if (auth) {
      setClientToken(auth);
      window.history.replaceState({}, '', window.location.pathname);
      showWelcome = true;
    } else if (getClientToken()) {
      showWelcome = true;
    }
    refresh(showWelcome);
  }, [refresh]);

  useEffect(() => {
    if (step === 2 && !agreement) loadAgreement();
  }, [step, agreement]);

  useEffect(() => {
    if (step === 3 && !integration) {
      clientApi.integration().then(setIntegration).catch(() => {});
    }
  }, [step, integration]);

  async function readLogoFile(file?: File) {
    if (!file) return '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      throw new Error('Choose a PNG, JPG or WEBP image for your school logo.');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('School logo must be 2MB or smaller.');
    }
    return fileToDataUrl(file);
  }

  async function handleLogo(file?: File) {
    if (!file) return;
    setError('');
    try {
      setLogo(await readLogoFile(file));
      setLogoName(file.name);
    } catch (err: any) {
      setError(err.message || 'Could not read the selected logo.');
    }
  }

  async function handleProfileLogo(file?: File) {
    if (!file) return;
    setError('');
    try {
      const data = await readLogoFile(file);
      setProfile((current) => ({ ...current, logo: data, schoolName: current.schoolName || file.name.replace(/\.[^.]+$/, '') }));
    } catch (err: any) {
      setError(err.message || 'Could not read the selected logo.');
    }
  }

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
          logo,
        })
        : await schoolLogin(form.email, form.password);
      setClientToken(data.token);
      setSession(data);
      setWelcome(mode);
      setInterest('none');
      const profileDoc = (data.onboarding || []).find((d: any) => d.section === 'school_profile');
      setProfile((current) => ({
        ...current,
        schoolName: data.client?.schoolName || form.schoolName,
        contactName: data.client?.contactName || form.contactName,
        logo: data.client?.logo || logo,
        ...(profileDoc?.data || {}),
      }));
      setStep(progressFor(data));
      setForm({ contactName: '', schoolName: '', email: '', password: '', confirmPassword: '', phone: '' });
      setLogo('');
      setLogoName('');
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

  async function submitAgreement(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await acceptSchoolAgreement(accept);
      await loadWorkspace();
      const data = await refresh();
      setStep(progressFor(data || session));
    } catch (err: any) {
      setError(err.message || 'Could not accept agreement.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm('Delete this school account and all submitted school data? This cannot be undone.')) return;
    setBusy(true);
    setError('');
    try {
      await schoolsApi.deleteAccount();
      clearClientToken();
      signOut();
    } catch (err: any) {
      setError(err.message || 'Could not delete the school account.');
    } finally {
      setBusy(false);
    }
  }

  async function createClass(event: React.FormEvent) {
    event.preventDefault();
    if (!className.trim() || !arm.trim()) {
      setError('Class name and arm are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await schoolsApi.createClass({
        name: className.trim(),
        arm: arm.trim(),
        level: level.trim(),
        headTeacherName: headTeacherName.trim(),
        headTeacherEmail: headTeacherEmail.trim(),
        subjects,
      });
      setClassName('');
      setArm('');
      setLevel('');
      setHeadTeacherName('');
      setHeadTeacherEmail('');
      setSubjects('');
      await loadWorkspace();
    } catch (err: any) {
      setError(err.message || 'Could not create the class.');
    } finally {
      setBusy(false);
    }
  }

  async function regenerateLink(id: string) {
    setBusy(true);
    setError('');
    try {
      await schoolsApi.createClassLink(id);
      await loadWorkspace();
    } catch (err: any) {
      setError(err.message || 'Could not regenerate the invite link.');
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite(url?: string) {
    if (!url) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser.');
      await navigator.clipboard.writeText(url);
    } catch (err: any) {
      setError(err.message || 'Could not copy the invite link.');
    }
  }

  async function downloadPaymentReceipt(payment: any) {
    setError('');
    try {
      await schoolsApi.downloadReceipt(payment.id || payment.reference, `receipt-${payment.reference || payment.id}.pdf`);
    } catch (err: any) {
      setError(err.message || 'Could not download the receipt.');
    }
  }

  function signOut() {
    clearClientToken();
    setSession(null);
    setWelcome(null);
    setInterest('none');
    setVideoFinished(false);
    setStep(0);
    setError('');
    setClasses([]);
    setSubmissions([]);
    setPayments([]);
    setClassName('');
    setArm('');
    setLevel('');
    setHeadTeacherName('');
    setHeadTeacherEmail('');
    setSubjects('');
  }

  function replayDemo() {
    setInterest('none');
    setVideoFinished(false);
    setVideoKey((current) => current + 1);
  }

  if (authChecking) {
    return (
      <div className="sm-root sm-loading">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  const onboardingVideo = config?.onboardingVideo;
  const landscapeUrl = onboardingVideo?.landscapeUrl || '';
  const portraitUrl = onboardingVideo?.portraitUrl || '';
  const downloads = onboardingVideo?.downloads || [];

  if (!session) {
    return (
      <div className="sm-root">
        <Header />
        <main className="sm-shell">
          {interest === 'not' ? (
            <section className="sm-card sm-center sm-not-interested">
              <span className="sm-success-icon"><CheckCircle2 className="h-7 w-7" /></span>
              <h1 className="sm-title">Thank you for watching.</h1>
              <p className="sm-lead">
                We appreciate your interest in learning about GTECH Global School Management. You can
                return any time to watch the demo again and decide if you would like to proceed.
              </p>
              <button type="button" onClick={replayDemo} className="sm-btn-outline"><PlayCircle className="h-4 w-4" /> Watch again</button>
            </section>
          ) : (
            <>
              <section className="sm-hero">
                <div>
                  <span className="sm-eyebrow"><Sparkles className="h-3.5 w-3.5" /> School Management Onboarding</span>
                  <h1 className="sm-title">
                    Welcome to GTECH Global School Management. Glad to have you here.
                  </h1>
                  <p className="sm-lead">
                    We guide you step by step through your school’s customized management platform,
                    from agreement and branding to setup, payments and handover.
                  </p>
                  <div className="sm-hero-grid">
                    {[
                      { icon: Building2, title: 'Your school, your identity', text: 'Upload your logo and details so every document is customized.' },
                      { icon: FileText, title: 'Clear agreement', text: 'Review and accept a school-specific development agreement.' },
                      { icon: ShieldCheck, title: 'Guided setup', text: 'Follow a simple onboarding checklist from start to finish.' },
                    ].map((item) => (
                      <div key={item.title} className="sm-card-soft">
                        <item.icon className="h-5 w-5" />
                        <p className="sm-card-title">{item.title}</p>
                        <p className="sm-small">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="sm-card sm-video-card">
                <div className="sm-section-heading">
                  <div>
                    <span className="sm-eyebrow sm-eyebrow-blue"><Video className="h-3.5 w-3.5" /> Short overview</span>
                    <h2 className="sm-section-title">{onboardingVideo?.title || 'GTECH Global School Management demo'}</h2>
                    <p className="sm-muted">
                      {onboardingVideo?.description || 'Please watch our short demo of what we will be building.'}
                    </p>
                  </div>
                  <span className="sm-private-chip"><Lock className="h-3.5 w-3.5" /> Private hosted video</span>
                </div>

                <div className={portraitUrl ? 'sm-video-grid' : ''}>
                  <div className="sm-video-panel">
                    {landscapeUrl ? (
                      <video
                        key={`landscape-${videoKey}`}
                        className="sm-video"
                        controls
                        playsInline
                        preload="metadata"
                        poster={onboardingVideo?.posterUrl || undefined}
                        onEnded={() => setVideoFinished(true)}
                      >
                        <source src={landscapeUrl} type="video/mp4" />
                      </video>
                    ) : (
                      <div className="sm-video-placeholder">
                        <PlayCircle className="h-10 w-10" />
                        <p>Landscape demo video will appear here.</p>
                      </div>
                    )}
                    <p className="sm-video-caption">Landscape overview</p>
                  </div>
                  {portraitUrl && (
                    <div className="sm-video-panel sm-video-panel-portrait">
                      <video
                        key={`portrait-${videoKey}`}
                        className="sm-video sm-video-short"
                        controls
                        playsInline
                        preload="metadata"
                        poster={onboardingVideo?.posterUrl || undefined}
                        onEnded={() => setVideoFinished(true)}
                      >
                        <source src={portraitUrl} type="video/mp4" />
                      </video>
                      <p className="sm-video-caption">Portrait shorts view</p>
                    </div>
                  )}
                </div>

                {downloads.length > 0 && (
                  <div className="sm-downloads">
                    <span className="sm-small sm-semibold">Download demo</span>
                    <div className="sm-download-buttons">
                      {downloads.map((item, index) => (
                        <a key={`${item.url}-${index}`} href={item.url} download className="sm-download-btn" target="_blank" rel="noreferrer">
                          <Download className="h-3.5 w-3.5" /> {item.label || item.quality || `Quality ${index + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {videoFinished ? (
                  <div className="sm-interest">
                    <div>
                      <p className="sm-semibold">Would you like to continue with onboarding?</p>
                      <p className="sm-small">Choose an option after watching the demo.</p>
                    </div>
                    <div className="sm-interest-actions">
                      <button type="button" onClick={() => { setInterest('interested'); setMode('signup'); setError(''); }} className="sm-btn">
                        I am interested <ArrowRight className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setInterest('not')} className="sm-btn-outline">
                        I am not interested
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="sm-video-note"><PlayCircle className="h-4 w-4" /> Watch the video to continue.</p>
                )}
              </section>

              {interest === 'interested' && (
                <section className="sm-card sm-auth">
                  <div className="sm-section-heading">
                    <div>
                      <span className="sm-eyebrow sm-eyebrow-blue">Get started</span>
                      <h2 className="sm-section-title">Create your school account</h2>
                      <p className="sm-muted">Your logo and school name will be used on your customized agreement.</p>
                    </div>
                  </div>

                  <div className="sm-tabs">
                    {(['signup', 'signin'] as Mode[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => { setMode(item); setError(''); }}
                        className={mode === item ? 'sm-tab sm-tab-active' : 'sm-tab'}
                      >
                        {item === 'signup' ? 'Create account' : 'Sign in'}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={submitAuth} className="sm-form-grid">
                    {mode === 'signup' && (
                      <>
                        <Field label="Your full name" value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} placeholder="Administrator name" required />
                        <Field label="School name" value={form.schoolName} onChange={(v) => setForm({ ...form, schoolName: v })} placeholder="Greatpath Academy" required />
                        <Field label="Phone number (WhatsApp preferred)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+234 801 234 5678" required />
                        <div className="sm-field sm-field-wide">
                          <span className="sm-field-label">School logo *</span>
                          <label className="sm-logo-upload">
                            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleLogo(event.target.files?.[0])} />
                            <BrandMark logo={logo} small />
                            <span>
                              <span className="sm-semibold">{logoName || 'Upload school logo'}</span>
                              <span className="sm-small">PNG, JPG or WEBP · Max 2MB</span>
                            </span>
                            <UploadCloud className="h-4 w-4" />
                          </label>
                        </div>
                      </>
                    )}
                    <Field label="Email address" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="admin@school.edu.ng" required />
                    <PasswordField label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="At least 8 characters" required />
                    {mode === 'signup' && <PasswordField label="Confirm password" value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} placeholder="Re-enter password" required />}
                    {error && <p className="sm-error sm-field-wide">{error}</p>}
                    <div className="sm-field-wide sm-form-actions">
                      <button type="submit" disabled={busy} className="sm-btn">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        {mode === 'signup' ? 'Create account and continue' : 'Sign in to dashboard'}
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    );
  }

  if (welcome) {
    const contactName = session.client?.contactName || session.client?.email || 'there';
    const schoolName = session.client?.schoolName || 'your school';
    return (
      <div className="sm-root">
        <Header name={session.client?.schoolName} logo={session.client?.logo} email={session.client?.email} onSignOut={signOut} />
        <main className="sm-shell sm-dashboard">
          <section className="sm-card sm-dashboard-hero">
            <div className="sm-dashboard-brand">
              <BrandMark logo={session.client?.logo} />
              <div>
                <span className="sm-eyebrow sm-eyebrow-blue">Welcome</span>
                <h1 className="sm-section-title">
                  Welcome {contactName} to GTECH Global School Management Onboarding System.
                </h1>
                <p className="sm-lead">
                  Glad to have you, {schoolName}. We will guide you step by step. Please go through the
                  terms of service agreement when you continue.
                </p>
              </div>
            </div>
            <div className="sm-dashboard-card">
              <span className="sm-small">Your onboarding status</span>
              <p className="sm-dashboard-progress">{progressFor(session)} of 3</p>
              <p className="sm-small">School profile, website request and agreement.</p>
            </div>
          </section>

          <section className="sm-grid sm-grid-three">
            {[
              { icon: Building2, title: 'School profile', text: 'Confirm your school name, logo, address, vision and mission.' },
              { icon: GraduationCap, title: 'Platform request', text: 'Tell us about pages, branding and delivery preferences.' },
              { icon: FileText, title: 'TOS agreement', text: 'Review and accept your customized development agreement.' },
            ].map((item, index) => (
              <div key={item.title} className="sm-card-soft">
                <span className="sm-step-number">{index + 1}</span>
                <item.icon className="h-5 w-5" />
                <p className="sm-card-title">{item.title}</p>
                <p className="sm-small">{item.text}</p>
              </div>
            ))}
          </section>

          {error && <p className="sm-error">{error}</p>}
          <button type="button" onClick={() => { setWelcome(null); setStep(progressFor(session)); }} className="sm-btn sm-btn-lg">
            Continue to onboarding <ArrowRight className="h-4 w-4" />
          </button>
        </main>
        <ChatBox projectId={session?.project?.id || session?.client?.projectId || session?.projectId} />
      </div>
    );
  }

  const steps = ['School profile', 'Website request', 'Agreement', 'Setup / complete'];

  return (
    <div className="sm-root">
      <Header name={session.client?.schoolName} logo={session.client?.logo} email={session.client?.email} onSignOut={signOut} />
      <main className="sm-shell">
        <div className="sm-steps">
          {steps.map((label, index) => (
            <div key={label} className={index === step ? 'sm-step sm-step-active' : index < step ? 'sm-step sm-step-done' : 'sm-step'}>
              <span className="sm-step-dot">{index < step ? <Check className="h-4 w-4" /> : index + 1}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {error && <p className="sm-error">{error}</p>}

        {step === 0 && (
          <form onSubmit={saveProfile} className="sm-card sm-form-card">
            <div className="sm-section-heading">
              <div>
                <span className="sm-eyebrow sm-eyebrow-blue">Step 1</span>
                <h2 className="sm-section-title">School profile</h2>
                <p className="sm-muted">These details customize your agreement and platform.</p>
              </div>
              <Building2 className="h-6 w-6" />
            </div>
            <div className="sm-form-grid">
              <div className="sm-field sm-field-wide">
                <span className="sm-field-label">School logo</span>
                <label className="sm-logo-upload">
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleProfileLogo(event.target.files?.[0])} />
                  <BrandMark logo={profile.logo || session.client?.logo} small />
                  <span>
                    <span className="sm-semibold">{profile.logo || session.client?.logo ? 'School logo selected' : 'Upload school logo'}</span>
                    <span className="sm-small">PNG, JPG or WEBP · Max 2MB</span>
                  </span>
                  <UploadCloud className="h-4 w-4" />
                </label>
              </div>
              <Field label="School name" value={profile.schoolName} onChange={(v) => setProfile({ ...profile, schoolName: v })} required />
              <Field label="Administrator name" value={profile.contactName} onChange={(v) => setProfile({ ...profile, contactName: v })} required />
              <Field label="School email" type="email" value={profile.schoolEmail} onChange={(v) => setProfile({ ...profile, schoolEmail: v })} />
              <Field label="School phone" value={profile.schoolPhone} onChange={(v) => setProfile({ ...profile, schoolPhone: v })} />
              <Field label="Address" value={profile.address} onChange={(v) => setProfile({ ...profile, address: v })} />
              <Field label="State" value={profile.state} onChange={(v) => setProfile({ ...profile, state: v })} />
              <Field label="LGA" value={profile.lga} onChange={(v) => setProfile({ ...profile, lga: v })} />
              <Field label="Student count" value={profile.studentCount} onChange={(v) => setProfile({ ...profile, studentCount: v })} />
              <Field label="Teacher count" value={profile.teacherCount} onChange={(v) => setProfile({ ...profile, teacherCount: v })} />
              <Field label="Proprietor welcome remark" value={profile.proprietorRemark} onChange={(v) => setProfile({ ...profile, proprietorRemark: v })} placeholder="Optional welcome message for your school community" textarea rows={3} />
              <Field label="School vision" value={profile.vision} onChange={(v) => setProfile({ ...profile, vision: v })} textarea rows={3} />
              <Field label="School mission" value={profile.mission} onChange={(v) => setProfile({ ...profile, mission: v })} textarea rows={3} />
              <Field label="Main challenge" value={profile.challenges} onChange={(v) => setProfile({ ...profile, challenges: v })} placeholder="What should the platform solve first?" textarea rows={3} />
            </div>
            <div className="sm-form-actions sm-actions-end">
              <button type="submit" disabled={busy} className="sm-btn">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} Save and continue
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={saveSite} className="sm-card sm-form-card">
            <div className="sm-section-heading">
              <div>
                <span className="sm-eyebrow sm-eyebrow-blue">Step 2</span>
                <h2 className="sm-section-title">Website & customization request</h2>
                <p className="sm-muted">Tell us how your school platform should look and work.</p>
              </div>
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="sm-form-grid">
              <Field label="Platform type" value={site.siteType} onChange={(v) => setSite({ ...site, siteType: v })} />
              <Field label="Brand colors" value={site.brandColors} onChange={(v) => setSite({ ...site, brandColors: v })} placeholder="Green and gold" />
              <Field label="Preferred timeline" value={site.timeline} onChange={(v) => setSite({ ...site, timeline: v })} placeholder="Before next term" />
              <Field label="PIN delivery webhook" value={site.deliveryWebhookUrl} onChange={(v) => setSite({ ...site, deliveryWebhookUrl: v })} placeholder="https://school.example.com/api/result-pins/gtech-delivery" />
              <div className="sm-field sm-field-wide">
                <span className="sm-field-label">Requested pages</span>
                <div className="sm-chips">
                  {['Home', 'About', 'Results', 'News', 'Events', 'Staff', 'Contact', 'Parent portal'].map((page) => {
                    const active = site.pages.includes(page);
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setSite({ ...site, pages: active ? site.pages.filter((p) => p !== page) : [...site.pages, page] })}
                        className={active ? 'sm-chip sm-chip-active' : 'sm-chip'}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="Additional notes" value={site.notes} onChange={(v) => setSite({ ...site, notes: v })} placeholder="Any modules, pages or changes you want..." textarea rows={4} />
            </div>
            <div className="sm-form-actions sm-actions-between">
              <button type="button" onClick={() => setStep(0)} className="sm-btn-outline"><ChevronLeft className="h-4 w-4" /> Back</button>
              <button type="submit" disabled={busy} className="sm-btn">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} Save and continue
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitAgreement} className="sm-card sm-form-card">
            <div className="sm-section-heading">
              <div>
                <span className="sm-eyebrow sm-eyebrow-blue">Step 3</span>
                <h2 className="sm-section-title">School development agreement</h2>
                <p className="sm-muted">Please go through the agreement before accepting.</p>
              </div>
              <FileText className="h-6 w-6" />
            </div>
            <div className="sm-agreement">
              <div className="sm-agreement-sheet a4-sheet">
                <div className="sm-agreement-brand">
                  <BrandMark logo={profile.logo || session.client?.logo} small />
                  <div>
                    <p className="sm-semibold">{profile.schoolName || session.client?.schoolName}</p>
                    <p className="sm-small">School-specific development agreement</p>
                  </div>
                </div>
                <h3 className="sm-agreement-title">{agreement?.reference || 'GTECH Global School Management Agreement'}</h3>
                <p className="sm-agreement-text">{agreement?.content || 'Gtech Global will build, configure and deploy your customized school platform.'}</p>
                <div className="sm-agreement-list">
                  {(agreement?.scopeIncluded || []).map((item: string) => <p key={item}>• {item}</p>)}
                </div>
                <p className="sm-agreement-text">{agreement?.dataOwnership}</p>
              </div>
              <div className="sm-form-actions sm-actions-end no-print">
                <button type="button" onClick={() => window.print()} className="sm-btn-outline no-print"><FileText className="h-4 w-4" /> Print agreement</button>
              </div>
            </div>
            <div className="sm-form-grid">
              <Field label="Legal name" value={accept.legalName} onChange={(v) => setAccept({ ...accept, legalName: v })} required />
              <Field label="Position" value={accept.position} onChange={(v) => setAccept({ ...accept, position: v })} required />
            </div>
            <label className="sm-checkbox">
              <input type="checkbox" checked={accept.confirmed} onChange={(event) => setAccept({ ...accept, confirmed: event.target.checked })} />
              I confirm that I am authorized to accept this agreement on behalf of the school.
            </label>
            <div className="sm-form-actions sm-actions-between">
              <button type="button" onClick={deleteAccount} disabled={busy} className="sm-btn-ghost">Cancel and delete account</button>
              <button type="submit" disabled={busy} className="sm-btn">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Accept agreement
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <>
            <section className="sm-card sm-complete">
              <span className="sm-success-icon"><CheckCircle2 className="h-7 w-7" /></span>
              <h2 className="sm-section-title">School Management setup complete</h2>
              <p className="sm-lead">
                Your school profile, website request and agreement have been submitted. Gtech Global will now
                build and deploy your customized school platform.
              </p>
              <div className="sm-grid sm-grid-three sm-credential-grid">
                {[
                  { label: 'School ID', value: integration?.schoolId || session.credentials?.schoolId || session.client?.marketplaceIntegrationId || '' },
                  { label: 'Marketplace API key', value: integration?.apiKey || session.credentials?.apiKey || '' },
                  { label: 'Delivery secret', value: integration?.deliverySecret || session.credentials?.deliverySecret || '' },
                ].map((item) => (
                  <div key={item.label} className="sm-credential">
                    <p className="sm-small">{item.label}</p>
                    <p className="sm-code">{item.value || 'Provisioned'}</p>
                  </div>
                ))}
              </div>
              <p className="sm-small">
                Copy these values into the school backend as GTECH_SCHOOL_ID, GTECH_MARKETPLACE_API_KEY and GTECH_DELIVERY_SECRET.
              </p>
              <div className="sm-form-actions sm-actions-center">
                <Link to="/client-portal" className="sm-btn"><UserRound className="h-4 w-4" /> Open client portal</Link>
                <button onClick={() => refresh()} className="sm-btn-outline"><ShieldCheck className="h-4 w-4" /> Refresh status</button>
              </div>
            </section>

            <section className="sm-card sm-form-card a4-sheet">
              <div className="sm-section-heading">
                <div>
                  <span className="sm-eyebrow sm-eyebrow-blue"><Video className="h-3.5 w-3.5" /> Guideline videos</span>
                  <h2 className="sm-section-title">Setup guides</h2>
                  <p className="sm-muted">Short guides to help your team complete the school setup.</p>
                </div>
              </div>
              <div className="sm-grid sm-grid-three">
                {(config?.guidelineVideos || []).map((video) => {
                  const embedUrl = youtubeEmbedUrl(video.url || '');
                  return (
                    <div key={video.id} className="sm-card-soft">
                      <p className="sm-card-title">{video.title}</p>
                      {video.description && <p className="sm-small">{video.description}</p>}
                      {embedUrl ? (
                        <iframe
                          className="sm-video"
                          style={{ height: 220 }}
                          src={embedUrl}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : video.type === 'file' && video.url ? (
                        <video className="sm-video" controls playsInline preload="metadata" poster={video.posterUrl || undefined}>
                          <source src={video.url} type="video/mp4" />
                        </video>
                      ) : null}
                      {video.url && <a href={video.url} target="_blank" rel="noreferrer" className="sm-btn-outline">Open guideline</a>}
                    </div>
                  );
                })}
              </div>
              {!(config?.guidelineVideos || []).length && <p className="sm-small">No guideline videos have been added yet.</p>}
            </section>

            <section className="sm-card sm-form-card a4-sheet">
              <div className="sm-section-heading">
                <div>
                  <span className="sm-eyebrow sm-eyebrow-blue"><GraduationCap className="h-3.5 w-3.5" /> Class management</span>
                  <h2 className="sm-section-title">Create classes and invite teachers</h2>
                  <p className="sm-muted">Each class gets its own invite link for the head teacher.</p>
                </div>
              </div>
              <form onSubmit={createClass} className="sm-form-grid no-print">
                <Field label="Class name" value={className} onChange={setClassName} placeholder="Primary 1" required />
                <Field label="Arm" value={arm} onChange={setArm} placeholder="A" required />
                <Field label="Level" value={level} onChange={setLevel} placeholder="Primary" />
                <Field label="Head teacher name" value={headTeacherName} onChange={setHeadTeacherName} placeholder="Teacher name" />
                <Field label="Head teacher email" type="email" value={headTeacherEmail} onChange={setHeadTeacherEmail} placeholder="teacher@school.edu.ng" />
                <Field label="Subjects" value={subjects} onChange={setSubjects} placeholder="English, Maths, Science" />
                <div className="sm-field-wide sm-form-actions sm-actions-end">
                  <button type="submit" disabled={busy} className="sm-btn">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create class and link
                  </button>
                </div>
              </form>
              <div className="sm-grid sm-grid-three" style={{ marginTop: 24 }}>
                {classes.map((item) => (
                  <section key={item.id} className="sm-credential">
                    <p className="sm-semibold">{item.name}{item.arm ? ` · ${item.arm}` : ''}</p>
                    <p className="sm-small">Head teacher: {item.headTeacherName || 'Not assigned'}{item.headTeacherEmail ? ` · ${item.headTeacherEmail}` : ''}</p>
                    {item.level && <p className="sm-small">Level: {item.level}</p>}
                    {Array.isArray(item.subjects) && item.subjects.length > 0 && <p className="sm-small">Subjects: {item.subjects.join(', ')}</p>}
                    <p className="sm-code">{item.inviteUrl || 'Invite link pending'}</p>
                    <div className="sm-form-actions no-print">
                      <button type="button" onClick={() => copyInvite(item.inviteUrl)} className="sm-btn-outline"><Copy className="h-4 w-4" /> Copy link</button>
                      <button type="button" onClick={() => regenerateLink(item.id)} disabled={busy} className="sm-btn-ghost"><RefreshCw className="h-4 w-4" /> Regenerate link</button>
                    </div>
                  </section>
                ))}
              </div>
              {!classes.length && <p className="sm-small">No classes have been created yet.</p>}
            </section>

            <section className="sm-card sm-form-card a4-sheet">
              <div className="sm-section-heading">
                <div>
                  <span className="sm-eyebrow sm-eyebrow-blue"><UserRound className="h-3.5 w-3.5" /> Parent/student submissions</span>
                  <h2 className="sm-section-title">Submitted class information</h2>
                  <p className="sm-muted">Head teacher and student details received through your invite links.</p>
                </div>
                <button type="button" onClick={() => window.print()} className="sm-btn-outline no-print"><FileText className="h-4 w-4" /> Print form</button>
              </div>
              <div className="sm-grid">
                {submissions.map((submission) => (
                  <section key={submission.id} className="sm-card-soft">
                    <p className="sm-semibold">
                      {submission.schoolName || profile.schoolName || session.client?.schoolName || 'School'} · {submission.className}{submission.arm ? ` ${submission.arm}` : ''}
                    </p>
                    <p className="sm-small">
                      Head teacher: {submission.headTeacher?.fullName || '—'}{submission.headTeacher?.email ? ` · ${submission.headTeacher.email}` : ''}
                    </p>
                    <div style={{ overflowX: 'auto', marginTop: 12 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                        <thead>
                          <tr>
                            {['Student', 'Class', 'Arm', 'Gender', 'Date of birth', 'Parent', 'Relationship', 'Parent phone', 'Parent email', 'Address'].map((heading) => (
                              <th key={heading} style={tableCellStyle}>{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(submission.students || []).map((student: any, index: number) => (
                            <tr key={`${submission.id}-${student.studentName || index}`}>
                              <td style={tableCellStyle}>{student.studentName || '—'}</td>
                              <td style={tableCellStyle}>{student.className || submission.className || '—'}</td>
                              <td style={tableCellStyle}>{student.arm || '—'}</td>
                              <td style={tableCellStyle}>{student.gender || '—'}</td>
                              <td style={tableCellStyle}>{student.dateOfBirth || '—'}</td>
                              <td style={tableCellStyle}>{student.parentName || '—'}</td>
                              <td style={tableCellStyle}>{student.relationship || '—'}</td>
                              <td style={tableCellStyle}>{student.parentPhone || '—'}</td>
                              <td style={tableCellStyle}>{student.parentEmail || '—'}</td>
                              <td style={tableCellStyle}>{student.address || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
              {!submissions.length && <p className="sm-small">No submissions have been received yet.</p>}
            </section>

            <section className="sm-card sm-form-card a4-sheet">
              <div className="sm-section-heading">
                <div>
                  <span className="sm-eyebrow sm-eyebrow-blue"><FileText className="h-3.5 w-3.5" /> Payments/receipts</span>
                  <h2 className="sm-section-title">Payment history</h2>
                  <p className="sm-muted">Download receipts for completed school payments.</p>
                </div>
              </div>
              <div className="sm-grid sm-grid-three">
                {payments.map((payment) => {
                  const paid = ['success', 'paid', 'completed'].includes(String(payment.status || '').toLowerCase());
                  return (
                    <section key={payment.id || payment.reference} className="sm-credential">
                      <p className="sm-semibold">{payment.description || payment.type || 'Payment'}</p>
                      <p className="sm-small">{payment.reference || 'No reference'}</p>
                      <p className="sm-code">₦{Number(payment.amount || 0).toLocaleString('en-NG')}</p>
                      <p className="sm-small">Status: {payment.status || '—'}</p>
                      {paid && (
                        <div className="sm-form-actions no-print">
                          <button type="button" onClick={() => downloadPaymentReceipt(payment)} className="sm-btn-outline"><Download className="h-4 w-4" /> Download receipt</button>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
              {!payments.length && <p className="sm-small">No payments have been recorded yet.</p>}
            </section>
          </>
        )}
      </main>
      <ChatBox projectId={session?.project?.id || session?.client?.projectId || session?.projectId} />
    </div>
  );
}

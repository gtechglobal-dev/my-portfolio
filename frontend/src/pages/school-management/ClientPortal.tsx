import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, CreditCard, KeyRound, MessageSquare,
  FileText, AlertCircle, RefreshCw, LogOut, CheckCircle2, ExternalLink, Send, Upload,
  Video, Users, Copy, Download,
} from 'lucide-react';
import ChatBox from '../../components/ChatBox';
import {
  clientApi, clientLogin, clearClientToken, dateLabel, downloadClientDocument, fileToDataUrl,
  getClientToken, getPublicConfig, money, setClientToken, stageLabel, verifySchoolPayment,
} from '../../lib/schools';
import { schoolsApi } from '../../lib/schools';
import { OnboardingForms } from './OnboardingPortal';

const configApi = schoolsApi as typeof schoolsApi & { getPublicConfig?: typeof getPublicConfig };

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'guidelines', label: 'Guidelines', icon: Video },
  { id: 'classes', label: 'Classes', icon: Users },
  { id: 'submissions', label: 'Submissions', icon: ClipboardList },
  { id: 'onboarding', label: 'Onboarding', icon: ClipboardList },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'marketplace', label: 'Exam PINs', icon: KeyRound },
  { id: 'issues', label: 'Issues', icon: AlertCircle },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'documents', label: 'Documents', icon: FileText },
] as const;

const tableCellStyle = { border: '1px solid #dce6f7', padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap' } as const;

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

type Tab = typeof TABS[number]['id'];

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await clientLogin(email, password);
      setClientToken(data.token);
      onLogin(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 pt-20">
      <form onSubmit={submit} className="card p-6 w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6 text-violet-400" />
          </div>
          <h1 className="text-xl font-bold">Client Portal</h1>
          <p className="text-xs text-muted mt-1">Sign in with the credentials provided after project creation.</p>
        </div>
        <input required type="email" placeholder="Email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input required type="password" placeholder="Password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button disabled={loading} className="btn btn-primary w-full">{loading ? 'Signing in...' : 'Sign in'}</button>
        <div className="text-center"><Link to="/school-management" className="text-xs text-muted hover:text-white">Back to school systems</Link></div>
      </form>
    </div>
  );
}

export default function ClientPortal() {
  const [token, setToken] = useState<string | undefined>(getClientToken());
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [issue, setIssue] = useState({ title: '', description: '', module: '', severity: 'medium' });
  const [message, setMessage] = useState('');
  const [approval, setApproval] = useState({ name: '', note: '' });
  const [config, setConfig] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [receiptPayments, setReceiptPayments] = useState<any[]>([]);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [overview, messages, documents] = await Promise.all([
        clientApi.overview(), clientApi.messages(), clientApi.documents(),
      ]);
      setData({ ...overview, messages: messages.messages || [], documents: documents.documents || [] });
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes('authentication') || err.message.includes('Authentication')) {
        clearClientToken();
        setToken(undefined);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (configApi.getPublicConfig ? configApi.getPublicConfig() : getPublicConfig()).then(setConfig).catch(() => setConfig({}));
  }, []);

  async function loadWorkspace() {
    if (!token) return;
    const [classData, submissionData, paymentData] = await Promise.all([
      schoolsApi.getClientClasses().catch(() => ({ classes: [] as any[] })),
      schoolsApi.getClientSubmissions().catch(() => ({ submissions: [] as any[] })),
      clientApi.payments().catch(() => ({ payments: [] as any[] })),
    ]);
    setClasses(Array.isArray(classData?.classes) ? classData.classes : []);
    setSubmissions(Array.isArray(submissionData?.submissions) ? submissionData.submissions : []);
    setReceiptPayments(Array.isArray(paymentData?.payments) ? paymentData.payments : []);
  }

  useEffect(() => { load(); }, [token]);
  useEffect(() => { loadWorkspace(); }, [token]);

  useEffect(() => {
    const reference = searchParams.get('payment');
    if (!token || !reference) return;
    verifySchoolPayment(reference).then((result) => {
      setNotice(result.verified ? `Payment ${reference} verified. Receipt is available in Documents.` : `Payment ${reference} is still pending.`);
      load();
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      setSearchParams(next, { replace: true });
    }).catch((err) => setError(err.message));
  }, [token, searchParams]);

  async function run(fn: () => Promise<any>, success: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await fn();
      setNotice(success);
      await load();
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite(url?: string) {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Invite link copied.');
    } catch {
      setError('Could not copy the invite link.');
    }
  }

  async function regenerateClassLink(id: string) {
    const result = await run(() => schoolsApi.createClassLink(id), 'Invite link regenerated.');
    if (result) await loadWorkspace();
  }

  async function downloadPaymentReceipt(payment: any) {
    setError('');
    try {
      await schoolsApi.downloadReceipt(payment.id || payment.reference, `receipt-${payment.reference || payment.id}.pdf`);
    } catch (err: any) {
      setError(err.message || 'Could not download the receipt.');
    }
  }

  function logout() {
    clearClientToken();
    setToken(undefined);
  }

  if (!token) return <Login onLogin={setToken} />;

  const project = data.project;
  const milestones = data.milestones || [];
  const payments = data.payments || [];
  const issues = data.issues || [];
  const documents = data.documents || [];
  const unread = (data.notifications || []).filter((n: any) => !n.read).length;

  return (
    <div className="min-h-screen bg-ink text-[#f5f5f5] py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{data.client?.schoolName || 'Client Portal'}</h1>
            <p className="text-xs text-muted mt-1">
              {project ? `${project.reference} · ${stageLabel(project.stage)} · ${project.progress || 0}% complete` : 'No active project yet'}
              {unread > 0 && <span className="ml-2 text-violet-400">· {unread} unread</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="btn btn-outline !py-2 !px-3 !text-xs"><RefreshCw className="w-3 h-3" /> Refresh</button>
            <button onClick={logout} className="btn btn-outline !py-2 !px-3 !text-xs"><LogOut className="w-3 h-3" /> Sign out</button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
          {TABS.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap ${tab === item.id ? 'bg-violet-500/15 text-violet-300' : 'bg-surface text-muted hover:text-white'}`}>
              <item.icon className="w-3.5 h-3.5" /> {item.label}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 text-xs text-red-400">{error}</div>}
        {notice && <div className="mb-4 flex items-center gap-2 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> {notice}</div>}
        {loading && <p className="text-sm text-muted">Loading portal...</p>}

        {!loading && tab === 'overview' && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="card p-4"><div className="text-[10px] uppercase text-faint mb-1">Project cost</div><div className="text-lg font-bold">{money(project?.cost || 0)}</div></div>
              <div className="card p-4"><div className="text-[10px] uppercase text-faint mb-1">Paid</div><div className="text-lg font-bold text-emerald-400">{money(project?.totalPaid || 0)}</div></div>
              <div className="card p-4"><div className="text-[10px] uppercase text-faint mb-1">Outstanding</div><div className="text-lg font-bold">{money(Math.max(0, (project?.cost || 0) - (project?.totalPaid || 0)))}</div></div>
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3"><h2 className="font-semibold">Project progress</h2><span className="text-xs text-muted">{project?.progress || 0}%</span></div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full bg-violet-500" style={{ width: `${project?.progress || 0}%` }} /></div>
              <div className="grid sm:grid-cols-2 gap-2 mt-5">
                {milestones.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-surface/50 text-xs">
                    <span>{m.title}</span><span className={m.status === 'completed' ? 'text-emerald-400' : 'text-faint'}>{stageLabel(m.status)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="card p-5">
                <h2 className="font-semibold mb-4">Notifications</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(data.notifications || []).map((n: any) => (
                    <button key={n.id} onClick={() => !n.read && run(() => clientApi.readNotification(n.id), '')} className={`w-full text-left p-3 rounded-lg text-xs ${n.read ? 'bg-surface/40' : 'bg-violet-500/10'}`}>
                      <div className="font-medium">{n.title}</div><div className="text-muted mt-1">{n.message}</div><div className="text-faint mt-1">{dateLabel(n.createdAt)}</div>
                    </button>
                  ))}
                  {!data.notifications?.length && <p className="text-sm text-muted">No notifications yet.</p>}
                </div>
              </div>
              <div className="card p-5">
                <h2 className="font-semibold mb-4">Final approval & handover</h2>
                {project?.finalApproval?.approved ? (
                  <p className="text-xs text-emerald-400">Final approval recorded on {dateLabel(project.finalApproval.at)}.</p>
                ) : (
                  <div className="grid gap-2 text-xs">
                    <input className="input" placeholder="Your full name" value={approval.name} onChange={(e) => setApproval({ ...approval, name: e.target.value })} />
                    <textarea className="input" rows={2} placeholder="Note (optional)" value={approval.note} onChange={(e) => setApproval({ ...approval, note: e.target.value })} />
                    <button disabled={busy || !approval.name} onClick={() => run(() => clientApi.finalApproval({ approved: true, ...approval }), 'Final approval submitted.')} className="btn btn-primary !py-2 !text-xs">Approve completed work</button>
                  </div>
                )}
                {data.handover && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    {data.handover.status === 'acknowledged' ? (
                      <p className="text-xs text-emerald-400">Handover acknowledged on {dateLabel(data.handover.acknowledgedAt)}.</p>
                    ) : (
                      <button disabled={busy} onClick={() => run(() => clientApi.acknowledgeHandover(), 'Handover acknowledged.')} className="btn btn-outline !py-2 !text-xs">Acknowledge handover</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && tab === 'guidelines' && (
          <section className="sm-root sm-card sm-form-card a4-sheet" style={{ minHeight: 'auto' }}>
            <div className="sm-section-heading">
              <div>
                <span className="sm-eyebrow sm-eyebrow-blue"><Video className="w-3.5 h-3.5" /> Guidelines</span>
                <h2 className="sm-section-title">Guideline videos</h2>
                <p className="sm-muted">Short guides to help your team use the school workspace.</p>
              </div>
            </div>
            <div className="sm-grid sm-grid-three">
              {(config?.guidelineVideos || []).map((video: any) => {
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
            {!config?.guidelineVideos?.length && <p className="sm-small">No guideline videos have been added yet.</p>}
          </section>
        )}

        {!loading && tab === 'classes' && (
          <section className="sm-root sm-card sm-form-card a4-sheet" style={{ minHeight: 'auto' }}>
            <div className="sm-section-heading">
              <div>
                <span className="sm-eyebrow sm-eyebrow-blue"><Users className="w-3.5 h-3.5" /> Classes</span>
                <h2 className="sm-section-title">Classes</h2>
                <p className="sm-muted">Invite links and head teacher details for each class.</p>
              </div>
            </div>
            <div className="sm-grid sm-grid-three">
              {classes.map((item: any) => (
                <section key={item.id} className="sm-credential">
                  <p className="sm-semibold">{item.name}{item.arm ? ` · ${item.arm}` : ''}</p>
                  {item.headTeacherName && <p className="sm-small">Head teacher: {item.headTeacherName}</p>}
                  <p className="sm-code">{item.inviteUrl || 'Invite link pending'}</p>
                  <div className="sm-form-actions no-print">
                    <button type="button" disabled={!item.inviteUrl || busy} onClick={() => copyInvite(item.inviteUrl)} className="sm-btn-outline"><Copy className="w-3.5 h-3.5" /> Copy link</button>
                    <button type="button" disabled={busy} onClick={() => regenerateClassLink(item.id)} className="sm-btn-ghost"><RefreshCw className="w-3.5 h-3.5" /> Regenerate link</button>
                  </div>
                </section>
              ))}
            </div>
            {!classes.length && <p className="sm-small">No classes have been created yet.</p>}
          </section>
        )}

        {!loading && tab === 'submissions' && (
          <section className="sm-root sm-card sm-form-card a4-sheet" style={{ minHeight: 'auto' }}>
            <div className="sm-section-heading">
              <div>
                <span className="sm-eyebrow sm-eyebrow-blue"><ClipboardList className="w-3.5 h-3.5" /> Submissions</span>
                <h2 className="sm-section-title">Submissions</h2>
                <p className="sm-muted">Student and parent details received through class invite links.</p>
              </div>
              <button type="button" onClick={() => window.print()} className="sm-btn-outline no-print"><FileText className="w-3.5 h-3.5" /> Print form</button>
            </div>
            <div className="sm-grid">
              {submissions.map((submission: any) => (
                <section key={submission.id} className="sm-card-soft">
                  <p className="sm-semibold">{submission.className}{submission.arm ? ` ${submission.arm}` : ''}</p>
                  <p className="sm-small">Head teacher: {submission.headTeacher?.fullName || '—'}{submission.headTeacher?.email ? ` · ${submission.headTeacher.email}` : ''}</p>
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
        )}

        {!loading && tab === 'onboarding' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">Save drafts as you go. Submit each section when complete.</p>
              <Link to="/client-portal/onboarding" className="btn btn-outline !py-2 !px-3 !text-xs">Open full-page form <ExternalLink className="w-3 h-3" /></Link>
            </div>
            <OnboardingForms />
          </div>
        )}

        {!loading && tab === 'payments' && (
          <div className="space-y-5">
            <div className="card p-5">
              <h2 className="font-semibold mb-4">Make a payment</h2>
              <div className="flex flex-wrap gap-3">
                <button disabled={busy} onClick={() => run(() => clientApi.initiatePayment('deposit'), '').then((r) => { if (r?.authorizationUrl) window.location.href = r.authorizationUrl; })} className="btn btn-primary !py-2 !text-xs"><CreditCard className="w-3 h-3" /> Pay initial deposit</button>
                <button disabled={busy} onClick={() => run(() => clientApi.initiatePayment('final'), '').then((r) => { if (r?.authorizationUrl) window.location.href = r.authorizationUrl; })} className="btn btn-outline !py-2 !text-xs"><CreditCard className="w-3 h-3" /> Pay final balance</button>
              </div>
              <p className="text-[11px] text-faint mt-3">Amounts are calculated by the server from your approved project cost. All payments are verified through Paystack.</p>
            </div>
            <div className="card p-5">
              <h2 className="font-semibold mb-4">Payment history</h2>
              <div className="space-y-2">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface/50 text-xs">
                    <div><div className="font-medium">{p.description}</div><div className="text-faint">{p.reference} · {dateLabel(p.createdAt)}</div></div>
                    <div className="text-right"><div>{money(p.amount)}</div><div className={p.status === 'success' ? 'text-emerald-400' : 'text-muted'}>{stageLabel(p.status)}</div></div>
                  </div>
                ))}
                {!payments.length && <p className="text-sm text-muted">No payments recorded yet.</p>}
              </div>
            </div>
            <section className="sm-root sm-card sm-form-card a4-sheet" style={{ minHeight: 'auto' }}>
              <div className="sm-section-heading">
                <div>
                  <span className="sm-eyebrow sm-eyebrow-blue"><FileText className="w-3.5 h-3.5" /> Receipts</span>
                  <h2 className="sm-section-title">Receipts</h2>
                  <p className="sm-muted">Download receipts for successful school payments.</p>
                </div>
              </div>
              <div className="sm-grid sm-grid-three">
                {receiptPayments.map((payment: any) => {
                  const paid = ['success', 'paid', 'completed'].includes(String(payment.status || '').toLowerCase());
                  if (!paid) return null;
                  return (
                    <section key={payment.id || payment.reference} className="sm-credential">
                      <p className="sm-semibold">{payment.description || payment.type || 'Payment'}</p>
                      <p className="sm-small">{payment.reference || 'No reference'}</p>
                      <p className="sm-code">{money(payment.amount)}</p>
                      <p className="sm-small">Status: {payment.status}</p>
                      <div className="sm-form-actions no-print">
                        <button type="button" onClick={() => downloadPaymentReceipt(payment)} className="sm-btn-outline"><Download className="w-3.5 h-3.5" /> Download receipt</button>
                      </div>
                    </section>
                  );
                })}
              </div>
              {!receiptPayments.some((payment: any) => ['success', 'paid', 'completed'].includes(String(payment.status || '').toLowerCase())) && <p className="sm-small">No receipts available yet.</p>}
            </section>
          </div>
        )}

        {!loading && tab === 'marketplace' && (
          <div className="card p-6">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4"><KeyRound className="w-6 h-6 text-violet-400" /></div>
            <h2 className="text-xl font-bold mb-2">Universal exam PINs</h2>
            <p className="text-sm text-muted leading-relaxed mb-5">
              Your deployed school system can buy result-checking PINs from the Gtech Global marketplace. Generate a secure one-time launch link for your school dashboard.
            </p>
            <button disabled={busy} onClick={() => run(() => clientApi.issueLaunchToken(), '').then((r) => { if (r?.marketplaceUrl) copyLink(r.marketplaceUrl); })} className="btn btn-primary !py-2 !text-xs">
              <KeyRound className="w-3 h-3" /> Generate marketplace link
            </button>
            <p className="text-[11px] text-faint mt-3">The link expires in 30 days. PINs remain universal across participating school systems.</p>
          </div>
        )}

        {!loading && tab === 'issues' && (
          <div className="grid lg:grid-cols-2 gap-5">
            <form className="card p-5 space-y-3" onSubmit={async (e) => { e.preventDefault(); const ok = await run(() => clientApi.createIssue(issue), 'Issue submitted.'); if (ok) setIssue({ title: '', description: '', module: '', severity: 'medium' }); }}>
              <h2 className="font-semibold">Report an issue</h2>
              <input required className="input" placeholder="Title" value={issue.title} onChange={(e) => setIssue({ ...issue, title: e.target.value })} />
              <textarea required rows={4} className="input" placeholder="Describe what happened" value={issue.description} onChange={(e) => setIssue({ ...issue, description: e.target.value })} />
              <input className="input" placeholder="Module / page" value={issue.module} onChange={(e) => setIssue({ ...issue, module: e.target.value })} />
              <select className="input" value={issue.severity} onChange={(e) => setIssue({ ...issue, severity: e.target.value })}>
                {['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
              </select>
              <button disabled={busy} className="btn btn-primary !py-2 !text-xs"><Send className="w-3 h-3" /> Submit issue</button>
            </form>
            <div className="card p-5">
              <h2 className="font-semibold mb-4">Your issues</h2>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {issues.map((item: any) => (
                  <div key={item.id} className="p-3 rounded-lg bg-surface/50 text-xs">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium">{item.title}</span><span className="text-faint">{stageLabel(item.status)}</span></div>
                    <p className="text-muted mt-1">{item.description}</p>
                    {item.response && <p className="text-violet-300 mt-2">Response: {item.response}</p>}
                  </div>
                ))}
                {!issues.length && <p className="text-sm text-muted">No issues reported.</p>}
              </div>
            </div>
          </div>
        )}

        {!loading && tab === 'messages' && (
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Messages</h2>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
              {(data.messages || []).map((m: any) => (
                <div key={m.id} className={`p-3 rounded-lg text-xs max-w-lg ${m.senderRole === 'client' ? 'bg-violet-500/10 ml-auto' : 'bg-surface/60'}`}>
                  <div className="font-medium">{m.senderName}</div><div className="text-muted mt-1">{m.message}</div><div className="text-faint mt-1">{dateLabel(m.createdAt)}</div>
                </div>
              ))}
              {!data.messages?.length && <p className="text-sm text-muted">No messages yet.</p>}
            </div>
            <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!message.trim()) return; const ok = await run(() => clientApi.sendMessage(message), 'Message sent.'); if (ok) setMessage(''); }}>
              <input className="input" placeholder="Write a message" value={message} onChange={(e) => setMessage(e.target.value)} />
              <button disabled={busy} className="btn btn-primary !px-4"><Send className="w-4 h-4" /></button>
            </form>
          </div>
        )}

        {!loading && tab === 'documents' && (
          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="font-semibold mb-4">Upload a document</h2>
              <label className="flex items-center gap-2 w-fit px-3 py-2 rounded-lg bg-violet-500/15 text-violet-300 text-xs cursor-pointer">
                <Upload className="w-3 h-3" /> Choose file
                <input type="file" className="hidden" disabled={!data.project?.id || busy} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !data.project?.id) return;
                  const dataUrl = await fileToDataUrl(file);
                  const ok = await run(() => clientApi.uploadDocument({
                    title: file.name, fileName: file.name, mimeType: file.type || 'application/octet-stream',
                    category: 'other', data: dataUrl,
                  }), 'Document uploaded.');
                  if (ok) await load();
                  e.target.value = '';
                }} />
              </label>
              <p className="text-[11px] text-faint mt-2">PDF, images, CSV and spreadsheets up to the configured limit.</p>
            </div>
            <div className="card p-5">
              <h2 className="font-semibold mb-4">Documents & receipts</h2>
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface/50 text-xs">
                    <div><div className="font-medium">{doc.title}</div><div className="text-faint">{stageLabel(doc.category)} · {dateLabel(doc.createdAt)}</div></div>
                    {doc.fileId ? (
                      <button onClick={() => downloadClientDocument(doc.id, doc.fileName || doc.title).catch((err: any) => setError(err.message))} className="text-violet-300 flex items-center gap-1">Download <ExternalLink className="w-3 h-3" /></button>
                    ) : doc.url ? (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-violet-300 flex items-center gap-1">Open <ExternalLink className="w-3 h-3" /></a>
                    ) : (
                      <button onClick={() => setNotice(doc.content || '')} className="text-violet-300">View</button>
                    )}
                  </div>
                ))}
                {!documents.length && <p className="text-sm text-muted">No documents available yet.</p>}
              </div>
              {notice && notice.length > 80 && <pre className="mt-4 p-4 rounded-lg bg-surface/60 text-xs text-muted whitespace-pre-wrap">{notice}</pre>}
            </div>
          </div>
        )}
      </div>
      <ChatBox projectId={data.project?.id || data.projectId} />
    </div>
  );
}

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}${url}`);
  } catch {
    window.location.href = url;
  }
}

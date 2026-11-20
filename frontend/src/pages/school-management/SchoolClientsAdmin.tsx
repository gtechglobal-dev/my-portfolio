import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, ClipboardList, FolderKanban,
  CreditCard, Settings, LogOut, RefreshCw, Copy, CheckCircle2,
  AlertCircle, Plus, Send, KeyRound, Rocket, ShieldCheck, Upload,
} from 'lucide-react';
import {
  adminApi, ADMIN_TOKEN_KEY, dateLabel, downloadAdminDocument, fileToDataUrl, money, stageLabel,
} from '../../lib/schools';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'applications', label: 'Applications', icon: ClipboardList },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'documents', label: 'Proposals & Agreements', icon: FileText },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'operations', label: 'Payments & Operations', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type Tab = typeof TABS[number]['id'];

const TAB_PATHS: Record<string, Tab> = {
  overview: 'overview',
  applications: 'applications',
  clients: 'clients',
  proposals: 'documents',
  documents: 'documents',
  projects: 'projects',
  operations: 'operations',
  settings: 'settings',
};

function tabFromPath(pathname: string): Tab {
  const segment = pathname.split('/')[3];
  return (segment && TAB_PATHS[segment]) || 'overview';
}

function pathForTab(active: Tab): string {
  if (active === 'overview') return '/admin/school-clients';
  if (active === 'documents') return '/admin/school-clients/proposals';
  return `/admin/school-clients/${active}`;
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-6">
      <form onSubmit={submit} className="card p-6 w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-violet-400" />
          </div>
          <h1 className="text-xl font-bold">School Clients Admin</h1>
          <p className="text-xs text-muted mt-1">Gtech Global internal portal</p>
        </div>
        <input required placeholder="Username" className="w-full px-4 py-3 rounded-lg bg-surface border border-white/[0.08] text-sm" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input required type="password" placeholder="Password" className="w-full px-4 py-3 rounded-lg bg-surface border border-white/[0.08] text-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button disabled={loading} className="btn btn-primary w-full">{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-faint mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  return <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px]">{stageLabel(status)}</span>;
}

export default function SchoolClientsAdmin() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [tab, setTab] = useState<Tab>(() => tabFromPath(pathname));
  const [data, setData] = useState<any>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [forms, setForms] = useState<any>({
    convert: {}, proposal: {}, agreement: {}, settings: {}, training: {}, handover: {}, document: { category: 'other', clientVisible: true },
  });

  useEffect(() => {
    setTab(tabFromPath(pathname));
  }, [pathname]);

  function selectTab(next: Tab) {
    setTab(next);
    if (pathname !== pathForTab(next)) navigate(pathForTab(next), { replace: true });
  }

  async function load() {
    if (!token) return;
    try {
      setError('');
      const results = await Promise.allSettled([
        adminApi.overview(), adminApi.applications(), adminApi.clients(),
        adminApi.proposals(), adminApi.agreements(), adminApi.projects(),
        adminApi.payments(), adminApi.issues(), adminApi.trainings(),
        adminApi.handovers(), adminApi.documents(), adminApi.packages(), adminApi.faqs(),
        adminApi.settings(), adminApi.reports(),
      ]);
      if (results.some((r) => r.status === 'rejected' && String((r as any).reason?.message).includes('Authentication'))) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken(null);
        return;
      }
      setData({
        overview: (results[0] as any).value,
        applications: (results[1] as any).value?.applications || [],
        clients: (results[2] as any).value?.clients || [],
        proposals: (results[3] as any).value?.proposals || [],
        agreements: (results[4] as any).value?.agreements || [],
        projects: (results[5] as any).value?.projects || [],
        payments: (results[6] as any).value?.payments || [],
        issues: (results[7] as any).value?.issues || [],
        trainings: (results[8] as any).value?.trainings || [],
        handovers: (results[9] as any).value?.handovers || [],
        documents: (results[10] as any).value?.documents || [],
        packages: (results[11] as any).value?.packages || [],
        faqs: (results[12] as any).value?.faqs || [],
        settings: (results[13] as any).value?.settings,
        reports: (results[14] as any).value,
      });
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [token]);

  async function act(fn: () => Promise<any>, success = 'Saved.') {
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

  function login(t: string) {
    localStorage.setItem(ADMIN_TOKEN_KEY, t);
    setToken(t);
  }

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} copied.`);
    } catch { setError('Could not copy to clipboard.'); }
  }

  if (!token) return <Login onLogin={login} />;

  const applications = data.applications || [];
  const clients = data.clients || [];
  const projects = data.projects || [];
  const proposals = data.proposals || [];
  const agreements = data.agreements || [];
  const payments = data.payments || [];
  const issues = data.issues || [];
  const documents = data.documents || [];
  const settings = data.settings || {};

  async function openApplication(id: string) {
    const result = await act(() => adminApi.application(id), '');
    if (result) setDetail(result);
  }

  return (
    <div className="min-h-screen bg-ink text-[#f5f5f5] flex">
      <aside className="w-60 shrink-0 border-r border-white/[0.06] bg-surface/40 p-4 space-y-1 hidden lg:block">
        <div className="px-3 py-4 mb-4">
          <div className="font-bold">Gtech <span className="text-violet-400">Schools</span></div>
          <div className="text-[10px] text-faint mt-1">Administration</div>
        </div>
        {TABS.map((item) => (
          <button key={item.id} onClick={() => selectTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${tab === item.id ? 'bg-violet-500/10 text-violet-300' : 'text-muted hover:text-white hover:bg-white/[0.04]'}`}>
            <item.icon className="w-4 h-4" /> {item.label}
          </button>
        ))}
        <div className="pt-4 mt-4 border-t border-white/[0.06]">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-white hover:bg-white/[0.04]">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 md:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{TABS.find((t) => t.id === tab)?.label}</h1>
            <p className="text-xs text-muted mt-1">Manage acquisition, projects and school integrations.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="btn btn-outline !py-2 !px-4"><RefreshCw className="w-4 h-4" /> Refresh</button>
            <button onClick={logout} className="btn btn-outline !py-2 !px-4 lg:hidden"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex lg:hidden gap-2 overflow-x-auto mb-6 pb-2">
          {TABS.map((item) => (
            <button key={item.id} onClick={() => selectTab(item.id)} className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap ${tab === item.id ? 'bg-violet-500/20 text-violet-300' : 'bg-surface text-muted'}`}>
              {item.label}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 flex items-center gap-2 text-sm text-red-400"><AlertCircle className="w-4 h-4" /> {error}</div>}
        {notice && <div className="mb-4 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="w-4 h-4" /> {notice}</div>}

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat label="Applications" value={data.overview?.totalApplications ?? 0} />
              <Stat label="Active projects" value={data.overview?.activeProjects ?? 0} />
              <Stat label="Project value" value={money(data.overview?.totalProjectValue || 0)} />
              <Stat label="Verified revenue" value={money(data.reports?.verifiedRevenue || data.overview?.totalPaymentsReceived || 0)} />
              <Stat label="Conversion rate" value={`${data.reports?.conversionRate || 0}%`} />
              <Stat label="Proposals sent" value={data.reports?.proposalsSent || 0} />
              <Stat label="Outstanding" value={money(data.reports?.outstanding || 0)} />
              <Stat label="Completed projects" value={data.reports?.completedProjects || 0} />
            </div>
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Recent applications</h2>
              <div className="space-y-2">
                {(data.overview?.recentApplications || []).map((app: any) => (
                  <button key={app.id} onClick={() => openApplication(app.id)} className="w-full flex items-center justify-between gap-4 p-3 rounded-lg bg-surface/60 hover:bg-surface text-left">
                    <div>
                      <div className="text-sm font-medium">{app.school.name}</div>
                      <div className="text-[11px] text-faint">{app.reference} · {app.applicant.email}</div>
                    </div>
                    <StatusBadge status={app.status} />
                  </button>
                ))}
                {!data.overview?.recentApplications?.length && <p className="text-sm text-muted">No applications yet.</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'applications' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="font-semibold mb-4">All applications</h2>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {applications.map((app: any) => (
                  <button key={app.id} onClick={() => openApplication(app.id)} className={`w-full p-3 rounded-lg text-left border ${detail?.application?.id === app.id ? 'border-violet-500/40 bg-violet-500/10' : 'border-white/[0.06] bg-surface/40 hover:bg-surface'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{app.school.name}</span>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="text-[11px] text-faint mt-1">{app.reference} · {dateLabel(app.createdAt)}</div>
                  </button>
                ))}
                {!applications.length && <p className="text-sm text-muted">No applications found.</p>}
              </div>
            </div>
            <div className="card p-5">
              {!detail?.application ? (
                <p className="text-sm text-muted">Select an application to review it.</p>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h2 className="font-semibold">{detail.application.school.name}</h2>
                      <StatusBadge status={detail.application.status} />
                    </div>
                    <p className="text-xs text-muted">{detail.application.reference} · {detail.application.applicant.fullName} · {detail.application.applicant.email}</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-surface/60"><div className="text-faint mb-1">School email</div>{detail.application.school.email}</div>
                    <div className="p-3 rounded-lg bg-surface/60"><div className="text-faint mb-1">Location</div>{detail.application.school.lga}, {detail.application.school.state}</div>
                    <div className="p-3 rounded-lg bg-surface/60"><div className="text-faint mb-1">Students</div>{detail.application.profile.studentCount || 'Not provided'}</div>
                    <div className="p-3 rounded-lg bg-surface/60"><div className="text-faint mb-1">Services</div>{detail.application.services.join(', ')}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/60 text-xs text-muted"><div className="text-faint mb-1">Challenges</div>{detail.application.profile.challenges}</div>
                  <div className="flex flex-wrap gap-2">
                    {['under_review', 'contacted', 'consultation_scheduled', 'proposal_preparation', 'accepted', 'rejected'].map((status) => (
                      <button key={status} disabled={busy} onClick={() => act(() => adminApi.updateApplication(detail.application.id, { status }), 'Status updated.')} className="px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-muted hover:text-white">
                        {stageLabel(status)}
                      </button>
                    ))}
                  </div>
                  {!detail.application.clientId && (
                    <div className="p-4 rounded-lg border border-violet-500/20 bg-violet-500/5 space-y-3">
                      <div className="text-xs font-semibold">Convert to client & project</div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input placeholder="Package name" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08] text-xs" value={forms.convert.packageName || ''} onChange={(e) => setForms((p: any) => ({ ...p, convert: { ...p.convert, packageName: e.target.value } }))} />
                        <input placeholder="Project cost (NGN)" type="number" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08] text-xs" value={forms.convert.cost || ''} onChange={(e) => setForms((p: any) => ({ ...p, convert: { ...p.convert, cost: e.target.value } }))} />
                      </div>
                      <button disabled={busy} onClick={() => act(() => adminApi.convertApplication(detail.application.id, forms.convert), 'Client and project created.')} className="btn btn-primary !py-2 !px-4 !text-xs">
                        Convert application
                      </button>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold">Activity</div>
                    {(detail.activity || []).map((item: any) => (
                      <div key={item.id} className="text-[11px] text-faint">• {item.action} · {dateLabel(item.createdAt)}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'clients' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface/60 text-faint uppercase tracking-wider">
                  <tr><th className="p-3">School</th><th className="p-3">Email</th><th className="p-3">Project</th><th className="p-3">Marketplace</th><th className="p-3">Actions</th></tr>
                </thead>
                <tbody>
                  {clients.map((client: any) => (
                    <tr key={client.id} className="border-t border-white/[0.06]">
                      <td className="p-3"><div className="font-medium">{client.schoolName}</div><div className="text-faint mt-0.5">{client.reference}</div></td>
                      <td className="p-3 text-muted">{client.email}</td>
                      <td className="p-3">{client.project ? <><div>{client.project.reference}</div><StatusBadge status={client.project.stage} /></> : <span className="text-faint">—</span>}</td>
                      <td className="p-3">{client.marketplace?.active ? <span className="text-emerald-400">Connected</span> : <span className="text-faint">Not connected</span>}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {!client.marketplace?.active && <button disabled={busy} onClick={() => act(() => adminApi.connectMarketplace(client.id), 'Marketplace connected. Copy the key now.').then((r) => { if (r?.apiKey) copy(r.apiKey, 'API key'); })} className="px-2 py-1 rounded bg-violet-500/10 text-violet-300 text-[10px]">Connect</button>}
                          {client.marketplace?.active && <button disabled={busy} onClick={() => act(() => adminApi.issueLaunchToken(client.id, {}), 'Launch token issued.').then((r) => { if (r?.token) copy(r.token, 'Launch token'); })} className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 text-[10px]">Launch token</button>}
                          {client.marketplace?.active && <button disabled={busy} onClick={() => act(() => adminApi.rotateMarketplaceKey(client.id), 'API key rotated.').then((r) => { if (r?.apiKey) copy(r.apiKey, 'API key'); })} className="px-2 py-1 rounded bg-white/5 text-muted text-[10px]">Rotate key</button>}
                          <button disabled={busy} onClick={() => act(() => adminApi.resetPassword(client.id), 'Password reset.').then((r) => { if (r?.temporaryPassword) copy(r.temporaryPassword, 'Temporary password'); })} className="px-2 py-1 rounded bg-white/5 text-muted text-[10px]">Reset password</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!clients.length && <p className="p-5 text-sm text-muted">No clients yet. Convert an application first.</p>}
            </div>
          </div>
        )}

        {tab === 'documents' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="card p-5">
                <h2 className="font-semibold mb-4">Create proposal</h2>
                <div className="grid gap-2 text-xs">
                  <select className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.proposal.applicationId || ''} onChange={(e) => setForms((p: any) => ({ ...p, proposal: { ...p.proposal, applicationId: e.target.value } }))}>
                    <option value="">Select application</option>
                    {applications.map((a: any) => <option key={a.id} value={a.id}>{a.school.name} · {a.reference}</option>)}
                  </select>
                  <input placeholder="Package name" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.proposal.packageName || ''} onChange={(e) => setForms((p: any) => ({ ...p, proposal: { ...p.proposal, packageName: e.target.value } }))} />
                  <input placeholder="Modules (comma separated)" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.proposal.modules || ''} onChange={(e) => setForms((p: any) => ({ ...p, proposal: { ...p.proposal, modules: e.target.value } }))} />
                  <input placeholder="Amount (NGN)" type="number" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.proposal.amount || ''} onChange={(e) => setForms((p: any) => ({ ...p, proposal: { ...p.proposal, amount: e.target.value } }))} />
                  <input placeholder="Timeline" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.proposal.timeline || ''} onChange={(e) => setForms((p: any) => ({ ...p, proposal: { ...p.proposal, timeline: e.target.value } }))} />
                  <input placeholder="Payment structure" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.proposal.paymentStructure || ''} onChange={(e) => setForms((p: any) => ({ ...p, proposal: { ...p.proposal, paymentStructure: e.target.value } }))} />
                  <button disabled={busy || !forms.proposal.applicationId} onClick={() => act(() => adminApi.createProposal({ ...forms.proposal, modules: String(forms.proposal.modules || '').split(',').map((s: string) => s.trim()).filter(Boolean) }), 'Proposal created.')} className="btn btn-primary !py-2 !text-xs">
                    <Plus className="w-3 h-3" /> Create proposal
                  </button>
                </div>
              </div>
              <div className="card p-5">
                <h2 className="font-semibold mb-4">Create agreement</h2>
                <div className="grid gap-2 text-xs">
                  <select className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.agreement.applicationId || ''} onChange={(e) => setForms((p: any) => ({ ...p, agreement: { ...p.agreement, applicationId: e.target.value } }))}>
                    <option value="">Select application</option>
                    {applications.map((a: any) => <option key={a.id} value={a.id}>{a.school.name} · {a.reference}</option>)}
                  </select>
                  <textarea placeholder="Project description" rows={2} className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.agreement.projectDescription || ''} onChange={(e) => setForms((p: any) => ({ ...p, agreement: { ...p.agreement, projectDescription: e.target.value } }))} />
                  <input placeholder="Amount (NGN)" type="number" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.agreement.amount || ''} onChange={(e) => setForms((p: any) => ({ ...p, agreement: { ...p.agreement, amount: e.target.value } }))} />
                  <input placeholder="Timeline" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.agreement.timeline || ''} onChange={(e) => setForms((p: any) => ({ ...p, agreement: { ...p.agreement, timeline: e.target.value } }))} />
                  <button disabled={busy || !forms.agreement.applicationId} onClick={() => act(() => adminApi.createAgreement(forms.agreement), 'Agreement created.')} className="btn btn-primary !py-2 !text-xs">
                    <Plus className="w-3 h-3" /> Create agreement
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="card p-5">
                <h2 className="font-semibold mb-4">Proposals</h2>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {proposals.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface/50 text-xs">
                      <div><div className="font-medium">{p.schoolName}</div><div className="text-faint">{p.reference} · {money(p.amount)}</div></div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={p.status} />
                        {p.status === 'draft' && <button disabled={busy} onClick={() => act(() => adminApi.sendProposal(p.id), 'Proposal sent.').then((r) => { if (r?.clientUrl) copy(window.location.origin + r.clientUrl, 'Proposal link'); })} className="px-2 py-1 rounded bg-violet-500/10 text-violet-300 text-[10px]"><Send className="w-3 h-3 inline" /> Send</button>}
                      </div>
                    </div>
                  ))}
                  {!proposals.length && <p className="text-sm text-muted">No proposals yet.</p>}
                </div>
              </div>
              <div className="card p-5">
                <h2 className="font-semibold mb-4">Agreements</h2>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {agreements.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface/50 text-xs">
                      <div><div className="font-medium">{a.reference}</div><div className="text-faint">{money(a.amount)} · v{a.version}</div></div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                  {!agreements.length && <p className="text-sm text-muted">No agreements yet.</p>}
                </div>
              </div>
              <div className="card p-5">
                <h2 className="font-semibold mb-4">Secure files</h2>
                <div className="grid gap-2 text-xs">
                  <select className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.document.projectId || ''} onChange={(e) => setForms((p: any) => ({ ...p, document: { ...p.document, projectId: e.target.value } }))}>
                    <option value="">Select project</option>
                    {projects.map((project: any) => <option key={project.id} value={project.id}>{project.schoolName} · {project.reference}</option>)}
                  </select>
                  <select className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.document.category || 'other'} onChange={(e) => setForms((p: any) => ({ ...p, document: { ...p.document, category: e.target.value } }))}>
                    {['other', 'proposal', 'agreement', 'receipt', 'onboarding', 'project', 'handover'].map((c) => <option key={c} value={c}>{stageLabel(c)}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-muted">
                    <input type="checkbox" checked={forms.document.clientVisible !== false} onChange={(e) => setForms((p: any) => ({ ...p, document: { ...p.document, clientVisible: e.target.checked } }))} /> Visible to client
                  </label>
                  <label className="flex items-center gap-2 w-fit px-3 py-2 rounded-lg bg-violet-500/15 text-violet-300 cursor-pointer">
                    <Upload className="w-3 h-3" /> Choose file
                    <input type="file" className="hidden" disabled={busy || !forms.document.projectId} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !forms.document.projectId) return;
                      const dataUrl = await fileToDataUrl(file);
                      const ok = await act(() => adminApi.uploadDocument({
                        projectId: forms.document.projectId, title: file.name, fileName: file.name,
                        mimeType: file.type || 'application/octet-stream', category: forms.document.category || 'other',
                        clientVisible: forms.document.clientVisible !== false, data: dataUrl,
                      }), 'Document uploaded.');
                      if (ok) await load();
                      e.target.value = '';
                    }} />
                  </label>
                </div>
                <div className="space-y-2 mt-4 max-h-52 overflow-y-auto">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface/50 text-xs">
                      <div><div className="font-medium">{doc.title}</div><div className="text-faint">{stageLabel(doc.category)} · {doc.clientVisible ? 'Client visible' : 'Internal'} · {dateLabel(doc.createdAt)}</div></div>
                      {doc.fileId && <button onClick={() => downloadAdminDocument(doc.id, doc.fileName || doc.title).catch((err: any) => setError(err.message))} className="text-violet-300">Download</button>}
                    </div>
                  ))}
                  {!documents.length && <p className="text-muted">No files uploaded yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'projects' && (
          <div className="space-y-4">
            {projects.map((project: any) => (
              <div key={project.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2"><h2 className="font-semibold">{project.schoolName}</h2><StatusBadge status={project.stage} /></div>
                    <div className="text-[11px] text-faint mt-1">{project.reference} · {money(project.totalPaid)} of {money(project.cost)} paid · {project.progress || 0}% complete</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08] text-xs" value={project.stage} onChange={(e) => act(() => adminApi.updateProject(project.id, { stage: e.target.value }), 'Stage updated.')}>
                      {['application', 'consultation', 'proposal', 'agreement', 'initial_payment', 'onboarding', 'development', 'testing', 'training', 'deployment', 'handover', 'completed'].map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
                    </select>
                    <button onClick={async () => { const r = await act(() => adminApi.project(project.id), ''); if (r) setDetail(r); }} className="btn btn-outline !py-2 !px-3 !text-xs">Open</button>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full bg-violet-500" style={{ width: `${project.progress || 0}%` }} />
                </div>
              </div>
            ))}
            {!projects.length && <div className="card p-6 text-sm text-muted">No projects yet.</div>}
            {detail?.project && (
              <div className="card p-5">
                <h2 className="font-semibold mb-4">{detail.project.reference} milestones</h2>
                <div className="space-y-2">
                  {(detail.milestones || []).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface/50 text-xs">
                      <div><div className="font-medium">{m.title}</div><div className="text-faint">{m.weight}% · {stageLabel(m.status)}</div></div>
                      <select className="px-2 py-1 rounded bg-surface border border-white/[0.08] text-xs" value={m.status} onChange={(e) => act(() => adminApi.updateMilestone(m.id, { status: e.target.value }), 'Milestone updated.')}>
                        {['pending', 'in_progress', 'completed', 'blocked'].map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'operations' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="font-semibold mb-4">Payments</h2>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface/50 text-xs">
                    <div><div className="font-medium">{p.reference}</div><div className="text-faint">{stageLabel(p.type)} · {dateLabel(p.createdAt)}</div></div>
                    <div className="text-right"><div>{money(p.amount)}</div><StatusBadge status={p.status} /></div>
                  </div>
                ))}
                {!payments.length && <p className="text-sm text-muted">No payments yet.</p>}
              </div>
            </div>
            <div className="space-y-6">
              <div className="card p-5">
                <h2 className="font-semibold mb-4">Issues</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {issues.map((issue: any) => (
                    <div key={issue.id} className="p-3 rounded-lg bg-surface/50 text-xs">
                      <div className="flex items-center justify-between gap-2"><span className="font-medium">{issue.title}</span><StatusBadge status={issue.status} /></div>
                      <select className="mt-2 px-2 py-1 rounded bg-surface border border-white/[0.08] text-xs" value={issue.status} onChange={(e) => act(() => adminApi.updateIssue(issue.id, { status: e.target.value }), 'Issue updated.')}>
                        {['submitted', 'under_review', 'in_progress', 'resolved', 'awaiting_client', 'closed'].map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
                      </select>
                    </div>
                  ))}
                  {!issues.length && <p className="text-sm text-muted">No issues reported.</p>}
                </div>
              </div>
              <div className="card p-5">
                <h2 className="font-semibold mb-4">Schedule training</h2>
                <div className="grid gap-2 text-xs">
                  <select className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.training.projectId || ''} onChange={(e) => setForms((p: any) => ({ ...p, training: { ...p.training, projectId: e.target.value } }))}>
                    <option value="">Select project</option>
                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.schoolName}</option>)}
                  </select>
                  <input placeholder="Title" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.training.title || ''} onChange={(e) => setForms((p: any) => ({ ...p, training: { ...p.training, title: e.target.value } }))} />
                  <input placeholder="Date" type="date" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.training.date || ''} onChange={(e) => setForms((p: any) => ({ ...p, training: { ...p.training, date: e.target.value } }))} />
                  <input placeholder="Time or link" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.training.linkOrVenue || ''} onChange={(e) => setForms((p: any) => ({ ...p, training: { ...p.training, linkOrVenue: e.target.value } }))} />
                  <button disabled={busy || !forms.training.projectId} onClick={() => act(() => adminApi.createTraining({ ...forms.training, time: forms.training.time || '', method: forms.training.method || 'online', targetStaff: forms.training.targetStaff || '' }), 'Training scheduled.')} className="btn btn-primary !py-2 !text-xs"><Rocket className="w-3 h-3" /> Schedule</button>
                </div>
              </div>
              <div className="card p-5">
                <h2 className="font-semibold mb-4">Prepare handover</h2>
                <div className="grid gap-2 text-xs">
                  <select className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.handover.projectId || ''} onChange={(e) => setForms((p: any) => ({ ...p, handover: { ...p.handover, projectId: e.target.value } }))}>
                    <option value="">Select project</option>
                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.schoolName}</option>)}
                  </select>
                  <input placeholder="Document title" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.handover.title || ''} onChange={(e) => setForms((p: any) => ({ ...p, handover: { ...p.handover, title: e.target.value } }))} />
                  <input placeholder="Document URL" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.handover.url || ''} onChange={(e) => setForms((p: any) => ({ ...p, handover: { ...p.handover, url: e.target.value } }))} />
                  <button disabled={busy || !forms.handover.projectId} onClick={() => act(() => adminApi.createHandover({ projectId: forms.handover.projectId, documents: [{ title: forms.handover.title || 'Handover document', url: forms.handover.url }] }), 'Handover prepared.')} className="btn btn-primary !py-2 !text-xs"><KeyRound className="w-3 h-3" /> Prepare</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="font-semibold mb-4">Public content</h2>
              <div className="grid gap-2 text-xs">
                <input className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.settings.contact?.email ?? settings.contact?.email ?? ''} placeholder="Contact email" onChange={(e) => setForms((p: any) => ({ ...p, settings: { ...p.settings, contact: { ...settings.contact, ...p.settings.contact, email: e.target.value } } }))} />
                <input className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.settings.contact?.whatsapp ?? settings.contact?.whatsapp ?? ''} placeholder="WhatsApp number" onChange={(e) => setForms((p: any) => ({ ...p, settings: { ...p.settings, contact: { ...settings.contact, ...p.settings.contact, whatsapp: e.target.value } } }))} />
                <textarea rows={3} className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.settings.privacyPolicy ?? settings.privacyPolicy ?? ''} placeholder="Privacy policy" onChange={(e) => setForms((p: any) => ({ ...p, settings: { ...p.settings, privacyPolicy: e.target.value } }))} />
                <textarea rows={3} className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.settings.terms ?? settings.terms ?? ''} placeholder="Terms" onChange={(e) => setForms((p: any) => ({ ...p, settings: { ...p.settings, terms: e.target.value } }))} />
              </div>
            </div>
            <div className="card p-5">
              <h2 className="font-semibold mb-4">Payment structure</h2>
              <div className="grid gap-2 text-xs">
                <input type="number" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.settings.depositPercent ?? settings.depositPercent ?? 40} placeholder="Deposit percent" onChange={(e) => setForms((p: any) => ({ ...p, settings: { ...p.settings, depositPercent: e.target.value } }))} />
                <input type="number" className="px-3 py-2 rounded-lg bg-surface border border-white/[0.08]" value={forms.settings.finalPercent ?? settings.finalPercent ?? 60} placeholder="Final percent" onChange={(e) => setForms((p: any) => ({ ...p, settings: { ...p.settings, finalPercent: e.target.value } }))} />
                <button disabled={busy} onClick={() => act(() => adminApi.saveSettings({ ...settings, ...forms.settings, depositPercent: Number(forms.settings.depositPercent ?? settings.depositPercent), finalPercent: Number(forms.settings.finalPercent ?? settings.finalPercent) }), 'Settings saved.')} className="btn btn-primary !py-2 !text-xs">Save settings</button>
              </div>
              <div className="mt-6 text-xs text-faint">
                Paystack secrets are configured server-side only. {settings.paymentSecretsConfigured ? 'A secret key is present.' : 'No Paystack secret key is configured.'}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

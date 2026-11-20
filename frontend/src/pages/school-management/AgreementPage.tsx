import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { acceptAgreement, dateLabel, getAgreement, money } from '../../lib/schools';

export default function AgreementPage({ token }: { token: string }) {
  const [agreement, setAgreement] = useState<any>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ legalName: '', position: '', confirmed: false });

  useEffect(() => {
    getAgreement(token).then((r) => setAgreement(r.agreement)).catch((err) => setError(err.message));
  }, [token]);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await acceptAgreement(token, form);
      setNotice('Agreement accepted. Your team will be notified to proceed with the initial payment.');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-ink text-[#f5f5f5] py-28 px-6">
      <div className="container max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Development agreement</h1>
          <p className="text-sm text-muted mt-2">Review and accept the agreement to continue your project.</p>
        </div>
        {error && <div className="mb-4 flex items-center gap-2 text-sm text-red-400"><AlertCircle className="w-4 h-4" /> {error}</div>}
        {notice && <div className="mb-4 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="w-4 h-4" /> {notice}</div>}
        {!agreement && !error && <p className="text-sm text-muted">Loading agreement...</p>}
        {agreement && (
          <div className="card p-6 md:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-5">
              <div>
                <div className="text-lg font-semibold">{agreement.reference}</div>
                <div className="text-xs text-muted mt-1">Version {agreement.version} · Prepared {dateLabel(agreement.createdAt)}</div>
              </div>
              <div className="text-right"><div className="text-xl font-bold">{money(agreement.amount)}</div><div className="text-[11px] text-faint">Agreed project value</div></div>
            </div>
            <section><h2 className="font-semibold mb-2">Project</h2><p className="text-sm text-muted whitespace-pre-wrap">{agreement.projectDescription || 'Project description will be provided by Gtech Global.'}</p></section>
            <div className="grid md:grid-cols-2 gap-5">
              <section><h2 className="font-semibold mb-2">Included</h2><ul className="space-y-1 text-xs text-muted">{(agreement.scopeIncluded || []).map((s: string) => <li key={s}>• {s}</li>)}</ul></section>
              <section><h2 className="font-semibold mb-2">Excluded</h2><ul className="space-y-1 text-xs text-muted">{(agreement.scopeExcluded || []).length ? agreement.scopeExcluded.map((s: string) => <li key={s}>• {s}</li>) : <li>None specified</li>}</ul></section>
            </div>
            <section><h2 className="font-semibold mb-2">Timeline</h2><p className="text-sm text-muted">{agreement.timeline || 'Timeline will be confirmed during onboarding.'}</p></section>
            <section><h2 className="font-semibold mb-2">Payment milestones</h2><div className="space-y-2">{(agreement.milestones || []).map((m: any, i: number) => <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface/50 text-xs"><span>{m.description}</span><span>{money(m.amount)}</span></div>)}</div></section>
            <section><h2 className="font-semibold mb-2">Terms</h2><div className="text-xs text-muted whitespace-pre-wrap space-y-3">
              <p>{agreement.dataOwnership}</p><p>{agreement.softwareLicence}</p><p>{agreement.confidentiality}</p><p>{agreement.maintenance}</p><p>{agreement.refundPolicy}</p><p>{agreement.disputeResolution}</p><p>{agreement.additionalTerms}</p>
            </div></section>
            <form onSubmit={accept} className="border-t border-white/[0.06] pt-6 space-y-4">
              <h2 className="font-semibold">Acceptance</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <input required className="input" placeholder="Legal full name" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
                <input required className="input" placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
              <label className="flex items-start gap-3 text-xs text-muted cursor-pointer">
                <input required type="checkbox" checked={form.confirmed} onChange={(e) => setForm({ ...form, confirmed: e.target.checked })} className="mt-0.5 accent-violet-500" />
                I confirm that I have read and understood this agreement and have authority to accept it on behalf of the school.
              </label>
              <button disabled={!form.confirmed} className="btn btn-primary !text-xs">Accept agreement</button>
            </form>
            <div className="pt-4"><Link to="/school-management" className="text-xs text-muted hover:text-white">Back to school systems</Link></div>
          </div>
        )}
      </div>
    </div>
  );
}

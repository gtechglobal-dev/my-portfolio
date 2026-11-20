import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { dateLabel, getProposal, money, respondProposal } from '../../lib/schools';

export default function ProposalPage({ token }: { token: string }) {
  const [proposal, setProposal] = useState<any>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<'accept' | 'request_changes' | 'decline' | null>(null);
  const [form, setForm] = useState({ name: '', note: '' });

  useEffect(() => {
    getProposal(token).then((r) => setProposal(r.proposal)).catch((err) => setError(err.message));
  }, [token]);

  async function respond(next: 'accept' | 'request_changes' | 'decline') {
    setAction(next);
    setError('');
    setNotice('');
    try {
      const result = await respondProposal(token, { action: next, ...form });
      setNotice(next === 'accept' ? 'Proposal accepted. Next steps will be shared shortly.' : 'Your response has been recorded.');
      setProposal(result.proposal || proposal);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="min-h-screen bg-ink text-[#f5f5f5] py-28 px-6">
      <div className="container max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Project proposal</h1>
          <p className="text-sm text-muted mt-2">Review the proposed scope, timeline and payment structure.</p>
        </div>
        {error && <div className="mb-4 flex items-center gap-2 text-sm text-red-400"><AlertCircle className="w-4 h-4" /> {error}</div>}
        {notice && <div className="mb-4 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="w-4 h-4" /> {notice}</div>}
        {!proposal && !error && <p className="text-sm text-muted">Loading proposal...</p>}
        {proposal && (
          <div className="space-y-5">
            <div className="card p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-5 mb-6">
                <div>
                  <div className="text-lg font-semibold">{proposal.reference}</div>
                  <div className="text-xs text-muted mt-1">Version {proposal.version} · Valid until {dateLabel(proposal.validUntil)}</div>
                </div>
                <div className="text-right"><div className="text-2xl font-bold">{money(proposal.amount)}</div><div className="text-[11px] text-faint">Total project value</div></div>
              </div>
              <div className="space-y-6">
                <section><h2 className="font-semibold mb-2">School</h2><p className="text-sm text-muted">{proposal.schoolName} · {proposal.applicantName}</p></section>
                <section><h2 className="font-semibold mb-2">Package</h2><p className="text-sm text-muted">{proposal.packageName || 'Custom scope'}</p></section>
                <section><h2 className="font-semibold mb-2">Modules</h2><div className="flex flex-wrap gap-2">{(proposal.modules || []).map((m: string) => <span key={m} className="px-2 py-1 rounded-full bg-violet-500/10 text-violet-300 text-[11px]">{m}</span>)}</div></section>
                <section><h2 className="font-semibold mb-2">Add-ons</h2><p className="text-sm text-muted">{(proposal.addOns || []).length ? proposal.addOns.map((a: any) => a.name).join(', ') : 'None'}</p></section>
                <div className="grid md:grid-cols-2 gap-5">
                  <section><h2 className="font-semibold mb-2">Timeline</h2><p className="text-sm text-muted">{proposal.timeline || 'To be confirmed during onboarding.'}</p></section>
                  <section><h2 className="font-semibold mb-2">Payment structure</h2><p className="text-sm text-muted">{proposal.paymentStructure || 'Initial and final payments via Paystack.'}</p></section>
                  <section><h2 className="font-semibold mb-2">Training</h2><p className="text-sm text-muted">{proposal.training || 'Staff training included before deployment.'}</p></section>
                  <section><h2 className="font-semibold mb-2">Support</h2><p className="text-sm text-muted">{proposal.support || 'Support terms confirmed in the agreement.'}</p></section>
                </div>
                {proposal.terms && <section><h2 className="font-semibold mb-2">Terms</h2><p className="text-sm text-muted whitespace-pre-wrap">{proposal.terms}</p></section>}
              </div>
            </div>
            {proposal.status !== 'accepted' ? (
              <div className="card p-6 space-y-4">
                <h2 className="font-semibold">Your response</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input className="input" placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <input className="input" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button disabled={!!action || !form.name} onClick={() => respond('accept')} className="btn btn-primary !text-xs"><CheckCircle2 className="w-3 h-3" /> Accept proposal</button>
                  <button disabled={!!action || !form.name} onClick={() => respond('request_changes')} className="btn btn-outline !text-xs">Request changes</button>
                  <button disabled={!!action || !form.name} onClick={() => respond('decline')} className="btn btn-outline !text-xs">Decline</button>
                </div>
              </div>
            ) : (
              <div className="card p-6 flex items-center gap-3 text-emerald-400 text-sm"><CheckCircle2 className="w-5 h-5" /> You accepted this proposal{proposal.clientResponse?.at ? ` on ${dateLabel(proposal.clientResponse.at)}` : ''}.</div>
            )}
            <div><Link to="/school-management" className="text-xs text-muted hover:text-white">Back to school systems</Link></div>
          </div>
        )}
      </div>
    </div>
  );
}

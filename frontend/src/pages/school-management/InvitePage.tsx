import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { getInvite, submitInvite } from '../../lib/schools';

export default function InvitePage({ token }: { token: string }) {
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    getInvite(token).then(setInvite).catch((err) => setError(err.message));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await submitInvite(token, form);
      setNotice('Your information has been submitted successfully.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !invite) {
    return <div className="min-h-screen bg-ink flex items-center justify-center px-6"><div className="card p-6 text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div></div>;
  }
  if (!invite) return <div className="min-h-screen bg-ink flex items-center justify-center text-sm text-muted">Loading invitation...</div>;

  const isTeacher = invite.type === 'teacher';

  return (
    <div className="min-h-screen bg-ink text-[#f5f5f5] py-28 px-6">
      <div className="container max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">{isTeacher ? 'Teacher information form' : 'Class information form'}</h1>
        <p className="text-sm text-muted mb-8">{invite.schoolName} · {invite.label || (isTeacher ? 'Teacher onboarding' : 'Class teacher onboarding')}</p>
        {notice && <div className="mb-4 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="w-4 h-4" /> {notice}</div>}
        {error && <div className="mb-4 flex items-center gap-2 text-sm text-red-400"><AlertCircle className="w-4 h-4" /> {error}</div>}
        <form onSubmit={submit} className="card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <input required className="input" placeholder="Full name" value={form.fullName || ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <input required type="email" className="input" placeholder="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input" placeholder="Phone number" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            {isTeacher ? (
              <>
                <input required className="input" placeholder="Subjects taught" value={form.subjects || ''} onChange={(e) => setForm({ ...form, subjects: e.target.value })} />
                <input required className="input" placeholder="Classes assigned" value={form.classes || ''} onChange={(e) => setForm({ ...form, classes: e.target.value })} />
              </>
            ) : (
              <>
                <input required className="input" placeholder="Class name" value={form.className || ''} onChange={(e) => setForm({ ...form, className: e.target.value })} />
                <input required className="input" placeholder="Number of students" value={form.studentCount || ''} onChange={(e) => setForm({ ...form, studentCount: e.target.value })} />
              </>
            )}
          </div>
          <textarea rows={4} className="input" placeholder="Additional information" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button disabled={busy} className="btn btn-primary !text-xs">Submit information</button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Send, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { clientApi, dateLabel } from '../../lib/schools';

const SECTIONS = [
  { id: 'school_profile', label: 'School profile' },
  { id: 'class_subject', label: 'Classes & subjects' },
  { id: 'staff', label: 'Staff information' },
  { id: 'student_import', label: 'Student data import' },
] as const;

type Section = typeof SECTIONS[number]['id'];

function Fields({ section, data, set, setError, setNotice }: { section: Section; data: any; set: (key: string, value: any) => void; setError: (value: string) => void; setNotice: (value: string) => void }) {
  if (section === 'school_profile') {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          ['schoolMotto', 'School motto'], ['schoolAddress', 'School address'], ['state', 'State'], ['lga', 'LGA'],
          ['term', 'Current term'], ['session', 'Current session'], ['termStartDate', 'Term start date'], ['termEndDate', 'Term end date'],
        ].map(([key, label]) => (
          <div key={key}><label className="block text-xs text-muted mb-1">{label}</label><input className="input" value={data[key] || ''} onChange={(e) => set(key, e.target.value)} /></div>
        ))}
      </div>
    );
  }
  if (section === 'class_subject') {
    return (
      <div className="space-y-4">
        <div><label className="block text-xs text-muted mb-1">Classes (one per line)</label><textarea rows={5} className="input" value={data.classesText || ''} onChange={(e) => set('classesText', e.target.value)} /></div>
        <div><label className="block text-xs text-muted mb-1">Subjects (one per line)</label><textarea rows={5} className="input" value={data.subjectsText || ''} onChange={(e) => set('subjectsText', e.target.value)} /></div>
        <div><label className="block text-xs text-muted mb-1">Class arms / sections</label><input className="input" value={data.arms || ''} onChange={(e) => set('arms', e.target.value)} /></div>
      </div>
    );
  }
  if (section === 'staff') {
    return (
      <div className="space-y-4">
        <div><label className="block text-xs text-muted mb-1">Staff list (name, email, role — one per line)</label><textarea rows={8} className="input" value={data.staffText || ''} onChange={(e) => set('staffText', e.target.value)} /></div>
        <div><label className="block text-xs text-muted mb-1">Admin accounts needed</label><input className="input" value={data.adminAccounts || ''} onChange={(e) => set('adminAccounts', e.target.value)} /></div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="block text-xs text-muted mb-1">Student CSV file</span>
        <input type="file" accept=".csv,text/csv" className="block w-full text-xs text-muted file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-violet-500/20 file:text-violet-300" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setError('');
          setNotice('Validating student data...');
          try {
            const result = await clientApi.importStudents(file.name, await file.text());
            set('fileName', file.name);
            set('headers', result.headers || []);
            set('rows', result.rows || []);
            set('rowCount', result.import?.rowCount || 0);
            set('importId', result.import?.id);
            set('importErrors', result.import?.errors || []);
            setNotice(result.import?.status === 'rejected'
              ? `Import rejected: ${(result.import.errors || []).join(' ')}`
              : `${result.import?.rowCount || 0} student rows validated and ready to submit.`);
          } catch (err: any) {
            setError(err.message);
            setNotice('');
          }
          e.target.value = '';
        }} />
      </label>
      {data.fileName && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-surface/60 text-xs text-muted">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> {data.fileName} · {data.rowCount} rows
        </div>
      )}
      {Array.isArray(data.importErrors) && data.importErrors.length > 0 && (
        <div className="p-3 rounded-lg bg-red-500/10 text-xs text-red-300 space-y-1">
          {data.importErrors.map((item: string) => <div key={item}>{item}</div>)}
        </div>
      )}
      <div><label className="block text-xs text-muted mb-1">Import notes</label><textarea rows={3} className="input" value={data.notes || ''} onChange={(e) => set('notes', e.target.value)} /></div>
    </div>
  );
}

export function OnboardingForms() {
  const [section, setSection] = useState<Section>('school_profile');
  const [data, setData] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    clientApi.onboarding().then((res) => {
      const entries = res.submissions || [];
      setData(Object.fromEntries(entries.map((item: any) => [item.section, item.data || {}])));
      setStatus(Object.fromEntries(entries.map((item: any) => [item.section, item.status])));
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  async function save(submit: boolean) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await clientApi.saveOnboarding(section, data[section] || {}, submit);
      setStatus((prev) => ({ ...prev, [section]: submit ? 'submitted' : 'draft' }));
      setNotice(submit ? 'Submitted for review.' : 'Draft saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading onboarding forms...</p>;

  return (
    <div className="grid lg:grid-cols-[220px,1fr] gap-5">
      <div className="space-y-1">
        {SECTIONS.map((item) => (
          <button key={item.id} onClick={() => setSection(item.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-left ${section === item.id ? 'bg-violet-500/10 text-violet-300' : 'text-muted hover:bg-white/[0.04]'}`}>
            {item.label}
            {status[item.id] === 'submitted' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        ))}
      </div>
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-semibold">{SECTIONS.find((s) => s.id === section)?.label}</h2>
            <p className="text-[11px] text-faint mt-1">{status[section] ? `Status: ${status[section]}` : 'Not started'}</p>
          </div>
          {status[section] === 'submitted' && <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">Submitted</span>}
        </div>
        <Fields section={section} data={data[section] || {}} set={(key, value) => setData((prev) => ({ ...prev, [section]: { ...(prev[section] || {}), [key]: value } }))} setError={setError} setNotice={setNotice} />
        {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
        {notice && <p className="mt-4 text-xs text-emerald-400">{notice}</p>}
        <div className="flex flex-wrap gap-2 mt-6">
          <button disabled={saving} onClick={() => save(false)} className="btn btn-outline !py-2 !px-4 !text-xs"><Save className="w-3 h-3" /> Save draft</button>
          <button disabled={saving} onClick={() => save(true)} className="btn btn-primary !py-2 !px-4 !text-xs"><Send className="w-3 h-3" /> Submit for review</button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPortal() {
  return (
    <div className="min-h-screen bg-ink text-[#f5f5f5] py-28 px-6">
      <div className="container">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Project onboarding</h1>
            <p className="text-sm text-muted mt-2">Provide the information our team needs to configure your school system.</p>
          </div>
          <Link to="/client-portal" className="btn btn-outline !py-2 !px-4 !text-xs">Back to portal</Link>
        </div>
        <OnboardingForms />
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle, Building2, CheckCircle2, GraduationCap, Loader2, Plus, Trash2, UserRound,
} from 'lucide-react';
import { schoolsApi } from '../../lib/schools';

interface StudentForm {
  studentName: string;
  className: string;
  arm: string;
  gender: string;
  dateOfBirth: string;
  parentName: string;
  relationship: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
}

function newStudent(className = '', arm = ''): StudentForm {
  return {
    studentName: '',
    className,
    arm,
    gender: '',
    dateOfBirth: '',
    parentName: '',
    relationship: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
  };
}

export default function ClassInvite() {
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [headTeacher, setHeadTeacher] = useState({ fullName: '', email: '', phone: '' });
  const [students, setStudents] = useState<StudentForm[]>([newStudent()]);

  useEffect(() => {
    if (!token) {
      setError('This class invitation link is invalid.');
      return;
    }
    let cancelled = false;
    schoolsApi.getClassInvite(token)
      .then((data) => { if (!cancelled) setInvite(data); })
      .catch((err: any) => { if (!cancelled) setError(err.message || 'Could not load this class invitation.'); });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!invite) return;
    setStudents((current) => current.map((student) => ({
      ...student,
      className: student.className || invite.className || '',
      arm: student.arm || invite.arm || '',
    })));
  }, [invite]);

  function updateStudent(index: number, key: keyof StudentForm, value: string) {
    setStudents((current) => current.map((student, position) => (
      position === index ? { ...student, [key]: value } : student
    )));
  }

  function addStudent() {
    setStudents((current) => [...current, newStudent(invite?.className || '', invite?.arm || '')]);
  }

  function removeStudent(index: number) {
    setStudents((current) => current.filter((_, position) => position !== index));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || submitted) return;
    const fullName = headTeacher.fullName.trim();
    const email = headTeacher.email.trim();
    if (!fullName || !email) {
      setError('Enter the head teacher full name and email.');
      return;
    }
    const completeStudents = students.filter((student) =>
      student.studentName.trim() && student.parentName.trim() && student.parentPhone.trim());
    if (!completeStudents.length) {
      setError('Add at least one student with a student name, parent name and parent phone.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await schoolsApi.submitClassInvite(token, {
        headTeacher: { fullName, email, phone: headTeacher.phone },
        students: completeStudents,
      });
      setSubmitted(true);
      setNotice('Your class information has been submitted successfully.');
    } catch (err: any) {
      setError(err.message || 'Could not submit the class information.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !invite) {
    return (
      <div className="sm-root">
        <main className="sm-shell sm-center">
          <section className="sm-card sm-not-interested">
            <AlertCircle className="h-8 w-8" />
            <h1 className="sm-section-title">Invitation unavailable</h1>
            <p className="sm-error">{error}</p>
          </section>
        </main>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="sm-root sm-loading">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  const subjects: string[] = Array.isArray(invite.subjects) ? invite.subjects.map(String) : [];
  const disabled = submitted || busy;

  return (
    <div className="sm-root">
      <main className="sm-shell">
        <section className="sm-card sm-form-card">
          <div className="sm-section-heading">
            <div>
              <span className="sm-eyebrow sm-eyebrow-blue"><GraduationCap className="h-3.5 w-3.5" /> Class invitation</span>
              <h1 className="sm-section-title">Class information form</h1>
              <p className="sm-muted">Please provide the head teacher and student details for this class.</p>
            </div>
            {invite.schoolLogo
              ? <img src={invite.schoolLogo} alt={`${invite.schoolName || 'School'} logo`} className="sm-logo" />
              : <span className="sm-logo sm-logo-fallback"><Building2 className="h-5 w-5" /></span>}
          </div>
          <div className="sm-grid sm-grid-three">
            <div className="sm-card-soft">
              <p className="sm-small">School</p>
              <p className="sm-card-title">{invite.schoolName || 'School'}</p>
            </div>
            <div className="sm-card-soft">
              <p className="sm-small">Class</p>
              <p className="sm-card-title">{invite.className || '—'}</p>
              <p className="sm-small">Arm: {invite.arm || '—'}</p>
            </div>
            <div className="sm-card-soft">
              <p className="sm-small">Head teacher on record</p>
              <p className="sm-card-title">{invite.headTeacherName || 'To be provided'}</p>
            </div>
          </div>
          <div className="sm-chips" style={{ marginTop: 16 }}>
            {subjects.map((subject) => <span key={subject} className="sm-chip">{subject}</span>)}
          </div>
          {!subjects.length && <p className="sm-small" style={{ marginTop: 16 }}>No subjects were specified for this class.</p>}
        </section>

        {notice && (
          <section className="sm-card sm-center" style={{ marginTop: 24 }}>
            <span className="sm-success-icon"><CheckCircle2 className="h-7 w-7" /></span>
            <h2 className="sm-section-title">Submission received</h2>
            <p className="sm-lead">{notice}</p>
          </section>
        )}
        {error && <p className="sm-error" style={{ marginTop: 24 }}>{error}</p>}

        <form onSubmit={submit} className="sm-card sm-form-card" style={{ marginTop: 24 }}>
          <div className="sm-section-heading">
            <div>
              <span className="sm-eyebrow sm-eyebrow-blue"><UserRound className="h-3.5 w-3.5" /> Class details</span>
              <h2 className="sm-section-title">Head teacher and students</h2>
              <p className="sm-muted">Fields marked * are required. Only complete student rows will be submitted.</p>
            </div>
          </div>
          <fieldset disabled={disabled} className="sm-form-grid" style={{ border: 0, padding: 0, margin: 0 }}>
            <label className="sm-field">
              <span className="sm-field-label">Head teacher full name *</span>
              <input required className="sm-input" value={headTeacher.fullName} onChange={(event) => setHeadTeacher({ ...headTeacher, fullName: event.target.value })} placeholder="Full name" />
            </label>
            <label className="sm-field">
              <span className="sm-field-label">Head teacher email *</span>
              <input required type="email" className="sm-input" value={headTeacher.email} onChange={(event) => setHeadTeacher({ ...headTeacher, email: event.target.value })} placeholder="teacher@school.edu.ng" />
            </label>
            <label className="sm-field sm-field-wide">
              <span className="sm-field-label">Head teacher phone</span>
              <input type="tel" className="sm-input" value={headTeacher.phone} onChange={(event) => setHeadTeacher({ ...headTeacher, phone: event.target.value })} placeholder="+234 801 234 5678" />
            </label>

            <div className="sm-field sm-field-wide">
              <span className="sm-field-label">Students</span>
              {students.map((student, index) => (
                <div key={index} className="sm-card-soft" style={{ marginBottom: 14 }}>
                  <div className="sm-section-heading" style={{ marginBottom: 14 }}>
                    <p className="sm-semibold">Student {index + 1}</p>
                    <button type="button" onClick={() => removeStudent(index)} disabled={disabled || students.length === 1} className="sm-btn-ghost"><Trash2 className="h-4 w-4" /> Remove student</button>
                  </div>
                  <div className="sm-form-grid">
                    <label className="sm-field">
                      <span className="sm-field-label">Student name *</span>
                      <input className="sm-input" value={student.studentName} onChange={(event) => updateStudent(index, 'studentName', event.target.value)} placeholder="Student full name" />
                    </label>
                    <label className="sm-field">
                      <span className="sm-field-label">Class</span>
                      <input className="sm-input" value={student.className} onChange={(event) => updateStudent(index, 'className', event.target.value)} placeholder="Class name" />
                    </label>
                    <label className="sm-field">
                      <span className="sm-field-label">Arm</span>
                      <input className="sm-input" value={student.arm} onChange={(event) => updateStudent(index, 'arm', event.target.value)} placeholder="Arm" />
                    </label>
                    <label className="sm-field">
                      <span className="sm-field-label">Gender</span>
                      <select className="sm-input" value={student.gender} onChange={(event) => updateStudent(index, 'gender', event.target.value)}>
                        <option value="">Select gender</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                      </select>
                    </label>
                    <label className="sm-field">
                      <span className="sm-field-label">Date of birth</span>
                      <input type="date" className="sm-input" value={student.dateOfBirth} onChange={(event) => updateStudent(index, 'dateOfBirth', event.target.value)} />
                    </label>
                    <label className="sm-field">
                      <span className="sm-field-label">Parent name *</span>
                      <input className="sm-input" value={student.parentName} onChange={(event) => updateStudent(index, 'parentName', event.target.value)} placeholder="Parent or guardian" />
                    </label>
                    <label className="sm-field">
                      <span className="sm-field-label">Relationship</span>
                      <input className="sm-input" value={student.relationship} onChange={(event) => updateStudent(index, 'relationship', event.target.value)} placeholder="Mother, father, guardian..." />
                    </label>
                    <label className="sm-field">
                      <span className="sm-field-label">Parent phone *</span>
                      <input type="tel" className="sm-input" value={student.parentPhone} onChange={(event) => updateStudent(index, 'parentPhone', event.target.value)} placeholder="Parent phone number" />
                    </label>
                    <label className="sm-field">
                      <span className="sm-field-label">Parent email</span>
                      <input type="email" className="sm-input" value={student.parentEmail} onChange={(event) => updateStudent(index, 'parentEmail', event.target.value)} placeholder="parent@example.com" />
                    </label>
                    <label className="sm-field sm-field-wide">
                      <span className="sm-field-label">Address</span>
                      <input className="sm-input" value={student.address} onChange={(event) => updateStudent(index, 'address', event.target.value)} placeholder="Home address" />
                    </label>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addStudent} disabled={disabled} className="sm-btn-outline"><Plus className="h-4 w-4" /> Add student</button>
            </div>
            <div className="sm-field-wide sm-form-actions sm-actions-end">
              <button type="submit" disabled={disabled} className="sm-btn">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Submit class information
              </button>
            </div>
          </fieldset>
        </form>
      </main>
    </div>
  );
}

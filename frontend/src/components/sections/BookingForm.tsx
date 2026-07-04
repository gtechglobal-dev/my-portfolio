import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Loader2, X, AlertTriangle } from 'lucide-react';
import { webDevPackages, graphicsPackages } from '../../lib/constants';

const budgets = ['₦10k-₦50k', '₦50k-₦200k', '₦200k-₦500k', '₦500k-₦1M', '₦1M+', 'Custom'];

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="card p-8 max-w-md w-full relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-[#6b6560] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function BookingForm() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<'web-development' | 'graphics-design'>('web-development');
  const [selectedPkg, setSelectedPkg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', budget: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const pkg = searchParams.get('package');
    const cat = searchParams.get('category');
    if (cat === 'web-development' || cat === 'graphics-design') setCategory(cat);
    if (pkg) setSelectedPkg(pkg);
  }, [searchParams]);

  const packages = category === 'web-development' ? webDevPackages : graphicsPackages;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (!form.budget) errs.budget = 'Select a budget range';
    if (!form.description.trim()) errs.description = 'Description is required';
    else if (form.description.trim().length < 20) errs.description = 'Description must be at least 20 characters';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: form.name.trim(), clientEmail: form.email.trim(), clientPhone: form.phone.trim(), serviceCategory: category, package: selectedPkg, budget: form.budget, description: form.description.trim() }),
      });
      if (res.ok) {
        setSubmitted(true);
        setShowModal(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong. Please try again.');
        setShowModal(true);
      }
    } catch {
      setError('Could not connect to server. Make sure the backend is running (npm run dev in /backend).');
      setShowModal(true);
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', budget: '', description: '' });
    setSelectedPkg('');
    setStep(1);
    setSubmitted(false);
    setError('');
    setShowModal(false);
    setValidationErrors({});
  };

  return (
    <section className="min-h-screen bg-[#0c0b0a] pt-28 pb-24">
      <Modal open={showModal} onClose={() => { setShowModal(false); if (submitted) resetForm(); }}>
        {submitted ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Booking Submitted!</h3>
            <p className="text-sm text-[#a09890] mb-2">We'll review your details and contact you within 24 hours.</p>
            <div className="bg-[#151412] rounded-lg p-4 mt-4 text-left text-sm space-y-1">
              <p><span className="text-[#a09890]">Name:</span> {form.name}</p>
              <p><span className="text-[#a09890]">Email:</span> {form.email}</p>
              <p><span className="text-[#a09890]">Category:</span> {category === 'web-development' ? 'Web Development' : 'Graphics Design'}</p>
              {selectedPkg && <p><span className="text-[#a09890]">Package:</span> {selectedPkg}</p>}
              <p><span className="text-[#a09890]">Budget:</span> {form.budget}</p>
            </div>
            <div className="flex gap-3 mt-6 justify-center">
              <button onClick={resetForm} className="btn btn-primary">Book Another</button>
              <a href="/" className="btn btn-outline">Home</a>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Submission Failed</h3>
            <p className="text-sm text-[#a09890]">{error}</p>
            <div className="flex gap-3 mt-6 justify-center">
              <button onClick={() => setShowModal(false)} className="btn btn-primary">Try Again</button>
            </div>
          </div>
        )}
      </Modal>

      <div className="container px-6 md:px-8">
        <div className="text-center max-w-xl mx-auto mb-12 md:mb-14">
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">Book a Project</h2>
          <p className="mt-3 text-[0.9375rem] md:text-base text-[#a09890]">Tell us about your project and we'll get started.</p>
        </div>
        <div className="max-w-xl mx-auto">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-lg font-semibold text-center mb-6">Choose Category</h3>
              <div className="grid grid-cols-2 gap-4">
                {(['web-development', 'graphics-design'] as const).map((c) => (
                  <button key={c} onClick={() => { setCategory(c); setSelectedPkg(''); setStep(2); }}
                    className="card p-6 md:p-8 text-center transition-all cursor-pointer hover:border-indigo/30">
                    <div className="text-3xl mb-3">{c === 'web-development' ? '💻' : '🎨'}</div>
                    <h4 className="text-base font-semibold">{c === 'web-development' ? 'Web Development' : 'Graphics Design'}</h4>
                    <p className="text-sm text-[#a09890] mt-1">{c === 'web-development' ? 'Apps & websites' : 'Flyers & branding'}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-lg font-semibold text-center mb-6">Choose a Package</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <button key={pkg.id} onClick={() => { setSelectedPkg(pkg.id); setStep(3); }}
                    className="card p-5 md:p-6 text-left transition-all cursor-pointer hover:border-indigo/30">
                    <h4 className="text-sm font-semibold mb-2">{pkg.title}</h4>
                    <div className="text-indigo text-base font-bold">₦{pkg.price.ngn}</div>
                    <div className="text-xs text-[#6b6560]">${pkg.price.usd} USD</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-lg font-semibold text-center mb-6">Project Details</h3>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#a09890] mb-1.5">Name *</label>
                    <input type="text" required value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setValidationErrors({ ...validationErrors, name: '' }); }}
                      className={`w-full px-4 py-3 rounded-lg bg-[#151412] border text-white text-sm placeholder-[#6b6560] focus:outline-none transition-colors ${validationErrors.name ? 'border-red-500/40' : 'border-white/[0.06] focus:border-indigo/40'}`} placeholder="Your name" />
                    {validationErrors.name && <p className="text-red-400 text-[11px] mt-1">{validationErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-[#a09890] mb-1.5">Email *</label>
                    <input type="email" required value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setValidationErrors({ ...validationErrors, email: '' }); }}
                      className={`w-full px-4 py-3 rounded-lg bg-[#151412] border text-white text-sm placeholder-[#6b6560] focus:outline-none transition-colors ${validationErrors.email ? 'border-red-500/40' : 'border-white/[0.06] focus:border-indigo/40'}`} placeholder="you@email.com" />
                    {validationErrors.email && <p className="text-red-400 text-[11px] mt-1">{validationErrors.email}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#a09890] mb-1.5">Phone *</label>
                  <input type="tel" required value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setValidationErrors({ ...validationErrors, phone: '' }); }}
                    className={`w-full px-4 py-3 rounded-lg bg-[#151412] border text-white text-sm placeholder-[#6b6560] focus:outline-none transition-colors ${validationErrors.phone ? 'border-red-500/40' : 'border-white/[0.06] focus:border-indigo/40'}`} placeholder="+234 900 000 0000" />
                  {validationErrors.phone && <p className="text-red-400 text-[11px] mt-1">{validationErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm text-[#a09890] mb-1.5">Budget *</label>
                  <div className="flex flex-wrap gap-2">
                    {budgets.map((b) => (
                      <button key={b} type="button" onClick={() => { setForm({ ...form, budget: b }); setValidationErrors({ ...validationErrors, budget: '' }); }}
                        className={`px-4 py-1.5 rounded-lg text-sm transition-all cursor-pointer ${
                          form.budget === b ? 'bg-indigo/10 text-indigo border border-indigo/20' : 'bg-[#151412] text-[#a09890] border border-white/[0.06] hover:border-white/[0.12]'
                        }`}>{b}</button>
                    ))}
                  </div>
                  {validationErrors.budget && <p className="text-red-400 text-[11px] mt-1">{validationErrors.budget}</p>}
                </div>
                <div>
                  <label className="block text-sm text-[#a09890] mb-1.5">Description *</label>
                  <textarea required rows={4} value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setValidationErrors({ ...validationErrors, description: '' }); }}
                    className={`w-full px-4 py-3 rounded-lg bg-[#151412] border text-white text-sm placeholder-[#6b6560] focus:outline-none transition-colors resize-none ${validationErrors.description ? 'border-red-500/40' : 'border-white/[0.06] focus:border-indigo/40'}`} placeholder="Describe your project in detail (at least 20 characters)..." />
                  {validationErrors.description && <p className="text-red-400 text-[11px] mt-1">{validationErrors.description}</p>}
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-8">
                <button onClick={() => setStep(2)} className="btn btn-outline">Back</button>
                <button onClick={submit} disabled={submitting} className="btn btn-primary">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Booking'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

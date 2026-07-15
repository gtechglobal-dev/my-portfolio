import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Loader2, X, AlertTriangle, ChevronDown, Upload, Image as ImageIcon } from 'lucide-react';
import { webDevPackages, graphicsPackages, formatNgn, DEFAULT_EXCHANGE_RATE } from '../../lib/constants';

const countries = [
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '\u{1F1F3}\u{1F1EC}', pattern: /^[7-9][0-1]\d{7}$/, hint: '10 digits e.g. 8012345678' },
  { code: 'US', name: 'United States', dial: '+1', flag: '\u{1F1FA}\u{1F1F8}', pattern: /^[2-9]\d{9}$/, hint: '10 digits e.g. 2025551234' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '\u{1F1EC}\u{1F1E7}', pattern: /^7\d{9}$/, hint: '10 digits starting with 7' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '\u{1F1EC}\u{1F1ED}', pattern: /^[2-5]\d{8}$/, hint: '9 digits e.g. 241234567' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '\u{1F1F0}\u{1F1EA}', pattern: /^[17]\d{8}$/, hint: '9 digits e.g. 712345678' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '\u{1F1FF}\u{1F1E6}', pattern: /^[6-8]\d{8}$/, hint: '9 digits e.g. 812345678' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '\u{1F1E8}\u{1F1E6}', pattern: /^[2-9]\d{9}$/, hint: '10 digits e.g. 4165551234' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '\u{1F1E9}\u{1F1EA}', pattern: /^[1-9]\d{6,14}$/, hint: '7-15 digits' },
  { code: 'FR', name: 'France', dial: '+33', flag: '\u{1F1EB}\u{1F1F7}', pattern: /^[67]\d{8}$/, hint: '9 digits starting with 6 or 7' },
  { code: 'IN', name: 'India', dial: '+91', flag: '\u{1F1EE}\u{1F1F3}', pattern: /^[6-9]\d{9}$/, hint: '10 digits e.g. 9876543210' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '\u{1F1E7}\u{1F1F7}', pattern: /^[1-9]\d{9,10}$/, hint: '10-11 digits' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '\u{1F1E6}\u{1F1EA}', pattern: /^5[024568]\d{7}$/, hint: '9 digits starting with 5' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '\u{1F1F8}\u{1F1E6}', pattern: /^5\d{8}$/, hint: '9 digits starting with 5' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '\u{1F1EA}\u{1F1EC}', pattern: /^1[0125]\d{8}$/, hint: '10 digits starting with 1' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '\u{1F1EF}\u{1F1F5}', pattern: /^[7-9]0\d{8}$/, hint: '10 digits e.g. 9012345678' },
  { code: 'CN', name: 'China', dial: '+86', flag: '\u{1F1E8}\u{1F1F3}', pattern: /^1[3-9]\d{9}$/, hint: '11 digits starting with 1' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '\u{1F1E6}\u{1F1FA}', pattern: /^4\d{8}$/, hint: '9 digits starting with 4' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '\u{1F1EE}\u{1F1F9}', pattern: /^[3-9]\d{8,10}$/, hint: '9-11 digits' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '\u{1F1EA}\u{1F1F8}', pattern: /^[6-9]\d{8}$/, hint: '9 digits e.g. 612345678' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '\u{1F1F3}\u{1F1F1}', pattern: /^[6-9]\d{8}$/, hint: '9 digits e.g. 612345678' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '\u{1F1F8}\u{1F1EA}', pattern: /^[7-8]\d{7,9}$/, hint: '8-10 digits' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '\u{1F1E8}\u{1F1ED}', pattern: /^[7-8]\d{8}$/, hint: '9 digits' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '\u{1F1F5}\u{1F1F9}', pattern: /^[6-9]\d{8}$/, hint: '9 digits e.g. 912345678' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '\u{1F1F5}\u{1F1ED}', pattern: /^9\d{9}$/, hint: '10 digits starting with 9' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '\u{1F1F8}\u{1F1EC}', pattern: /^[689]\d{7}$/, hint: '8 digits' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '\u{1F1F2}\u{1F1FE}', pattern: /^1\d{8,9}$/, hint: '9-10 digits starting with 1' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '\u{1F1F5}\u{1F1F0}', pattern: /^3\d{9}$/, hint: '10 digits starting with 3' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '\u{1F1E7}\u{1F1E9}', pattern: /^1[3-9]\d{8}$/, hint: '10 digits starting with 1' },
  { code: 'IL', name: 'Israel', dial: '+972', flag: '\u{1F1EE}\u{1F1F1}', pattern: /^[5-9]\d{8}$/, hint: '9 digits' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '\u{1F1F9}\u{1F1F7}', pattern: /^[5]\d{9}$/, hint: '10 digits starting with 5' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '\u{1F1F0}\u{1F1F7}', pattern: /^1[016-9]\d{7,8}$/, hint: '9-10 digits starting with 1' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '\u{1F1F2}\u{1F1FD}', pattern: /^[1-9]\d{9}$/, hint: '10 digits' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '\u{1F1E6}\u{1F1F7}', pattern: /^[1-9]\d{9}$/, hint: '10 digits' },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '\u{1F1E8}\u{1F1F4}', pattern: /^3\d{9}$/, hint: '10 digits starting with 3' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '\u{1F1E8}\u{1F1F1}', pattern: /^[6-9]\d{8}$/, hint: '9 digits' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '\u{1F1F5}\u{1F1F1}', pattern: /^[5-8]\d{8}$/, hint: '9 digits' },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '\u{1F1F7}\u{1F1FA}', pattern: /^[9]\d{9}$/, hint: '10 digits starting with 9' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '\u{1F1F9}\u{1F1ED}', pattern: /^[6-9]\d{8}$/, hint: '9 digits' },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '\u{1F1FB}\u{1F1F3}', pattern: /^[3-9]\d{8}$/, hint: '9 digits' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '\u{1F1EE}\u{1F1E9}', pattern: /^[8]\d{9,12}$/, hint: '10-13 digits starting with 8' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '\u{1F1F3}\u{1F1FF}', pattern: /^2\d{7,9}$/, hint: '8-10 digits starting with 2' },
  { code: 'IE', name: 'Ireland', dial: '+353', flag: '\u{1F1EE}\u{1F1EA}', pattern: /^[8-9]\d{7,8}$/, hint: '8-9 digits' },
];

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
  const [form, setForm] = useState({ name: '', email: '', phone: '', country: 'NG', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [samplePreviews, setSamplePreviews] = useState<string[]>([]);

  useEffect(() => {
    const pkg = searchParams.get('package');
    const cat = searchParams.get('category');
    if (cat === 'web-development' || cat === 'graphics-design') setCategory(cat);
    if (pkg) setSelectedPkg(pkg);
    if (pkg && cat) setStep(3);
  }, [searchParams]);

  const packages = category === 'web-development' ? webDevPackages : graphicsPackages;

  const selectedCountry = countries.find((c) => c.code === form.country) || countries[0];
  const selectedPkgData = packages.find((p) => p.id === selectedPkg);

  const validate = () => {
    const errs: Record<string, string> = {};
    const name = form.name.trim();
    if (!name) errs.name = 'Name is required';
    else if (name.length > 100) errs.name = 'Name is too long';
    else if (/[<>"{}|\\^~\[\]`]/.test(name)) errs.name = 'Name contains invalid characters';

    const email = form.email.trim().toLowerCase();
    if (!email) errs.email = 'Email is required';
    else if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) errs.email = 'Enter a valid email address';

    if (!form.phone.trim()) errs.phone = 'Phone is required';
    else {
      const digits = form.phone.replace(/\D/g, '');
      if (!selectedCountry.pattern.test(digits)) errs.phone = `Invalid number for ${selectedCountry.name}. ${selectedCountry.hint}`;
    }

    if (!form.country) errs.country = 'Select a country';
    if (!selectedPkg) errs.package = 'Select a package';

    const desc = form.description.trim();
    if (!desc) errs.description = 'Description is required';
    else if (desc.length > 2000) errs.description = 'Description must be under 2000 characters';

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError('');
    try {
      const pkgLabel = selectedPkg === 'other' ? 'Other Designs (Custom)' : selectedPkgData ? `${selectedPkgData.title} — $${selectedPkgData.priceUsd} USD` : selectedPkg;
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: form.name.trim(),
          clientEmail: form.email.trim(),
          clientPhone: `${selectedCountry.dial} ${form.phone.trim()}`,
          clientCountry: `${selectedCountry.flag} ${selectedCountry.name}`,
          serviceCategory: category,
          package: pkgLabel,
          description: form.description.trim(),
          sampleImages: samplePreviews.length > 0 ? samplePreviews : undefined,
        }),
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
      setError('Could not connect to server. Make sure the backend is running.');
      setShowModal(true);
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', country: 'NG', description: '' });
    setSelectedPkg('');
    setStep(1);
    setSubmitted(false);
    setError('');
    setShowModal(false);
    setValidationErrors({});
    setSamplePreviews([]);
  };

  return (
    <section className="min-h-screen bg-[#0a0f14] pt-28 pb-24">
      <Modal open={showModal} onClose={() => { setShowModal(false); if (submitted) resetForm(); }}>
        {submitted ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Booking Submitted!</h3>
            <p className="text-sm text-[#a09890] mb-2">We'll review your details and get back to you shortly.</p>
            <div className="bg-[#111820] rounded-lg p-4 mt-4 text-left text-sm space-y-1">
              <p><span className="text-[#a09890]">Name:</span> {form.name}</p>
              <p><span className="text-[#a09890]">Email:</span> {form.email}</p>
              <p><span className="text-[#a09890]">Phone:</span> {selectedCountry.dial} {form.phone}</p>
              <p><span className="text-[#a09890]">Country:</span> {selectedCountry.flag} {selectedCountry.name}</p>
              <p><span className="text-[#a09890]">Category:</span> {category === 'web-development' ? 'Web Development' : 'Graphics Design'}</p>
              {selectedPkgData && selectedPkg !== 'other' && <p><span className="text-[#a09890]">Package:</span> {selectedPkgData.title} — ${selectedPkgData.priceUsd} USD</p>}
              {selectedPkg === 'other' && <p><span className="text-[#a09890]">Package:</span> Other Designs (Custom)</p>}
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
                  <button key={pkg.id} onClick={() => { setSelectedPkg(pkg.id); if (pkg.id === 'other') { setStep(3); } else { setStep(3); } }}
                    className="card p-5 md:p-6 text-left transition-all cursor-pointer hover:border-indigo/30">
                    <h4 className="text-sm font-semibold mb-2">{pkg.title}</h4>
                    {pkg.id !== 'other' ? (
                      <>
                        <div className="text-indigo text-base font-bold">${pkg.priceUsd}</div>
                      </>
                    ) : (
                      <div className="text-indigo text-sm font-medium mt-1">Describe your needs →</div>
                    )}
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
                      className={`w-full px-4 py-3 rounded-lg bg-[#111820] border text-white text-sm placeholder-[#6b6560] focus:outline-none transition-colors ${validationErrors.name ? 'border-red-500/40' : 'border-white/[0.06] focus:border-indigo/40'}`} placeholder="Your name" />
                    {validationErrors.name && <p className="text-red-400 text-[11px] mt-1">{validationErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-[#a09890] mb-1.5">Email *</label>
                    <input type="email" required value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setValidationErrors({ ...validationErrors, email: '' }); }}
                      className={`w-full px-4 py-3 rounded-lg bg-[#111820] border text-white text-sm placeholder-[#6b6560] focus:outline-none transition-colors ${validationErrors.email ? 'border-red-500/40' : 'border-white/[0.06] focus:border-indigo/40'}`} placeholder="you@email.com" />
                    {validationErrors.email && <p className="text-red-400 text-[11px] mt-1">{validationErrors.email}</p>}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#a09890] mb-1.5">Country *</label>
                    <div className="relative">
                      <select value={form.country} onChange={(e) => { setForm({ ...form, country: e.target.value }); setValidationErrors({ ...validationErrors, country: '' }); }}
                        className={`w-full px-4 py-3 rounded-lg bg-[#111820] border text-white text-sm focus:outline-none transition-colors appearance-none cursor-pointer ${validationErrors.country ? 'border-red-500/40' : 'border-white/[0.06] focus:border-indigo/40'}`}>
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6560] pointer-events-none" />
                    </div>
                    {validationErrors.country && <p className="text-red-400 text-[11px] mt-1">{validationErrors.country}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-[#a09890] mb-1.5">Phone *</label>
                    <div className="flex">
                      <span className="flex items-center px-3 py-3 rounded-l-lg bg-[#1a1915] border border-r-0 border-white/[0.06] text-sm text-[#a09890] shrink-0 select-none">
                        {selectedCountry.flag} {selectedCountry.dial}
                      </span>
                      <input type="tel" required value={form.phone}
                        onChange={(e) => { const digits = e.target.value.replace(/\D/g, '').slice(0, 15); setForm({ ...form, phone: digits }); setValidationErrors({ ...validationErrors, phone: '' }); }}
                        className={`w-full px-4 py-3 rounded-r-lg bg-[#111820] border text-white text-sm placeholder-[#6b6560] focus:outline-none transition-colors ${validationErrors.phone ? 'border-red-500/40' : 'border-white/[0.06] focus:border-indigo/40'}`} placeholder={selectedCountry.hint} />
                    </div>
                    {validationErrors.phone ? (
                      <p className="text-red-400 text-[11px] mt-1">{validationErrors.phone}</p>
                    ) : (
                      <p className="text-[10px] text-[#6b6560] mt-1">{selectedCountry.hint}</p>
                    )}
                  </div>
                </div>
                {category === 'graphics-design' && (
                  <div>
                    <label className="block text-sm text-[#a09890] mb-1.5">Upload Samples (optional)</label>
                    <p className="text-[11px] text-[#6b6560] mb-2">Upload reference images of what you want designed (max 3)</p>
                    {samplePreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {samplePreviews.map((img, i) => (
                          <div key={i} className="relative group rounded-lg overflow-hidden border border-white/[0.06] bg-[#111820]">
                            <img src={img} alt={`Sample ${i + 1}`} className="w-full h-28 object-contain p-1" />
                            <button onClick={() => setSamplePreviews((prev) => prev.filter((_, j) => j !== i))}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/70">
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed border-white/[0.08] bg-[#111820] cursor-pointer hover:border-indigo/30 transition-colors py-5">
                      <Upload className="w-5 h-5 text-[#6b6560] mb-1" />
                      <span className="text-xs text-[#6b6560]">{samplePreviews.length === 0 ? 'Click to upload images' : 'Add more images'}</span>
                      <span className="text-[10px] text-[#4a4540] mt-0.5">PNG, JPG, WEBP — max 5MB each</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files) return;
                          const remaining = 3 - samplePreviews.length;
                          if (remaining <= 0) { alert('Maximum 3 sample images allowed.'); return; }
                          Array.from(files).slice(0, remaining).forEach((file) => {
                            if (file.size > 5 * 1024 * 1024) { alert(`"${file.name}" is too large. Max 5MB.`); return; }
                            const reader = new FileReader();
                            reader.onload = () => setSamplePreviews((prev) => [...prev, reader.result as string]);
                            reader.readAsDataURL(file);
                          });
                          e.target.value = '';
                        }} />
                    </label>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-[#a09890] mb-1.5">Description *</label>
                  <textarea required rows={4} value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setValidationErrors({ ...validationErrors, description: '' }); }}
                    className={`w-full px-4 py-3 rounded-lg bg-[#111820] border text-white text-sm placeholder-[#6b6560] focus:outline-none transition-colors resize-none ${validationErrors.description ? 'border-red-500/40' : 'border-white/[0.06] focus:border-indigo/40'}`} placeholder="Describe your project in detail (at least 20 characters)..." />
                  {validationErrors.description && <p className="text-red-400 text-[11px] mt-1">{validationErrors.description}</p>}
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-8">
                <button onClick={() => setStep(2)} className="btn btn-outline">Back</button>
                <button onClick={submit} disabled={submitting} className="btn btn-primary">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Booking'}
                </button>
              </div>
              {validationErrors.package && <p className="text-red-400 text-[11px] mt-2 text-center">{validationErrors.package}</p>}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

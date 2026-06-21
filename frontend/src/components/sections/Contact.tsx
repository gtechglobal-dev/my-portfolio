import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MessageSquare, Linkedin, Send, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../../lib/constants';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setSent(true); }
    } catch {}
    setSending(false);
  };

  return (
    <section className="py-20 md:py-24">
      <div className="container px-6 md:px-8">
        <div className="text-center max-w-xl mx-auto mb-12 md:mb-14">
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">Contact Us</h2>
          <p className="mt-3 text-[0.9375rem] md:text-base text-[#7a7a8c]">Have a project in mind? Let's discuss how we can help.</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-8 md:gap-10 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            {sent ? (
              <div className="card p-8 md:p-10 text-center">
                <div className="text-xl font-bold mb-2">Message Sent!</div>
                <p className="text-sm text-[#7a7a8c] mb-6">We'll get back to you soon.</p>
                <button onClick={() => setSent(false)} className="btn btn-outline">Send Another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#7a7a8c] mb-1.5">Name *</label>
                    <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-[#12121c] border border-white/[0.06] text-white text-sm placeholder-[#5a5a6e] focus:border-indigo/40 focus:outline-none transition-colors" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm text-[#7a7a8c] mb-1.5">Email *</label>
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-[#12121c] border border-white/[0.06] text-white text-sm placeholder-[#5a5a6e] focus:border-indigo/40 focus:outline-none transition-colors" placeholder="you@email.com" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#7a7a8c] mb-1.5">Phone</label>
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-[#12121c] border border-white/[0.06] text-white text-sm placeholder-[#5a5a6e] focus:border-indigo/40 focus:outline-none transition-colors" placeholder="+234 900 000 0000" />
                  </div>
                  <div>
                    <label className="block text-sm text-[#7a7a8c] mb-1.5">Subject *</label>
                    <input type="text" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-[#12121c] border border-white/[0.06] text-white text-sm placeholder-[#5a5a6e] focus:border-indigo/40 focus:outline-none transition-colors" placeholder="Project discussion" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#7a7a8c] mb-1.5">Message *</label>
                  <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-[#12121c] border border-white/[0.06] text-white text-sm placeholder-[#5a5a6e] focus:border-indigo/40 focus:outline-none transition-colors resize-none" placeholder="Tell us about your project..." />
                </div>
                <button type="submit" disabled={sending} className="btn btn-primary">
                  {sending ? 'Sending...' : 'Send Message'} <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.08 }} className="space-y-3">
            {[
              { icon: Mail, label: 'Email', value: siteConfig.email, href: `mailto:${siteConfig.email}` },
              { icon: Phone, label: 'Phone', value: siteConfig.phone, href: `tel:${siteConfig.phone}` },
              { icon: MessageSquare, label: 'WhatsApp', value: 'Chat with us', href: siteConfig.social.whatsapp, external: true },
              { icon: Linkedin, label: 'LinkedIn', value: 'Okoro Ebube', href: siteConfig.social.linkedin, external: true },
            ].map((item) => (
              <a key={item.label} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined}
                className="card p-5 md:p-6 flex items-center gap-4 group hover:border-indigo/20 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-indigo/[0.06] flex items-center justify-center shrink-0">
                  <item.icon className="w-[18px] h-[18px] text-indigo" />
                </div>
                <div>
                  <div className="text-xs text-[#7a7a8c]">{item.label}</div>
                  <div className="text-sm font-medium">{item.value}</div>
                </div>
              </a>
            ))}
            <div className="card p-5 md:p-6">
              <Link to="/booking" className="w-full py-3 rounded-lg bg-indigo text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-dark transition-all">
                Book a Project <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

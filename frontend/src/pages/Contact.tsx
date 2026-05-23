import { useState } from "react";
import { Mail, Phone, MessageCircle, Github, Linkedin, Twitter, Instagram, Send } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch {
      // fallback: open mailto if API fails
      window.open(
        `mailto:gtechglobal.dev@gmail.com?subject=New Project Inquiry from ${form.name}&body=${encodeURIComponent(
          `Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`
        )}`
      );
    }
    setSent(true);
    setForm({ name: "", email: "", message: "" });
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="section-padding">
      <div className="container-premium px-4 md:px-6">
        <div className="max-w-2xl mx-auto mb-14">
          <span className="text-xs text-primary font-semibold tracking-wider uppercase">
            Get in Touch
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-4">
            Let&apos;s Build Together
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            Ready to transform your digital presence? Let&apos;s turn your vision
            into a modern digital experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-dark-border bg-dark-card/50 text-text-primary text-sm placeholder:text-text-muted focus:border-primary/50 focus:outline-none transition-colors"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-dark-border bg-dark-card/50 text-text-primary text-sm placeholder:text-text-muted focus:border-primary/50 focus:outline-none transition-colors"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Message
              </label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-dark-border bg-dark-card/50 text-text-primary text-sm placeholder:text-text-muted focus:border-primary/50 focus:outline-none transition-colors resize-none"
                placeholder="Tell me about your project..."
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              {sent ? "Message Sent!" : "Send Message"}
              <Send size={14} />
            </button>
          </form>

          <div className="space-y-4">
            <a
              href="https://wa.me/2349054867749"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border border-dark-border hover:border-green-500/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <MessageCircle size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-xs text-text-muted">WhatsApp</p>
                <p className="text-sm font-medium text-text-primary group-hover:text-green-500 transition-colors">
                  Chat on WhatsApp
                </p>
              </div>
            </a>

            <a
              href="mailto:gtechglobal.dev@gmail.com"
              className="flex items-center gap-3 p-4 rounded-xl border border-dark-border hover:border-primary/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Email</p>
                <p className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                  gtechglobal.dev@gmail.com
                </p>
              </div>
            </a>

            <a
              href="tel:+2349054867749"
              className="flex items-center gap-3 p-4 rounded-xl border border-dark-border hover:border-secondary/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Phone size={20} className="text-secondary" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Phone</p>
                <p className="text-sm font-medium text-text-primary group-hover:text-secondary transition-colors">
                  09054867749
                </p>
              </div>
            </a>

            <div className="p-4 rounded-xl border border-dark-border">
              <p className="text-xs text-text-muted mb-3">Social</p>
              <div className="flex gap-2">
                {[
                  { icon: Github, href: "#", label: "GitHub" },
                  { icon: Linkedin, href: "#", label: "LinkedIn" },
                  { icon: Twitter, href: "#", label: "Twitter" },
                  { icon: Instagram, href: "#", label: "Instagram" },
                ].map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg border border-dark-border flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/30 transition-colors"
                    aria-label={label}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

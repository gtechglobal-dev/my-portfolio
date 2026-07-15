import { motion } from 'framer-motion';
import { Download, ExternalLink, Mail, Phone, MapPin, Globe, Code, Smartphone, Palette, ShoppingCart, Search } from 'lucide-react';
import { siteConfig } from '../lib/constants';

const skills = [
  { category: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'Vite', 'TailwindCSS', 'Framer Motion'] },
  { category: 'Backend', items: ['Node.js', 'Express', 'REST APIs', 'Socket.IO'] },
  { category: 'Databases', items: ['MongoDB', 'PostgreSQL', 'Redis'] },
  { category: 'DevOps', items: ['Git', 'Vercel', 'Netlify', 'PWA', 'CI/CD'] },
  { category: 'Design', items: ['UI/UX Design', 'Brand Identity', 'Responsive Design'] },
  { category: 'Other', items: ['SEO', 'Payment Integration', 'CMS Integration'] },
];

const experience = [
  {
    role: 'Founder & Lead Developer',
    company: 'Gtech Global',
    period: '2022 - Present',
    highlights: [
      'Founded and operate a full-service digital agency serving clients across web development, mobile apps, and design',
      'Architected and deployed 8+ production applications including community platforms, marketplaces, and fintech solutions',
      'Built a booking and client management system streamlining project intake and communication',
      'Integrated payment gateways (Paystack, Stripe) and real-time features using Socket.IO',
    ],
  },
];

const projects = [
  { title: 'Youth Community Management System', tech: 'Next.js, MongoDB, Socket.IO, PWA', desc: 'Interactive youth engagement platform with real-time features, role-based dashboards, and community management tools serving 2,000+ active users.' },
  { title: 'PrestigeMart Marketplace', tech: 'Next.js, Stripe, MongoDB, TailwindCSS', desc: 'Full-featured service marketplace where users browse, select, and pay for digital projects.' },
  { title: 'Academic Result Portal', tech: 'React, Node.js, PostgreSQL, Chart.js', desc: 'School result management system for nursery, primary and secondary schools with secure login, term filtering, automated grade computation, and printable report cards.', url: 'https://phronesisresultportal.gtechglobal.dev/' },
  { title: 'Church Website & Member Portal', tech: 'Next.js, Paystack, Sanity CMS, TailwindCSS', desc: 'Digital presence with sermon archives, event calendar, donation integration, and member portal.' },
  { title: 'Fintech Dashboard', tech: 'React, Node.js, PostgreSQL, Chart.js', desc: 'Real-time financial analytics dashboard with transaction monitoring and multi-currency support.' },
  { title: 'E-Commerce Fashion Platform', tech: 'Next.js, MongoDB, Paystack, Redis', desc: 'Premium fashion e-commerce with inventory management, seamless checkout, and order tracking.' },
];

const services = [
  { icon: Code, title: 'Web Development', desc: 'Custom websites and full-stack web applications built with modern frameworks.' },
  { icon: Smartphone, title: 'Mobile Apps', desc: 'Cross-platform iOS and Android applications.' },
  { icon: Palette, title: 'UI/UX Design', desc: 'Beautiful, intuitive, and effective user interfaces.' },
  { icon: ShoppingCart, title: 'E-Commerce', desc: 'Online stores with secure payments and smooth checkout.' },
  { icon: Globe, title: 'Brand Identity', desc: 'Logos, color systems, and brand guidelines.' },
  { icon: Search, title: 'SEO & Analytics', desc: 'Search optimization and data-driven growth strategies.' },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-indigo mb-5 tracking-wide uppercase">
      {children}
      <span className="block w-10 h-0.5 bg-indigo/40 mt-2 rounded-full" />
    </h2>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm text-[#c4c4d4] leading-relaxed">
      <span className="text-indigo mt-1 shrink-0">•</span>
      <span>{children}</span>
    </li>
  );
}

export default function ResumePage() {
  return (
    <div className="pt-20 md:pt-24 pb-16">
      <div className="container px-6 md:px-8">

        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-[-0.01em]">Resume</h1>
            <p className="text-sm text-[#a09890] mt-1">Professional profile & experience</p>
          </div>
          <a
            href="/api/resume/download"
            className="btn btn-primary text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="card p-6 md:p-7"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo to-violet-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
                  OE
                </div>
                <div>
                  <h2 className="font-bold text-base">Okoro Ebubechukwu E.</h2>
                  <p className="text-xs text-[#a09890]">Full-Stack Developer & Agency Founder | CEO of Gtechglobal</p>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-3 text-[#a09890] hover:text-white transition-colors">
                  <Mail className="w-4 h-4 text-indigo shrink-0" />
                  {siteConfig.email}
                </a>
                <a href={`tel:${siteConfig.phone}`} className="flex items-center gap-3 text-[#a09890] hover:text-white transition-colors">
                  <Phone className="w-4 h-4 text-indigo shrink-0" />
                  {siteConfig.phone}
                </a>
                <div className="flex items-center gap-3 text-[#a09890]">
                  <MapPin className="w-4 h-4 text-indigo shrink-0" />
                  Nigeria
                </div>
                <a href={siteConfig.social.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[#a09890] hover:text-white transition-colors">
                  <svg className="w-4 h-4 text-indigo shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  linkedin.com/in/okoroebube-gtech/
                </a>
                <a href={siteConfig.social.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[#a09890] hover:text-white transition-colors">
                  <svg className="w-4 h-4 text-indigo shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  github.com/gtechglobal-dev
                </a>
                <a href="https://gtechglobal.netlify.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[#a09890] hover:text-white transition-colors">
                  <Globe className="w-4 h-4 text-indigo shrink-0" />
                  gtechglobal.netlify.app
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="card p-6 md:p-7"
            >
              <SectionTitle>Skills</SectionTitle>
              <div className="space-y-4">
                {skills.map((g) => (
                  <div key={g.category}>
                    <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">{g.category}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.items.map((s) => (
                        <span key={s} className="text-[11px] px-2 py-1 rounded-md bg-white/[0.04] text-[#c4c4d4] border border-white/[0.05]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="card p-6 md:p-7"
            >
              <SectionTitle>Professional Summary</SectionTitle>
              <p className="text-sm text-[#c4c4d4] leading-relaxed">
                Results-driven full-stack developer and founder of Gtech Global, a digital agency specializing in web development,
                mobile applications, UI/UX design, and brand identity. Proven track record of delivering high-quality digital
                solutions for diverse clients, from interactive community platforms to e-commerce marketplaces and fintech dashboards.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="card p-6 md:p-7"
            >
              <SectionTitle>Experience</SectionTitle>
              {experience.map((exp) => (
                <div key={exp.role}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-semibold text-sm">{exp.role}</h3>
                      <p className="text-xs text-indigo/80">{exp.company}</p>
                    </div>
                    <span className="text-[11px] text-[#6b6560] shrink-0">{exp.period}</span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {exp.highlights.map((h, i) => (
                      <div key={i}><Bullet>{h}</Bullet></div>
                    ))}
                  </ul>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="card p-6 md:p-7"
            >
              <SectionTitle>Selected Projects</SectionTitle>
              <div className="space-y-5">
                {projects.map((p) => (
                  <div key={p.title} className="pb-4 border-b border-white/[0.04] last:border-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-sm">{p.title}</h3>
                      <ExternalLink className="w-3.5 h-3.5 text-indigo/40 shrink-0 mt-0.5" />
                    </div>
                    <p className="text-[11px] text-indigo/60 mt-0.5">{p.tech}</p>
                    <p className="text-sm text-[#a09890] mt-1.5 leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="card p-6 md:p-7"
            >
              <SectionTitle>Services</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-3">
                {services.map((s) => (
                  <div key={s.title} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="w-8 h-8 rounded-lg bg-indigo/10 flex items-center justify-center shrink-0">
                      <s.icon className="w-4 h-4 text-indigo" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{s.title}</p>
                      <p className="text-[11px] text-[#a09890] mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="card p-6 md:p-7"
            >
              <SectionTitle>Education</SectionTitle>
              <div>
                <h3 className="font-semibold text-sm">Imo State University</h3>
                <p className="text-xs text-indigo/80">Mechanical Engineering</p>
                <p className="text-[11px] text-[#6b6560] mt-0.5">2012 - 2017</p>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}

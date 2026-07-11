import { useState, ImgHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X, Layers, Code, Clock, Sparkles } from 'lucide-react';

function getScreenshotUrl(siteUrl: string) {
  return `https://image.thum.io/get/width/1200/crop/800/${siteUrl}`;
}

function DynamicScreenshot({
  src,
  siteUrl,
  fallbackSrc,
  color,
  title,
  ...props
}: {
  src?: string | null;
  siteUrl: string;
  fallbackSrc?: string | null;
  color: string;
  title: string;
} & ImgHTMLAttributes<HTMLImageElement>) {
  const [attempt, setAttempt] = useState<'dynamic' | 'static' | 'failed'>('dynamic');

  const currentSrc = attempt === 'dynamic'
    ? getScreenshotUrl(siteUrl)
    : attempt === 'static' && fallbackSrc
      ? fallbackSrc
      : null;

  if (!currentSrc) return null;

  return (
    <img
      {...props}
      src={currentSrc}
      onError={() => {
        if (attempt === 'dynamic') setAttempt('static');
        else setAttempt('failed');
      }}
    />
  );
}

const projects = [
  {
    title: 'Youth Community Management System',
    category: 'Fullstack Platform',
    desc: 'Interactive youth engagement platform with real-time features, PWA support, role-based dashboards, and community management tools.',
    tech: ['Next.js', 'MongoDB', 'Socket.IO', 'PWA'],
    url: 'https://royalyouths.onrender.com/',
    siteUrl: 'https://royalyouths.onrender.com/',
    image: '/screenshots/royal-youths.png',
    color: '#d97706',
    metric: '2K+ Active Users',
    status: 'live',
  },
  {
    title: 'PrestigeMart Marketplace',
    category: 'Digital Services Mall',
    desc: 'A full-featured service marketplace where users browse, select, and pay for digital projects — from design to development.',
    tech: ['Next.js', 'Stripe', 'MongoDB', 'TailwindCSS'],
    url: 'https://prestigemart.netlify.app/',
    siteUrl: 'https://prestigemart.netlify.app/',
    image: '/screenshots/prestige-mart.png',
    color: '#f59e0b',
    metric: 'Live & Active',
    status: 'live',
  },
  {
    title: 'Academic Result Portal',
    category: 'EdTech',
    desc: 'Student result checking system with secure login, semester filtering, GPA calculation, and printable result transcripts.',
    tech: ['React', 'Node.js', 'PostgreSQL', 'Chart.js'],
    url: 'https://phronesisresultportal.gtechglobal.dev/',
    siteUrl: 'https://phronesisresultportal.gtechglobal.dev/',
    image: '/screenshots/school-results.png',
    color: '#10b981',
    metric: 'Demo Available',
    status: 'live',
  },
  {
    title: 'Your Church Website',
    category: 'Church Management',
    desc: 'Digital presence for a modern church with sermon archives, event calendar, donation integration, and member portal.',
    tech: ['Next.js', 'Paystack', 'Sanity CMS', 'TailwindCSS'],
    url: 'https://houseonthethronechurch.netlify.app/',
    siteUrl: 'https://houseonthethronechurch.netlify.app/',
    image: '/screenshots/church.png',
    color: '#a78bfa',
    metric: 'Live Website',
    status: 'live',
  },
  {
    title: 'Fintech Dashboard',
    category: 'Financial SaaS',
    desc: 'Real-time financial analytics dashboard with transaction monitoring and multi-currency support.',
    tech: ['React', 'Node.js', 'PostgreSQL', 'Chart.js'],
    url: '#',
    siteUrl: '',
    image: null,
    color: '#10b981',
    metric: 'Under Development',
    status: 'coming',
  },
  {
    title: 'AI SaaS Platform',
    category: 'AI',
    desc: 'AI-powered content generation platform with NLP capabilities and subscription billing.',
    tech: ['Next.js', 'Python', 'TensorFlow', 'Stripe'],
    url: '#',
    siteUrl: '',
    image: null,
    color: '#a78bfa',
    metric: 'Under Development',
    status: 'coming',
  },
  {
    title: 'E-Commerce Fashion',
    category: 'Online Store',
    desc: 'Premium fashion e-commerce with inventory management and seamless checkout.',
    tech: ['Next.js', 'MongoDB', 'Paystack', 'Redis'],
    url: '#',
    siteUrl: '',
    image: null,
    color: '#f472b6',
    metric: 'Under Development',
    status: 'coming',
  },
  {
    title: 'Real Estate Platform',
    category: 'Marketplace',
    desc: 'Property listing platform with virtual tours, mortgage calculator, and agent management.',
    tech: ['React', 'Node.js', 'PostgreSQL', 'Mapbox'],
    url: '#',
    siteUrl: '',
    image: null,
    color: '#f59e0b',
    metric: 'Under Development',
    status: 'coming',
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 100, damping: 14 },
  },
};

const modalOverlay = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};

const modalPanel = {
  hidden: { opacity: 0, scale: 0.92, y: 40 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

function ProjectModal({ project, onClose }: { project: (typeof projects)[0]; onClose: () => void }) {
  return (
    <motion.div
      variants={modalOverlay}
      initial="hidden"
      animate="show"
      exit="hidden"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        variants={modalPanel}
        initial="hidden"
        animate="show"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#151412] border border-white/[0.06] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="relative">
          {project.siteUrl || project.image ? (
            <div className="w-full h-52 md:h-56 overflow-hidden rounded-t-2xl bg-[#1c1a18]">
              <DynamicScreenshot
                siteUrl={project.siteUrl}
                fallbackSrc={project.image}
                color={project.color}
                title={project.title}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className="w-full h-52 md:h-56 rounded-t-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${project.color}15, ${project.color}08)` }}
            >
              <div className="text-center">
                <Layers className="w-10 h-10 mx-auto opacity-20" style={{ color: project.color }} />
                <div className="text-xs text-white/20 mt-2">Preview coming soon</div>
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
          {project.status === 'coming' && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.06]">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">Coming Soon</span>
            </div>
          )}
        </div>
        <div className="p-6 md:p-7">
          <span className="text-[11px] uppercase tracking-wider text-white/40">{project.category}</span>
          <h2 className="text-xl font-bold mt-1 mb-3">{project.title}</h2>
          <p className="text-sm text-[#a09890] leading-relaxed mb-5">{project.desc}</p>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {project.tech.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] text-white/50 border border-white/[0.05]"
              >
                <Code className="w-3 h-3" />
                {t}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Sparkles className="w-3.5 h-3.5" style={{ color: project.color }} />
              <span style={{ color: project.color }} className="font-medium">{project.metric}</span>
            </div>
            {project.status === 'live' && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary text-xs"
              >
                Visit Live Site <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PortfolioGrid() {
  const [selected, setSelected] = useState<(typeof projects)[0] | null>(null);

  return (
    <section className="py-20 md:py-24">
      <div className="container px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-xl mx-auto mb-12 md:mb-14"
        >
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">
            Our <span className="gradient-text">Portfolio</span>
          </h2>
          <p className="mt-3 text-[0.9375rem] md:text-base text-[#a09890]">
            Real projects we've shipped. Real results we've delivered.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
        >
          {projects.map((p, i) => (
            <motion.div
              key={p.title}
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.02, transition: { type: 'spring' as const, stiffness: 300, damping: 15 } }}
              onClick={() => p.status === 'live' && setSelected(p)}
              className={`card p-0 overflow-hidden cursor-default ${p.status === 'live' ? 'cursor-pointer' : ''} group`}
            >
              <div
                className="relative w-full h-36 md:h-40 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${p.color}12, ${p.color}06)` }}
              >
                {p.siteUrl || p.image ? (
                  <DynamicScreenshot
                    siteUrl={p.siteUrl}
                    fallbackSrc={p.image}
                    color={p.color}
                    title={p.title}
                    alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Layers className="w-8 h-8 opacity-[0.07]" style={{ color: p.color }} />
                  </div>
                )}
                {p.status === 'coming' && (
                  <div className="absolute inset-0 bg-[#0c0b0a]/60 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] font-medium text-amber-400/80 uppercase tracking-wider">Under Development</span>
                    </div>
                  </div>
                )}
                {p.status === 'live' && (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20">
                    <span className="text-[9px] font-medium text-emerald-400 uppercase tracking-wider">Live</span>
                  </div>
                )}
              </div>

              <div className="p-4 md:p-5">
                <span className="text-[10px] uppercase tracking-wider text-white/40">{p.category}</span>
                <h3 className="text-sm font-semibold mt-0.5 mb-1.5">{p.title}</h3>
                <p className="text-xs text-[#a09890] leading-relaxed line-clamp-2 mb-3">{p.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {p.tech.slice(0, 3).map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/40">{t}</span>
                  ))}
                  {p.tech.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/40">+{p.tech.length - 3}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 pt-2.5 mt-2.5 border-t border-white/[0.04]">
                  {p.status === 'live' ? (
                    <>
                      <span className="text-xs text-indigo flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        View Details
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-white/20 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && <ProjectModal project={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  );
}

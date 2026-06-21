import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const projects = [
  { title: 'Royal Youth Hub', category: 'Fullstack Platform', desc: 'Interactive youth engagement platform with real-time features, PWA support, and admin dashboard.', tech: ['Next.js', 'MongoDB', 'Socket.IO', 'PWA'], url: 'https://royalyouths.onrender.com/', color: '#6366f1', metric: '2K+ Users' },
  { title: 'Fintech Dashboard', category: 'Financial SaaS', desc: 'Real-time financial analytics dashboard with transaction monitoring and multi-currency support.', tech: ['React', 'Node.js', 'PostgreSQL', 'Chart.js'], color: '#10b981', metric: '$50K+ Tracked' },
  { title: 'AI SaaS Platform', category: 'AI', desc: 'AI-powered content generation platform with NLP capabilities and subscription billing.', tech: ['Next.js', 'Python', 'TensorFlow', 'Stripe'], color: '#a78bfa', metric: '10K+ Generations' },
  { title: 'E-Commerce Fashion', category: 'Online Store', desc: 'Premium fashion e-commerce with inventory management and seamless checkout.', tech: ['Next.js', 'MongoDB', 'Paystack', 'Redis'], color: '#f472b6', metric: '5K+ Orders' },
  { title: 'Real Estate Platform', category: 'Marketplace', desc: 'Property listing platform with virtual tours, mortgage calculator, and agent management.', tech: ['React', 'Node.js', 'PostgreSQL', 'Mapbox'], color: '#f59e0b', metric: '500+ Listings' },
  { title: 'School Management', category: 'EdTech', desc: 'School management system with attendance tracking, grade management, and parent portal.', tech: ['Next.js', 'MongoDB', 'Socket.IO', 'Chart.js'], color: '#60a5fa', metric: '1K+ Students' },
  { title: 'Restaurant Ordering', category: 'Food Tech', desc: 'Digital ordering platform with real-time tracking, menu management, and delivery integration.', tech: ['React', 'Node.js', 'Firebase', 'Stripe'], color: '#ef4444', metric: '3K+ Orders' },
  { title: 'Live Streaming App', category: 'Media', desc: 'Live streaming platform with real-time video, chat system, and content management.', tech: ['Next.js', 'WebRTC', 'Socket.IO', 'AWS'], color: '#8b5cf6', metric: '100K+ Views' },
];

export default function PortfolioGrid() {
  return (
    <section className="py-20 md:py-24">
      <div className="container px-6 md:px-8">
        <div className="text-center max-w-xl mx-auto mb-12 md:mb-14">
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">Our Work</h2>
          <p className="mt-3 text-[0.9375rem] md:text-base text-[#7a7a8c]">Showcasing our finest projects across various industries.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {projects.map((p, i) => (
            <motion.div key={p.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: i * 0.04, duration: 0.35 }} className="card p-5 md:p-6 group">
              <div className="w-full h-28 md:h-32 rounded-lg mb-4 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${p.color}08, ${p.color}03)`, border: `1px solid ${p.color}15` }}>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold" style={{ color: p.color }}>{p.metric.split('+')[0]}</div>
                  <div className="text-xs text-white/30">{p.metric.split('+')[1]}+</div>
                </div>
              </div>
              <span className="text-xs text-white/40">{p.category}</span>
              <h3 className="text-sm font-semibold mt-0.5 mb-1.5">{p.title}</h3>
              <p className="text-xs text-[#7a7a8c] leading-relaxed mb-3 line-clamp-2">{p.desc}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {p.tech.slice(0, 3).map((t) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/40">{t}</span>
                ))}
                {p.tech.length > 3 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/40">+{p.tech.length - 3}</span>}
              </div>
              <div className="flex items-center gap-3 pt-2.5 border-t border-white/[0.04]">
                <a href={p.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-indigo hover:text-white transition-colors flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  Live
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

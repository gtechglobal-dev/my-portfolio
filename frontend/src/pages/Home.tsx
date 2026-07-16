import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Services from '../components/sections/Services';
import CtaSection from '../components/sections/CtaSection';
import TypeWriter from '../components/sections/TypeWriter';
import { Target, Lightbulb, Rocket } from 'lucide-react';

const shapes = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 18 + 8,
  delay: Math.random() * 4,
  duration: Math.random() * 10 + 8,
  rotation: Math.random() * 360,
}));

const ripples = [0, 1, 2, 3, 4];

export default function Home() {
  return (
    <>
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(56,174,204,0.08)_0%,transparent_60%)]" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(56,174,204,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(56,174,204,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />

          {ripples.map((i) => (
            <motion.div key={`ripple-${i}`}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#38aecc]/[0.07]"
              style={{ width: 120 + i * 120, height: 120 + i * 120 }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0, 0.15] }}
              transition={{ duration: 5, delay: i * 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 md:w-56 md:h-56 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(56,174,204,0.12) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {shapes.map((s) => (
            <motion.div key={s.id}
              className="absolute border border-[#38aecc]/[0.08]"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                borderRadius: s.id % 3 === 0 ? '50%' : s.id % 3 === 1 ? '3px' : '0',
                transform: `rotate(${s.rotation}deg)`,
              }}
              animate={{
                y: [0, -25, 0],
                x: [0, 12, 0],
                rotate: [s.rotation, s.rotation + 90, s.rotation],
                opacity: [0.06, 0.14, 0.06],
              }}
              transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          <motion.div className="absolute top-[8%] left-[12%] w-1 h-1 rounded-full bg-[#38aecc]/30"
            animate={{ y: [0, -18, 0], scale: [1, 1.5, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute top-[20%] right-[18%] w-1.5 h-1.5 rounded-full bg-[#38aecc]/20"
            animate={{ y: [0, 14, 0], scale: [1, 0.6, 1] }} transition={{ duration: 4, delay: 0.8, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-[25%] left-[15%] w-1 h-1 rounded-full bg-[#38aecc]/25"
            animate={{ y: [0, -22, 0] }} transition={{ duration: 3.5, delay: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-[15%] right-[12%] w-2 h-2 rounded-full bg-[#38aecc]/15"
            animate={{ y: [0, 16, 0], x: [0, -10, 0] }} transition={{ duration: 5, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute top-[55%] right-[8%] w-1 h-1 rounded-full bg-[#38aecc]/20"
            animate={{ y: [0, -14, 0] }} transition={{ duration: 4.5, delay: 2, repeat: Infinity, ease: 'easeInOut' }} />

          <motion.div className="absolute top-[12%] right-[30%] w-48 h-px bg-gradient-to-r from-transparent via-[#38aecc]/10 to-transparent"
            animate={{ opacity: [0, 0.5, 0], scaleX: [0.3, 1, 0.3] }} transition={{ duration: 5, delay: 1, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-[18%] left-[25%] w-56 h-px bg-gradient-to-r from-transparent via-[#38aecc]/[0.08] to-transparent"
            animate={{ opacity: [0, 0.4, 0], scaleX: [0.4, 1, 0.4] }} transition={{ duration: 6, delay: 2.5, repeat: Infinity, ease: 'easeInOut' }} />
        </div>

        <div className="container px-6 md:px-8 py-20 md:py-28 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center">
            <img src="/gtechName1.png" alt="Gtech Global" className="w-[180px] md:w-[220px] h-auto mb-8 md:mb-10 object-contain" />
            <h1 className="text-[1.75rem] sm:text-[2.25rem] md:text-[2.75rem] lg:text-[3rem] font-semibold leading-[1.15] tracking-[-0.01em] max-w-3xl">
              Welcome to <span className="text-[#38aecc]">Gtech Global</span>
            </h1>
            <p className="mt-5 md:mt-6 text-[1.125rem] sm:text-[1.25rem] md:text-[1.5rem] text-[#c4c4d4] max-w-2xl leading-relaxed min-h-[1.6em]">
              We craft premium <TypeWriter />
            </p>
            <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <a href="#our-services" onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('our-services');
                if (!el) return;
                const y = el.getBoundingClientRect().top + window.scrollY - 80;
                const start = window.scrollY;
                const dist = y - start;
                const duration = 1000;
                let startTime: number | null = null;
                const step = (ts: number) => {
                  if (!startTime) startTime = ts;
                  const p = Math.min((ts - startTime) / duration, 1);
                  const ease = 1 - Math.pow(1 - p, 3);
                  window.scrollTo(0, start + dist * ease);
                  if (p < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
              }} className="btn btn-primary w-full sm:w-auto">Our Services</a>
              <Link to="/contact" className="btn btn-outline w-full sm:w-auto">Contact Us</Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#e8edf2] py-20 md:py-24">
        <div className="container px-6 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5 }} className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em] text-[#0a0f14]">
              Why Choose <span className="text-[#38aecc]">Gtech Global?</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }} className="mt-4 text-[#4a5568] text-sm md:text-base leading-relaxed">
              We don't just build digital products — we engineer experiences that drive growth, engagement, and results for businesses worldwide.
            </motion.p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: Target, title: 'Result-Driven', desc: 'Every project is built with clear goals and measurable outcomes in mind.' },
              { icon: Lightbulb, title: 'Innovative Solutions', desc: 'We leverage the latest tech stacks to deliver cutting-edge products.' },
              { icon: Rocket, title: 'Fast Delivery', desc: 'Agile workflows that get your product to market without delays.' },
            ].map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}
                className="bg-white rounded-xl p-7 md:p-8 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-[#38aecc]/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-[#38aecc]" />
                </div>
                <h3 className="text-base font-bold text-[#0a0f14] mb-2">{item.title}</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Services />
      <CtaSection />
    </>
  );
}

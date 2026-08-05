import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Services from '../components/sections/Services';
import CtaSection from '../components/sections/CtaSection';
import TypeWriter from '../components/sections/TypeWriter';
import { Target, Lightbulb, Rocket } from 'lucide-react';

const orbs = [
  { top: '16%', left: '10%', size: 12, color: '168,85,247', dur: 5, delay: 0 },
  { top: '24%', left: '78%', size: 8, color: '255,122,47', dur: 6.5, delay: 0.8 },
  { top: '58%', left: '84%', size: 10, color: '168,85,247', dur: 5.5, delay: 1.6 },
  { top: '70%', left: '16%', size: 9, color: '255,122,47', dur: 6, delay: 0.4 },
  { top: '42%', left: '46%', size: 6, color: '255,122,47', dur: 7, delay: 2 },
  { top: '10%', left: '55%', size: 6, color: '168,85,247', dur: 6.8, delay: 1.2 },
];

const sparkles = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2.5 + 1,
  dur: Math.random() * 3 + 2,
  delay: Math.random() * 3,
  color: i % 3 === 0 ? '#ff7a2f' : i % 3 === 1 ? '#a855f7' : '#ffffff',
}));

export default function Home() {
  return (
    <>
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(168,85,247,0.16)_0%,rgba(255,122,47,0.06)_45%,transparent_65%)]" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-40 -left-40 w-[34rem] h-[34rem] rounded-full bg-[#a855f7]/25 blur-3xl"
            animate={{ x: [0, 60, -20, 0], y: [0, 40, 80, 0], scale: [1, 1.15, 0.95, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-48 -right-32 w-[38rem] h-[38rem] rounded-full bg-[#ff7a2f]/20 blur-3xl"
            animate={{ x: [0, -50, 30, 0], y: [0, -40, -90, 0], scale: [1, 0.9, 1.15, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[26rem] h-[26rem] rounded-full bg-[#7c3aed]/15 blur-3xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full bg-[#ff7a2f]/15 blur-3xl"
            animate={{ x: [0, 80, -40, 0], y: [0, -60, 30, 0], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.div
            className="absolute inset-x-[-50%] top-0 h-full opacity-20"
            style={{
              background: 'linear-gradient(100deg, transparent 20%, rgba(168,85,247,0.4) 45%, rgba(255,122,47,0.4) 55%, transparent 80%)',
              filter: 'blur(50px)',
            }}
            animate={{ x: ['-30%', '30%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />

          {orbs.map((orb, i) => (
            <motion.div
              key={`orb-${i}`}
              className="absolute rounded-full"
              style={{
                top: orb.top,
                left: orb.left,
                width: orb.size,
                height: orb.size,
                background: `rgba(${orb.color},0.55)`,
                boxShadow: `0 0 ${orb.size * 4}px rgba(${orb.color},0.45), 0 0 ${orb.size * 10}px rgba(${orb.color},0.15)`,
              }}
              animate={{ y: [0, -28, 0], opacity: [0.35, 0.85, 0.35], scale: [1, 1.12, 1] }}
              transition={{ duration: orb.dur, delay: orb.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          {sparkles.map((s) => (
            <motion.div
              key={`sparkle-${s.id}`}
              className="absolute rounded-full"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, background: s.color }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.3, 0.6] }}
              transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <div className="container px-6 md:px-8 py-20 md:py-28 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
              <img src="/gtechName2.png" alt="Gtech Global" className="w-[180px] md:w-[220px] h-auto mb-8 md:mb-10 object-contain drop-shadow-[0_0_25px_rgba(168,85,247,0.35)]" />
            </motion.div>
            <h1 className="text-[1.75rem] sm:text-[2.25rem] md:text-[2.75rem] lg:text-[3rem] font-semibold leading-[1.15] tracking-[-0.01em] max-w-3xl">
              Welcome to <span className="bg-gradient-to-r from-[#a855f7] to-[#ff7a2f] bg-clip-text text-transparent">Gtech Global</span>
            </h1>
            <p className="mt-5 md:mt-6 text-[1.125rem] sm:text-[1.25rem] md:text-[1.5rem] text-[#c4c4d4] max-w-2xl leading-relaxed min-h-[1.6em]">
              We craft premium <TypeWriter />
            </p>
            <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <a href="#our-services" className="btn btn-primary w-full sm:w-auto">Our Services</a>
              <Link to="/contact" className="btn btn-outline w-full sm:w-auto">Contact Us</Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#0d0a18] py-20 md:py-24">
        <div className="container px-6 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5 }} className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em] text-white">
              Why Choose <span className="bg-gradient-to-r from-[#a855f7] to-[#ff7a2f] bg-clip-text text-transparent">Gtech Global?</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }} className="mt-4 text-[#a196b8] text-sm md:text-base leading-relaxed">
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
                className="bg-[#120d1f] rounded-xl p-7 md:p-8 text-center shadow-lg shadow-black/20 border border-indigo/10 hover:border-accent/40 hover:shadow-indigo/10 transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-[#a855f7]" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-[#a196b8] leading-relaxed">{item.desc}</p>
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

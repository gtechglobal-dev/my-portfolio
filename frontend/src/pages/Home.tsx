import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Services from '../components/sections/Services';
import CtaSection from '../components/sections/CtaSection';
import TypeWriter from '../components/sections/TypeWriter';
import { Target, Lightbulb, Rocket, Sparkles } from 'lucide-react';

const embers = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  bottom: Math.random() * 20,
  size: Math.random() * 3 + 1.5,
  dur: Math.random() * 9 + 8,
  delay: Math.random() * 9,
  drift: (Math.random() - 0.5) * 60,
  color: i % 2 === 0 ? '255,122,47' : '168,85,247',
}));

export default function Home() {
  return (
    <>
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Base wash */}
        <div className="absolute inset-0 bg-[#050505]" />

        {/* Animated aurora gradient mesh — unified backdrop */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -inset-[40%]"
            style={{
              background:
                'radial-gradient(58% 52% at 22% 30%, rgba(168,85,247,0.32) 0%, transparent 60%),' +
                'radial-gradient(48% 45% at 78% 24%, rgba(255,122,47,0.24) 0%, transparent 55%),' +
                'radial-gradient(65% 60% at 50% 78%, rgba(124,58,237,0.28) 0%, transparent 60%)',
              filter: 'blur(22px)',
            }}
            animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.12, 0.96, 1] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Slow-shifting conic halo behind the logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="w-[30rem] h-[30rem] md:w-[38rem] md:h-[38rem] rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(168,85,247,0.28), rgba(255,122,47,0.16), rgba(124,58,237,0.26), rgba(168,85,247,0.28))',
              filter: 'blur(60px)',
              maskImage: 'radial-gradient(circle, black 40%, transparent 72%)',
              WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 72%)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Rising ember particles */}
          {embers.map((e) => (
            <motion.span
              key={`ember-${e.id}`}
              className="absolute rounded-full"
              style={{
                left: `${e.left}%`,
                bottom: `${e.bottom}%`,
                width: e.size,
                height: e.size,
                background: `rgb(${e.color})`,
                boxShadow: `0 0 ${e.size * 3}px rgba(${e.color},0.7)`,
              }}
              animate={{
                y: ['0vh', '-92vh'],
                x: [0, e.drift, -e.drift * 0.5, 0],
                opacity: [0, 0.9, 0.6, 0],
              }}
              transition={{ duration: e.dur, delay: e.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          {/* Perspective grid floor */}
          <div className="absolute inset-x-0 bottom-0 h-[46%] overflow-hidden">
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(168,85,247,0.18), transparent 70%)',
                transform: 'perspective(500px) rotateX(58deg)',
                transformOrigin: 'bottom',
                maskImage: 'linear-gradient(to top, black 10%, transparent 90%)',
                WebkitMaskImage: 'linear-gradient(to top, black 10%, transparent 90%)',
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(168,85,247,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.5) 1px, transparent 1px)',
                  backgroundSize: '46px 46px',
                }}
              />
            </motion.div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#a855f7]/70 to-transparent" />
          </div>
        </div>

        {/* Periodic cinematic light sweep */}
        <motion.div
          className="absolute top-0 bottom-0 w-[22rem] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.10), transparent)',
            filter: 'blur(18px)',
            left: '-30%',
          }}
          animate={{ left: ['-30%', '130%'] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', repeatDelay: 4 }}
        />

        {/* subtle vignette to frame the text */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,5,5,0.55) 100%)',
        }} />

        <div className="container px-6 md:px-8 py-20 md:py-28 relative z-10">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              whileHover={{ scale: 1.04 }}
              className="relative"
            >
              <div className="absolute -inset-10 rounded-full bg-[#a855f7]/20 blur-3xl" />
              <img src="/gtechName2.png" alt="Gtech Global" className="relative w-[180px] md:w-[220px] h-auto mb-8 md:mb-10 object-contain drop-shadow-[0_0_35px_rgba(168,85,247,0.55)]" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 backdrop-blur-sm text-[11px] sm:text-xs text-[#d8b9f9] mb-6"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff7a2f]" />
              Premium Digital Craftsmanship
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[1.75rem] sm:text-[2.25rem] md:text-[2.75rem] lg:text-[3rem] font-semibold leading-[1.15] tracking-[-0.01em] max-w-3xl bg-gradient-to-b from-white via-white to-[#b18df0] bg-clip-text text-transparent"
            >
              Welcome to <span className="text-indigo">Gtech Global</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="mt-5 md:mt-6 text-[1.125rem] sm:text-[1.25rem] md:text-[1.5rem] text-[#c8c8cc] max-w-2xl leading-relaxed min-h-[1.6em]"
            >
              We craft premium <TypeWriter />
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
            >
              <a href="#our-services" className="btn btn-primary w-full sm:w-auto">Our Services</a>
              <Link to="/contact" className="btn btn-outline w-full sm:w-auto">Contact Us</Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="bg-ink py-20 md:py-24">
        <div className="container px-6 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5 }} className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em] text-white">
              Why Choose <span className="text-indigo">Gtech Global?</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }} className="mt-4 text-muted text-sm md:text-base leading-relaxed">
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
                className="bg-surface rounded-xl p-7 md:p-8 text-center shadow-lg shadow-black/20 border border-indigo/10 hover:border-accent/40 hover:shadow-indigo/10 transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-[#a855f7]" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
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

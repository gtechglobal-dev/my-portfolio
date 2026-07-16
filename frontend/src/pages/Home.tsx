import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Services from '../components/sections/Services';
import CtaSection from '../components/sections/CtaSection';
import TypeWriter from '../components/sections/TypeWriter';
import { Target, Lightbulb, Rocket } from 'lucide-react';

const techSymbols = ['{ }', '< />', '( )', '[ ]', '&&', '=>', ';;', '##'];
const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  delay: Math.random() * 5,
  duration: Math.random() * 8 + 6,
}));

export default function Home() {
  return (
    <>
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(0,144,193,0.06)_0%,transparent_60%)]" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,144,193,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,144,193,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

          {particles.map((p) => (
            <motion.div key={p.id}
              className="absolute rounded-full bg-[#0090c1]/30"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
              animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px]"
            animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}>
            <div className="absolute inset-0 rounded-full border border-[#0090c1]/[0.06]" />
            <div className="absolute inset-8 rounded-full border border-[#183446]/[0.05]" />
            <div className="absolute inset-16 rounded-full border border-[#0090c1]/[0.04]" />
          </motion.div>

          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[550px] md:h-[550px]"
            animate={{ rotate: -360 }} transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}>
            <div className="absolute inset-0 rounded-full border border-dashed border-[#183446]/[0.06]" />
            <div className="absolute inset-12 rounded-full border border-dashed border-[#0090c1]/[0.05]" />
          </motion.div>

          {techSymbols.map((sym, i) => {
            const angle = (i / techSymbols.length) * 360;
            const radius = 220;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            return (
              <motion.div key={sym}
                className="absolute top-1/2 left-1/2 text-[#0090c1]/10 text-lg md:text-xl font-mono font-bold"
                style={{ x: x - 12, y: y - 12 }}
                animate={{ opacity: [0.05, 0.15, 0.05], scale: [1, 1.1, 1] }}
                transition={{ duration: 3 + i * 0.5, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
              >
                {sym}
              </motion.div>
            );
          })}

          <motion.div className="absolute top-[15%] left-[10%] w-2 h-2 rounded-full bg-[#0090c1]/20"
            animate={{ y: [0, -20, 0], x: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute top-[25%] right-[15%] w-1.5 h-1.5 rounded-full bg-[#183446]/20"
            animate={{ y: [0, 15, 0], x: [0, -8, 0] }} transition={{ duration: 5, delay: 1, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-[20%] left-[20%] w-1 h-1 rounded-full bg-[#0090c1]/25"
            animate={{ y: [0, -12, 0] }} transition={{ duration: 3, delay: 2, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-[30%] right-[10%] w-2 h-2 rounded-full bg-[#183446]/15"
            animate={{ y: [0, 18, 0], x: [0, -6, 0] }} transition={{ duration: 6, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute top-[60%] left-[5%] w-1.5 h-1.5 rounded-full bg-[#0090c1]/15"
            animate={{ y: [0, -10, 0] }} transition={{ duration: 4, delay: 3, repeat: Infinity, ease: 'easeInOut' }} />

          <motion.div className="absolute top-[10%] right-[25%] w-32 h-px bg-gradient-to-r from-transparent via-[#0090c1]/10 to-transparent"
            animate={{ opacity: [0, 0.4, 0], scaleX: [0.5, 1, 0.5] }} transition={{ duration: 4, delay: 1, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-[15%] left-[30%] w-40 h-px bg-gradient-to-r from-transparent via-[#183446]/10 to-transparent"
            animate={{ opacity: [0, 0.3, 0], scaleX: [0.5, 1, 0.5] }} transition={{ duration: 5, delay: 2, repeat: Infinity, ease: 'easeInOut' }} />
        </div>

        <div className="container px-6 md:px-8 py-20 md:py-28 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center">
            <img src="/gtechName2.png" alt="Gtech Global" className="w-[180px] md:w-[220px] h-auto mb-8 md:mb-10 object-contain" />
            <h1 className="text-[1.75rem] sm:text-[2.25rem] md:text-[2.75rem] lg:text-[3rem] font-semibold leading-[1.15] tracking-[-0.01em] max-w-3xl">
              Welcome to <span className="gradient-text">Gtech Global</span>
            </h1>
            <p className="mt-5 md:mt-6 text-[1.125rem] sm:text-[1.25rem] md:text-[1.5rem] text-[#c4c4d4] max-w-2xl leading-relaxed min-h-[1.6em]">
              We craft premium <TypeWriter />
            </p>
            <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <a href="#our-services" className="btn btn-primary w-full sm:w-auto">Our Services</a>
              <Link to="/booking" className="btn btn-outline w-full sm:w-auto">Book a Call</Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#e8edf2] py-20 md:py-24">
        <div className="container px-6 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5 }} className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em] text-[#0a0f14]">
              Why Choose <span className="text-[#0090c1]">Gtech Global?</span>
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
                <div className="w-12 h-12 rounded-xl bg-[#0090c1]/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-[#0090c1]" />
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

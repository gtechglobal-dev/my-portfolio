import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Services from '../components/sections/Services';
import CtaSection from '../components/sections/CtaSection';
import TypeWriter from '../components/sections/TypeWriter';
import { Target, Lightbulb, Rocket } from 'lucide-react';

const particles = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1.5,
  delay: Math.random() * 3,
  duration: Math.random() * 6 + 4,
}));

const hexCodes = ['0x3F', '0xA7', '0xE2', '0x1B', '0xD4', '0x9C', '0x55', '0xF0'];

const scanLines = [0, 1, 2];

const dataStreams = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: 8 + i * 12,
  delay: Math.random() * 3,
  duration: Math.random() * 2 + 2.5,
}));

export default function Home() {
  return (
    <>
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(92,200,232,0.1)_0%,transparent_55%)]" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(92,200,232,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(92,200,232,0.04)_1px,transparent_1px)] bg-[size:50px_50px]" />

          {scanLines.map((i) => (
            <motion.div key={`scan-${i}`}
              className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5cc8e8]/30 to-transparent"
              style={{ top: `${20 + i * 25}%` }}
              animate={{ opacity: [0, 0.8, 0], scaleX: [0.2, 1, 0.2] }}
              transition={{ duration: 3, delay: i * 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          {dataStreams.map((s) => (
            <motion.div key={`stream-${s.id}`}
              className="absolute w-px bg-gradient-to-b from-transparent via-[#5cc8e8]/25 to-transparent"
              style={{ left: `${s.x}%`, height: '120px' }}
              animate={{ y: ['-100%', '800%'], opacity: [0, 0.7, 0] }}
              transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'linear' }}
            />
          ))}

          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] md:w-[600px] md:h-[600px] rounded-full border border-[#5cc8e8]/[0.1]"
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#5cc8e8]/60" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-[#5cc8e8]/40" />
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#5cc8e8]/30" />
          </motion.div>

          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] md:w-[450px] md:h-[450px] rounded-full border border-dashed border-[#5cc8e8]/[0.08]"
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#5cc8e8]/50 rotate-45" />
          </motion.div>

          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-44 md:h-44 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(92,200,232,0.15) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {particles.map((p) => (
            <motion.div key={p.id}
              className="absolute rounded-full bg-[#5cc8e8]"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
              animate={{ y: [0, -20, 0], opacity: [0.15, 0.55, 0.15] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          {hexCodes.map((code, i) => {
            const angle = (i / hexCodes.length) * 360;
            const radius = 250;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            return (
              <motion.div key={code}
                className="absolute top-1/2 left-1/2 text-[#5cc8e8]/20 text-xs font-mono"
                style={{ x: x - 10, y: y - 8 }}
                animate={{ opacity: [0.08, 0.25, 0.08] }}
                transition={{ duration: 2.5 + i * 0.4, delay: i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {code}
              </motion.div>
            );
          })}

          <motion.div className="absolute top-[10%] left-[8%] w-2 h-2 rounded-full bg-[#5cc8e8]/40"
            animate={{ y: [0, -25, 0], scale: [1, 1.4, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute top-[18%] right-[12%] w-2.5 h-2.5 rounded-sm bg-[#5cc8e8]/25 rotate-45"
            animate={{ y: [0, 20, 0], rotate: [45, 135, 45] }} transition={{ duration: 4.5, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-[22%] left-[10%] w-1.5 h-1.5 rounded-full bg-[#5cc8e8]/35"
            animate={{ y: [0, -18, 0] }} transition={{ duration: 3.5, delay: 1, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-[12%] right-[8%] w-2 h-2 rounded-full bg-[#5cc8e8]/30"
            animate={{ y: [0, 22, 0], x: [0, -8, 0] }} transition={{ duration: 5, delay: 0.3, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute top-[60%] right-[5%] w-1.5 h-1.5 bg-[#5cc8e8]/20 rotate-12"
            animate={{ y: [0, -16, 0], rotate: [12, 60, 12] }} transition={{ duration: 4, delay: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute top-[45%] left-[5%] w-2 h-2 rounded-full bg-[#5cc8e8]/20"
            animate={{ y: [0, 14, 0], x: [0, 6, 0] }} transition={{ duration: 3.8, delay: 2, repeat: Infinity, ease: 'easeInOut' }} />

          <motion.div className="absolute top-[15%] right-[25%] w-56 h-px bg-gradient-to-r from-transparent via-[#5cc8e8]/20 to-transparent"
            animate={{ opacity: [0, 0.7, 0], scaleX: [0.2, 1, 0.2] }} transition={{ duration: 4, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-[20%] left-[20%] w-64 h-px bg-gradient-to-r from-transparent via-[#5cc8e8]/15 to-transparent"
            animate={{ opacity: [0, 0.6, 0], scaleX: [0.3, 1, 0.3] }} transition={{ duration: 5, delay: 2, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute top-[70%] right-[30%] w-40 h-px bg-gradient-to-r from-transparent via-[#5cc8e8]/12 to-transparent"
            animate={{ opacity: [0, 0.5, 0], scaleX: [0.4, 1, 0.4] }} transition={{ duration: 6, delay: 1, repeat: Infinity, ease: 'easeInOut' }} />
        </div>

        <div className="container px-6 md:px-8 py-20 md:py-28 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center">
            <img src="/gtechName2.png" alt="Gtech Global" className="w-[180px] md:w-[220px] h-auto mb-8 md:mb-10 object-contain" />
            <h1 className="text-[1.75rem] sm:text-[2.25rem] md:text-[2.75rem] lg:text-[3rem] font-semibold leading-[1.15] tracking-[-0.01em] max-w-3xl">
              Welcome to <span className="text-[#5cc8e8]">Gtech Global</span>
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

      <section className="bg-[#e8edf2] py-20 md:py-24">
        <div className="container px-6 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5 }} className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em] text-[#0a0f14]">
              Why Choose <span className="text-[#5cc8e8]">Gtech Global?</span>
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
                <div className="w-12 h-12 rounded-xl bg-[#5cc8e8]/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-[#5cc8e8]" />
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

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Services from '../components/sections/Services';
import CtaSection from '../components/sections/CtaSection';

const stats = [
  { value: '50+', label: 'Projects' },
  { value: '30+', label: 'Clients' },
  { value: '4+', label: 'Years' },
];

export default function Home() {
  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(79,70,229,0.05)_0%,transparent_60%)]" />
        <div className="container px-6 md:px-8 py-28 md:py-36 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center">
            <img src="/gtechlogo.png" alt="" className="w-16 md:w-[72px] mb-6 object-contain" />
            <img src="/gtechName2.png" alt="Gtech Global" className="w-[180px] md:w-[220px] h-auto mb-8 md:mb-10 object-contain" />
            <h1 className="text-[2.25rem] sm:text-[3rem] md:text-[3.75rem] lg:text-[4.25rem] font-bold leading-[1.1] tracking-[-0.02em] max-w-3xl">
              Building modern digital<br /><span className="gradient-text">experiences</span>
            </h1>
            <p className="mt-5 md:mt-6 text-[0.9375rem] md:text-base text-[#7a7a8c] max-w-md leading-relaxed">
              We craft premium websites, applications, and brand identities that help businesses grow online.
            </p>
            <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link to="/portfolio" className="btn btn-primary w-full sm:w-auto">View Our Work</Link>
              <Link to="/booking" className="btn btn-outline w-full sm:w-auto">Book a Call</Link>
            </div>
            <div className="mt-14 md:mt-16 flex items-center gap-10 md:gap-14">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-lg md:text-xl font-bold tracking-tight">{s.value}</div>
                  <div className="text-xs md:text-sm text-[#5a5a6e] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      <Services />
      <CtaSection />
    </>
  );
}

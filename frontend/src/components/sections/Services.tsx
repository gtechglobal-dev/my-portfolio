import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code, Smartphone, Palette, ShoppingCart, Globe, Layers } from 'lucide-react';

const services = [
  { icon: Code, title: 'Web Development', desc: 'Custom websites and web apps built with modern frameworks.' },
  { icon: Smartphone, title: 'Mobile Apps', desc: 'Cross-platform mobile applications for iOS and Android.' },
  { icon: Palette, title: 'UI/UX Design', desc: 'User interfaces that are beautiful, intuitive, and effective.' },
  { icon: ShoppingCart, title: 'E-Commerce', desc: 'Online stores with secure payments and smooth checkout.' },
  { icon: Globe, title: 'Graphics Design/Branding', desc: 'Logos, color systems, and brand guidelines that stand out.' },
  { icon: Layers, title: 'Web Apps', desc: 'Scalable web applications with powerful features and integrations.' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function Services() {
  return (
    <section className="py-24 md:py-28">
      <div className="container px-6 md:px-8">
        <div className="text-center max-w-xl mx-auto mb-14 md:mb-16">
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">What We Do</h2>
          <p className="mt-3 text-[0.9375rem] md:text-base text-[#a09890]">
            Full-service digital agency covering everything from design to deployment.
          </p>
        </div>
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {services.map((s) => (
            <motion.div key={s.title} variants={item}>
              <Link to="/booking" className="card block p-7 md:p-8 group h-full">
                <div className="w-10 h-10 rounded-lg bg-indigo/10 flex items-center justify-center mb-4 group-hover:bg-indigo/15 transition-colors">
                  <s.icon className="w-[18px] h-[18px] text-indigo" />
                </div>
                <h3 className="text-[1.0625rem] font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-[#a09890] leading-relaxed">{s.desc}</p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

import { motion } from 'framer-motion';
import PortfolioGrid from '../components/sections/PortfolioGrid';

export default function Portfolio() {
  return (
    <div className="pt-20 md:pt-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 80, damping: 16 }}
        className="container px-6 md:px-8 pt-8 md:pt-12 text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]"
        >
          Our <span className="gradient-text">Portfolio</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-3 text-[0.9375rem] md:text-base text-[#a09890] max-w-xl mx-auto"
        >
          Explore our premium projects — from full-scale platforms to elegant websites.
        </motion.p>
      </motion.div>
      <PortfolioGrid />
    </div>
  );
}

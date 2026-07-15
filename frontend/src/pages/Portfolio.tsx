import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Palette } from 'lucide-react';
import PortfolioGrid from '../components/sections/PortfolioGrid';
import GraphicsGallery from '../components/sections/GraphicsGallery';

type Tab = 'web' | 'graphics';

const tabs: { id: Tab; label: string; icon: typeof Code }[] = [
  { id: 'web', label: 'Web / App Development', icon: Code },
  { id: 'graphics', label: 'Graphics Designs', icon: Palette },
];

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState<Tab>('web');

  return (
    <div className="pt-20 md:pt-24">
      <section className="py-12 md:py-16">
        <div className="container px-6 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-xl mx-auto mb-10"
          >
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">
              Our <span className="gradient-text">Portfolio</span>
            </h2>
            <p className="mt-3 text-[0.9375rem] md:text-base text-[#a09890]">
              Real projects we've shipped. Real results we've delivered.
            </p>
          </motion.div>

          <div className="flex justify-center mb-10 md:mb-12">
            <div className="inline-flex bg-[#151412] border border-white/[0.06] rounded-xl p-1 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-[#6b6560] hover:text-[#a09890]'
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="portfolio-tab"
                      className="absolute inset-0 bg-indigo/15 border border-indigo/20 rounded-lg"
                      transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
                    />
                  )}
                  <tab.icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'web' && <PortfolioGrid />}
              {activeTab === 'graphics' && (
                <div className="py-20 md:py-24">
                  <div className="container px-6 md:px-8">
                    <GraphicsGallery />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

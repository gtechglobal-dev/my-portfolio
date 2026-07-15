import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { graphicsPackages } from '../../lib/constants';

export default function GraphicsPricing() {
  return (
    <section className="pb-20 md:pb-24">
      <div className="container px-6 md:px-8">
        <div className="text-center max-w-xl mx-auto mb-12 md:mb-14">
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">Graphics Design Pricing</h2>
          <p className="mt-3 text-[0.9375rem] md:text-base text-[#a09890]">Professional design services at affordable rates.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {graphicsPackages.map((pkg, i) => (
            <motion.div key={pkg.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-20px' }}
              transition={{ delay: i * 0.03, duration: 0.3 }} className="card p-4 md:p-5">
              <h3 className="text-sm md:text-base font-semibold mb-2 leading-snug">{pkg.title}</h3>
              <div className="mb-4">
                {pkg.id === 'other' ? (
                  <div className="text-base md:text-lg font-bold text-emerald-400">Available</div>
                ) : (
                  <>
                    <div className="text-base md:text-lg font-bold">₦{pkg.price.ngn}</div>
                    <div className="text-[10px] text-[#6b6560]">${pkg.price.usd} USD</div>
                  </>
                )}
              </div>
              <ul className="space-y-1.5 mb-4">
                {pkg.features.slice(0, 3).map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-[#a09890]">
                    <Check className="w-2.5 h-2.5 text-indigo mt-0.5 shrink-0" />
                    <span className="leading-tight">{f}</span>
                  </li>
                ))}
                {pkg.features.length > 3 && <li className="text-[10px] text-white/30">+{pkg.features.length - 3} more</li>}
              </ul>
              <Link to={`/booking?package=${pkg.id}&category=graphics-design`}
                className="w-full py-1.5 rounded-lg text-xs font-semibold text-center btn-outline flex items-center justify-center gap-1">
                Order <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

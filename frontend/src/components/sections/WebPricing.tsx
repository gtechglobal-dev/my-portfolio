import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { webDevPackages } from '../../lib/constants';

export default function WebPricing() {
  return (
    <section className="py-20 md:py-24">
      <div className="container px-6 md:px-8">
        <div className="text-center max-w-xl mx-auto mb-12 md:mb-14">
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">Web Development Pricing</h2>
          <p className="mt-3 text-[0.9375rem] md:text-base text-[#7a7a8c]">Choose the right package for your project.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
          {webDevPackages.map((pkg, i) => (
            <motion.div key={pkg.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              className={`card p-6 md:p-7 flex flex-col relative ${pkg.popular ? 'border-indigo/30' : ''}`}>
              {pkg.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo text-white text-[10px] font-semibold whitespace-nowrap">Most Popular</div>
              )}
              <h3 className="text-base md:text-lg font-semibold mb-2">{pkg.title}</h3>
              <div className="mb-5">
                <div className="text-xl md:text-2xl font-bold">₦{pkg.price.ngn}</div>
                <div className="text-xs text-[#5a5a6e]">${pkg.price.usd} USD</div>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#7a7a8c]">
                    <Check className="w-3.5 h-3.5 text-indigo mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to={`/booking?package=${pkg.id}&category=web-development`}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold text-center flex items-center justify-center gap-2 ${
                  pkg.popular ? 'btn-primary' : 'btn-outline'}`}>
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Clock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { webDevPackages, graphicsPackages, DEFAULT_EXCHANGE_RATE, formatNgn } from '../../lib/constants';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function Services() {
  const [rate, setRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data?.rates?.NGN) setRate(Math.round(data.rates.NGN));
      } catch {}
    };
    fetchRate();
  }, []);

  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <section id="our-services" className="py-24 md:py-28 scroll-mt-20">
      <div className="container px-6 md:px-8">
        <div className="text-center max-w-xl mx-auto mb-14 md:mb-16">
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">Our Services</h2>
          <p className="mt-3 text-[0.9375rem] md:text-base text-[#a09890]">
            Full-service digital agency covering everything from design to deployment.
          </p>
        </div>

        <div className="mb-12">
          <h3 className="text-lg md:text-xl font-bold tracking-[-0.01em] mb-6 text-center">Web Development</h3>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
            className="space-y-4 max-w-4xl mx-auto">
            {webDevPackages.map((pkg) => (
              <motion.div key={pkg.id} variants={item}>
                <div className="card overflow-hidden">
                  <button onClick={() => toggle(pkg.id)}
                    className="w-full text-left p-6 md:p-7 flex items-start justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base md:text-lg font-bold">{pkg.title}</h4>
                        {pkg.popular && (
                          <span className="px-2 py-0.5 rounded-full bg-[#0090c1] text-white text-[10px] font-semibold flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#a09890] mt-1">{pkg.desc}</p>
                      <div className="flex items-center gap-1.5 text-xs text-[#6b6560] mt-2">
                        <Clock className="w-3 h-3" />
                        Delivery: {pkg.delivery}
                      </div>
                    </div>
                    <div className="shrink-0 mt-1">
                      {expanded === pkg.id ? (
                        <ChevronUp className="w-5 h-5 text-[#a09890]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#a09890]" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expanded === pkg.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                        className="overflow-hidden">
                        <div className="px-6 md:px-7 pb-6 md:pb-7 border-t border-white/[0.06] pt-5">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-[#6b6560] mb-2">Perfect for</h5>
                              <div className="flex flex-wrap gap-2">
                                {pkg.perfectFor.map((p) => (
                                  <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] text-[#a09890] border border-white/[0.06]">{p}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-[#6b6560] mb-2">Includes</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                {pkg.features.map((f) => (
                                  <li key={f} className="flex items-start gap-2 text-sm text-[#a09890] list-none">
                                    <Check className="w-3.5 h-3.5 text-indigo mt-0.5 shrink-0" />
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                              <div className="text-xs text-[#6b6560] mb-1">Starting from</div>
                              <div className="text-2xl md:text-3xl font-bold">₦{formatNgn(pkg.priceUsd, rate)}</div>
                              <div className="text-sm text-[#6b6560]">${pkg.priceUsd.toLocaleString()} USD</div>
                            </div>
                            <Link to={`/booking?package=${pkg.id}&category=web-development`}
                              className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
                                pkg.popular ? 'btn-primary' : 'btn-outline'}`}>
                              Get Started <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div>
          <h3 className="text-lg md:text-xl font-bold tracking-[-0.01em] mb-6 text-center">Graphics Design</h3>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {graphicsPackages.map((pkg) => (
              <motion.div key={pkg.id} variants={item}>
                <div className="card p-5 md:p-6 h-full flex flex-col">
                  <h4 className="text-base font-bold mb-2">{pkg.title}</h4>
                  <ul className="space-y-1.5 mb-4 flex-1">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-[#a09890]">
                        <Check className="w-3.5 h-3.5 text-indigo mt-0.5 shrink-0" />
                        <span className="leading-tight">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <AnimatePresence>
                    {expanded === pkg.id ? (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25 }}>
                        <div className="mb-3">
                          {pkg.id === 'other' ? (
                            <div className="text-lg font-bold text-emerald-400">Custom Quote</div>
                          ) : (
                            <>
                              <div className="text-lg font-bold">₦{formatNgn(pkg.priceUsd, rate)}</div>
                              <div className="text-xs text-[#6b6560]">${pkg.priceUsd} USD</div>
                            </>
                          )}
                        </div>
                        <Link to={`/booking?package=${pkg.id}&category=graphics-design`}
                          className="w-full py-2 rounded-lg text-sm font-semibold text-center btn-outline flex items-center justify-center gap-1.5">
                          Get Started <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </motion.div>
                    ) : (
                      <button onClick={() => toggle(pkg.id)}
                        className="w-full py-2 rounded-lg text-sm font-semibold text-center btn-outline flex items-center justify-center gap-1.5">
                        View Details <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

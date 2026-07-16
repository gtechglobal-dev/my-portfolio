import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { webDevPackages, webDevAddons, DEFAULT_EXCHANGE_RATE, formatNgn } from '../../lib/constants';

export default function WebPricing() {
  const [rate, setRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [rateSource, setRateSource] = useState('fallback');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data?.rates?.NGN) {
          setRate(Math.round(data.rates.NGN));
          setRateSource('live');
        }
      } catch {
        setRateSource('fallback');
      }
      setLoading(false);
    };
    fetchRate();
  }, []);

  return (
    <section className="py-20 md:py-24">
      <div className="container px-6 md:px-8">
        <div className="text-center max-w-xl mx-auto mb-12 md:mb-14">
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">Web Development Pricing</h2>
          <p className="mt-3 text-[0.9375rem] md:text-base text-[#a09890]">Choose the right package for your project.</p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-[#6b6560] bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/[0.06]">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            1 USD = ₦{rate.toLocaleString()} {rateSource === 'live' ? '(Live rate)' : '(Estimated)'}
          </div>
        </div>

        <div className="space-y-6 max-w-4xl mx-auto">
          {webDevPackages.map((pkg, i) => (
            <motion.div key={pkg.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }} transition={{ delay: i * 0.05, duration: 0.4 }}
              className={`card p-6 md:p-8 relative overflow-hidden ${pkg.popular ? 'border-indigo/30' : ''}`}>
              {pkg.popular && (
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#5cc8e8] text-white text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="md:w-1/3">
                  <h3 className="text-lg md:text-xl font-bold mb-1">{pkg.title}</h3>
                  <p className="text-sm text-[#a09890] mb-4">{pkg.desc}</p>
                  <div className="mb-4">
                    <div className="text-xs text-[#6b6560] mb-1">Starting from</div>
                    <div className="text-2xl md:text-3xl font-bold">₦{formatNgn(pkg.priceUsd, rate)}</div>
                    <div className="text-sm text-[#6b6560]">${pkg.priceUsd.toLocaleString()} USD</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6b6560]">
                    <Clock className="w-3.5 h-3.5" />
                    Delivery: {pkg.delivery}
                  </div>
                </div>

                <div className="md:w-2/3 md:border-l md:border-white/[0.06] md:pl-8">
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6b6560] mb-2">Perfect for</h4>
                    <div className="flex flex-wrap gap-2">
                      {pkg.perfectFor.map((p) => (
                        <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] text-[#a09890] border border-white/[0.06]">{p}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6b6560] mb-2">Includes</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {pkg.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-[#a09890] list-none">
                          <Check className="w-3.5 h-3.5 text-indigo mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-white/[0.06] flex justify-end">
                <Link to={`/booking?package=${pkg.id}&category=web-development`}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
                    pkg.popular ? 'btn-primary' : 'btn-outline'}`}>
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.4 }}
          className="max-w-4xl mx-auto mt-16">
          <div className="text-center mb-8">
            <h3 className="text-xl md:text-2xl font-bold tracking-[-0.01em]">Optional Add-ons</h3>
            <p className="mt-2 text-sm text-[#a09890]">Enhance your package with extra features.</p>
          </div>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-white/[0.04]">
              {webDevAddons.map((addon) => (
                <div key={addon.service} className="bg-[#111820] p-4 flex flex-col justify-between">
                  <span className="text-sm text-[#a09890] mb-2">{addon.service}</span>
                  <div>
                    <span className="text-sm font-semibold">₦{formatNgn(addon.priceUsd, rate)}</span>
                    <span className="text-xs text-[#6b6560] ml-1.5">${addon.priceUsd}{addon.perMonth ? '/mo' : ''} USD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

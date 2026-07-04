import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function CtaSection() {
  return (
    <section className="pb-28 md:pb-36">
      <div className="container px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
          className="card p-8 md:p-12 text-center max-w-xl mx-auto"
        >
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">Let&apos;s Build Together</h2>
          <p className="mt-3 md:mt-4 text-[0.9375rem] md:text-base text-[#a09890] max-w-sm mx-auto leading-relaxed">
            Ready to start your next project? Book a free consultation and we&apos;ll discuss your ideas.
          </p>
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/booking" className="btn btn-primary w-full sm:w-auto">Book Your Call</Link>
            <Link to="/contact" className="btn btn-outline w-full sm:w-auto">Contact Us</Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

const posts = [
  { title: 'Building Premium Fullstack Applications with Next.js', excerpt: 'Discover how modern fullstack development can transform your digital presence.', date: 'Dec 15, 2024', cat: 'Development', slug: 'building-premium-fullstack-apps' },
  { title: 'The Art of Cinematic UI Design', excerpt: 'Learn how to create immersive user interfaces that captivate audiences.', date: 'Nov 28, 2024', cat: 'Design', slug: 'cinematic-ui-design' },
  { title: 'Why Your Business Needs a Progressive Web App', excerpt: 'PWAs are revolutionizing how businesses connect with users.', date: 'Nov 10, 2024', cat: 'Technology', slug: 'why-pwa-matters' },
  { title: 'Maximizing Conversion with Strategic UI/UX', excerpt: 'How strategic design decisions can dramatically improve conversion rates.', date: 'Oct 22, 2024', cat: 'Design', slug: 'conversion-ui-ux' },
];

export default function BlogGrid() {
  return (
    <section className="py-20 md:py-24">
      <div className="container px-6 md:px-8">
        <div className="text-center max-w-xl mx-auto mb-12 md:mb-14">
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">Latest Insights</h2>
          <p className="mt-3 text-[0.9375rem] md:text-base text-[#a09890]">Thoughts on development, design, and digital strategy.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
          {posts.map((post, i) => (
            <motion.article key={post.slug} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              className="card p-6 md:p-7 group cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo/10 text-indigo font-medium">{post.cat}</span>
                <span className="text-xs text-[#a09890] flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>
              </div>
              <h3 className="text-sm md:text-base font-semibold mb-2 group-hover:text-indigo transition-colors">{post.title}</h3>
              <p className="text-xs md:text-sm text-[#a09890] leading-relaxed">{post.excerpt}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

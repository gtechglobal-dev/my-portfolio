import { Link } from 'react-router-dom';
import { siteConfig } from '../../lib/constants';

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.04] bg-[#0b0b12]">
      <div className="container px-6 md:px-8 py-10 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <img src="/gtechlogo.png" alt="" className="w-7 object-contain" />
            <img src="/gtechName2.png" alt="Gtech Global" className="w-[72px] h-auto object-contain" />
          </div>
          <nav className="flex items-center gap-5 text-sm text-[#7a7a8c]">
            <Link to="/portfolio" className="hover:text-white transition-colors">Work</Link>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link to="/booking" className="hover:text-white transition-colors">Book</Link>
            <Link to="/resume" className="hover:text-white transition-colors">Resume</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
          </nav>
        </div>
        <div className="mt-6 pt-5 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5a5a6e]">
          <span>&copy; {new Date().getFullYear()} Gtech Global.</span>
          <div className="flex items-center gap-3">
            <a href={siteConfig.social.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <LinkedinIcon className="w-4 h-4" />
            </a>
            <span className="hidden sm:inline">|</span>
            <a href={`tel:${siteConfig.phone}`} className="hover:text-white transition-colors">{siteConfig.phone}</a>
            <span className="hidden sm:inline">|</span>
            <a href={`mailto:${siteConfig.email}`} className="hover:text-white transition-colors">{siteConfig.email}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

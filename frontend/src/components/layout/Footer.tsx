import { Link } from 'react-router-dom';
import { Linkedin } from 'lucide-react';
import { siteConfig } from '../../lib/constants';

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
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
          </nav>
        </div>
        <div className="mt-6 pt-5 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5a5a6e]">
          <span>&copy; {new Date().getFullYear()} Gtech Global.</span>
          <div className="flex items-center gap-3">
            <a href={siteConfig.social.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <Linkedin className="w-4 h-4" />
            </a>
            <span>gtechglobal.dev@gmail.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

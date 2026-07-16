import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowLeft } from 'lucide-react';

const links = [
  { to: '/', label: 'Home' },
  { to: '/portfolio', label: 'Sample Jobs' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/booking', label: 'Book' },
  { to: '/resume', label: 'Resume' },
  { to: '/contact', label: 'Contact' },
];

const extraLinks = [
  { to: '/admin', label: 'Admin' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#1a2332] shadow-lg shadow-black/20 border-b border-white/[0.06]' : 'bg-[#1a2332]/85 backdrop-blur-xl'
    }`}>
      <div className="container flex items-center justify-between h-16 px-6 md:px-8">
        <div className="flex items-center gap-2.5">
          {pathname !== '/' && (
            <button onClick={() => navigate(-1)}
              className="p-1.5 -ml-1 rounded-md text-[#8899aa] hover:text-white hover:bg-white/[0.06] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/gtechlogo.png" alt="" className="w-7 md:w-8 object-contain" />
            <img src="/gtechName2.png" alt="Gtech Global" className="w-[72px] md:w-20 h-auto object-contain hidden sm:block" />
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-0.5">
          {links.map((l) => (
            <Link key={l.to} to={l.to}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === l.to ? 'text-white bg-white/[0.08]' : 'text-[#8899aa] hover:text-white'
              }`}>
              {l.label}
            </Link>
          ))}
          <span className="w-px h-4 bg-white/[0.08] mx-1" />
          {extraLinks.map((l) => (
            <Link key={l.to} to={l.to}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                pathname.startsWith(l.to) ? 'text-[#5cc8e8] bg-[#5cc8e8]/10' : 'text-[#6b8090] hover:text-[#5cc8e8]'
              }`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-[#8899aa] hover:text-white transition-colors">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#1a2332]">
          <div className="px-6 py-3 space-y-0.5">
            {links.map((l) => (
              <Link key={l.to} to={l.to}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === l.to ? 'text-white bg-white/[0.08]' : 'text-[#8899aa]'
                }`}>
                {l.label}
              </Link>
            ))}
            <hr className="my-1 border-white/[0.06]" />
            {extraLinks.map((l) => (
              <Link key={l.to} to={l.to}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(l.to) ? 'text-[#5cc8e8] bg-[#5cc8e8]/10' : 'text-[#6b8090]'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

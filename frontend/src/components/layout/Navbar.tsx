import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/projects", label: "Projects" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const linkClass = (to: string) =>
    `text-sm transition-colors duration-150 relative group ${
      pathname === to ? "text-primary" : "text-text-secondary hover:text-text-primary"
    }`;

  const underlineClass = (to: string) =>
    `absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-200 ${
      pathname === to ? "w-full" : "w-0 group-hover:w-full"
    }`;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-dark-bg/80 backdrop-blur-md border-b border-dark-border"
          : "bg-transparent"
      }`}
    >
      <nav className="container-premium flex items-center justify-between px-4 h-16 md:px-6">
        <Link
          to="/"
          className="text-lg font-bold gradient-text hover:opacity-80 transition-opacity"
        >
          Gtech Global
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className={linkClass(link.to)}>
              {link.label}
              <span className={underlineClass(link.to)} />
            </Link>
          ))}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-text-primary hover:text-primary transition-colors"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-dark-bg/95 backdrop-blur-md border-b border-dark-border">
          <div className="flex flex-col px-4 py-3 gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm py-2.5 transition-colors ${
                  pathname === link.to
                    ? "text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

import { Link } from "react-router-dom";
import { Github, Linkedin, Twitter, Mail } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/projects", label: "Projects" },
  { to: "/contact", label: "Contact" },
];

const services = [
  "Web Development",
  "Graphics Design",
  "UI/UX Design",
  "Brand Identity",
];

export default function Footer() {
  return (
    <footer className="border-t border-dark-border bg-dark-card/30">
      <div className="container-premium px-4 py-12 md:px-6">
        {/* Mobile: 2-column layout with vertical divider */}
        <div className="grid grid-cols-2 gap-0 text-center md:hidden">
          <div className="border-r border-dark-border pr-4">
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">
              Links
            </h4>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-text-secondary hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="pl-4">
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">
              Services
            </h4>
            <ul className="space-y-2">
              {services.map((s) => (
                <li key={s}>
                  <span className="text-sm text-text-secondary">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Desktop: original 4-column grid */}
        <div className="hidden md:grid md:grid-cols-4 gap-6 text-left">
          <div>
            <h3 className="text-base font-bold gradient-text mb-3">
              Gtech Global
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Crafting digital experiences that inspire and engage.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">
              Links
            </h4>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-text-secondary hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">
              Services
            </h4>
            <ul className="space-y-2">
              {services.map((s) => (
                <li key={s}>
                  <span className="text-sm text-text-secondary">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">
              Connect
            </h4>
            <div className="flex gap-2">
              {[
                { icon: Github, href: "#", label: "GitHub" },
                { icon: Linkedin, href: "#", label: "LinkedIn" },
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Mail, href: "mailto:gtechglobal.dev@gmail.com", label: "Email" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg border border-dark-border flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/30 transition-all duration-200"
                  aria-label={label}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-dark-border text-center">
          <p className="text-sm text-text-muted">
            &copy; {new Date().getFullYear()} Gtech Global. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

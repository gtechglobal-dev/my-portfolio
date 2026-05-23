import { Link } from "react-router-dom";
import { ArrowRight, Code2, Palette, Layout, Lightbulb, Target } from "lucide-react";

const traits = [
  { icon: Lightbulb, label: "Creative Problem Solver", desc: "Transforming complex challenges into elegant digital solutions." },
  { icon: Code2, label: "Web Developer", desc: "Crafting clean, scalable, and performant code using modern technologies." },
  { icon: Palette, label: "Graphics Designer", desc: "Creating visual identities that captivate and communicate brand stories." },
  { icon: Target, label: "Digital Brand Strategist", desc: "Developing comprehensive brand strategies for meaningful digital presence." },
  { icon: Layout, label: "UI/UX Creator", desc: "Designing intuitive interfaces that deliver exceptional user experiences." },
];

const specialties = [
  "Full-stack web development",
  "Responsive websites",
  "Portfolio systems",
  "Church & community platforms",
  "Progressive Web Apps (PWAs)",
  "Business landing pages",
  "Branding and identity design",
  "Interactive user experiences",
];

export default function About() {
  return (
    <div className="section-padding">
      <div className="container-premium px-4 md:px-6">
        <div className="max-w-2xl mx-auto mb-14">
          <span className="text-xs text-primary font-semibold tracking-wider uppercase">
            About Me
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-4">
            Crafting Digital Excellence
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            I&apos;m Gtech Global — a web developer and graphics designer dedicated
            to building visually stunning, functional digital experiences. My
            work bridges aesthetic excellence and technical precision.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              With a deep understanding of modern web technologies and design
              principles, I help businesses, startups, churches, and
              organizations establish powerful online presences that drive
              engagement and deliver measurable results.
            </p>
            <p className="text-text-secondary text-sm leading-relaxed mb-6">
              Every project is a partnership — I listen, strategize, design, and
              execute with unwavering commitment to quality.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-light transition-colors"
            >
              Let&apos;s work together <ArrowRight size={14} />
            </Link>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-4">
              Specialties
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {specialties.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-xs text-text-secondary"
                >
                  <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-sm font-semibold text-text-primary mb-5">
            Who I Am
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {traits.map((t) => (
              <div
                key={t.label}
                className="p-4 rounded-xl border border-dark-border bg-dark-card/30"
              >
                <t.icon size={18} className="text-primary mb-2" />
                <h3 className="text-sm font-medium text-text-primary mb-1">
                  {t.label}
                </h3>
                <p className="text-xs text-text-secondary">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

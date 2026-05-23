import { Link } from "react-router-dom";
import { ArrowRight, Code2, Palette, Layout, Zap } from "lucide-react";

const highlights = [
  {
    icon: Code2,
    title: "Web Development",
    desc: "Modern, responsive websites built with cutting-edge technology.",
  },
  {
    icon: Palette,
    title: "Graphics Design",
    desc: "Brand identities and visuals that communicate your story.",
  },
  {
    icon: Layout,
    title: "UI/UX Design",
    desc: "Intuitive interfaces crafted for exceptional user experiences.",
  },
  {
    icon: Zap,
    title: "PWA Development",
    desc: "App-like experiences with offline support and fast performance.",
  },
];

export default function Home() {
  return (
    <>
      <section className="min-h-[90vh] flex items-center justify-center px-4 pt-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-dark-border text-xs text-text-muted mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Available for Projects
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-5">
            Designing Powerful{" "}
            <span className="gradient-text">Digital Experiences</span>
          </h1>

          <p className="text-text-secondary text-base md:text-lg leading-relaxed mb-8 max-w-xl mx-auto">
            Gtech Global helps businesses, brands, churches, and startups stand
            out online through modern web development, creative design, and
            responsive user experiences.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/projects"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              View My Work
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-dark-border text-text-primary text-sm font-medium hover:border-primary/50 hover:text-primary transition-colors"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-premium px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">What I Do</h2>
            <p className="text-text-secondary text-sm max-w-lg mx-auto">
              From concept to launch, I deliver digital solutions that elevate
              brands and engage audiences.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-xl border border-dark-border bg-dark-card/50 hover:border-primary/30 transition-colors group"
              >
                <item.icon
                  size={22}
                  className="text-primary mb-3 group-hover:text-secondary transition-colors"
                />
                <h3 className="text-sm font-semibold text-text-primary mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              to="/services"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-light transition-colors"
            >
              See all services <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-premium px-4 md:px-6">
          <div className="rounded-xl border border-dark-border bg-dark-card/30 p-8 md:p-12 text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-3">
              Let&apos;s Build Something Great
            </h2>
            <p className="text-text-secondary text-sm max-w-md mx-auto mb-6">
              Ready to transform your digital presence? I&apos;d love to hear
              about your project.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              Start a Project <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

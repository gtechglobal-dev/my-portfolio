import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { projects } from "../data/projects";

export default function Projects() {
  return (
    <div className="section-padding">
      <div className="container-premium px-4 md:px-6">
        <div className="max-w-2xl mx-auto mb-14">
          <span className="text-xs text-primary font-semibold tracking-wider uppercase">
            Portfolio
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-4">Projects</h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            A showcase of my best work — each project represents a unique
            challenge solved with creativity and technical precision.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <Link
              key={project.slug}
              to={`/projects/${project.slug}`}
              className="rounded-xl border border-dark-border bg-dark-card/30 overflow-hidden hover:border-primary/30 transition-colors group block"
            >
              <div className="h-40 bg-dark-card flex items-center justify-center border-b border-dark-border">
                <project.icon
                  size={36}
                  className="text-primary/30 group-hover:text-primary/50 transition-colors"
                />
              </div>
              <div className="p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-1.5 group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-3">
                  {project.desc}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {project.tech.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 text-[10px] rounded-md border border-dark-border text-text-muted"
                    >
                      {t}
                    </span>
                  ))}
                  {project.tech.length > 3 && (
                    <span className="px-2 py-0.5 text-[10px] rounded-md border border-dark-border text-text-muted">
                      +{project.tech.length - 3}
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-primary group-hover:gap-1.5 transition-all">
                  View details <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

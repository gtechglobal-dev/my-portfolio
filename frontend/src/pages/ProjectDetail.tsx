import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Github, Calendar, User, Tag } from "lucide-react";
import { projects } from "../data/projects";

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return (
      <div className="section-padding">
        <div className="container-premium px-4 md:px-6 text-center">
          <h1 className="text-2xl font-bold mb-3">Project not found</h1>
          <Link
            to="/projects"
            className="text-sm text-primary hover:text-primary-light transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Back to projects
          </Link>
        </div>
      </div>
    );
  }

  const Icon = project.icon;

  return (
    <div className="section-padding">
      <div className="container-premium px-4 md:px-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <div className="rounded-xl border border-dark-border bg-dark-card/30 overflow-hidden mb-10">
          <div className="h-48 md:h-64 bg-dark-card flex items-center justify-center border-b border-dark-border">
            <Icon size={64} className="text-primary/30" />
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded-md border border-dark-border text-text-muted flex items-center gap-1">
              <Calendar size={10} /> {project.year}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md border border-dark-border text-text-muted flex items-center gap-1">
              <User size={10} /> {project.client}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md border border-dark-border text-text-muted flex items-center gap-1">
              <Tag size={10} /> {project.category}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-1">{project.title}</h1>
          <p className="text-text-secondary text-sm mb-6">{project.subtitle}</p>

          <div className="flex flex-wrap gap-3 mb-8">
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <ExternalLink size={14} /> Live Preview
            </a>
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-dark-border text-text-primary text-sm font-medium hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Github size={14} /> Source Code
            </a>
          </div>

          <div className="space-y-4 mb-10">
            {project.longDesc.map((paragraph, i) => (
              <p key={i} className="text-text-secondary text-sm leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4">Technologies Used</h2>
            <div className="flex flex-wrap gap-2">
              {project.tech.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 text-xs rounded-lg border border-dark-border bg-dark-card/50 text-text-secondary"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4">Key Features</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {project.features.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-sm text-text-secondary"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

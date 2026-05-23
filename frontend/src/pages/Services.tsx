import {
  Globe,
  Palette,
  Frame,
  Smartphone,
  LayoutDashboard,
  Building2,
  Shield,
  Wrench,
  Share2,
  Sparkles,
} from "lucide-react";

const services = [
  {
    icon: Globe,
    title: "Modern Website Development",
    desc: "Custom-built, responsive websites using cutting-edge technologies for optimal performance and user experience.",
  },
  {
    icon: Palette,
    title: "Graphics Design & Branding",
    desc: "Complete brand identity systems including logos, color palettes, typography, and visual assets.",
  },
  {
    icon: Frame,
    title: "UI/UX Design Systems",
    desc: "Comprehensive design systems that ensure consistency, accessibility, and delightful user interactions.",
  },
  {
    icon: Smartphone,
    title: "Progressive Web Apps (PWA)",
    desc: "App-like experiences with offline functionality, push notifications, and fast load times.",
  },
  {
    icon: LayoutDashboard,
    title: "Business Landing Pages",
    desc: "High-converting landing pages designed to capture leads and drive business growth.",
  },
  {
    icon: Building2,
    title: "Church & Community Platforms",
    desc: "Custom platforms with event management, donation systems, and community engagement features.",
  },
  {
    icon: Shield,
    title: "Admin Dashboard Systems",
    desc: "Powerful admin panels with data visualization, user management, and analytics integration.",
  },
  {
    icon: Wrench,
    title: "Website Maintenance & Optimization",
    desc: "Ongoing support, performance optimization, security updates, and content management.",
  },
  {
    icon: Share2,
    title: "Social Media Brand Design",
    desc: "Cohesive social media visuals, templates, and brand assets for consistent online presence.",
  },
  {
    icon: Sparkles,
    title: "Interactive User Experiences",
    desc: "Engaging micro-interactions, animations, and immersive digital experiences.",
  },
];

export default function Services() {
  return (
    <div className="section-padding">
      <div className="container-premium px-4 md:px-6">
        <div className="max-w-2xl mx-auto mb-14">
          <span className="text-xs text-primary font-semibold tracking-wider uppercase">
            What I Do
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-4">Services</h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            From concept to launch, I deliver comprehensive digital solutions
            that elevate brands and engage audiences.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.title}
              className="p-5 rounded-xl border border-dark-border bg-dark-card/30 hover:border-primary/30 transition-colors group"
            >
              <service.icon
                size={20}
                className="text-primary mb-3 group-hover:text-secondary transition-colors"
              />
              <h3 className="text-sm font-semibold text-text-primary mb-1.5 group-hover:text-primary transition-colors">
                {service.title}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {service.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

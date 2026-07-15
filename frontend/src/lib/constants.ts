export const siteConfig = {
  name: 'Gtech Global',
  email: 'gtechglobal.dev@gmail.com',
  phone: '+234 905 486 7749',
  social: {
    whatsapp: 'https://wa.me/2349054867749',
    linkedin: 'https://www.linkedin.com/in/okoroebube-gtech/',
    github: 'https://github.com/gtechglobal-dev',
  },
}

export const webDevPackages = [
  {
    id: 'landing-page',
    title: 'Landing Page Website',
    desc: 'Personal brands, events, campaigns, product launches',
    perfectFor: ['Personal portfolio', 'Event website', 'Product launch', 'Restaurant', 'Small business'],
    priceUsd: 150,
    features: ['Responsive design', 'Contact form', 'Social media links', 'Basic SEO', '1 page'],
    delivery: '3–5 days',
    popular: false,
  },
  {
    id: 'business',
    title: 'Business Website',
    desc: 'Companies, schools, churches, hotels, hospitals',
    perfectFor: ['Schools', 'Churches', 'SMEs', 'NGOs', 'Hotels'],
    priceUsd: 350,
    features: ['5–10 pages', 'Mobile responsive', 'Contact forms', 'Google Maps', 'Gallery', 'Basic CMS', 'SEO optimization'],
    delivery: '1–2 weeks',
    popular: true,
  },
  {
    id: 'corporate',
    title: 'Corporate Website',
    desc: 'Organizations requiring multiple pages and advanced features',
    perfectFor: ['Large businesses', 'Government organizations', 'Educational institutions'],
    priceUsd: 700,
    features: ['Up to 20 pages', 'Admin dashboard', 'Blog', 'Team management', 'Downloads', 'News section', 'Advanced animations', 'Premium UI/UX'],
    delivery: '2–4 weeks',
    popular: false,
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce Website',
    desc: 'Online stores with payment gateway and inventory',
    perfectFor: ['Fashion stores', 'Supermarkets', 'Electronics', 'Pharmacies'],
    priceUsd: 1200,
    features: ['Product management', 'Shopping cart', 'Checkout', 'Paystack/Stripe integration', 'Customer accounts', 'Order management', 'Email notifications', 'Coupons', 'Inventory'],
    delivery: '3–6 weeks',
    popular: false,
  },
  {
    id: 'webapp',
    title: 'Web Application',
    desc: 'Portals, dashboards, SaaS platforms, management systems',
    perfectFor: ['School Management System', 'Hospital Management', 'Hotel Booking', 'HR System', 'CRM', 'Learning Management System', 'Real Estate Portal', 'Student Result Portal'],
    priceUsd: 2500,
    features: ['Authentication', 'Admin dashboard', 'Database', 'Analytics', 'Role management', 'Reports', 'API integration', 'Cloud deployment', 'Security'],
    delivery: '1–3 months',
    popular: false,
  },
  {
    id: 'enterprise',
    title: 'Custom Enterprise Solution',
    desc: 'Large-scale custom software with unique requirements',
    perfectFor: ['Banks', 'Fintech', 'Government', 'Large organizations', 'SaaS startups', 'Multi-tenant platforms'],
    priceUsd: 5000,
    features: ['Everything in Web Application', 'Custom integrations', 'High security', 'Scalable architecture', 'Multiple user roles', 'Advanced reporting', 'API development', 'Ongoing support options', 'Dedicated project planning'],
    delivery: 'Custom timeline',
    popular: false,
  },
]

export const webDevAddons = [
  { service: 'Extra Page', priceUsd: 30 },
  { service: 'Blog Setup', priceUsd: 100 },
  { service: 'Booking System', priceUsd: 200 },
  { service: 'Payment Gateway Integration', priceUsd: 150 },
  { service: 'Live Chat', priceUsd: 50 },
  { service: 'WhatsApp Integration', priceUsd: 30 },
  { service: 'Domain Setup', priceUsd: 30 },
  { service: 'Hosting Deployment', priceUsd: 80 },
  { service: 'Business Email Setup', priceUsd: 50 },
  { service: 'SEO Optimization', priceUsd: 200 },
  { service: 'Website Maintenance', priceUsd: 50, perMonth: true },
]

export const DEFAULT_EXCHANGE_RATE = 1540

export function formatNgn(usd: number, rate: number): string {
  const ngn = Math.round(usd * rate)
  return ngn.toLocaleString('en-NG')
}

export const graphicsPackages = [
  { id: 'logo', title: 'Logo Design', priceUsd: 7, features: ['3 concepts', 'Vector files', 'Source file', 'Color variations'] },
  { id: 'flyer', title: 'Flyer Design', priceUsd: 5, features: ['Print ready', 'Social version', 'Source file', '2 revisions'] },
  { id: 'banner', title: 'Banner Ad', priceUsd: 5, features: ['Multiple sizes', 'Animated option', 'Source file', '2 revisions'] },
  { id: 'other', title: 'Other Designs', priceUsd: 0, features: ['Custom design', 'Describe your needs', 'Get a quote'] },
]

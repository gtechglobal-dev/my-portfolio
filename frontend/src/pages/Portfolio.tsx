import PortfolioGrid from '../components/sections/PortfolioGrid';

export default function Portfolio() {
  return (
    <div className="pt-20 md:pt-24">
      <div className="container px-6 md:px-8 pt-8 md:pt-12 text-center">
        <h1 className="text-[1.75rem] md:text-[2.25rem] font-bold tracking-[-0.01em]">Our Portfolio</h1>
        <p className="mt-3 text-[0.9375rem] md:text-base text-[#7a7a8c] max-w-xl mx-auto">
          Explore our premium projects across various industries.
        </p>
      </div>
      <PortfolioGrid />
    </div>
  );
}

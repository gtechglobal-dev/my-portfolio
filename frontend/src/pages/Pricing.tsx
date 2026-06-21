import WebPricing from '../components/sections/WebPricing';
import GraphicsPricing from '../components/sections/GraphicsPricing';

export default function Pricing() {
  return (
    <div className="pt-20 md:pt-24">
      <WebPricing />
      <GraphicsPricing />
    </div>
  );
}

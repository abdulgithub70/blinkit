import { BRAND } from "@/config/brand";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold">About {BRAND.name}</h1>

      <p className="mb-4 text-gray-700">
        {BRAND.name} brings quick-commerce style delivery inside India&apos;s biggest exhibitions
        and trade shows — think Bharat Mandapam, Pragati Maidan, India Expo Mart and Yashobhoomi.
      </p>

      <p className="mb-4 text-gray-700">
        Exhibitors and stall staff spend long hours on the show floor, and regular delivery apps
        don&apos;t reach individual stalls inside a venue. We do — just tell us your hall and stall
        number and we bring water, tea, snacks and meals straight to you.
      </p>

      <h2 className="mb-2 mt-6 text-xl font-semibold">What we offer</h2>
      <ul className="list-inside list-disc space-y-1 text-gray-700">
        <li>Water, beverages, snacks and full meals, ordered in a couple of taps</li>
        <li>Delivery to your exact hall and stall, no addresses needed</li>
        <li>Live order tracking from placed to delivered</li>
        <li>Admin-managed fulfilment, so every order is looked after</li>
      </ul>

      <p className="mt-6 text-gray-700">
        Our goal is simple: keep you at your stall, not queuing for coffee.
      </p>
    </div>
  );
}

// Guide ka apna layout: shop ka header, search bar aur footer yahan nahi aata (alag project jaisa).
export const metadata = { title: "Hall Guide" };
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default function GuideLayout({ children }) {
  return <div className="min-h-dvh bg-slate-100 text-slate-900">{children}</div>;
}

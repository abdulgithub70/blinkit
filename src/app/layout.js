import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/config/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description:
    "Order water, tea, snacks and meals for delivery straight to your stall at India's biggest exhibitions.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// No shared chrome here on purpose: the customer shop, the admin panel and
// the auth pages each need a different header/nav, so every route group
// under app/ brings its own layout.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}>
        {children}
      </body>
    </html>
  );
}

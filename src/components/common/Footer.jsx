import Link from "next/link";
import { BRAND } from "@/config/brand";

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <nav className="flex gap-4 font-medium">
            <Link href="/about">About</Link>
            <Link href="/contactus">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

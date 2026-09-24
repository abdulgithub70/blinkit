"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Package, ShoppingBag, Tags, Percent } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BRAND } from "@/config/brand";

const NAV = [
  { href: "/adminzxz", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/adminzxz/orders", label: "Orders", icon: ShoppingBag },
  { href: "/adminzxz/products", label: "Products", icon: Package },
  { href: "/adminzxz/categories", label: "Categories", icon: Tags },
  { href: "/adminzxz/offers", label: "Offers", icon: Percent },
];

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-slate-900 px-4 text-white md:h-screen md:w-56 md:flex-col md:items-stretch md:justify-start md:py-5">
        <Link href="/adminzxz" className="text-lg font-extrabold">
          {BRAND.name} <span className="font-normal text-white/60">admin</span>
        </Link>

        <nav className="hidden md:mt-8 md:block">
          <ul className="space-y-1">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold ${
                      active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={18} /> {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 md:mt-auto md:flex"
        >
          <LogOut size={18} /> Sign out
        </button>
      </aside>

      <nav className="sticky top-14 z-20 flex justify-around border-b bg-white md:hidden">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                active ? "text-brand" : "text-slate-500"
              }`}
            >
              <Icon size={18} /> {label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}

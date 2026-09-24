'use client';

import Link from "next/link";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";

export default function MobileMenu({ open, onClose }) {
  const router = useRouter();
  if (!open) return null;
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-lg animate-slideIn">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <span className="text-lg font-semibold">Menu</span>
          <button onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col p-4 gap-4 text-gray-700">
          <Link href="/account" onClick={onClose}>👤 My Account</Link>
          {/*<Link href="/orders" onClick={onClose}>📦 My Orders</Link>*/}
          {/*<Link href="/saved" onClick={onClose}>❤️ Saved Profiles</Link>*/}
          <Link href="/about" onClick={onClose}>ℹ️ About ExpoEase</Link>
          <Link href="/contactus" onClick={onClose}>📞 Contact Support</Link>

          <hr />

          <button className="text-red-500 flex items-center gap-2 text-left" onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} >
            <LogOut size={18} /> Logout
          </button>
        </nav>
      </div>
    </>
  );
}

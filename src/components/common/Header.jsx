'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import CartDrawer from "@/components/cart/CartDrawer";
import MobileMenu from "./MobileMenu";
import { useCartStore } from "@/store/cartStore";
import { Menu, ShoppingCart } from "lucide-react";

export default function Header() {
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cart = useCartStore((state) => state.cart);

  // 🔒 lock scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "auto";
  }, [menuOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-[#1e2f4f] text-white z-50 shadow-md">
        <div className="flex items-center justify-between px-4 h-14">

          {/* Hamburger */}
          <button onClick={() => setMenuOpen(true)}>
            <Menu size={24} />
          </button>

          {/* Logo */}
          <Link href="/" className="text-lg font-semibold">
            ExpoEase
          </Link>

          {/* Cart */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative"
          >
            <ShoppingCart size={22} />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="h-14" />

      {/* Drawers */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

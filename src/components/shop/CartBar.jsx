"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { useCartStore, selectCartCount, selectCartSubtotal } from "@/store/cartStore";
import { formatPrice } from "@/lib/format";

// Floating "View cart" bar shown while the cart has items.
export default function CartBar({ onOpen }) {
  const pathname = usePathname();
  const count = useCartStore(selectCartCount);
  const subtotal = useCartStore(selectCartSubtotal);
  if (count === 0 || pathname === "/checkout") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-4">
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto mx-auto flex h-14 w-full max-w-md items-center justify-between rounded-2xl bg-brand px-4 text-white shadow-lg active:bg-brand-dark"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingBag size={20} />
          {count} {count === 1 ? "item" : "items"} · {formatPrice(subtotal)}
        </span>
        <span className="flex items-center text-sm font-bold">
          View cart <ChevronRight size={18} />
        </span>
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ShoppingCart, UserRound, Zap } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useCartStore, selectCartCount } from "@/store/cartStore";
import { useDeliveryStore } from "@/store/deliveryStore";
import { useCurrentExhibition } from "@/lib/useExhibitions";
import SearchBar from "./SearchBar";

export default function Header({ onOpenCart, onOpenLocation }) {
  const pathname = usePathname();
  const count = useCartStore(selectCartCount);
  const hall = useDeliveryStore((s) => s.hall);
  const stall = useDeliveryStore((s) => s.stall);
  const { exhibition } = useCurrentExhibition();

  const eta = exhibition
    ? `Delivery in ${exhibition.est_delivery_min}–${exhibition.est_delivery_max} min`
    : "Choose your venue";
  const where = [hall || "Add hall", stall ? `Stall ${stall}` : "Add stall"].join(" • ");

  return (
    <header className="sticky top-0 z-40 bg-brand text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-2 pt-3">
        <Link href="/" className="hidden text-lg font-extrabold tracking-tight md:block">
          {BRAND.name}
        </Link>

        <button
          type="button"
          onClick={onOpenLocation}
          className="min-w-0 flex-1 text-left"
          aria-label="Change delivery location"
        >
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
            <Zap size={12} className="fill-current" /> {eta}
          </span>
          <span className="flex items-center gap-1 truncate text-base font-bold leading-tight">
            <span className="truncate">{exhibition?.name ?? "Select venue"}</span>
            <ChevronDown size={18} className="shrink-0" />
          </span>
          <span className="block truncate text-xs text-white/90">{where}</span>
        </button>

        <Link
          href="/orders"
          aria-label="My orders"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 active:bg-white/25"
        >
          <UserRound size={22} />
        </Link>

        <button
          type="button"
          onClick={onOpenCart}
          aria-label={`Open cart, ${count} items`}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 active:bg-white/25"
        >
          <ShoppingCart size={22} />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-highlight px-1 text-[11px] font-bold text-slate-900">
              {count}
            </span>
          )}
        </button>
      </div>

      {pathname !== "/search" && (
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <SearchBar />
        </div>
      )}
    </header>
  );
}

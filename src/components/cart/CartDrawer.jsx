"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, X } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useActiveOffer, discountedCartSubtotal } from "@/lib/offers";
import { useCurrentExhibition } from "@/lib/useExhibitions";
import { useCartSync } from "@/lib/useCartSync";
import CartItem from "./CartItem";
import BillSummary from "./BillSummary";

export default function CartDrawer({ open, onClose }) {
  const router = useRouter();
  const cart = useCartStore((s) => s.cart);
  const offer = useActiveOffer();
  const subtotal = discountedCartSubtotal(cart, offer);
  const removeUnavailable = useCartStore((s) => s.removeUnavailable);
  const { exhibition } = useCurrentExhibition();
  useCartSync(exhibition?.id ?? null, open);

  // Freeze background scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const deliveryFee = exhibition ? Number(exhibition.delivery_fee) : 0;
  const hasUnavailable = cart.some((i) => i.unavailable);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-slate-50 shadow-xl"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-4">
          <h2 className="text-lg font-bold">Your cart</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="grid h-10 w-10 place-items-center rounded-full active:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShoppingBag size={40} className="text-slate-300" />
            <p className="font-semibold text-slate-800">Your cart is empty</p>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-full bg-brand px-6 text-sm font-semibold text-white"
            >
              Start shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {cart.map((item) => (
                <CartItem key={item.id} item={item} editable />
              ))}
            </div>

            <div className="shrink-0 space-y-3 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {hasUnavailable && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
                  <span>Some items are no longer available.</span>
                  <button
                    type="button"
                    onClick={removeUnavailable}
                    className="shrink-0 font-bold underline"
                  >
                    Remove them
                  </button>
                </div>
              )}
              <BillSummary subtotal={subtotal} deliveryFee={deliveryFee} />
              <button
                type="button"
                disabled={hasUnavailable}
                onClick={() => {
                  onClose();
                  router.push("/checkout");
                }}
                className="h-12 w-full rounded-xl bg-brand text-base font-bold text-white active:bg-brand-dark disabled:opacity-50"
              >
                Proceed to checkout
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

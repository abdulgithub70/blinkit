"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { ChevronLeft, MapPin, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCartStore, selectCartCount } from "@/store/cartStore";
import { useActiveOffer, discountedCartSubtotal } from "@/lib/offers";
import { useDeliveryStore } from "@/store/deliveryStore";
import { useMyOrdersStore } from "@/store/myOrdersStore";
import { useCurrentExhibition } from "@/lib/useExhibitions";
import { useCartSync } from "@/lib/useCartSync";
import { useMounted } from "@/lib/useMounted";
import { isValidPhone, normalizePhone, uuid } from "@/lib/format";
import CartItem from "@/components/cart/CartItem";
import BillSummary from "@/components/cart/BillSummary";
import LocationSelector from "@/components/shop/LocationSelector";
import { Field, inputClass } from "@/components/shop/LocationFields";
import { EmptyState } from "@/components/shop/States";

function validate({ exhibitionId, hall, stall, name, phone }) {
  const errors = {};
  if (!exhibitionId) errors.exhibition = "Choose a venue";
  if (!hall.trim()) errors.hall = "Required";
  if (!stall.trim()) errors.stall = "Required";
  if (!name.trim()) errors.name = "Required";
  if (!isValidPhone(phone)) errors.phone = "Enter a valid 10-digit mobile number";
  return errors;
}

export default function CheckoutPage() {
  const router = useRouter();
  const mounted = useMounted();

  const cart = useCartStore((s) => s.cart);
  const offer = useActiveOffer();
  const subtotal = discountedCartSubtotal(cart, offer);
  const count = useCartStore(selectCartCount);
  const clearCart = useCartStore((s) => s.clearCart);

  const delivery = useDeliveryStore(
    useShallow((s) => ({
      exhibitionId: s.exhibitionId,
      hall: s.hall,
      stall: s.stall,
      stallName: s.stallName,
      name: s.name,
      phone: s.phone,
    }))
  );
  const setDelivery = useDeliveryStore((s) => s.setDelivery);
  const addOrder = useMyOrdersStore((s) => s.addOrder);
  const { exhibition } = useCurrentExhibition();
  const { refresh: refreshCartSync } = useCartSync(exhibition?.id ?? null, true);

  const [instructions, setInstructions] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const deliveryFee = exhibition ? Number(exhibition.delivery_fee) : 0;
  const hasUnavailable = cart.some((i) => i.unavailable);
  const where = useMemo(
    () => [delivery.hall, delivery.stall && `Stall ${delivery.stall}`].filter(Boolean).join(" • "),
    [delivery.hall, delivery.stall]
  );

  if (!mounted) return null;

  if (count === 0) {
    return (
      <EmptyState title="Your cart is empty" message="Add something tasty before checking out.">
        <Link href="/" className="mt-4 inline-block font-semibold text-brand">
          Start shopping
        </Link>
      </EmptyState>
    );
  }

  async function placeOrder() {
    const errs = validate(delivery);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (hasUnavailable) {
      setSubmitError("Some items in your cart are no longer available. Please remove them first.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const id = uuid();

    const { error } = await supabase.from("orders").insert({
      id,
      exhibition_id: delivery.exhibitionId,
      name: delivery.name.trim(),
      phone: normalizePhone(delivery.phone),
      hall_no: delivery.hall.trim(),
      stall_name: delivery.stallName.trim() || null,
      stall_number: delivery.stall.trim(),
      delivery_instructions: instructions.trim() || null,
      order_items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
    });

    if (error) {
      // The database re-validates everything (availability, quantities,
      // prices); a failure here usually means the catalogue moved under us.
      setSubmitError(
        error.message?.includes("Unknown product") ||
          error.message?.includes("unavailable") ||
          error.message?.includes("not available")
          ? "Your cart is out of date. We've refreshed it — please check and try again."
          : "Could not place your order. Please try again."
      );
      refreshCartSync();
      setSubmitting(false);
      return;
    }

    addOrder(id);
    clearCart();
    router.push(`/order/${id}?placed=1`);
  }

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <Link href="/" className="mb-3 inline-flex items-center text-sm font-semibold text-brand">
        <ChevronLeft size={18} /> Back
      </Link>
      <h1 className="mb-4 text-xl font-bold">Checkout</h1>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2">
            <MapPin size={18} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <p className="font-bold text-slate-900">{exhibition?.name ?? "No venue selected"}</p>
              <p className="text-sm text-slate-600">{where || "Add hall and stall"}</p>
              {delivery.stallName && <p className="text-sm text-slate-500">{delivery.stallName}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLocationOpen(true)}
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand"
          >
            <Pencil size={14} /> Edit
          </button>
        </div>
        {(errors.exhibition || errors.hall || errors.stall) && (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
            Please complete your delivery location.
          </p>
        )}
      </section>

      <section className="mb-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Field label="Your name" htmlFor="co-name" error={errors.name}>
          <input
            id="co-name"
            value={delivery.name}
            onChange={(e) => setDelivery({ name: e.target.value })}
            maxLength={100}
            aria-invalid={Boolean(errors.name)}
            className={inputClass}
          />
        </Field>
        <Field label="Contact number" htmlFor="co-phone" error={errors.phone}>
          <input
            id="co-phone"
            type="tel"
            inputMode="numeric"
            value={delivery.phone}
            onChange={(e) => setDelivery({ phone: e.target.value })}
            placeholder="10-digit mobile number"
            maxLength={13}
            aria-invalid={Boolean(errors.phone)}
            className={inputClass}
          />
        </Field>
        <Field label="Delivery instructions" htmlFor="co-instr" optional>
          <input
            id="co-instr"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Near the main entrance"
            maxLength={300}
            className={inputClass}
          />
        </Field>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-bold">
          {count} {count === 1 ? "item" : "items"}
        </h2>
        <div className="space-y-2">
          {cart.map((item) => (
            <CartItem key={item.id} item={item} editable />
          ))}
        </div>
        {hasUnavailable && (
          <p className="mt-3 text-xs font-medium text-red-600">
            Remove unavailable items from your cart before placing the order.
          </p>
        )}
        <BillSummary subtotal={subtotal} deliveryFee={deliveryFee} className="mt-4" />
      </section>

      {submitError && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
          {submitError}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={placeOrder}
          disabled={submitting || hasUnavailable}
          className="mx-auto flex h-12 w-full max-w-2xl items-center justify-center rounded-xl bg-brand text-base font-bold text-white active:bg-brand-dark disabled:opacity-50"
        >
          {submitting ? "Placing order…" : `Place order · ₹${(subtotal + deliveryFee).toFixed(0)}`}
        </button>
      </div>

      <LocationSelector open={locationOpen} onClose={() => setLocationOpen(false)} />
    </div>
  );
}

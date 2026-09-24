"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cached, invalidate } from "@/lib/cache";

// The single currently-active promotional offer (e.g. "First Day Special —
// ₹50 OFF"). Always a flat rupee amount, never a percentage. The database
// only ever allows one row with is_active = true.
export function fetchActiveOffer() {
  return cached(
    "offer:active",
    async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("id,title,amount")
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    30_000
  );
}

export function useActiveOffer() {
  const [offer, setOffer] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchActiveOffer()
      .then((o) => !cancelled && setOffer(o))
      .catch(() => !cancelled && setOffer(null));
    return () => {
      cancelled = true;
    };
  }, []);

  return offer;
}

export function invalidateOfferCache() {
  invalidate("offer:");
}

// Same rule the database trigger uses when actually charging the order: a
// flat amount comes off, but never below ₹0 — if the offer is bigger than
// (or equal to) the item's price, that item is simply left undiscounted.
// Keeping this identical to the SQL in 0002_offers.sql is what guarantees
// the price shown here always matches what the customer is charged.
export function applyOffer(price, offer) {
  const base = Number(price) || 0;
  const amount = Number(offer?.amount) || 0;
  if (!offer || amount <= 0 || base <= amount) {
    return { price: base, discounted: false };
  }
  return { price: base - amount, discounted: true };
}

// Cart subtotal with the offer applied per line, for display in the cart
// drawer and at checkout — computed the same way the database will.
export function discountedCartSubtotal(cart, offer) {
  return cart.reduce(
    (sum, item) => sum + applyOffer(item.price, offer).price * item.quantity,
    0
  );
}

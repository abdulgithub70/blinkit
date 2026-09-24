"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import CartBar from "./CartBar";
import BottomNav from "./BottomNav";
import LocationSelector from "./LocationSelector";
import CartDrawer from "@/components/cart/CartDrawer";
import Footer from "@/components/common/Footer";
import { useDeliveryStore } from "@/store/deliveryStore";
import { useCurrentExhibition } from "@/lib/useExhibitions";

// Customer-facing chrome: header, floating cart bar, tab bar, cart drawer and
// the delivery-location sheet.
export default function ShopShell({ children }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const setExhibition = useDeliveryStore((s) => s.setExhibition);
  const { exhibition, exhibitions, loading } = useCurrentExhibition();

  // No (valid) venue chosen yet: auto-pick when there is only one, otherwise
  // ask. The sheet cannot be dismissed until a venue is set.
  useEffect(() => {
    if (loading || exhibitions.length === 0 || exhibition) return;
    if (exhibitions.length === 1) setExhibition(exhibitions[0].id);
    else setLocationOpen(true);
  }, [loading, exhibitions, exhibition, setExhibition]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header onOpenCart={() => setCartOpen(true)} onOpenLocation={() => setLocationOpen(true)} />
      <main className="mx-auto max-w-6xl px-4 pb-40 pt-4 md:pb-16">{children}</main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <CartBar onOpen={() => setCartOpen(true)} />
      <BottomNav />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <LocationSelector
        open={locationOpen && (Boolean(exhibition) || exhibitions.length > 0)}
        required={!exhibition}
        onClose={() => setLocationOpen(false)}
      />
    </div>
  );
}

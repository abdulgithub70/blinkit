"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/store/cartStore";

// Keeps cart lines honest: refreshes prices/names and flags lines that are no
// longer orderable. `refresh()` re-runs it on demand (e.g. after a failed order).
export function useCartSync(exhibitionId, active = true) {
  // primitive selector: re-runs only when the set of product ids changes
  const idsKey = useCartStore((s) =>
    s.cart.map((i) => i.id).sort((a, b) => a - b).join(",")
  );
  const syncWithCatalog = useCartStore((s) => s.syncWithCatalog);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active || !idsKey) return;
    let cancelled = false;
    supabase
      .from("products")
      .select("id,name,description,price,image,exhibition_id,is_available")
      .in("id", idsKey.split(",").map(Number))
      .then(({ data, error }) => {
        if (!cancelled && !error) syncWithCatalog(data ?? [], exhibitionId);
      });
    return () => {
      cancelled = true;
    };
  }, [active, idsKey, exhibitionId, syncWithCatalog, tick]);

  return { refresh: useCallback(() => setTick((n) => n + 1), []) };
}

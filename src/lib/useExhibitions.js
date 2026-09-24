"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cached } from "@/lib/cache";
import { useDeliveryStore } from "@/store/deliveryStore";

const COLUMNS =
  "id,name,slug,city,halls,delivery_fee,est_delivery_min,est_delivery_max";

export function fetchExhibitions() {
  return cached("exhibitions", async () => {
    const { data, error } = await supabase
      .from("exhibitions")
      .select(COLUMNS)
      .eq("is_active", true)
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return data ?? [];
  });
}

export function useExhibitions() {
  const [state, setState] = useState({ exhibitions: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    fetchExhibitions()
      .then((exhibitions) => {
        if (!cancelled) setState({ exhibitions, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            exhibitions: [],
            loading: false,
            error: err?.message || "Could not load venues",
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// The exhibition the customer has picked (or null until they do).
export function useCurrentExhibition() {
  const exhibitionId = useDeliveryStore((s) => s.exhibitionId);
  const { exhibitions, loading, error } = useExhibitions();
  const exhibition = exhibitions.find((e) => e.id === exhibitionId) ?? null;
  return { exhibition, exhibitions, loading, error };
}

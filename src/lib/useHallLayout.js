"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const key = (slug, hall) => `hall-layout:${slug}:${hall}`;
const readLocal = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k));
  } catch {
    return null;
  }
};

// Offline-first: pehle phone me saved copy dikhao, network se naya aaye to badal do.
export function useHallLayout(slug, hall) {
  const [state, setState] = useState({ layout: null, loading: true, offline: false });

  useEffect(() => {
    if (!slug || !hall) {
      setState({ layout: null, loading: false, offline: false });
      return;
    }
    let off = false;
    const k = key(slug, hall);
    const local = readLocal(k);
    setState({ layout: local, loading: true, offline: false });

    supabase
      .from("hall_layouts")
      .select("rows,cols,cells,stalls,pois,version")
      .eq("exhibition_slug", slug)
      .eq("hall", hall)
      .maybeSingle()
      .then(({ data, error }) => {
        if (off) return;
        if (error) return setState({ layout: local, loading: false, offline: true });
        if (data) {
          try {
            localStorage.setItem(k, JSON.stringify(data));
          } catch {}
        }
        setState({ layout: data ?? local, loading: false, offline: false });
      })
      .catch(() => !off && setState({ layout: local, loading: false, offline: true }));

    return () => {
      off = true;
    };
  }, [slug, hall]);

  return state;
}

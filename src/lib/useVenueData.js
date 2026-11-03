"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const key = (slug) => `venue-data:${slug}`;
const empty = { layouts: {}, links: [] };
const readLocal = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k));
  } catch {
    return null;
  }
};

// Ek exhibition ke saare halls + unke beech ke links. Pehle phone ki saved copy, phir network se naya.
export function useVenueData(slug) {
  const [state, setState] = useState({ ...empty, loading: true, offline: false });

  useEffect(() => {
    if (!slug) {
      setState({ ...empty, loading: false, offline: false });
      return;
    }
    let off = false;
    const k = key(slug);
    const local = readLocal(k);
    setState({ ...(local ?? empty), loading: true, offline: false });

    Promise.all([
      supabase.from("hall_layouts").select("hall,rows,cols,cells,stalls,pois,version").eq("exhibition_slug", slug),
      supabase.from("hall_links").select("a_hall,a_poi,b_hall,b_poi,meters,kind").eq("exhibition_slug", slug),
    ])
      .then(([lay, lnk]) => {
        if (off) return;
        if (lay.error || lnk.error) return setState({ ...(local ?? empty), loading: false, offline: true });
        const layouts = Object.fromEntries((lay.data ?? []).map((r) => [r.hall, r]));
        const links = (lnk.data ?? []).map((r) => ({ aHall: r.a_hall, aPoi: r.a_poi, bHall: r.b_hall, bPoi: r.b_poi, meters: r.meters, kind: r.kind }));
        try {
          localStorage.setItem(k, JSON.stringify({ layouts, links }));
        } catch {}
        setState({ layouts, links, loading: false, offline: false });
      })
      .catch(() => !off && setState({ ...(local ?? empty), loading: false, offline: true }));

    return () => {
      off = true;
    };
  }, [slug]);

  return state;
}

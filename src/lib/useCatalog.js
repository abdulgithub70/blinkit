"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cached, invalidate } from "@/lib/cache";

const PRODUCT_COLUMNS =
  "id,name,description,price,image,category_id,exhibition_id,is_available,is_featured,sort_order";

function fetchCatalog(exhibitionId) {
  return cached(`catalog:${exhibitionId}`, async () => {
    const [cats, prods] = await Promise.all([
      supabase
        .from("categories")
        .select("id,name,slug,icon,sort_order")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        // products with no exhibition are sold everywhere
        .or(`exhibition_id.is.null,exhibition_id.eq.${exhibitionId}`)
        .order("sort_order")
        .order("name"),
    ]);
    if (cats.error) throw cats.error;
    if (prods.error) throw prods.error;
    return { categories: cats.data ?? [], products: prods.data ?? [] };
  });
}

// Categories + products sold at one exhibition. Pass null while no exhibition
// is selected yet (stays in the loading state).
export function useCatalog(exhibitionId) {
  const [state, setState] = useState({ categories: [], products: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!exhibitionId) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchCatalog(exhibitionId)
      .then((data) => {
        if (!cancelled) setState({ ...data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            categories: [],
            products: [],
            loading: false,
            error: err?.message || "Could not load the menu",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [exhibitionId, attempt]);

  const reload = useCallback(() => {
    invalidate("catalog:");
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}

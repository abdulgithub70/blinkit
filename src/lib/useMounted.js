"use client";

import { useEffect, useState } from "react";

// True after the first client render. Persisted stores (cart, delivery
// details) are only trustworthy from then on, so pages that redirect or
// validate based on them wait for this.
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

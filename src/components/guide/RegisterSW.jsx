"use client";

import { useEffect } from "react";

// Offline support for /guide (public/sw.js). Production builds only: in dev the chunk names keep changing.
export default function RegisterSW({ onReady }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let timer;
    const warm = (reg) => {
      const urls = [...performance.getEntriesByType("resource").map((e) => e.name), "/guide"];
      (reg.active ?? reg.waiting ?? reg.installing)?.postMessage({ type: "WARM", urls });
    };
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        warm(reg);
        timer = setTimeout(() => {
          warm(reg);
          onReady?.(true);
        }, 3000);
      })
      .catch(() => {});
    return () => clearTimeout(timer);
  }, [onReady]);
  return null;
}

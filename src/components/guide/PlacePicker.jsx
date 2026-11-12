"use client";

import { useMemo, useState } from "react";

export const fmtDist = (m) => (m == null ? "" : !Number.isFinite(m) ? "not connected" : m < 1000 ? `${Math.max(5, Math.round(m / 5) * 5)} m` : `${(m / 1000).toFixed(1)} km`);

// Bottom sheet: "Where are you?" / "Where to?". Search results nearest-first (when a start is known), with distance on every row.
export default function PlacePicker({ open, title, index, quick = [], featured = [], nearby = [], categories = [], hasDistance = false, hint, onPick, onMap, onClose }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const list = index.filter((i) => words.every((w) => i.text.includes(w)));
    list.sort((a, b) => {
      if (hasDistance) {
        const da = a.d ?? Infinity;
        const db = b.d ?? Infinity;
        if (da !== db) return da < db ? -1 : 1;
      } else if (!!a.promo !== !!b.promo) return a.promo ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
    return list.slice(0, 40);
  }, [q, index, hasDistance]);
  if (!open) return null;

  const pick = (i) => {
    setQ("");
    onPick(i);
  };
  const row = (i) => (
    <li key={`${i.hall}|${i.id}`}>
      <button type="button" className="flex min-h-12 w-full items-center justify-between gap-3 px-1 py-2 text-left active:bg-slate-100" onClick={() => pick(i)}>
        <span className="min-w-0">
          <span className="font-semibold">{i.label}</span>
          {i.promo && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">★ Sponsored</span>}
          {i.promo?.tagline && <span className="block truncate text-xs text-slate-500">{i.promo.tagline}</span>}
        </span>
        <span className="shrink-0 text-right text-xs text-slate-500">
          {hasDistance && i.d !== undefined && <span className={`block font-semibold ${Number.isFinite(i.d) ? "text-slate-800" : "italic"}`}>{fmtDist(i.d)}</span>}
          {i.hall}
        </span>
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 md:items-center md:justify-center" onClick={onClose}>
      <div className="max-h-[85dvh] w-full overflow-auto rounded-t-2xl bg-white p-4 pb-8 md:max-w-lg md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" aria-label="Close" className="h-10 w-10 rounded-full bg-slate-100 text-lg" onClick={onClose}>×</button>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, stall or place" className="h-12 w-full rounded-xl border border-slate-300 px-3 text-base" />
        {hint && !q.trim() && <p className="mt-2 text-xs text-slate-500">{hint}</p>}

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c.q} type="button" className="min-h-10 rounded-full border border-slate-300 px-4 text-sm font-semibold active:bg-slate-100" onClick={() => setQ(c.q)}>{c.label}</button>
            ))}
          </div>
        )}

        {!q.trim() ? (
          <>
            {quick.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {quick.map((c) => (
                  <button key={`${c.hall}|${c.id}`} type="button" className="min-h-11 rounded-full border px-4 text-sm font-semibold active:bg-slate-100" onClick={() => pick(c)}>{c.label}</button>
                ))}
              </div>
            )}
            <button type="button" className="mt-3 h-12 w-full rounded-xl border border-slate-300 font-semibold active:bg-slate-100" onClick={onMap}>Pick on the map</button>
            {nearby.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Nearest to you</h3>
                <ul className="divide-y">{nearby.map(row)}</ul>
              </>
            )}
            {featured.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Featured</h3>
                <ul className="divide-y">{featured.slice(0, 6).map(row)}</ul>
              </>
            )}
          </>
        ) : hits.length ? (
          <>
            {hasDistance && <p className="mt-3 text-xs text-slate-500">Nearest first</p>}
            <ul className="mt-1 divide-y">{hits.map(row)}</ul>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">No place matches “{q.trim()}”. Try a company name, a stall number, or words like washroom, food or gate.</p>
        )}
      </div>
    </div>
  );
}

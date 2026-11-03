"use client";

import { useMemo, useState } from "react";

// Bottom sheet: "Where are you?" / "Where to?". Bade touch targets, search + quick chips + sponsored list.
export default function PlacePicker({ open, title, index, quick = [], featured = [], onPick, onMap, onClose }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return index.filter((i) => i.text.includes(t)).sort((a, b) => Number(!!b.promo) - Number(!!a.promo)).slice(0, 30);
  }, [q, index]);
  if (!open) return null;

  const pick = (i) => {
    setQ("");
    onPick(i);
  };
  const row = (i) => (
    <li key={`${i.hall}|${i.id}`}>
      <button type="button" className="flex min-h-12 w-full items-center justify-between gap-2 px-1 py-2 text-left active:bg-slate-100" onClick={() => pick(i)}>
        <span>
          <span className="font-semibold">{i.label}</span>
          {i.promo && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">★ Sponsored</span>}
          {i.promo?.tagline && <span className="block text-xs text-slate-500">{i.promo.tagline}</span>}
        </span>
        <span className="shrink-0 text-xs text-slate-500">{i.hall}</span>
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="max-h-[85vh] overflow-auto rounded-t-2xl bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" aria-label="Close" className="h-10 w-10 rounded-full bg-slate-100 text-lg" onClick={onClose}>×</button>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, stall or place" className="h-12 w-full rounded-xl border border-slate-300 px-3 text-base" />

        {!q.trim() && (
          <>
            {quick.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {quick.map((c) => (
                  <button key={`${c.hall}|${c.id}`} type="button" className="min-h-11 rounded-full border px-4 text-sm font-semibold active:bg-slate-100" onClick={() => pick(c)}>{c.label}</button>
                ))}
              </div>
            )}
            <button type="button" className="mt-3 h-12 w-full rounded-xl border border-slate-300 font-semibold active:bg-slate-100" onClick={onMap}>Pick on the map</button>
            {featured.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Featured</h3>
                <ul className="divide-y">{featured.slice(0, 6).map(row)}</ul>
              </>
            )}
          </>
        )}
        {q.trim() && (hits.length ? <ul className="mt-2 divide-y">{hits.map(row)}</ul> : <p className="py-6 text-center text-sm text-slate-500">No match</p>)}
      </div>
    </div>
  );
}

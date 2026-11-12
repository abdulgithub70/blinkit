"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrentExhibition, useExhibitions } from "@/lib/useExhibitions";
import { useDeliveryStore } from "@/store/deliveryStore";
import { useVenueData } from "@/lib/useVenueData";
import { PATH_NODE, distancesFrom, venueKey, findVenueRoute, partsOf, minutesFor, toSteps, describeEnglish } from "@/lib/guide/core";
import HallMap, { promoOf } from "@/components/guide/HallMap";
import ZoomPane from "@/components/guide/ZoomPane";
import PlacePicker from "@/components/guide/PlacePicker";
import RegisterSW from "@/components/guide/RegisterSW";

const SHELL_M = 3; // 1 shell = 3 m x 3 m
const SAVED_KEY = "guide:last"; // venue + halls saved on the phone so the guide opens offline
const GREEN = "#059669";
const RED = "#e11d48";
const BLUE = "#2563eb";
// words people type for each kind of place, so "toilet" finds washrooms and "food court" finds the food area
const WORDS = {
  gate: "gate entry entrance exit door",
  washroom: "washroom toilet restroom bathroom wc",
  food: "food court cafe canteen restaurant eat",
  lift: "lift elevator",
  stairs: "stairs steps",
  help: "help desk information info",
};
const CATEGORIES = [
  { type: "washroom", label: "Washrooms", q: "washroom" },
  { type: "food", label: "Food", q: "food" },
  { type: "gate", label: "Gates", q: "gate" },
  { type: "lift", label: "Lifts", q: "lift" },
  { type: "help", label: "Help desk", q: "help" },
];

// The page is a grid: phone = stacked (header, route, halls, map, panel), desktop = panel on the left, map on the right.
const CSS = `
.guide-grid{display:grid;height:100dvh;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto minmax(30dvh,1fr) auto;grid-template-areas:"head" "route" "chips" "map" "panel"}
.guide-panel{display:flex;flex-direction:column;min-height:0;max-height:36dvh;border-top:1px solid #e2e8f0;background:#fff}
@media (min-width:768px){
.guide-grid{grid-template-columns:400px minmax(0,1fr);grid-template-rows:auto auto auto minmax(0,1fr);grid-template-areas:"head map" "route map" "chips map" "panel map"}
.guide-panel{max-height:none;height:100%}
}
`;

function Row({ badge, color, value, sub, onClick, pad = "pr-4" }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-11 w-full items-center gap-2.5 py-1 pl-3 text-left active:bg-slate-50 ${pad}`}>
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: color }}>{badge}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{value}</span>
      {sub && <span className="max-w-[40%] shrink-0 truncate text-xs text-slate-500">{sub}</span>}
    </button>
  );
}

export default function GuidePage() {
  const { exhibition: current } = useCurrentExhibition();
  const { exhibitions } = useExhibitions();
  const myHall = useDeliveryStore((s) => s.hall);
  const myStall = useDeliveryStore((s) => s.stall);
  const [saved, setSaved] = useState(null);
  const [slugPick, setSlugPick] = useState(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [browse, setBrowse] = useState(null); // hall chosen with the hall chips
  const [from, setFrom] = useState(null); // { hall, id }
  const [to, setTo] = useState(null);
  const [focus, setFocus] = useState(null);
  const [sheet, setSheet] = useState(null); // "from" | "to"
  const [mapPick, setMapPick] = useState(null); // "from" | "to"
  const [partIdx, setPartIdx] = useState(0);
  const [editTop, setEditTop] = useState(false); // expand the From/To rows while a route is shown
  const [collapsed, setCollapsed] = useState(false); // shrink the instructions panel to give the map more room
  const pane = useRef(null);

  const live = (slugPick && exhibitions.find((e) => e.slug === slugPick)) || current || exhibitions[0] || null;
  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(SAVED_KEY)));
    } catch {}
  }, []);
  useEffect(() => {
    if (!live) return;
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify({ slug: live.slug, name: live.name, halls: live.halls ?? [] }));
    } catch {}
  }, [live]);

  const exhibition = live ?? saved;
  const { layouts, links, loading, offline } = useVenueData(exhibition?.slug);

  const hallNames = useMemo(() => {
    const order = exhibition?.halls ?? [];
    return [...order.filter((h) => layouts[h]), ...Object.keys(layouts).filter((h) => !order.includes(h))];
  }, [layouts, exhibition]);

  const labelOf = (h, id) => {
    const L = layouts[h];
    const s = L?.stalls.find((x) => x.id === id);
    if (s) return s.company ? `${s.label} · ${s.company}` : s.label;
    return L?.pois.find((p) => p.id === id)?.label ?? id;
  };
  const cellOf = (h, id) => layouts[h]?.stalls.find((s) => s.id === id)?.cells?.[0] ?? layouts[h]?.pois.find((p) => p.id === id)?.cell;

  const mine = useMemo(() => {
    if (!myStall) return null;
    const t = myStall.trim().toLowerCase();
    for (const h of [myHall, ...hallNames]) {
      const s = layouts[h]?.stalls.find((x) => x.label.trim().toLowerCase() === t);
      if (s) return { hall: h, id: s.id };
    }
    return null;
  }, [layouts, hallNames, myHall, myStall]);

  const start = from ?? mine;
  // walking distance from the chosen location to every place, recalculated whenever the location changes
  const dist = useMemo(() => (start ? distancesFrom(layouts, links, start, SHELL_M) : null), [layouts, links, start]);

  const index = useMemo(
    () =>
      hallNames.flatMap((h) => [
        ...layouts[h].stalls.map((s) => ({ hall: h, id: s.id, type: "stall", label: s.company ? `${s.label} · ${s.company}` : s.label, promo: promoOf(s), d: s.cells?.length ? dist?.[venueKey(h, s.id)] : undefined, text: `${s.label} ${s.company} ${h}`.toLowerCase() })),
        ...layouts[h].pois.map((p) => ({ hall: h, id: p.id, type: p.type, label: p.label, promo: null, d: p.cell ? dist?.[venueKey(h, p.id)] : undefined, text: `${p.label} ${WORDS[p.type] ?? p.type} ${h}`.toLowerCase() })),
      ]),
    [layouts, hallNames, dist]
  );
  const featured = useMemo(() => index.filter((i) => i.promo), [index]);
  const nearby = useMemo(
    () => (dist ? index.filter((i) => i.type !== "stall" && Number.isFinite(i.d) && i.d > 0).sort((a, b) => a.d - b.d).slice(0, 6) : []),
    [index, dist]
  );
  const categories = useMemo(() => CATEGORIES.filter((c) => index.some((i) => i.type === c.type)), [index]);

  const route = useMemo(() => (start && to ? findVenueRoute(layouts, links, start, to, SHELL_M) : null), [layouts, links, start, to]);
  const parts = useMemo(() => (route ? partsOf(route) : []), [route]);
  useEffect(() => {
    setPartIdx(0);
    setBrowse(null);
    setEditTop(false);
  }, [route]);

  const part = parts[partIdx] ?? null;
  const hallBefore = (i) => {
    for (let k = i; k >= 0; k--) if (parts[k].type === "hall") return parts[k];
    return null;
  };
  const prev = part ? hallBefore(partIdx) : null;
  const partHall = part ? (part.type === "hall" ? part.hall : prev?.hall) : null;
  const shown = browse ?? partHall ?? start?.hall ?? (hallNames.includes(myHall) ? myHall : hallNames[0]);
  const layout = layouts[shown];

  // what the map draws for the current part
  let routeCells = [];
  let routeFrom = null;
  let routeTo = null;
  let pins = [];
  if (part?.type === "hall" && part.hall === shown) {
    const first = part.role === "start" || part.role === "only";
    const end = part.role === "end" || part.role === "only";
    routeCells = part.path;
    routeFrom = part.fromId;
    routeTo = part.toId;
    pins = [
      { id: part.fromId, text: first ? "A" : "Enter", color: first ? GREEN : BLUE },
      { id: part.toId, text: end ? "B" : "Exit", color: end ? RED : BLUE },
    ];
  } else if (part?.type === "outside" && prev?.hall === shown) {
    pins = [{ id: prev.toId, text: "Exit", color: BLUE }];
  } else {
    if (start && start.hall === shown) pins.push({ id: start.id, text: "A", color: GREEN });
    if (to && to.hall === shown) pins.push({ id: to.id, text: "B", color: RED });
  }

  useEffect(() => {
    const c = part?.type === "hall" ? part.path[0] : prev ? cellOf(prev.hall, prev.toId) : null;
    if (c) pane.current?.scrollToCell(c[0], c[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part]);

  function reveal(p) {
    setBrowse(p.hall);
    const c = cellOf(p.hall, p.id);
    if (c) setTimeout(() => pane.current?.scrollToCell(c[0], c[1]), 50);
  }
  function choose(i) {
    const p = { hall: i.hall, id: i.id };
    if (sheet === "from") setFrom(p);
    else setTo(p);
    setSheet(null);
    setFocus(null);
    reveal(p);
  }
  function onPick(_kind, id) {
    const p = { hall: shown, id };
    if (mapPick) {
      if (mapPick === "from") setFrom(p);
      else setTo(p);
      setMapPick(null);
      return;
    }
    setFocus(p);
  }

  const quickFrom = [
    ...(mine ? [{ hall: mine.hall, id: mine.id, label: `My stall · ${labelOf(mine.hall, mine.id)}` }] : []),
    ...(layout?.pois ?? []).filter((p) => p.type === "gate").map((p) => ({ hall: shown, id: p.id, label: p.label })),
  ];

  const focusStall = focus && layouts[focus.hall]?.stalls.find((s) => s.id === focus.id);
  const focusPromo = focusStall ? promoOf(focusStall) : null;
  const focusD = focus && dist ? dist[venueKey(focus.hall, focus.id)] : undefined;
  const last = parts.length - 1;
  const nextHall = (i) => parts.slice(i + 1).find((p) => p.type === "hall")?.hall;
  const pt = (p) => (p.hall === PATH_NODE ? p.label : `${p.label} (${p.hall})`);

  function titleOf(p, i) {
    if (p.type === "outside") return `Walk about ${Math.round(p.meters)} m outside to ${nextHall(i)}`;
    const a = labelOf(p.hall, p.fromId);
    const b = labelOf(p.hall, p.toId);
    if (p.role === "only") return `In ${p.hall}: go to ${b}`;
    if (p.role === "start") return `Leave ${p.hall} through ${b}`;
    if (p.role === "end") return `Enter ${p.hall} at ${a}, then go to ${b}`;
    return `Cross ${p.hall}: ${a} → ${b}`;
  }
  const steps = part?.type === "hall" ? (part.path.length > 1 ? describeEnglish(toSteps(part.path)) : ["It is right there"]) : [];

  const swap = () => {
    setFrom(to);
    setTo(start);
  };
  const clear = () => {
    setFrom(null);
    setTo(null);
    setFocus(null);
  };
  const go = (i) => {
    setPartIdx(i);
    setBrowse(null);
  };
  const hasRoute = route && part;
  const rows = !hasRoute || editTop;

  return (
    <div className="guide-grid mx-auto max-w-[1400px] bg-white md:shadow-xl">
      <style>{CSS}</style>
      <RegisterSW onReady={setOfflineReady} />

      <header style={{ gridArea: "head" }} className="px-4 pb-1 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hall guide</p>
            <h1 className="truncate text-base font-extrabold leading-tight">{exhibition?.name ?? "Pick a venue"}</h1>
          </div>
          {offline ? (
            <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Offline</span>
          ) : offlineReady && layout ? (
            <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Saved offline ✓</span>
          ) : null}
        </div>
        {exhibitions.length > 1 && (
          <select className="mt-1 h-8 rounded-lg border bg-white px-2 text-sm" value={exhibition?.slug ?? ""} onChange={(e) => { setSlugPick(e.target.value); clear(); }}>
            {exhibitions.map((e) => (<option key={e.id} value={e.slug}>{e.name}</option>))}
          </select>
        )}
      </header>

      <section style={{ gridArea: "route" }} className="px-4 pb-1">
        {exhibition && rows && (
          <div className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
            <Row badge="A" color={GREEN} value={start ? labelOf(start.hall, start.id) : "Where are you?"} sub={start ? start.hall : ""} pad="pr-14" onClick={() => setSheet("from")} />
            <div className="mx-3 border-t" />
            <Row badge="B" color={RED} value={to ? labelOf(to.hall, to.id) : "Where do you want to go?"} sub={to ? to.hall : ""} pad="pr-14" onClick={() => setSheet("to")} />
            {(start || to) && (
              <button type="button" aria-label="Swap" onClick={swap} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border bg-white shadow-sm active:bg-slate-100">⇅</button>
            )}
          </div>
        )}
        {exhibition && !rows && (
          <div className="flex min-h-11 items-center gap-2 rounded-xl border bg-white px-3 shadow-sm">
            <button type="button" aria-label="Edit route" onClick={() => setEditTop(true)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: GREEN }}>A</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{labelOf(start.hall, start.id)}</span>
              <span className="text-slate-400">→</span>
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: RED }}>B</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{labelOf(to.hall, to.id)}</span>
            </button>
            <button type="button" aria-label="Swap" onClick={swap} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-white active:bg-slate-100">⇅</button>
            <button type="button" className="h-9 shrink-0 px-1 text-sm font-semibold text-slate-500" onClick={clear}>Clear</button>
          </div>
        )}
        {exhibition && rows && (from || to) && (
          <div className="flex justify-end"><button type="button" className="h-8 px-2 text-sm font-semibold text-slate-500" onClick={clear}>Clear</button></div>
        )}
      </section>

      <div style={{ gridArea: "chips" }} className="flex gap-2 overflow-x-auto px-4 pb-2">
        {hallNames.length > 1 &&
          hallNames.map((h) => (
            <button key={h} type="button" onClick={() => setBrowse(h)} className={`min-h-8 shrink-0 rounded-full border px-3.5 text-sm font-semibold ${h === shown ? "border-brand bg-brand text-white" : "bg-white text-slate-700"}`}>{h}</button>
          ))}
      </div>

      <main style={{ gridArea: "map" }} className="min-h-0 px-4 pb-2 md:p-3">
        {!exhibition ? (
          <p className="px-6 py-16 text-center text-slate-500">No venue found. If you are offline, open this page once with internet so it can be saved on your phone.</p>
        ) : layout ? (
          <ZoomPane ref={pane} cols={layout.cols} className="h-full" height="100%">
            {(px) => (
              <HallMap layout={layout} px={px} route={routeCells} routeFrom={routeFrom} routeTo={routeTo} pins={pins} selectedId={focus && focus.hall === shown ? focus.id : null} onPick={onPick} onCell={() => setFocus(null)} />
            )}
          </ZoomPane>
        ) : (
          <p className="py-16 text-center text-slate-500">{loading ? "Loading…" : "No hall layout has been uploaded for this venue yet."}</p>
        )}
      </main>

      <section style={{ gridArea: "panel" }} className="guide-panel" aria-label="Directions">
        {mapPick && (
          <div className="m-3 flex shrink-0 items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <span>{mapPick === "from" ? "Tap your location on the map" : "Tap your destination on the map"}</span>
            <button type="button" className="h-9 rounded-full border border-blue-300 px-3 text-xs font-bold" onClick={() => setMapPick(null)}>Cancel</button>
          </div>
        )}

        {exhibition && focus && layouts[focus.hall] ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm" style={{ overscrollBehavior: "contain" }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-bold">{labelOf(focus.hall, focus.id)}</p>
                <p className="text-xs text-slate-500">
                  {focus.hall}
                  {focusD !== undefined && Number.isFinite(focusD) && focusD > 0 && ` · about ${Math.max(5, Math.round(focusD / 5) * 5)} m from you`}
                  {focusPromo && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">★ Sponsored</span>}
                </p>
                {focusPromo?.tagline && <p className="mt-1 text-slate-700">{focusPromo.tagline}</p>}
              </div>
              <button type="button" aria-label="Close" className="h-9 w-9 shrink-0 rounded-full bg-slate-100" onClick={() => setFocus(null)}>×</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="h-12 rounded-xl border font-semibold active:bg-slate-100" onClick={() => { setFrom(focus); setFocus(null); }}>I am here</button>
              <button type="button" className="h-12 rounded-xl bg-brand font-bold text-white active:bg-brand-dark" onClick={() => { setTo(focus); setFocus(null); }}>Take me here</button>
            </div>
          </div>
        ) : hasRoute ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-2">
              <p className="text-xs font-semibold text-slate-500">{Math.round(route.meters)} m · about {minutesFor(route.meters)} min</p>
              <button type="button" aria-label={collapsed ? "Show directions" : "Hide directions"} onClick={() => setCollapsed(!collapsed)} className="h-8 rounded-full border px-3 text-xs font-semibold text-slate-600">{collapsed ? "Show steps ⌃" : "Hide steps ⌄"}</button>
            </div>
            <ol className="flex shrink-0 items-center gap-1 overflow-x-auto px-4 py-1.5">
              {parts.map((p, i) => (
                <li key={i} className="flex shrink-0 items-center gap-1">
                  {i > 0 && <span className="text-slate-300">›</span>}
                  <button type="button" onClick={() => go(i)} className={`flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${i === partIdx ? "border-brand bg-brand text-white" : "bg-white text-slate-600"}`}>
                    <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] ${i === partIdx ? "bg-white/25" : "bg-slate-100"}`}>{i + 1}</span>
                    {p.type === "hall" ? p.hall : "Outside"}
                  </button>
                </li>
              ))}
            </ol>
            <div data-testid="steps" className={`min-h-0 flex-1 overflow-y-auto px-4 pb-2 text-sm ${collapsed ? "hidden" : ""}`} style={{ overscrollBehavior: "contain" }}>
              <h2 className="text-base font-bold leading-snug">{titleOf(part, partIdx)}</h2>
              {part.type === "outside" ? (
                <p className="mt-1 leading-relaxed text-slate-600">{part.points.map(pt).join(" → ")}</p>
              ) : (
                <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                  {steps.map((t, i) => (<li key={i}>{t}</li>))}
                  {partIdx === last && <li>You have arrived</li>}
                </ol>
              )}
            </div>
            {collapsed && <p className="truncate px-4 text-sm font-semibold">{titleOf(part, partIdx)}</p>}
            <div className="grid shrink-0 grid-cols-2 gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
              <button type="button" disabled={partIdx === 0} className="h-11 rounded-xl border font-semibold disabled:opacity-40" onClick={() => go(partIdx - 1)}>Back</button>
              <button type="button" disabled={partIdx === last} className="h-11 rounded-xl bg-brand font-bold text-white disabled:opacity-40" onClick={() => go(partIdx + 1)}>Next</button>
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ overscrollBehavior: "contain" }}>
            {start && to && !route ? (
              <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">No route found. These halls are not connected yet.</p>
            ) : route && route.legs.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-800">You are already there.</p>
            ) : exhibition ? (
              <>
                <p className="text-sm text-slate-500">Tap a stall on the map, or search.</p>
                <button type="button" onClick={() => setSheet("to")} className="mt-2 flex h-11 w-full items-center rounded-xl bg-slate-100 px-4 text-left text-slate-500 active:bg-slate-200">Search company, stall or place</button>
                {featured.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {featured.slice(0, 8).map((f) => (
                      <button key={`${f.hall}|${f.id}`} type="button" onClick={() => { setTo({ hall: f.hall, id: f.id }); reveal({ hall: f.hall, id: f.id }); }} className="min-h-10 shrink-0 rounded-full border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 active:bg-amber-100">
                        ★ {f.label} <span className="text-xs font-normal text-amber-700">· {f.hall}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </section>

      <PlacePicker
        open={!!sheet}
        title={sheet === "from" ? "Where are you?" : "Where to?"}
        index={index}
        quick={sheet === "from" ? quickFrom : []}
        featured={featured}
        nearby={sheet === "to" ? nearby : []}
        categories={categories}
        hasDistance={sheet === "to" && !!dist}
        hint={sheet === "to" && !dist ? "Tip: set “Where are you?” first and results will be sorted nearest first." : undefined}
        onPick={choose}
        onMap={() => { setMapPick(sheet); setSheet(null); }}
        onClose={() => setSheet(null)}
      />
    </div>
  );
}

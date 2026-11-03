"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrentExhibition } from "@/lib/useExhibitions";
import { useDeliveryStore } from "@/store/deliveryStore";
import { useVenueData } from "@/lib/useVenueData";
import { findVenueRoute, minutesFor, toSteps, describeEnglish } from "@/lib/guide/core";
import HallMap, { promoOf } from "@/components/guide/HallMap";
import ZoomPane from "@/components/guide/ZoomPane";
import PlacePicker from "@/components/guide/PlacePicker";
import RegisterSW from "@/components/guide/RegisterSW";

const SHELL_M = 3; // 1 shell = 3 m x 3 m
const SAVED_KEY = "guide:last"; // venue + halls saved on the phone so the guide opens offline
const KIND = { outdoor: "outside", corridor: "along the corridor", walk: "" };

function PickRow({ tag, value, sub, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-white px-4 py-2 text-left active:bg-slate-100">
      <span className="w-10 text-xs font-bold uppercase text-slate-500">{tag}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold">{value}</span>
        {sub && <span className="block text-xs text-slate-500">{sub}</span>}
      </span>
    </button>
  );
}

export default function GuidePage() {
  const { exhibition: live } = useCurrentExhibition();
  const myHall = useDeliveryStore((s) => s.hall);
  const myStall = useDeliveryStore((s) => s.stall);
  const [saved, setSaved] = useState(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [browse, setBrowse] = useState(null); // hall chosen with the hall chips
  const [from, setFrom] = useState(null); // { hall, id }
  const [to, setTo] = useState(null);
  const [focus, setFocus] = useState(null);
  const [sheet, setSheet] = useState(null); // "from" | "to"
  const [mapPick, setMapPick] = useState(null); // "from" | "to"
  const [legIdx, setLegIdx] = useState(0);
  const pane = useRef(null);

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
  const cellOf = (h, id) => layouts[h]?.stalls.find((s) => s.id === id)?.cells[0] ?? layouts[h]?.pois.find((p) => p.id === id)?.cell;

  const index = useMemo(
    () =>
      hallNames.flatMap((h) => [
        ...layouts[h].stalls.map((s) => ({ hall: h, id: s.id, label: s.company ? `${s.label} · ${s.company}` : s.label, promo: promoOf(s), text: `${s.label} ${s.company} ${h}`.toLowerCase() })),
        ...layouts[h].pois.map((p) => ({ hall: h, id: p.id, label: p.label, promo: null, text: `${p.label} ${p.type} ${h}`.toLowerCase() })),
      ]),
    [layouts, hallNames]
  );
  const featured = useMemo(() => index.filter((i) => i.promo), [index]);

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
  const route = useMemo(() => (start && to ? findVenueRoute(layouts, links, start, to, SHELL_M) : null), [layouts, links, start, to]);
  useEffect(() => {
    setLegIdx(0);
    setBrowse(null);
  }, [route]);

  const leg = route?.legs[legIdx] ?? null;
  const routeHall = leg ? (leg.type === "hall" ? leg.hall : leg.fromHall) : null;
  const shown = browse ?? routeHall ?? start?.hall ?? (hallNames.includes(myHall) ? myHall : hallNames[0]);
  const layout = layouts[shown];
  const onLeg = leg?.type === "hall" && leg.hall === shown;
  const path = onLeg ? leg.path : [];
  const startId = start && start.hall === shown ? start.id : onLeg ? leg.fromId : null;
  const endId = to && to.hall === shown ? to.id : onLeg ? leg.toId : leg?.type === "link" && leg.fromHall === shown ? leg.fromId : null;

  useEffect(() => {
    const c = leg ? (leg.type === "hall" ? leg.path[0] : cellOf(leg.fromHall, leg.fromId)) : null;
    if (c) pane.current?.scrollToCell(c[0], c[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leg]);

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
    setFocus(p);
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
  const steps = leg?.type === "hall" ? (leg.path.length > 1 ? describeEnglish(toSteps(leg.path)) : ["You are right at the exit"]) : [];
  const last = route ? route.legs.length - 1 : 0;

  return (
    <div className="space-y-3 pb-24">
      <RegisterSW onReady={setOfflineReady} />
      <h1 className="text-xl font-extrabold">Hall guide</h1>

      {!exhibition && (
        <p className="py-10 text-center text-slate-500">Pick a venue first. If you are offline, open this page once with internet so it can be saved on your phone.</p>
      )}

      {exhibition && (
        <>
          <div className="space-y-2">
            <PickRow tag="From" value={start ? labelOf(start.hall, start.id) : "Where are you?"} sub={start ? start.hall : "Tap to choose a gate, stall or place"} onClick={() => setSheet("from")} />
            <PickRow tag="To" value={to ? labelOf(to.hall, to.id) : "Where do you want to go?"} sub={to ? to.hall : "Search a company or stall number"} onClick={() => setSheet("to")} />
            {(start || to) && (
              <div className="flex justify-end gap-2">
                <button type="button" className="h-10 rounded-full border px-4 text-sm font-semibold" onClick={() => { setFrom(to); setTo(start); }}>⇅ Swap</button>
                <button type="button" className="h-10 rounded-full border px-4 text-sm font-semibold" onClick={() => { setFrom(null); setTo(null); setFocus(null); }}>Clear</button>
              </div>
            )}
          </div>

          {offline && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">You are offline. Showing the layout saved on this phone.</p>}
          {!offline && offlineReady && layout && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">Saved for offline use ✓</p>}
          {mapPick && (
            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <span>{mapPick === "from" ? "Tap your location on the map" : "Tap your destination on the map"}</span>
              <button type="button" className="h-9 rounded-full border border-blue-300 px-3 text-xs font-bold" onClick={() => setMapPick(null)}>Cancel</button>
            </div>
          )}

          {featured.length > 0 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {featured.slice(0, 8).map((f) => (
                <button key={`${f.hall}|${f.id}`} type="button" onClick={() => { setTo({ hall: f.hall, id: f.id }); reveal({ hall: f.hall, id: f.id }); }} className="min-h-11 shrink-0 rounded-full border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 active:bg-amber-100">
                  ★ {f.label} <span className="text-xs font-normal text-amber-700">· {f.hall}</span>
                </button>
              ))}
            </div>
          )}

          {hallNames.length > 1 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
              {hallNames.map((h) => (
                <button key={h} type="button" onClick={() => setBrowse(h)} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${h === shown ? "border-brand bg-brand text-white" : "bg-white"}`}>{h}</button>
              ))}
            </div>
          )}

          {layout ? (
            <ZoomPane ref={pane} cols={layout.cols}>
              {(px) => <HallMap layout={layout} px={px} route={path} startId={startId} endId={endId} selectedId={focus && focus.hall === shown ? focus.id : null} onPick={onPick} onCell={() => setFocus(null)} />}
            </ZoomPane>
          ) : loading ? (
            <p className="py-10 text-center text-slate-500">Loading…</p>
          ) : (
            <p className="py-10 text-center text-slate-500">No hall layout has been uploaded for this venue yet.</p>
          )}

          {focus && layouts[focus.hall] && (
            <div className="rounded-2xl border bg-white p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold">{labelOf(focus.hall, focus.id)}</p>
                  <p className="text-xs text-slate-500">{focus.hall}{focusPromo && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">★ Sponsored</span>}</p>
                  {focusPromo?.tagline && <p className="mt-1 text-slate-700">{focusPromo.tagline}</p>}
                </div>
                <button type="button" aria-label="Close" className="h-9 w-9 rounded-full bg-slate-100" onClick={() => setFocus(null)}>×</button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="h-12 rounded-xl border font-semibold active:bg-slate-100" onClick={() => setFrom(focus)}>I am here</button>
                <button type="button" className="h-12 rounded-xl bg-brand font-bold text-white active:bg-brand-dark" onClick={() => setTo(focus)}>Take me here</button>
              </div>
            </div>
          )}

          {start && to && !route && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">No route found. These halls may not be connected yet.</p>}
          {route && route.legs.length === 0 && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">You are already there.</p>}
          {route && leg && (
            <div className="rounded-2xl border bg-white p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Part {legIdx + 1} of {route.legs.length} · {Math.round(route.meters)} m · about {minutesFor(route.meters)} min</p>
              {leg.type === "hall" ? (
                <>
                  <h2 className="mt-1 text-base font-bold">In {leg.hall}: go to {labelOf(leg.hall, leg.toId)}</h2>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    {steps.map((t, i) => (<li key={i}>{t}</li>))}
                    {legIdx === last && <li>You have arrived</li>}
                  </ol>
                </>
              ) : (
                <>
                  <h2 className="mt-1 text-base font-bold">Walk {Math.round(leg.meters)} m {KIND[leg.kind]} to {leg.toHall}</h2>
                  <p className="mt-1 text-slate-600">{leg.fromLabel} → {leg.toLabel}</p>
                </>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" disabled={legIdx === 0} className="h-12 rounded-xl border font-semibold disabled:opacity-40" onClick={() => { setLegIdx(legIdx - 1); setBrowse(null); }}>Back</button>
                <button type="button" disabled={legIdx === last} className="h-12 rounded-xl bg-brand font-bold text-white disabled:opacity-40" onClick={() => { setLegIdx(legIdx + 1); setBrowse(null); }}>Next</button>
              </div>
            </div>
          )}
        </>
      )}

      <PlacePicker
        open={!!sheet}
        title={sheet === "from" ? "Where are you?" : "Where to?"}
        index={index}
        quick={sheet === "from" ? quickFrom : []}
        featured={featured}
        onPick={choose}
        onMap={() => { setMapPick(sheet); setSheet(null); }}
        onClose={() => setSheet(null)}
      />
    </div>
  );
}

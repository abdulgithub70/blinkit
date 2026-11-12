"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useExhibitions } from "@/lib/useExhibitions";
import { findVenueRoute, partsOf } from "@/lib/guide/core";

const PATH = "@path"; // a walkway / junction outside the halls (not a hall)
const card = "rounded-xl border bg-white p-4";
const inp = "h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm";
const btn = "h-10 rounded-lg bg-brand px-4 text-sm font-bold text-white active:bg-brand-dark disabled:opacity-50";
const ghost = "h-10 rounded-lg border px-4 text-sm font-semibold text-slate-700 active:bg-slate-100";
const PRESETS = [10, 30, 60, 100, 200];

function LinkRow({ text, meters, onSave, onRemove }) {
  const [edit, setEdit] = useState(false);
  const [m, setM] = useState(meters);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span>{text}{!edit && <b> · {meters} m</b>}</span>
      <span className="flex items-center gap-3">
        {edit ? (
          <>
            <input aria-label="New distance in metres" type="number" min="0" max="5000" className="h-8 w-20 rounded border px-2" value={m} onChange={(e) => setM(e.target.value)} />
            <button type="button" className="font-semibold text-blue-700" onClick={async () => { if (await onSave(Math.round(+m))) setEdit(false); }}>Save</button>
            <button type="button" onClick={() => { setM(meters); setEdit(false); }}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" className="text-blue-700" onClick={() => setEdit(true)}>Edit distance</button>
            <button type="button" className="text-red-600" onClick={onRemove}>Remove</button>
          </>
        )}
      </span>
    </li>
  );
}

// Small picture of the venue: halls and walkways as dots, connections as lines. Green = visitors can get there, amber = not connected yet.
function Diagram({ halls, walkways, links, anchor }) {
  const nodes = [...halls.map((h) => ({ id: `h:${h}`, label: h, kind: "hall" })), ...walkways.map((w) => ({ id: `w:${w}`, label: w, kind: "walk" }))];
  if (nodes.length < 1) return null;
  const pos = {};
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    pos[n.id] = nodes.length === 1 ? [300, 160] : [300 + Math.cos(a) * 220, 160 + Math.sin(a) * 105];
  });
  const key = (hall, poi) => (hall === PATH ? `w:${poi}` : `h:${hall}`);
  const edges = {};
  for (const l of links) {
    const a = key(l.a_hall, l.a_poi);
    const b = key(l.b_hall, l.b_poi);
    if (!pos[a] || !pos[b] || a === b) continue;
    const k = [a, b].sort().join("|");
    edges[k] = { a, b, m: Math.min(edges[k]?.m ?? Infinity, l.meters), n: (edges[k]?.n ?? 0) + 1 };
  }
  const reach = new Set(anchor ? [`h:${anchor}`] : []);
  for (let changed = true; changed; ) {
    changed = false;
    for (const e of Object.values(edges)) {
      if (reach.has(e.a) !== reach.has(e.b)) { reach.add(e.a); reach.add(e.b); changed = true; }
    }
  }
  return (
    <svg viewBox="0 0 600 320" className="h-auto w-full rounded-lg bg-slate-50" role="img" aria-label="Connections diagram">
      {Object.values(edges).map((e) => (
        <g key={e.a + e.b}>
          <line x1={pos[e.a][0]} y1={pos[e.a][1]} x2={pos[e.b][0]} y2={pos[e.b][1]} stroke="#94a3b8" strokeWidth="2" />
          <text x={(pos[e.a][0] + pos[e.b][0]) / 2} y={(pos[e.a][1] + pos[e.b][1]) / 2 - 4} fontSize="11" textAnchor="middle" fill="#475569">{e.m} m{e.n > 1 ? ` ×${e.n}` : ""}</text>
        </g>
      ))}
      {nodes.map((n) => {
        const [x, y] = pos[n.id];
        const ok = n.kind === "walk" ? reach.has(n.id) : reach.has(n.id);
        const fill = n.kind === "walk" ? "#e0f2fe" : ok ? "#d1fae5" : "#fef3c7";
        const stroke = n.kind === "walk" ? "#0284c7" : ok ? "#059669" : "#d97706";
        return (
          <g key={n.id} data-node={n.label}>
            <rect x={x - 48} y={y - 15} width="96" height="30" rx={n.kind === "walk" ? 15 : 7} fill={fill} stroke={stroke} strokeWidth="2" strokeDasharray={n.kind === "walk" ? "4 3" : undefined} />
            <text x={x} y={y + 4} fontSize="12" fontWeight="600" textAnchor="middle" fill="#0f172a">{n.label.length > 14 ? `${n.label.slice(0, 13)}…` : n.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ConnectionsPage() {
  const { exhibitions } = useExhibitions();
  const [slug, setSlug] = useState("");
  const [layouts, setLayouts] = useState({});
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(null); // "hall|gateId" whose connect form is open
  const [form, setForm] = useState({ type: "walkway", walkway: "", otherHall: "", otherGate: "", meters: 30, where: "outdoor" });
  const [wf, setWf] = useState({ a: "", b: "", meters: 50 });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("exhibition");
    if (q) setSlug(q);
  }, []);

  useEffect(() => {
    setLayouts({});
    setLinks([]);
    setOpen(null);
    setMsg("");
    if (!slug) return;
    let off = false;
    setLoading(true);
    (async () => {
      const [lay, lnk] = await Promise.all([
        supabase.from("hall_layouts").select("hall,rows,cols,cells,stalls,pois").eq("exhibition_slug", slug),
        supabase.from("hall_links").select("*").eq("exhibition_slug", slug),
      ]);
      if (off) return;
      if (lay.error || lnk.error) setMsg((lay.error || lnk.error).message);
      setLayouts(Object.fromEntries((lay.data ?? []).map((r) => [r.hall, r])));
      setLinks(lnk.data ?? []);
      setLoading(false);
    })();
    return () => {
      off = true;
    };
  }, [slug]);

  const ex = exhibitions.find((e) => e.slug === slug);
  const hallNames = useMemo(() => {
    const order = ex?.halls ?? [];
    return [...order, ...Object.keys(layouts).filter((h) => !order.includes(h))];
  }, [ex, layouts]);
  const drawn = hallNames.filter((h) => layouts[h]);

  const gatesOf = (h) => (layouts[h]?.pois ?? []).filter((p) => p.type === "gate");
  const poiName = (h, id) => (layouts[h]?.pois ?? []).find((p) => p.id === id)?.label ?? id;
  const linksOf = (h, id) => links.filter((l) => (l.a_hall === h && l.a_poi === id) || (l.b_hall === h && l.b_poi === id));
  const otherEnd = (l, h, id) => (l.a_hall === h && l.a_poi === id ? { hall: l.b_hall, id: l.b_poi } : { hall: l.a_hall, id: l.a_poi });
  const endText = (e) => (e.hall === PATH ? `Walkway “${e.id}”` : `${e.hall} · ${poiName(e.hall, e.id)}`);
  const walkways = useMemo(() => [...new Set(links.flatMap((l) => [l.a_hall === PATH ? l.a_poi : null, l.b_hall === PATH ? l.b_poi : null]).filter(Boolean))].sort(), [links]);
  const walkLinks = links.filter((l) => l.a_hall === PATH && l.b_hall === PATH);
  const gateCount = drawn.reduce((n, h) => n + gatesOf(h).length, 0);
  const connectedGates = drawn.reduce((n, h) => n + gatesOf(h).filter((g) => linksOf(h, g.id).length).length, 0);

  // Can a visitor get from the first hall to every other hall? Uses the same routing the guide uses.
  const checks = useMemo(() => {
    if (drawn.length < 2) return [];
    const coreLinks = links.map((l) => ({ aHall: l.a_hall, aPoi: l.a_poi, bHall: l.b_hall, bPoi: l.b_poi, meters: l.meters, kind: l.kind }));
    // a point inside each hall (a stall if there is one), so the check does not depend on which gate happens to be linked
    const pick = (h) => {
      const L = layouts[h];
      const s = L.stalls.find((x) => x.cells?.length);
      if (s) return { hall: h, id: s.id };
      const p = L.pois[0];
      return p ? { hall: h, id: p.id } : null;
    };
    const a = pick(drawn[0]);
    return drawn.slice(1).map((h) => {
      const b = pick(h);
      if (!a || !b) return { hall: h, ok: false, why: "This hall has no gate or stall yet." };
      const r = findVenueRoute(layouts, coreLinks, a, b);
      return r ? { hall: h, ok: true, meters: r.meters, via: partsOf(r).map((p) => (p.type === "hall" ? p.hall : "Outside")).join(" › ") } : { hall: h, ok: false, why: "Not connected yet. Connect one of its gates to a walkway or to another hall." };
    });
  }, [layouts, links, drawn.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  async function insert(row) {
    const dup = links.some((l) => (l.a_hall === row.a_hall && l.a_poi === row.a_poi && l.b_hall === row.b_hall && l.b_poi === row.b_poi) || (l.a_hall === row.b_hall && l.a_poi === row.b_poi && l.b_hall === row.a_hall && l.b_poi === row.a_poi));
    if (dup) return setMsg("These two are already connected. Use “Edit distance” to change it.");
    const { data, error } = await supabase.from("hall_links").insert(row).select().single();
    if (error) return setMsg(error.message);
    setLinks((l) => [...l, data]);
    setMsg("Connection saved ✓");
    return true;
  }
  async function saveMeters(id, meters) {
    if (!(meters >= 0 && meters <= 5000)) return setMsg("Distance must be between 0 and 5000 m."), false;
    const { error } = await supabase.from("hall_links").update({ meters }).eq("id", id);
    if (error) return setMsg(error.message), false;
    setLinks((l) => l.map((x) => (x.id === id ? { ...x, meters } : x)));
    setMsg("Distance updated ✓");
    return true;
  }
  async function remove(id) {
    const { error } = await supabase.from("hall_links").delete().eq("id", id);
    if (error) return setMsg(error.message);
    setLinks((l) => l.filter((x) => x.id !== id));
    setMsg("Connection removed");
  }

  const meters = (v) => Math.round(+v);
  const validM = (v) => Number.isFinite(+v) && +v >= 0 && +v <= 5000;
  async function connectGate(hall, gate) {
    const name = form.walkway.trim();
    const kind = form.where;
    const row =
      form.type === "walkway"
        ? { exhibition_slug: slug, a_hall: hall, a_poi: gate.id, b_hall: PATH, b_poi: name, meters: meters(form.meters), kind }
        : { exhibition_slug: slug, a_hall: hall, a_poi: gate.id, b_hall: form.otherHall, b_poi: form.otherGate, meters: meters(form.meters), kind };
    if (await insert(row)) setOpen(null);
  }
  const formReady = (form.type === "walkway" ? form.walkway.trim() : form.otherHall && form.otherGate) && validM(form.meters);
  const openForm = (hall, gate) => {
    setForm({ type: "walkway", walkway: "", otherHall: "", otherGate: "", meters: 30, where: "outdoor" });
    setOpen(`${hall}|${gate.id}`);
  };
  async function joinWalkways() {
    const a = wf.a.trim();
    const b = wf.b.trim();
    if (!a || !b || a === b) return setMsg("Enter two different walkway names.");
    if (await insert({ exhibition_slug: slug, a_hall: PATH, a_poi: a, b_hall: PATH, b_poi: b, meters: meters(wf.meters), kind: "outdoor" })) setWf({ a: "", b: "", meters: 50 });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">Connections</h1>
        <p className="text-sm text-slate-500">How visitors walk from one hall to another.</p>
      </div>

      <div className={`${card} space-y-3`}>
        <ol className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-lg bg-slate-50 p-3"><b>1. Gates</b><br />Each hall has gates (added with the Marker tool in the hall editor).</li>
          <li className="rounded-lg bg-slate-50 p-3"><b>2. Connect each gate</b><br />To a <i>walkway</i> outside (any path or junction you name) or straight to a gate of another hall.</li>
          <li className="rounded-lg bg-slate-50 p-3"><b>3. The guide does the rest</b><br />Stall → nearest gate → walkway → gate of the other hall → stall.</li>
        </ol>
        <label className="block text-xs font-semibold text-slate-600">
          Exhibition
          <select className={`${inp} sm:w-80`} value={slug} onChange={(e) => setSlug(e.target.value)}>
            <option value="">Select an exhibition</option>
            {exhibitions.map((e) => (<option key={e.id} value={e.slug}>{e.name}</option>))}
          </select>
        </label>
      </div>

      {msg && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700" role="status">{msg}</p>}
      {slug && loading && <p className="text-sm text-slate-500">Loading…</p>}

      {slug && !loading && drawn.length === 0 && (
        <p className={`${card} text-sm text-slate-600`}>No hall layouts saved for this exhibition yet. <a className="font-semibold text-blue-700 underline" href="/adminzxz/halls">Draw a hall first</a>.</p>
      )}

      {slug && drawn.length > 0 && (
        <>
          <div className={`${card} space-y-3`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1">{drawn.length} halls</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{connectedGates} of {gateCount} gates connected</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{walkways.length} walkways</span>
            </div>
            <Diagram halls={drawn} walkways={walkways} links={links} anchor={drawn[0]} />
            <p className="text-xs text-slate-500">Solid green = visitors can reach it from {drawn[0]}. Amber = not connected yet. Dashed blue = outside walkway.</p>
          </div>

          {checks.length > 0 && (
            <div className={`${card} space-y-2`}>
              <h2 className="text-sm font-bold">Can visitors get everywhere? (from {drawn[0]})</h2>
              <ul className="space-y-1 text-sm">
                {checks.map((c) => (
                  <li key={c.hall} data-check={c.hall} className={`rounded-lg px-3 py-2 ${c.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                    {c.ok ? "✓" : "!"} <b>{c.hall}</b>: {c.ok ? `reachable, about ${Math.round(c.meters)} m (${c.via})` : c.why}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hallNames.map((h) => {
            const L = layouts[h];
            if (!L) return (
              <div key={h} className={`${card} text-sm text-slate-500`}><b className="text-slate-700">{h}</b> has no saved layout yet. <a className="font-semibold text-blue-700 underline" href="/adminzxz/halls">Draw it</a>.</div>
            );
            const gates = gatesOf(h);
            const done = gates.filter((g) => linksOf(h, g.id).length).length;
            return (
              <details key={h} open={done < gates.length || gates.length === 0} className={card}>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-bold">
                  <span>{h}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${gates.length && done === gates.length ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{gates.length === 0 ? "No gates yet" : `${done} of ${gates.length} gates connected`}</span>
                </summary>
                {gates.length === 0 && <p className="mt-3 text-sm text-slate-600">This hall has no gates. In the hall editor use the Marker tool, choose “gate”, click where the door is, then Save.</p>}
                <ul className="mt-3 space-y-3">
                  {gates.map((g) => {
                    const mine = linksOf(h, g.id);
                    const isOpen = open === `${h}|${g.id}`;
                    return (
                      <li key={g.id} data-gate={g.id} className="rounded-xl border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            <span className={`h-2.5 w-2.5 rounded-full ${mine.length ? "bg-emerald-500" : "bg-amber-400"}`} />
                            {g.label}
                            <span className="text-xs font-normal text-slate-500">{mine.length ? `${mine.length} connection${mine.length > 1 ? "s" : ""}` : "not connected"}</span>
                          </span>
                          {!isOpen && <button type="button" className={ghost} onClick={() => openForm(h, g)}>{mine.length ? "Add another" : "Connect"}</button>}
                        </div>
                        {mine.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {mine.map((l) => (
                              <LinkRow key={l.id} text={`→ ${endText(otherEnd(l, h, g.id))}`} meters={l.meters} onSave={(m) => saveMeters(l.id, m)} onRemove={() => remove(l.id)} />
                            ))}
                          </ul>
                        )}
                        {isOpen && (
                          <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
                            <p className="text-sm font-semibold">Where does “{g.label}” lead?</p>
                            <div className="grid grid-cols-2 gap-2">
                              {[["walkway", "Outside walkway"], ["hall", "Gate of another hall"]].map(([v, t]) => (
                                <button key={v} type="button" onClick={() => setForm({ ...form, type: v })} className={`h-10 rounded-lg border text-sm font-semibold ${form.type === v ? "border-brand bg-brand text-white" : "bg-white"}`}>{t}</button>
                              ))}
                            </div>
                            {form.type === "walkway" ? (
                              <label className="block text-xs font-semibold text-slate-600">
                                Walkway name
                                <input className={inp} list="walkway-names" value={form.walkway} onChange={(e) => setForm({ ...form, walkway: e.target.value })} placeholder="e.g. Central walkway" />
                                <datalist id="walkway-names">{walkways.map((w) => (<option key={w} value={w} />))}</datalist>
                                <span className="mt-1 block font-normal text-slate-500">A walkway is any outside path or junction. Type a new name or pick one you already made; gates on the same walkway are linked to each other.</span>
                              </label>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2">
                                <select className={inp} value={form.otherHall} onChange={(e) => setForm({ ...form, otherHall: e.target.value, otherGate: "" })} aria-label="Other hall">
                                  <option value="">Choose hall</option>
                                  {drawn.filter((x) => x !== h).map((x) => (<option key={x} value={x}>{x}</option>))}
                                </select>
                                <select className={inp} value={form.otherGate} onChange={(e) => setForm({ ...form, otherGate: e.target.value })} disabled={!form.otherHall} aria-label="Gate of that hall">
                                  <option value="">Choose gate</option>
                                  {gatesOf(form.otherHall).map((x) => (<option key={x.id} value={x.id}>{x.label}</option>))}
                                </select>
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-semibold text-slate-600">
                                Walking distance (metres)
                                <input className={`${inp} sm:w-40`} type="number" min="0" max="5000" value={form.meters} onChange={(e) => setForm({ ...form, meters: e.target.value })} aria-label="Distance in metres" />
                              </label>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {PRESETS.map((p) => (
                                  <button key={p} type="button" className="h-8 rounded-full border bg-white px-3 text-xs font-semibold" onClick={() => setForm({ ...form, meters: p })}>{p} m</button>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:w-72">
                              {[["outdoor", "Outside"], ["corridor", "Inside corridor"]].map(([v, t]) => (
                                <button key={v} type="button" onClick={() => setForm({ ...form, where: v })} className={`h-9 rounded-lg border text-xs font-semibold ${form.where === v ? "border-slate-700 bg-slate-700 text-white" : "bg-white"}`}>{t}</button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button type="button" className={btn} disabled={!formReady} onClick={() => connectGate(h, g)}>Save connection</button>
                              <button type="button" className={ghost} onClick={() => setOpen(null)}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}

          <div className={`${card} space-y-3`}>
            <h2 className="text-sm font-bold">Walkways outside</h2>
            <p className="text-xs text-slate-500">If two walkways meet, join them here with the distance between them. A visitor can then walk Hall A → walkway → walkway → Hall B.</p>
            {walkways.length === 0 && <p className="text-sm text-slate-500">No walkways yet. They appear when you connect a gate to one.</p>}
            <ul className="space-y-1">
              {walkLinks.map((l) => (
                <LinkRow key={l.id} text={`${l.a_poi} ↔ ${l.b_poi}`} meters={l.meters} onSave={(m) => saveMeters(l.id, m)} onRemove={() => remove(l.id)} />
              ))}
            </ul>
            <div className="grid gap-2 sm:grid-cols-4">
              <input className={inp} list="walkway-names2" value={wf.a} onChange={(e) => setWf({ ...wf, a: e.target.value })} placeholder="First walkway" aria-label="First walkway" />
              <input className={inp} list="walkway-names2" value={wf.b} onChange={(e) => setWf({ ...wf, b: e.target.value })} placeholder="Second walkway" aria-label="Second walkway" />
              <datalist id="walkway-names2">{walkways.map((w) => (<option key={w} value={w} />))}</datalist>
              <input className={inp} type="number" min="0" max="5000" value={wf.meters} onChange={(e) => setWf({ ...wf, meters: e.target.value })} aria-label="Distance between walkways in metres" />
              <button type="button" className={btn} onClick={joinWalkways}>Join walkways</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

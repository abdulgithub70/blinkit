"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useExhibitions } from "@/lib/useExhibitions";
import { layoutFromTemplate } from "@/lib/guide/core";
import HallMap from "@/components/guide/HallMap";

const TOOLS = [
  ["select", "Select"],
  ["aisle", "Aisle"],
  ["wall", "Wall"],
  ["stall", "Stall (2 clicks)"],
  ["poi", "Marker"],
  ["erase", "Erase"],
];
const POI_TYPES = ["gate", "washroom", "food", "lift", "stairs", "help"];
const PATH = "@path"; // outside walkway / junction (not a hall)
const card = "rounded-xl border bg-white p-4";
const inp = "h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm";
const btn = "h-10 rounded-lg bg-brand px-4 text-sm font-bold text-white active:bg-brand-dark disabled:opacity-50";

const blank = (rows, cols) => ({
  rows,
  cols,
  cells: Array.from({ length: rows }, (_, r) => (r === 0 || r === rows - 1 ? "#".repeat(cols) : "#" + "W".repeat(cols - 2) + "#")),
  stalls: [],
  pois: [],
});
const setCell = (L, r, c, ch) => {
  const cells = [...L.cells];
  cells[r] = cells[r].slice(0, c) + ch + cells[r].slice(c + 1);
  return { ...L, cells };
};
const stallAt = (L, r, c) => L.stalls.find((s) => s.cells.some(([a, b]) => a === r && b === c));
const poiAt = (L, r, c) => L.pois.find((p) => p.cell[0] === r && p.cell[1] === c);

export default function HallsAdminPage() {
  const { exhibitions } = useExhibitions();
  const [slug, setSlug] = useState("");
  const [hall, setHall] = useState("");
  const [layout, setLayout] = useState(null);
  const [version, setVersion] = useState(0);
  const [tool, setTool] = useState("select");
  const [corner, setCorner] = useState(null);
  const [sel, setSel] = useState(null);
  const [poiType, setPoiType] = useState("gate");
  const [px, setPx] = useState(28);
  const [size, setSize] = useState({ rows: 20, cols: 16, blocks: 4 });
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [allLinks, setAllLinks] = useState([]); // every connection of this exhibition
  const [allPois, setAllPois] = useState({}); // hall -> saved markers (used to pick gates for links)
  const [lk, setLk] = useState({ target: "hall", other: "", mine: "", theirs: "", pathName: "", newPath: "", meters: 60, kind: "walk" });
  const [pp, setPp] = useState({ a: "", newA: "", b: "", newB: "", meters: 50 });

  const halls = exhibitions.find((e) => e.slug === slug)?.halls ?? [];

  useEffect(() => {
    setLayout(null);
    setSel(null);
    setCorner(null);
    setMsg("");
    if (!slug || !hall) return;
    let off = false;
    supabase
      .from("hall_layouts")
      .select("*")
      .eq("exhibition_slug", slug)
      .eq("hall", hall)
      .maybeSingle()
      .then(({ data, error }) => {
        if (off) return;
        if (error) return setMsg(error.message);
        if (data) {
          setLayout({ rows: data.rows, cols: data.cols, cells: data.cells, stalls: data.stalls, pois: data.pois });
          setVersion(data.version);
        } else {
          setVersion(0);
          setMsg("No layout for this hall yet. Start from a blank hall or the template.");
        }
      });
    return () => {
      off = true;
    };
  }, [slug, hall]);

  useEffect(() => {
    setAllLinks([]);
    setAllPois({});
    if (!slug || !hall) return;
    let off = false;
    (async () => {
      const [lnk, lay] = await Promise.all([
        supabase.from("hall_links").select("*").eq("exhibition_slug", slug),
        supabase.from("hall_layouts").select("hall,pois").eq("exhibition_slug", slug),
      ]);
      if (off) return;
      setAllLinks(lnk.data ?? []);
      setAllPois(Object.fromEntries((lay.data ?? []).map((r) => [r.hall, r.pois])));
    })();
    return () => {
      off = true;
    };
  }, [slug, hall]);

  const selStall = sel?.kind === "stall" ? layout?.stalls.find((s) => s.id === sel.id) : null;
  const selPoi = sel?.kind === "poi" ? layout?.pois.find((p) => p.id === sel.id) : null;
  const selectedId = selStall?.id ?? selPoi?.id;

  function onCell(r, c) {
    if (!layout) return;
    const s = stallAt(layout, r, c);
    const p = poiAt(layout, r, c);
    setMsg("");
    if (tool === "select") return setSel(s ? { kind: "stall", id: s.id } : p ? { kind: "poi", id: p.id } : null);

    if (tool === "aisle" || tool === "wall") {
      if (s) return setMsg("Can't paint over a stall. Remove the stall with Erase first.");
      return setLayout(setCell(layout, r, c, tool === "aisle" ? "W" : "#"));
    }

    if (tool === "erase") {
      let L = layout;
      if (s) {
        L = { ...L, stalls: L.stalls.filter((x) => x.id !== s.id) };
        for (const [a, b] of s.cells) L = setCell(L, a, b, "W");
      }
      if (p) L = { ...L, pois: L.pois.filter((x) => x.id !== p.id) };
      if (!s && !p) L = setCell(L, r, c, "W");
      setSel(null);
      return setLayout(L);
    }

    if (tool === "poi") {
      const id = "p" + Date.now();
      setSel({ kind: "poi", id });
      return setLayout({ ...layout, pois: [...layout.pois, { id, type: poiType, label: poiType[0].toUpperCase() + poiType.slice(1), cell: [r, c] }] });
    }

    // tool === "stall": do click = rectangle ke do corners
    if (!corner) return setCorner([r, c]);
    const [r0, r1] = [Math.min(corner[0], r), Math.max(corner[0], r)];
    const [c0, c1] = [Math.min(corner[1], c), Math.max(corner[1], c)];
    const cells = [];
    for (let a = r0; a <= r1; a++) for (let b = c0; b <= c1; b++) cells.push([a, b]);
    setCorner(null);
    if (cells.some(([a, b]) => layout.cells[a][b] === "#" || stallAt(layout, a, b))) {
      return setMsg("That rectangle overlaps a wall or another stall.");
    }
    const n = Math.max(0, ...layout.stalls.map((x) => parseInt(x.id.replace(/\D/g, ""), 10) || 0)) + 1;
    const id = "s" + n;
    let L = layout;
    for (const [a, b] of cells) L = setCell(L, a, b, "S");
    setLayout({ ...L, stalls: [...L.stalls, { id, label: "", company: "", cells }] });
    setSel({ kind: "stall", id });
  }

  const patchStall = (f, v) => setLayout({ ...layout, stalls: layout.stalls.map((s) => (s.id === sel.id ? { ...s, [f]: v } : s)) });
  const patchPoi = (f, v) => setLayout({ ...layout, pois: layout.pois.map((p) => (p.id === sel.id ? { ...p, [f]: v } : p)) });

  const patchPromo = (p) =>
    patchStall("promo", { style: "pulse", color: "#f59e0b", tagline: "", until: "", ...selStall.promo, ...p });

  const hallLinks = allLinks.filter((l) => l.a_hall === hall || l.b_hall === hall);
  const pathLinks = allLinks.filter((l) => l.a_hall === PATH && l.b_hall === PATH);
  const pathNames = [...new Set(allLinks.flatMap((l) => [l.a_hall === PATH ? l.a_poi : null, l.b_hall === PATH ? l.b_poi : null]).filter(Boolean))].sort();
  const poiLabel = (h, id) => ((h === hall ? layout?.pois : allPois[h]) ?? []).find((p) => p.id === id)?.label ?? id;
  const gates = (list) => (list ?? []).filter((p) => p.type === "gate");
  const pick = (selected, typed) => typed.trim() || selected;
  const linkReady = lk.mine && (lk.target === "path" ? pick(lk.pathName, lk.newPath) : lk.other && lk.theirs);
  const pathReady = pick(pp.a, pp.newA) && pick(pp.b, pp.newB) && pick(pp.a, pp.newA) !== pick(pp.b, pp.newB);

  async function insertLink(row) {
    const { data, error } = await supabase.from("hall_links").insert(row).select().single();
    if (error) return setMsg(error.message);
    setAllLinks((l) => [...l, data]);
    setMsg("Connection added ✓");
  }
  const addLink = () =>
    insertLink(
      lk.target === "path"
        ? { exhibition_slug: slug, a_hall: hall, a_poi: lk.mine, b_hall: PATH, b_poi: pick(lk.pathName, lk.newPath), meters: Math.round(+lk.meters), kind: "outdoor" }
        : { exhibition_slug: slug, a_hall: hall, a_poi: lk.mine, b_hall: lk.other, b_poi: lk.theirs, meters: Math.round(+lk.meters), kind: lk.kind }
    );
  const addPathLink = () =>
    insertLink({ exhibition_slug: slug, a_hall: PATH, a_poi: pick(pp.a, pp.newA), b_hall: PATH, b_poi: pick(pp.b, pp.newB), meters: Math.round(+pp.meters), kind: "outdoor" });
  async function delLink(id) {
    const { error } = await supabase.from("hall_links").delete().eq("id", id);
    if (error) return setMsg(error.message);
    setAllLinks((l) => l.filter((x) => x.id !== id));
  }

  function applyBulk() {
    const byId = new Map(layout.stalls.map((s) => [s.id.toLowerCase(), s]));
    const upd = new Map();
    const miss = [];
    for (const line of bulk.split("\n")) {
      const [slot, label, ...rest] = line.split(/[,\t]/).map((x) => x.trim());
      if (!slot) continue;
      const s = byId.get(slot.toLowerCase());
      if (!s) miss.push(slot);
      else upd.set(s.id, { label: label || s.label, company: rest.join(", ") });
    }
    setLayout({ ...layout, stalls: layout.stalls.map((s) => (upd.has(s.id) ? { ...s, ...upd.get(s.id) } : s)) });
    setMsg(`${upd.size} stalls updated${miss.length ? `. Not found: ${miss.slice(0, 8).join(", ")}` : ""}. Don't forget to Save.`);
  }

  async function save() {
    setSaving(true);
    const row = {
      exhibition_slug: slug,
      hall,
      rows: layout.rows,
      cols: layout.cols,
      cells: layout.cells,
      stalls: layout.stalls,
      pois: layout.pois,
      version: version + 1,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("hall_layouts").upsert(row, { onConflict: "exhibition_slug,hall" });
    setSaving(false);
    if (error) return setMsg(error.message);
    setVersion(version + 1);
    setMsg("Saved ✓");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Hall layouts</h1>

      <div className={`${card} grid gap-3 sm:grid-cols-3`}>
        <label className="text-xs font-semibold text-slate-600">
          Exhibition
          <select className={inp} value={slug} onChange={(e) => { setSlug(e.target.value); setHall(""); }}>
            <option value="">Select</option>
            {exhibitions.map((e) => (
              <option key={e.id} value={e.slug}>{e.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Hall
          {halls.length ? (
            <select className={inp} value={hall} onChange={(e) => setHall(e.target.value)}>
              <option value="">Select</option>
              {halls.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          ) : (
            <input className={inp} value={hall} onChange={(e) => setHall(e.target.value)} placeholder="e.g. Hall 5" />
          )}
        </label>
        <p className="self-end text-xs text-slate-500">Saved version: {version}</p>
      </div>

      {slug && hall && !layout && (
        <div className={`${card} space-y-4`}>
          {msg && <p className="text-sm text-slate-600">{msg}</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-slate-600">Rows<input className={inp} type="number" min="3" max="200" value={size.rows} onChange={(e) => setSize({ ...size, rows: +e.target.value })} /></label>
            <label className="text-xs font-semibold text-slate-600">Columns<input className={inp} type="number" min="3" max="200" value={size.cols} onChange={(e) => setSize({ ...size, cols: +e.target.value })} /></label>
            <button type="button" className={`${btn} self-end`} onClick={() => setLayout(blank(Math.max(3, size.rows), Math.max(3, size.cols)))}>Blank hall</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-slate-600">Template blocks (Hall 5 style)<input className={inp} type="number" min="1" max="12" value={size.blocks} onChange={(e) => setSize({ ...size, blocks: +e.target.value })} /></label>
            <button type="button" className={`${btn} self-end sm:col-start-3`} onClick={() => setLayout(layoutFromTemplate({ blocks: Math.min(12, Math.max(1, size.blocks)) }))}>Create from template</button>
          </div>
        </div>
      )}

      {layout && (
        <>
          <div className={`${card} flex flex-wrap items-center gap-2`}>
            {TOOLS.map(([k, label]) => (
              <button key={k} type="button" onClick={() => { setTool(k); setCorner(null); }} className={`h-9 rounded-lg border px-3 text-sm font-semibold ${tool === k ? "border-brand bg-brand text-white" : "bg-white text-slate-700"}`}>{label}</button>
            ))}
            {tool === "poi" && (
              <select className="h-9 rounded-lg border px-2 text-sm" value={poiType} onChange={(e) => setPoiType(e.target.value)}>
                {POI_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            )}
            <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              Zoom
              <input type="range" min="16" max="56" value={px} onChange={(e) => setPx(+e.target.value)} />
            </span>
            <button type="button" className={btn} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
          {tool === "stall" && <p className="text-sm text-slate-600">{corner ? "Now click the opposite corner." : "Click the first corner of the stall. The rectangle's size is its shells (1, 2, 4, 6…)."}</p>}
          {msg && <p className="text-sm text-slate-600">{msg}</p>}

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className={`${card} min-w-0 flex-1 overflow-auto`}>
              <HallMap layout={layout} px={px} selectedId={selectedId} onCell={onCell} />
            </div>

            <div className="w-full space-y-4 lg:w-80">
              <div className={`${card} space-y-3`}>
                <h2 className="text-sm font-bold">Selected</h2>
                {!selStall && !selPoi && <p className="text-sm text-slate-500">Use the Select tool and click a stall or marker.</p>}
                {selStall && (
                  <>
                    <p className="text-xs text-slate-500">Slot {selStall.id} · {selStall.cells.length} shell ({selStall.cells.length * 9} sq m)</p>
                    <label className="text-xs font-semibold text-slate-600">Stall number<input className={inp} value={selStall.label} onChange={(e) => patchStall("label", e.target.value)} placeholder="e.g. A-42" /></label>
                    <label className="text-xs font-semibold text-slate-600">Company name<input className={inp} value={selStall.company} onChange={(e) => patchStall("company", e.target.value)} placeholder="Company / brand" /></label>
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" checked={!!selStall.promo?.on} onChange={(e) => patchPromo({ on: e.target.checked })} /> Promote this stall (Sponsored)
                    </label>
                    {selStall.promo?.on && (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs font-semibold text-slate-600">Animation
                          <select className={inp} value={selStall.promo.style} onChange={(e) => patchPromo({ style: e.target.value })}>
                            <option value="pulse">Pulse</option>
                            <option value="glow">Glow</option>
                            <option value="bounce">Bounce</option>
                          </select>
                        </label>
                        <label className="text-xs font-semibold text-slate-600">Colour<input className={`${inp} p-1`} type="color" value={selStall.promo.color || "#f59e0b"} onChange={(e) => patchPromo({ color: e.target.value })} /></label>
                        <label className="col-span-2 text-xs font-semibold text-slate-600">Tagline<input className={inp} maxLength={50} value={selStall.promo.tagline ?? ""} onChange={(e) => patchPromo({ tagline: e.target.value })} placeholder="e.g. 20% off on show day" /></label>
                        <label className="col-span-2 text-xs font-semibold text-slate-600">Show until (optional)<input className={inp} type="date" value={selStall.promo.until ?? ""} onChange={(e) => patchPromo({ until: e.target.value })} /></label>
                      </div>
                    )}
                  </>
                )}
                {selPoi && (
                  <>
                    <label className="text-xs font-semibold text-slate-600">Name<input className={inp} value={selPoi.label} onChange={(e) => patchPoi("label", e.target.value)} /></label>
                    <label className="text-xs font-semibold text-slate-600">Type
                      <select className={inp} value={selPoi.type} onChange={(e) => patchPoi("type", e.target.value)}>
                        {POI_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                    </label>
                  </>
                )}
              </div>

              <div className={`${card} space-y-2`}>
                <h2 className="text-sm font-bold">Bulk assign</h2>
                <p className="text-xs text-slate-500">One line each: <code>slot, stall number, company</code> (slot = the stall's ID, e.g. B07). You can paste from Excel.</p>
                <textarea className="h-28 w-full rounded-lg border border-slate-300 p-2 text-sm" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={"B07, A-42, Acme Ltd\nB08, A-43, Rao Foods"} />
                <button type="button" className={btn} onClick={applyBulk} disabled={!bulk.trim()}>Apply</button>
              </div>
            </div>
          </div>

          <div className={`${card} space-y-3`}>
            <h2 className="text-sm font-bold">Exits and connections of this hall</h2>
            <p className="text-xs text-slate-500">
              A gate of this hall connects to a gate of another hall, or to a <b>path point</b> (a walkway or junction outside). The guide then walks a visitor: stall → nearest gate → outside path → destination hall gate → stall. Save the layout first so the gates exist.
            </p>
            {hallLinks.length === 0 && <p className="text-sm text-slate-500">No connections yet.</p>}
            <ul className="space-y-1 text-sm">
              {hallLinks.map((l) => {
                const mineIsA = l.a_hall === hall;
                const [oh, op, mp] = mineIsA ? [l.b_hall, l.b_poi, l.a_poi] : [l.a_hall, l.a_poi, l.b_poi];
                return (
                  <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <span>{poiLabel(hall, mp)} ↔ {oh === PATH ? `Path point · ${op}` : `${oh} · ${poiLabel(oh, op)}`} · {l.meters} m</span>
                    <button type="button" className="text-red-600" onClick={() => delLink(l.id)}>Remove</button>
                  </li>
                );
              })}
            </ul>
            <div className="grid gap-2 sm:grid-cols-2">
              <select className={inp} value={lk.mine} onChange={(e) => setLk({ ...lk, mine: e.target.value })}>
                <option value="">Gate in this hall</option>
                {gates(layout.pois).map((p) => (<option key={p.id} value={p.id}>{p.label}</option>))}
              </select>
              <select className={inp} value={lk.target} onChange={(e) => setLk({ ...lk, target: e.target.value })} aria-label="Connects to">
                <option value="hall">connects to a gate of another hall</option>
                <option value="path">connects to a path point outside</option>
              </select>
              {lk.target === "hall" ? (
                <>
                  <select className={inp} value={lk.other} onChange={(e) => setLk({ ...lk, other: e.target.value, theirs: "" })}>
                    <option value="">Other hall</option>
                    {halls.filter((h) => h !== hall).map((h) => (<option key={h} value={h}>{h}</option>))}
                  </select>
                  <select className={inp} value={lk.theirs} onChange={(e) => setLk({ ...lk, theirs: e.target.value })} disabled={!lk.other}>
                    <option value="">Gate in other hall</option>
                    {gates(allPois[lk.other]).map((p) => (<option key={p.id} value={p.id}>{p.label}</option>))}
                  </select>
                </>
              ) : (
                <>
                  <select className={inp} value={lk.pathName} onChange={(e) => setLk({ ...lk, pathName: e.target.value })}>
                    <option value="">Existing path point</option>
                    {pathNames.map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                  <input className={inp} value={lk.newPath} onChange={(e) => setLk({ ...lk, newPath: e.target.value })} placeholder="…or a new path point (e.g. Central walkway)" />
                </>
              )}
              <input className={inp} type="number" min="0" max="5000" value={lk.meters} onChange={(e) => setLk({ ...lk, meters: e.target.value })} aria-label="Distance in metres" />
              {lk.target === "hall" && (
                <select className={inp} value={lk.kind} onChange={(e) => setLk({ ...lk, kind: e.target.value })}>
                  <option value="walk">walk</option>
                  <option value="outdoor">outdoor</option>
                  <option value="corridor">corridor</option>
                </select>
              )}
              <button type="button" className={btn} onClick={addLink} disabled={!linkReady}>Add connection</button>
            </div>
          </div>

          <div className={`${card} space-y-3`}>
            <h2 className="text-sm font-bold">Outside paths (path point ↔ path point)</h2>
            <p className="text-xs text-slate-500">Join the walkways and junctions outside the halls, with the walking distance between them.</p>
            <ul className="space-y-1 text-sm">
              {pathLinks.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span>{l.a_poi} ↔ {l.b_poi} · {l.meters} m</span>
                  <button type="button" className="text-red-600" onClick={() => delLink(l.id)}>Remove</button>
                </li>
              ))}
            </ul>
            <div className="grid gap-2 sm:grid-cols-5">
              <select className={inp} value={pp.a} onChange={(e) => setPp({ ...pp, a: e.target.value })} aria-label="Path point A">
                <option value="">Path point A</option>
                {pathNames.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
              <input className={inp} value={pp.newA} onChange={(e) => setPp({ ...pp, newA: e.target.value })} placeholder="or new name" />
              <select className={inp} value={pp.b} onChange={(e) => setPp({ ...pp, b: e.target.value })} aria-label="Path point B">
                <option value="">Path point B</option>
                {pathNames.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
              <input className={inp} value={pp.newB} onChange={(e) => setPp({ ...pp, newB: e.target.value })} placeholder="or new name" />
              <div className="flex gap-2">
                <input className={inp} type="number" min="0" max="5000" value={pp.meters} onChange={(e) => setPp({ ...pp, meters: e.target.value })} aria-label="Path distance in metres" />
                <button type="button" className={btn} onClick={addPathLink} disabled={!pathReady}>Add path</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

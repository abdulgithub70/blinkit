"use client";

import { useMemo } from "react";
import { boxOf, pickLabels } from "@/lib/guide/labels";

const FLOOR = { ".": "transparent", "#": "#94a3b8", W: "#ffffff", S: "#eff6ff" };
const POI = { gate: ["G", "#059669"], washroom: ["WC", "#0284c7"], food: ["F", "#d97706"], lift: ["L", "#7c3aed"], stairs: ["St", "#7c3aed"], help: ["?", "#475569"] };

const CSS = `
.hm-block{position:absolute;inset:1px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border-radius:6px;text-align:center;line-height:1.1;color:#0f172a;border:1.5px solid}
.hm-ring{position:absolute;inset:0;border-radius:7px;pointer-events:none;animation-duration:1.7s;animation-iteration-count:infinite}
.hm-star{position:absolute;top:0;right:3px;font-style:normal;line-height:1}
.hm-pin{position:absolute;z-index:5;display:grid;place-items:center;color:#fff;font-weight:700;font-size:11px;border:2px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.35);pointer-events:none;white-space:nowrap}
@keyframes hm-pulse{0%{box-shadow:0 0 0 0 var(--c)}70%{box-shadow:0 0 0 12px transparent}100%{box-shadow:0 0 0 0 transparent}}
@keyframes hm-glow{0%,100%{box-shadow:0 0 3px 1px var(--c)}50%{box-shadow:0 0 16px 6px var(--c)}}
@keyframes hm-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes hm-fade{from{opacity:0}to{opacity:1}}
.hm-label{position:absolute;z-index:4;pointer-events:none;white-space:nowrap;text-align:center;border-radius:9999px;box-shadow:0 1px 4px rgba(15,23,42,.3);animation:hm-fade .18s ease-out}
.hm-co{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px}
@keyframes hm-flow{to{stroke-dashoffset:var(--d)}}
.hm-bounce{animation:hm-bounce 1.1s ease-in-out infinite}
.hm-flow{animation:hm-flow 1s linear infinite}
@media (prefers-reduced-motion:reduce){.hm-ring,.hm-bounce,.hm-flow{animation:none!important}}
`;

// Sponsored stall: promo = { on, style: "pulse" | "glow" | "bounce", color, tagline, until: "YYYY-MM-DD" }
export const promoOf = (s, today = new Date().toISOString().slice(0, 10)) =>
  s.promo?.on && (!s.promo.until || s.promo.until >= today) ? s.promo : null;

// Hall ka shell grid. Stalls halke uthe hue tiles ki tarah, route ek chikni animated line, pins A / B / Exit / Enter.
// Admin editor: onCell(row, col). Visitor guide: onPick("stall" | "poi", id), route (cells), routeFrom / routeTo (ids), pins.
export default function HallMap({ layout, px = 28, route = [], routeFrom, routeTo, pins = [], selectedId, onCell, onPick }) {
  const { rows, cols, cells, stalls, pois } = layout;
  const today = new Date().toISOString().slice(0, 10);
  const byId = useMemo(() => {
    const m = {};
    for (const s of stalls) if (s.cells.length) m[s.id] = boxOf(s.cells);
    for (const p of pois) m[p.id] = { r0: p.cell[0], c0: p.cell[1], h: 1, w: 1 };
    return m;
  }, [stalls, pois]);
  const center = (id) => (byId[id] ? [(byId[id].c0 + byId[id].w / 2) * px, (byId[id].r0 + byId[id].h / 2) * px] : null);
  const line = useMemo(() => {
    if (!route.length) return "";
    const pts = [center(routeFrom), ...route.map(([r, c]) => [(c + 0.5) * px, (r + 0.5) * px]), center(routeTo)].filter(Boolean);
    return pts.map((p) => p.join(",")).join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, routeFrom, routeTo, px, byId]);
  const boostKey = [selectedId, ...pins.map((p) => p.id)].join("|");
  const labels = useMemo(
    () =>
      pickLabels({
        stalls: stalls.map((s) => ({ id: s.id, label: s.label, company: s.company, cells: s.cells, promo: !!promoOf(s, today) })),
        pois,
        px,
        boost: new Set(boostKey.split("|")),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stalls, pois, px, boostKey, today]
  );
  const tap = (kind, id) => onPick && ((e) => { e.stopPropagation(); onPick(kind, id); });
  const mode = onPick ? "absolute cursor-pointer" : "pointer-events-none absolute";

  return (
    <div className="relative select-none" style={{ width: cols * px, height: rows * px }}>
      <style>{CSS}</style>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${cols}, ${px}px)` }}
        onClick={(e) => {
          const t = e.target.closest("[data-rc]");
          if (!t || !onCell) return;
          const [r, c] = t.dataset.rc.split(",").map(Number);
          onCell(r, c);
        }}
      >
        {cells.map((row, r) =>
          [...row].map((ch, c) => (
            <div key={`${r},${c}`} data-rc={`${r},${c}`} className={labels.grid ? "border-[0.5px] border-slate-200/70" : ""} style={{ width: px, height: px, background: FLOOR[ch] }} />
          ))
        )}
      </div>

      {stalls.map((s) => {
        if (!s.cells.length) return null;
        const b = byId[s.id];
        const promo = promoOf(s, today);
        const edge = promo?.color ?? "#60a5fa";
        const sel = s.id === selectedId;
        return (
          <div
            key={s.id}
            data-stall={s.id}
            data-promo={promo ? promo.style : undefined}
            role={onPick ? "button" : undefined}
            aria-label={onPick ? `${s.label} ${s.company}` : undefined}
            onClick={tap("stall", s.id)}
            className={mode}
            style={{ left: b.c0 * px, top: b.r0 * px, width: b.w * px, height: b.h * px, "--c": edge }}
          >
            {promo && promo.style !== "bounce" && <span className="hm-ring" style={{ animationName: promo.style === "glow" ? "hm-glow" : "hm-pulse" }} />}
            <div
              className={`hm-block ${promo?.style === "bounce" ? "hm-bounce" : ""}`}
              style={{
                borderColor: sel ? "#0f172a" : edge,
                background: promo ? "linear-gradient(160deg,#fffbeb,#fde68a)" : "linear-gradient(160deg,#ffffff,#dbeafe)",
                boxShadow: `0 2px 0 ${edge}, 0 5px 8px rgba(30,64,175,.16)`,
                fontSize: labels.f,
              }}
            >
              {labels.stalls[s.id] && <b>{s.label}</b>}
              {labels.stalls[s.id]?.company && <span className="hm-co text-slate-600">{s.company}</span>}
              {promo && px >= 10 && <i className="hm-star" style={{ color: edge }}>★</i>}
            </div>
          </div>
        );
      })}

      {line && (
        <svg className="pointer-events-none absolute left-0 top-0" width={cols * px} height={rows * px} style={{ "--d": `${-px * 0.7}px` }}>
          <polyline points={line} fill="none" stroke="#fff" strokeWidth={px * 0.42} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={line} fill="none" stroke="#2563eb" strokeWidth={px * 0.26} strokeLinecap="round" strokeLinejoin="round" />
          <polyline className="hm-flow" points={line} fill="none" stroke="#fff" strokeWidth={px * 0.08} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${px * 0.2} ${px * 0.5}`} />
        </svg>
      )}

      {pois.map((p) => {
        const [txt, col] = POI[p.type] ?? ["•", "#475569"];
        const size = px < 16 ? Math.max(8, px * 0.9) : Math.max(16, px - 6);
        return (
          <div
            key={p.id}
            data-poi={p.id}
            title={p.label}
            role={onPick ? "button" : undefined}
            aria-label={onPick ? p.label : undefined}
            onClick={tap("poi", p.id)}
            className={`${mode} grid place-items-center rounded-full font-bold text-white`}
            style={{
              left: (p.cell[1] + 0.5) * px - size / 2,
              top: (p.cell[0] + 0.5) * px - size / 2,
              width: size,
              height: size,
              background: col,
              border: "2px solid #fff",
              boxShadow: p.id === selectedId ? "0 0 0 3px #0f172a" : "0 1px 4px rgba(15,23,42,.3)",
              fontSize: Math.max(7, px * 0.26),
            }}
          >
            {size >= 14 ? txt : ""}
          </div>
        );
      })}

      {labels.pills.map((l) => (
        <div
          key={l.id}
          data-label={l.id}
          className="hm-label"
          style={{ left: l.x, top: l.y, width: l.w, height: l.h, lineHeight: `${l.h}px`, fontSize: Math.min(12, Math.max(9, px * 0.28)), background: l.tone === "stall" ? "#f59e0b" : "rgba(255,255,255,.95)", color: l.tone === "stall" ? "#fff" : "#0f172a", fontWeight: 600 }}
        >
          {l.text}
        </div>
      ))}

      {pins.map((pk) => {
        const c = center(pk.id);
        if (!c) return null;
        const word = pk.text.length > 1;
        return (
          <div
            key={`${pk.id}-${pk.text}`}
            data-pin={pk.text}
            className="hm-pin"
            style={{ left: c[0], top: c[1], background: pk.color, borderRadius: 9999, height: 22, minWidth: 22, padding: word ? "0 8px" : 0, transform: word ? "translate(-50%,-140%)" : "translate(-50%,-50%)" }}
          >
            {pk.text}
          </div>
        );
      })}
    </div>
  );
}

// Zoom ke hisaab se labels chunna (Google Maps jaisa): pehle bade/zaroori places, zoom in karne par chhote stalls,
// aur koi do labels ek-dusre par nahi chadhte. px = ek shell kitne pixel ka hai (zoom level).

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TYPE_RANK = { food: 5, gate: 4, washroom: 3, help: 3, lift: 2, stairs: 2 };
const textW = (t, f) => t.length * f * 0.58 + 6;
const hit = (a, b, pad = 2) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

export const boxOf = (cells) => {
  const rs = cells.map((c) => c[0]);
  const cs = cells.map((c) => c[1]);
  const r0 = Math.min(...rs);
  const c0 = Math.min(...cs);
  return { r0, c0, h: Math.max(...rs) - r0 + 1, w: Math.max(...cs) - c0 + 1 };
};

/**
 * stalls: [{ id, label, company, cells, promo }]   pois: [{ id, type, label, cell }]
 * boost: ids jo hamesha dikhne chahiye (selected, start, end)
 * returns { grid, f, stalls: { [id]: { company } }  (jis stall ka label dikhana hai),  pills: [{ id, text, x, y, w, h, tone }] }
 */
export function pickLabels({ stalls, pois, px, boost = new Set(), max = 400 }) {
  const f = clamp(px * 0.3, 7, 14); // stall ke andar ka font
  const fp = clamp(px * 0.28, 9, 12); // pill ka font
  const out = { grid: px >= 14, f, stalls: {}, pills: [] };
  const cand = [];

  for (const s of stalls) {
    if (!s.cells?.length) continue; // coordinates nahi hain: skip
    const b = boxOf(s.cells);
    const W = b.w * px;
    const H = b.h * px;
    const n = s.cells.length;
    const forced = !!s.promo || boost.has(s.id);
    const minPx = forced ? 10 : n >= 6 ? 12 : n >= 4 ? 14 : n >= 2 ? 18 : 24; // bada stall pehle, single shell sabse baad me
    const lab = s.label || "";
    const cx = (b.c0 + b.w / 2) * px;
    const cy = (b.r0 + b.h / 2) * px;
    const fits = lab && px >= minPx && textW(lab, f) <= W && f * 1.25 + 3 <= H;
    if (fits) {
      const coMin = n >= 4 ? 16 : n >= 2 ? 22 : 38;
      const company = !!(s.company && px >= coMin && H >= f * 2.5 + 4 && W >= textW(s.company.slice(0, 6), f * 0.9));
      const w = textW(lab, f);
      const h = company ? f * 2.5 : f * 1.25;
      cand.push({ kind: "inline", id: s.id, pri: 10 + n + (forced ? 80 : 0), company, rect: { x: cx - w / 2, y: cy - h / 2, w, h } });
    } else if (forced && lab && px >= 10) {
      const text = s.company ? `${lab} · ${s.company}` : lab;
      const w = textW(text, fp);
      const h = fp * 1.3 + 4;
      cand.push({ kind: "pill", id: s.id, pri: 90, text, tone: "stall", rect: { x: cx - w / 2, y: b.r0 * px - h - 3, w, h } });
    }
  }

  if (px >= 18)
    for (const p of pois) {
      if (!p.cell || !p.label) continue;
      const w = textW(p.label, fp);
      const h = fp * 1.3 + 4;
      const size = Math.max(16, px - 6);
      const cx = (p.cell[1] + 0.5) * px;
      const cy = (p.cell[0] + 0.5) * px;
      cand.push({ kind: "pill", id: p.id, pri: 40 + (TYPE_RANK[p.type] ?? 1) * 5 + (boost.has(p.id) ? 50 : 0), text: p.label, tone: "poi", rect: { x: cx - w / 2, y: cy - size / 2 - h - 2, w, h } });
    }

  const placed = [];
  cand.sort((a, b) => b.pri - a.pri);
  for (const c of cand) {
    if (out.pills.length + Object.keys(out.stalls).length >= max) break;
    if (placed.some((r) => hit(r, c.rect))) continue; // overlap: kam zaroori label hata do
    placed.push(c.rect);
    if (c.kind === "inline") out.stalls[c.id] = { company: c.company };
    else out.pills.push({ id: c.id, text: c.text, tone: c.tone, ...c.rect });
  }
  return out;
}

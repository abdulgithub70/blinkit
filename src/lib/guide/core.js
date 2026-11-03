// src/hall.ts
var WALKABLE = "PWFEMG4";
var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
var DEFAULT_PATTERN = "ABCDACBACBAD";
var COMP = {
  A: [[2, 2], [2, 1]],
  B: [[2, 1], [2, 2]],
  C: [[2, 1], [2, 1], [2, 1]],
  D: [[2, 3]]
};
function isWalkable(g, r, c) {
  return r >= 0 && c >= 0 && r < g.rows && c < g.cols && WALKABLE.includes(g.cells[r][c]);
}
function neighbours(g, cs) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const [r, c] of cs)
    for (const [dx, dy] of DIRS) {
      const a = r + dy, b = c + dx, k = a * g.cols + b;
      if (isWalkable(g, a, b) && !seen.has(k)) {
        seen.add(k);
        out.push([a, b]);
      }
    }
  return out;
}
function buildHall({ blocks: N, gate4Ext: X0 = 12, pattern = DEFAULT_PATTERN }) {
  const H0 = X0 + 2, rows = 4 * N + 4, cols = X0 + 15;
  const cells = Array.from({ length: rows }, () => Array(cols).fill("."));
  const stallAt = Array.from({ length: rows }, () => Array(cols).fill(0));
  const stalls = {};
  let n = 0;
  const cnt = {};
  const put = (L, cs, shells) => {
    const id = ++n;
    cnt[L] = (cnt[L] ?? 0) + 1;
    stalls[id] = { id, name: L + String(cnt[L]).padStart(2, "0"), cells: cs, shells };
    for (const [r, c] of cs) {
      cells[r][c] = "S";
      stallAt[r][c] = id;
    }
  };
  for (let r = 0; r < rows; r++) {
    cells[r][X0] = "P";
    const aisle = r > 0 && r < rows - 2 && (r - 1) % 4 === 0;
    if (r < rows - 1) {
      cells[r][X0 + 1] = aisle ? "G" : "#";
      cells[r][cols - 1] = "#";
    }
    if (r === 0) for (let h = 0; h < 12; h++) cells[r][H0 + h] = "F";
    else if (aisle) for (let h = 0; h < 12; h++) cells[r][H0 + h] = "W";
    else if (r === rows - 2) {
      for (let h = 0; h < 12; h++) cells[r][H0 + h] = "#";
      cells[r][H0] = "f";
      cells[r][H0 + 1] = "m";
      cells[r][H0 + 2] = "E";
      cells[r][H0 + 9] = "M";
    } else if (r === rows - 1) {
      cells[r].fill("P");
      cells[r][0] = "4";
    } else {
      for (const h of [1, 4, 7, 10]) cells[r][H0 + h] = "W";
      put("W", [[r, H0]], 1);
      put("E", [[r, H0 + 11]], 1);
    }
  }
  for (let b = 0; b < N; b++)
    for (let g = 0; g < 3; g++) {
      let y = 0;
      const c0 = H0 + 2 + 3 * g;
      for (const [w, h] of COMP[pattern[(b * 3 + g) % pattern.length]]) {
        const cs = [];
        for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) cs.push([2 + 4 * b + y + i, c0 + j]);
        put("BCD"[g], cs, w * h);
        y += h;
      }
    }
  const find = (ch) => {
    const o = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (cells[r][c] === ch) o.push([r, c]);
    return o;
  };
  const places = {};
  const pl = (key, label, ch) => {
    places[key] = { key, label, cells: find(ch), access: find(ch) };
  };
  pl("g4", "Gate 4", "4");
  pl("gE", "Gate Entry (bottom-left)", "E");
  pl("gM", "Main Entry (bottom-right)", "M");
  pl("gl", "Left side ka koi bhi gate", "G");
  pl("food", "Food Court", "F");
  for (const [k, label] of [["f", "Washroom (Female)"], ["m", "Washroom (Male)"]]) {
    const [[r, c]] = find(k);
    places[k] = { key: k, label, cells: [[r, c]], access: [[r - 1, c]] };
  }
  const grid = { rows, cols, cells, stallAt, stalls, places };
  for (const s of Object.values(stalls))
    places["s" + s.id] = { key: "s" + s.id, label: `${s.name} (${s.shells} shell)`, cells: s.cells, access: neighbours(grid, s.cells) };
  return grid;
}

// src/route.ts
var MinHeap = class {
  a = [];
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = i - 1 >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    if (!a.length) return void 0;
    const top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (; ; ) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
};
function findRoute(g, from, to, turnPenalty = 0.4) {
  const key = (r, c, d) => (r * g.cols + c) * 5 + d + 1;
  const goal = new Set(to.access.map(([r, c]) => r * g.cols + c));
  const dist = /* @__PURE__ */ new Map();
  const par = /* @__PURE__ */ new Map();
  const heap = new MinHeap();
  for (const [r, c] of from.access) {
    const k = key(r, c, -1);
    dist.set(k, 0);
    heap.push([0, r, c, -1, k]);
  }
  for (let n = heap.pop(); n; n = heap.pop()) {
    const [d0, r, c, d, k] = n;
    if (d0 > (dist.get(k) ?? Infinity)) continue;
    if (goal.has(r * g.cols + c)) {
      const p = [];
      let q = k;
      while (q !== void 0) {
        const i = Math.floor(q / 5);
        p.push([Math.floor(i / g.cols), i % g.cols]);
        q = par.get(q);
      }
      return p.reverse();
    }
    for (let nd = 0; nd < 4; nd++) {
      const nr = r + DIRS[nd][1], nc = c + DIRS[nd][0];
      if (!isWalkable(g, nr, nc)) continue;
      const w = d0 + 1 + (d >= 0 && nd !== d ? turnPenalty : 0), nk = key(nr, nc, nd);
      if (w < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, w);
        par.set(nk, k);
        heap.push([w, nr, nc, nd, nk]);
      }
    }
  }
  return null;
}

// src/instructions.ts
function toSteps(path) {
  const seg = [];
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][1] - path[i - 1][1], dy = path[i][0] - path[i - 1][0];
    const dir = DIRS.findIndex(([x, y]) => x === dx && y === dy);
    const last = seg[seg.length - 1];
    if (last && last.dir === dir) last.count++;
    else seg.push({ dir, count: 1 });
  }
  return seg.map((s, i) => {
    if (i === 0) return { ...s, turn: null };
    const a = DIRS[seg[i - 1].dir], b = DIRS[s.dir];
    return { ...s, turn: a[0] * b[1] - a[1] * b[0] > 0 ? "right" : "left" };
  });
}
var NAME = ["upar", "right", "neeche", "left"];
function describeHinglish(steps, unit = "shell") {
  return steps.map((s, i) => i === 0 ? `Pehle ${NAME[s.dir]} ${s.count} ${unit} chalo` : `${s.turn === "right" ? "Right" : "Left"} lo, ${s.count} ${unit} chalo`);
}

// src/geo.ts
function haversineM(a, b) {
  const R = 6371e3, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function nearestNode(p, nodes, maxM = 40) {
  let best = null;
  for (const node of nodes) {
    if (node.lat == null || node.lng == null) continue;
    const distM = haversineM(p, node);
    if (!best || distM < best.distM) best = { node, distM };
  }
  return best && best.distM <= maxM ? best : null;
}

// src/pdr.ts
var StepDetector = class {
  constructor(threshold = 1, minGapMs = 280) {
    this.threshold = threshold;
    this.minGapMs = minGapMs;
  }
  threshold;
  minGapMs;
  steps = 0;
  base = 9.81;
  prev = 0;
  lastT = -1e9;
  /** accelerationIncludingGravity (m/s²) aur timestamp (ms). Step mila to true. */
  push(ax, ay, az, tMs) {
    const mag = Math.hypot(ax, ay, az);
    this.base += 0.01 * (mag - this.base);
    const dyn = mag - this.base;
    const stepped = this.prev < this.threshold && dyn >= this.threshold && tMs - this.lastT > this.minGapMs;
    this.prev = dyn;
    if (stepped) {
      this.steps++;
      this.lastT = tMs;
    }
    return stepped;
  }
  reset() {
    this.steps = 0;
    this.prev = 0;
    this.lastT = -1e9;
  }
};
function progressIndex(path, steps, stepLenM = 0.7, shellM = 3) {
  return Math.min(path.length - 1, Math.floor(steps * stepLenM / shellM));
}

// src/layout.ts
function gridFromLayout(l) {
  const cells = l.cells.map((r) => [...r]);
  const g = { rows: l.rows, cols: l.cols, cells };
  const places = {};
  for (const s of l.stalls)
    places[s.id] = { key: s.id, label: s.company ? `${s.label} \xB7 ${s.company}` : s.label, cells: s.cells, access: neighbours(g, s.cells) };
  for (const p of l.pois) {
    const [r, c] = p.cell;
    places[p.id] = { key: p.id, label: p.label, cells: [p.cell], access: isWalkable(g, r, c) ? [p.cell] : neighbours(g, [p.cell]) };
  }
  return { ...g, places };
}
function layoutFromTemplate(p) {
  const g = buildHall({ ...p, gate4Ext: 0 });
  const pois = [];
  const rows = [];
  const stalls = Object.values(g.stalls).map((s) => ({
    id: s.name,
    label: s.name,
    company: "",
    cells: s.cells.map(([r, c]) => [r, c - 1])
  }));
  let gl = 0;
  const poi = (id, type, label, r, c) => pois.push({ id, type, label, cell: [r, c - 1] });
  for (let r = 0; r < g.rows - 1; r++) {
    let row = "";
    for (let c = 1; c < g.cols; c++) {
      const t = g.cells[r][c];
      if (t === "S" || t === "W") row += t;
      else if (t === "F") row += "W";
      else {
        row += "#";
        if (t === "G") poi(`gate-l${++gl}`, "gate", `Left gate ${gl}`, r, c);
        else if (t === "E") poi("gate-entry", "gate", "Gate Entry (bottom-left)", r, c);
        else if (t === "M") poi("main-entry", "gate", "Main Entry (bottom-right)", r, c);
        else if (t === "f") poi("wc-f", "washroom", "Washroom (Female)", r, c);
        else if (t === "m") poi("wc-m", "washroom", "Washroom (Male)", r, c);
      }
    }
    rows.push(row);
  }
  pois.push({ id: "food", type: "food", label: "Food Court", cell: [0, Math.floor((g.cols - 1) / 2)] });
  return { rows: rows.length, cols: g.cols - 1, cells: rows, stalls, pois };
}
var EN = ["up", "right", "down", "left"];
function describeEnglish(steps, unit = "shell") {
  return steps.map((s, i) => `${i === 0 ? `Head ${EN[s.dir]}` : `Turn ${s.turn}`} and go ${s.count} ${unit}${s.count > 1 ? "s" : ""}`);
}

// src/venue.ts
var PATH_NODE = "@path";
var minutesFor = (meters) => Math.max(1, Math.round(meters / 70));
var SEP = "";
function findVenueRoute(layouts, links, from, to, shellM = 3) {
  const grids = {};
  const grid = (h) => grids[h] ??= gridFromLayout(layouts[h]);
  const has = (h, id) => h === PATH_NODE || !!layouts[h] && !!grid(h).places[id];
  const labelOf = (h, id) => h === PATH_NODE ? id : grid(h).places[id].label;
  if (!has(from.hall, from.id) || !has(to.hall, to.id)) return null;
  if (from.hall === to.hall && from.id === to.id) return { legs: [], meters: 0 };
  const node = (h, id) => h + SEP + id;
  const edges = /* @__PURE__ */ new Map();
  const add = (a, e) => edges.set(a, [...edges.get(a) ?? [], e]);
  const portals = {};
  const portal = (h, id) => (portals[h] ??= /* @__PURE__ */ new Set()).add(id);
  for (const l of links) {
    if (!has(l.aHall, l.aPoi) || !has(l.bHall, l.bPoi)) continue;
    const kind = l.kind ?? "walk";
    const aLabel = labelOf(l.aHall, l.aPoi), bLabel = labelOf(l.bHall, l.bPoi);
    add(node(l.aHall, l.aPoi), { to: node(l.bHall, l.bPoi), cost: l.meters, leg: { type: "link", fromHall: l.aHall, toHall: l.bHall, fromId: l.aPoi, toId: l.bPoi, fromLabel: aLabel, toLabel: bLabel, meters: l.meters, kind } });
    add(node(l.bHall, l.bPoi), { to: node(l.aHall, l.aPoi), cost: l.meters, leg: { type: "link", fromHall: l.bHall, toHall: l.aHall, fromId: l.bPoi, toId: l.aPoi, fromLabel: bLabel, toLabel: aLabel, meters: l.meters, kind } });
    if (l.aHall !== PATH_NODE) portal(l.aHall, l.aPoi);
    if (l.bHall !== PATH_NODE) portal(l.bHall, l.bPoi);
  }
  portal(from.hall, from.id);
  portal(to.hall, to.id);
  for (const [h, set] of Object.entries(portals)) {
    const ids = [...set];
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const g = grid(h);
        const p = findRoute(g, g.places[ids[i]], g.places[ids[j]]);
        if (!p) continue;
        const m = (p.length - 1) * shellM;
        add(node(h, ids[i]), { to: node(h, ids[j]), cost: m, leg: { type: "hall", hall: h, path: p, fromId: ids[i], toId: ids[j], meters: m } });
        add(node(h, ids[j]), { to: node(h, ids[i]), cost: m, leg: { type: "hall", hall: h, path: [...p].reverse(), fromId: ids[j], toId: ids[i], meters: m } });
      }
  }
  const S = node(from.hall, from.id), E = node(to.hall, to.id);
  const dist = /* @__PURE__ */ new Map([[S, 0]]), prev = /* @__PURE__ */ new Map(), done = /* @__PURE__ */ new Set();
  for (; ; ) {
    let u = null;
    for (const [k, d] of dist) if (!done.has(k) && (u === null || d < dist.get(u))) u = k;
    if (u === null) return null;
    if (u === E) break;
    done.add(u);
    for (const e of edges.get(u) ?? []) {
      const nd = dist.get(u) + e.cost;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, { from: u, leg: e.leg });
      }
    }
  }
  const legs = [];
  for (let k = E; k !== S; ) {
    const p = prev.get(k);
    legs.push(p.leg);
    k = p.from;
  }
  legs.reverse();
  return { legs, meters: dist.get(E) };
}
function partsOf(route) {
  const parts = [];
  for (const leg of route.legs) {
    if (leg.type === "hall") {
      parts.push({ type: "hall", hall: leg.hall, path: leg.path, fromId: leg.fromId, toId: leg.toId, meters: leg.meters, role: "through" });
      continue;
    }
    const last = parts[parts.length - 1];
    if (last && last.type === "outside") {
      last.meters += leg.meters;
      last.points.push({ hall: leg.toHall, id: leg.toId, label: leg.toLabel });
    } else {
      parts.push({ type: "outside", meters: leg.meters, points: [{ hall: leg.fromHall, id: leg.fromId, label: leg.fromLabel }, { hall: leg.toHall, id: leg.toId, label: leg.toLabel }] });
    }
  }
  parts.forEach((p, i) => {
    if (p.type === "hall") p.role = parts.length === 1 ? "only" : i === 0 ? "start" : i === parts.length - 1 ? "end" : "through";
  });
  return parts;
}
export {
  DEFAULT_PATTERN,
  DIRS,
  PATH_NODE,
  StepDetector,
  WALKABLE,
  buildHall,
  describeEnglish,
  describeHinglish,
  findRoute,
  findVenueRoute,
  gridFromLayout,
  haversineM,
  isWalkable,
  layoutFromTemplate,
  minutesFor,
  nearestNode,
  neighbours,
  partsOf,
  progressIndex,
  toSteps
};

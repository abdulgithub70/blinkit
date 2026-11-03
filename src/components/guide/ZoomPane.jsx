"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Touch map: ek ungli se drag, do ungliyon se pinch zoom, +/- aur Fit buttons. children(px) = ek shell kitne pixel ka hai.
const ZoomPane = forwardRef(function ZoomPane({ cols, children, height = "55vh", className = "", min = 12, max = 64 }, ref) {
  const box = useRef(null);
  const [px, setPx] = useState(24);
  const pxRef = useRef(24);
  const pts = useRef(new Map());
  const drag = useRef(null);
  const pinch = useRef(null);
  const moved = useRef(false);

  const zoom = useCallback(
    (next) => {
      const n = clamp(Math.round(next), min, max);
      const old = pxRef.current;
      if (n === old) return;
      const el = box.current;
      const k = n / old;
      pxRef.current = n;
      setPx(n);
      if (el)
        requestAnimationFrame(() => {
          el.scrollLeft = (el.scrollLeft + el.clientWidth / 2) * k - el.clientWidth / 2;
          el.scrollTop = (el.scrollTop + el.clientHeight / 2) * k - el.clientHeight / 2;
        });
    },
    [min, max]
  );

  const fit = useCallback(() => {
    const el = box.current;
    if (el && cols) zoom(Math.floor((el.clientWidth - 20) / cols));
  }, [cols, zoom]);

  useEffect(() => {
    fit();
  }, [fit]);

  useImperativeHandle(ref, () => ({
    scrollToCell(r, c) {
      const el = box.current;
      el?.scrollTo?.({ left: (c + 0.5) * pxRef.current - el.clientWidth / 2, top: (r + 0.5) * pxRef.current - el.clientHeight / 2, behavior: "smooth" });
    },
  }));

  const dist = () => {
    const [a, b] = [...pts.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const down = (e) => {
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const el = box.current;
    if (pts.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop };
      moved.current = false;
    }
    if (pts.current.size === 2) {
      pinch.current = { d: dist() || 1, px: pxRef.current };
      moved.current = true;
    }
  };
  const move = (e) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const el = box.current;
    if (pts.current.size === 2 && pinch.current) return zoom(pinch.current.px * (dist() / pinch.current.d));
    if (pts.current.size === 1 && drag.current) {
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 8) moved.current = true;
      if (moved.current) {
        el.scrollLeft = drag.current.l - dx;
        el.scrollTop = drag.current.t - dy;
      }
    }
  };
  const up = (e) => {
    pts.current.delete(e.pointerId);
    pinch.current = null;
    if (pts.current.size === 1) {
      const [p] = [...pts.current.values()];
      drag.current = { x: p.x, y: p.y, l: box.current.scrollLeft, t: box.current.scrollTop };
    } else drag.current = null;
  };

  const btn = "grid h-11 w-11 place-items-center rounded-full border bg-white/95 text-lg font-bold shadow active:bg-slate-100";
  return (
    <div className={`relative ${className}`}>
      <div
        ref={box}
        className="overflow-auto rounded-xl border bg-white"
        style={{ height, touchAction: "none", overscrollBehavior: "contain" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        onClickCapture={(e) => {
          if (moved.current) {
            e.stopPropagation();
            e.preventDefault();
            moved.current = false;
          }
        }}
      >
        <div className="p-2" style={{ width: "max-content" }}>{typeof children === "function" ? children(px) : children}</div>
      </div>
      <div className="absolute right-2 top-2 flex flex-col gap-1.5">
        <button type="button" aria-label="Zoom in" className={btn} onClick={() => zoom(pxRef.current + 4)}>+</button>
        <button type="button" aria-label="Zoom out" className={btn} onClick={() => zoom(pxRef.current - 4)}>−</button>
        <button type="button" aria-label="Fit to screen" className={btn} onClick={fit}>⤢</button>
      </div>
    </div>
  );
});

export default ZoomPane;

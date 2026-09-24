"use client";

import { Minus, Plus } from "lucide-react";

export default function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  disableIncrement = false,
  size = "md",
  className = "",
}) {
  const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  return (
    <div
      role="group"
      aria-label="Quantity"
      className={`inline-flex items-center rounded-full bg-brand text-white ${className}`}
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label="Decrease quantity"
        className={`${dim} grid place-items-center rounded-full active:bg-brand-dark`}
      >
        <Minus size={16} />
      </button>
      <span className="min-w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={disableIncrement}
        aria-label="Increase quantity"
        className={`${dim} grid place-items-center rounded-full active:bg-brand-dark disabled:opacity-40`}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

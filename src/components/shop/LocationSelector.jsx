"use client";

import { X } from "lucide-react";
import LocationFields from "./LocationFields";

// Bottom sheet (mobile) / dialog (desktop) for choosing the delivery location.
// Fields save into the store as you type, so "Done" only closes it. When
// `required` is set (no valid venue chosen yet) it cannot be dismissed.
export default function LocationSelector({ open, onClose, required = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delivery location"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Where should we deliver?</h2>
            <p className="text-sm text-slate-500">
              We bring it straight to your stall inside the venue.
            </p>
          </div>
          {!required && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full active:bg-slate-100"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <LocationFields idPrefix="sheet" />

        <button
          type="button"
          onClick={onClose}
          disabled={required}
          className="mt-5 h-12 w-full rounded-xl bg-brand text-base font-bold text-white active:bg-brand-dark disabled:opacity-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}

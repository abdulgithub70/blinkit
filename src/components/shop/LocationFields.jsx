"use client";

import { useShallow } from "zustand/react/shallow";
import { useDeliveryStore } from "@/store/deliveryStore";
import { useExhibitions } from "@/lib/useExhibitions";

export const inputClass =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-red-500";

export function Field({ label, htmlFor, error, optional = false, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Venue → Hall → Stall. Shared by the location sheet and the checkout form so
// both edit the same remembered delivery location.
export default function LocationFields({ errors = {}, idPrefix = "loc" }) {
  const { exhibitions } = useExhibitions();
  const { exhibitionId, hall, stall, stallName } = useDeliveryStore(
    useShallow((s) => ({
      exhibitionId: s.exhibitionId,
      hall: s.hall,
      stall: s.stall,
      stallName: s.stallName,
    }))
  );
  const setDelivery = useDeliveryStore((s) => s.setDelivery);
  const setExhibition = useDeliveryStore((s) => s.setExhibition);

  const exhibition = exhibitions.find((e) => e.id === exhibitionId);
  const halls = exhibition?.halls ?? [];

  return (
    <div className="space-y-4">
      <Field label="Exhibition / venue" htmlFor={`${idPrefix}-venue`} error={errors.exhibition}>
        <select
          id={`${idPrefix}-venue`}
          value={exhibition ? exhibitionId : ""}
          onChange={(e) => setExhibition(e.target.value || null)}
          aria-invalid={Boolean(errors.exhibition)}
          className={inputClass}
        >
          <option value="" disabled>
            Select venue
          </option>
          {exhibitions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
              {e.city ? ` — ${e.city}` : ""}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hall" htmlFor={`${idPrefix}-hall`} error={errors.hall}>
          {halls.length > 0 ? (
            <select
              id={`${idPrefix}-hall`}
              value={halls.includes(hall) ? hall : ""}
              onChange={(e) => setDelivery({ hall: e.target.value })}
              aria-invalid={Boolean(errors.hall)}
              className={inputClass}
            >
              <option value="" disabled>
                Select hall
              </option>
              {halls.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${idPrefix}-hall`}
              value={hall}
              onChange={(e) => setDelivery({ hall: e.target.value })}
              placeholder="e.g. Hall 5"
              maxLength={50}
              aria-invalid={Boolean(errors.hall)}
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Stall / booth" htmlFor={`${idPrefix}-stall`} error={errors.stall}>
          <input
            id={`${idPrefix}-stall`}
            value={stall}
            onChange={(e) => setDelivery({ stall: e.target.value })}
            placeholder="e.g. A-42"
            maxLength={50}
            aria-invalid={Boolean(errors.stall)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Stall / company name" htmlFor={`${idPrefix}-stallname`} optional>
        <input
          id={`${idPrefix}-stallname`}
          value={stallName}
          onChange={(e) => setDelivery({ stallName: e.target.value })}
          placeholder="Helps the delivery partner find you"
          maxLength={100}
          className={inputClass}
        />
      </Field>
    </div>
  );
}

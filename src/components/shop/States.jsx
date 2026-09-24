"use client";

import { AlertCircle, PackageSearch } from "lucide-react";

export function ErrorState({ message, onRetry }) {
  return (
    <div className="mt-10 rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
      <AlertCircle className="mx-auto text-red-500" />
      <p className="mt-2 font-semibold text-red-700">Something went wrong</p>
      {message && <p className="mt-1 text-sm text-red-600">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 h-10 rounded-full bg-red-600 px-6 text-sm font-semibold text-white"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, children }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <PackageSearch className="mx-auto text-slate-400" size={36} />
      <p className="mt-3 font-semibold text-slate-800">{title}</p>
      {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
      {children}
    </div>
  );
}

export function SkeletonRail() {
  return (
    <div className="mt-6" aria-hidden="true">
      <div className="mb-3 h-5 w-40 animate-pulse rounded bg-slate-200" />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-40 shrink-0 animate-pulse rounded-2xl bg-white p-2.5 shadow-sm">
            <div className="aspect-square rounded-xl bg-slate-100" />
            <div className="mt-3 h-3 w-3/4 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-1/3 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

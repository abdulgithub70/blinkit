"use client";

import Form from "next/form";
import { Search, X } from "lucide-react";

// Two modes:
//  - uncontrolled (header): submitting navigates to /search?q=...
//  - controlled (search page): pass value/onChange for instant filtering
export default function SearchBar({ value, onChange, autoFocus = false, className = "" }) {
  const controlled = value !== undefined;
  const field = (
    <>
      <Search size={18} className="shrink-0 text-slate-400" />
      <input
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="Search water, tea, snacks…"
        aria-label="Search products"
        {...(controlled ? { value, onChange: (e) => onChange(e.target.value) } : {})}
        className="h-full min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
      />
      {controlled && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 active:bg-slate-100"
        >
          <X size={16} />
        </button>
      )}
    </>
  );
  const shell = `flex h-11 items-center gap-2 rounded-xl bg-white px-3 shadow-sm ${className}`;

  if (controlled) {
    return (
      <form role="search" onSubmit={(e) => e.preventDefault()} className={shell}>
        {field}
      </form>
    );
  }
  return (
    <Form action="/search" role="search" className={shell}>
      {field}
    </Form>
  );
}

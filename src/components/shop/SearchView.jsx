"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCurrentExhibition } from "@/lib/useExhibitions";
import { useCatalog } from "@/lib/useCatalog";
import SearchBar from "./SearchBar";
import ProductList from "@/components/products/ProductList";
import CategoryCard from "./CategoryCard";
import { EmptyState, ErrorState, SkeletonRail } from "./States";

// Instant, client-side search over the products sold at the chosen venue.
export default function SearchView() {
  const [query, setQuery] = useState(useSearchParams().get("q") ?? "");
  const { exhibition } = useCurrentExhibition();
  const { categories, products, loading, error, reload } = useCatalog(exhibition?.id ?? null);

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    const catName = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));
    return products
      .filter((p) => {
        const hay = `${p.name} ${p.description ?? ""} ${catName.get(p.category_id) ?? ""}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
      .sort((a, b) => Number(b.is_available) - Number(a.is_available));
  }, [query, products, categories]);

  const searching = query.trim().length > 0;

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} autoFocus className="border border-slate-200" />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !exhibition || loading ? (
        <SkeletonRail />
      ) : searching ? (
        results.length > 0 ? (
          <>
            <p className="mb-3 mt-4 text-sm text-slate-500">
              {results.length} {results.length === 1 ? "result" : "results"} for “{query.trim()}”
            </p>
            <ProductList products={results} />
          </>
        ) : (
          <EmptyState
            title={`No results for “${query.trim()}”`}
            message="Try a shorter word, like “water” or “tea”."
          />
        )
      ) : (
        <section className="mt-5">
          <h2 className="mb-2 text-lg font-bold">Browse categories</h2>
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-6 md:grid-cols-9">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

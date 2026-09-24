"use client";

import { useMemo } from "react";
import { Bike, Clock } from "lucide-react";
import { FOOD_COURT_CATEGORY_SLUGS } from "@/config/features";
import { useCurrentExhibition } from "@/lib/useExhibitions";
import { useCatalog } from "@/lib/useCatalog";
import { formatPrice } from "@/lib/format";
import { useActiveOffer } from "@/lib/offers";
import CategoryCard from "@/components/shop/CategoryCard";
import ProductRail from "@/components/products/ProductRail";
import { EmptyState, ErrorState, SkeletonRail } from "@/components/shop/States";

export default function HomePage() {
  const { exhibition, exhibitions, loading: exLoading, error: exError } = useCurrentExhibition();
  const { categories, products, loading, error, reload } = useCatalog(exhibition?.id ?? null);
  const offer = useActiveOffer();

  const { featured, rails, foodCourt, uncategorised } = useMemo(() => {
    const foodIds = new Set(
      categories.filter((c) => FOOD_COURT_CATEGORY_SLUGS.includes(c.slug)).map((c) => c.id)
    );
    const byCat = new Map();
    const loose = [];
    for (const p of products) {
      if (p.category_id == null) loose.push(p);
      else byCat.set(p.category_id, [...(byCat.get(p.category_id) ?? []), p]);
    }
    return {
      featured: products.filter((p) => p.is_featured && p.is_available),
      rails: categories
        .filter((c) => !foodIds.has(c.id) && byCat.has(c.id))
        .map((c) => ({ category: c, products: byCat.get(c.id) })),
      foodCourt: products.filter((p) => foodIds.has(p.category_id)),
      uncategorised: loose,
    };
  }, [categories, products]);

  if (exError) return <ErrorState message={exError} onRetry={() => window.location.reload()} />;
  if (!exLoading && exhibitions.length === 0) {
    return (
      <EmptyState
        title="No venues are open for delivery yet"
        message="Please check back soon."
      />
    );
  }
  if (!exhibition || loading) {
    return (
      <>
        <SkeletonRail />
        <SkeletonRail />
      </>
    );
  }
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div>
      {offer && (
        <div className="mb-3 rounded-2xl bg-highlight px-4 py-3 text-sm font-bold text-slate-900">
          🎉 {offer.title} — Get {formatPrice(offer.amount)} OFF
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand-dark">
        <span className="flex items-center gap-1.5">
          {/* Fixed marketing promise, not tied to a specific exhibition's
              estimate — some order types (e.g. food-court, rentals) may take
              longer, and that is shown on the order itself, not here. */}
          <Clock size={16} /> 10–15 min to your stall
        </span>
        <span className="flex items-center gap-1.5">
          <Bike size={16} />
          {Number(exhibition.delivery_fee) > 0
            ? `${formatPrice(exhibition.delivery_fee)} delivery`
            : "Free delivery"}
        </span>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="Nothing on the menu yet"
          message="Products for this venue will show up here."
        />
      ) : (
        <>
          <section className="mt-5">
            <h2 className="mb-2 text-lg font-bold">Shop by category</h2>
            <div className="grid grid-cols-4 gap-1 sm:grid-cols-6 md:grid-cols-9">
              {categories.map((c) => (
                <CategoryCard key={c.id} category={c} />
              ))}
            </div>
          </section>

          <ProductRail title="Quick picks" subtitle="Order in a couple of taps" products={featured} />

          <ProductRail
            title="Food court"
            subtitle="Meals and snacks from participating food-court partners"
            products={foodCourt}
          />

          {rails.map(({ category, products: list }) => (
            <ProductRail
              key={category.id}
              title={category.name}
              products={list}
              href={`/category/${category.slug}`}
            />
          ))}

          <ProductRail title="More items" products={uncategorised} />
        </>
      )}
    </div>
  );
}

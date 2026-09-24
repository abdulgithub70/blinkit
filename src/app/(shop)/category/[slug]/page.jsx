"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useCurrentExhibition } from "@/lib/useExhibitions";
import { useCatalog } from "@/lib/useCatalog";
import ProductList from "@/components/products/ProductList";
import { EmptyState, ErrorState, SkeletonRail } from "@/components/shop/States";

export default function CategoryPage() {
  const { slug } = useParams();
  const { exhibition } = useCurrentExhibition();
  const { categories, products, loading, error, reload } = useCatalog(exhibition?.id ?? null);

  if (!exhibition || loading) return <SkeletonRail />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const category = categories.find((c) => c.slug === slug);
  if (!category) {
    return (
      <EmptyState title="Category not found">
        <Link href="/" className="mt-4 inline-block font-semibold text-brand">
          Back to home
        </Link>
      </EmptyState>
    );
  }

  const list = products.filter((p) => p.category_id === category.id);

  return (
    <div>
      <Link href="/" className="mb-3 inline-flex items-center text-sm font-semibold text-brand">
        <ChevronLeft size={18} /> Home
      </Link>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            aria-current={c.id === category.id ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              c.id === category.id
                ? "bg-brand text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {c.icon} {c.name}
          </Link>
        ))}
      </div>

      <h1 className="mb-3 text-xl font-bold">{category.name}</h1>
      {list.length === 0 ? (
        <EmptyState title={`No ${category.name.toLowerCase()} items right now`} />
      ) : (
        <ProductList products={list} />
      )}
    </div>
  );
}

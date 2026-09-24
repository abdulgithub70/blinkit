"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";

// A titled, horizontally scrolling row of products (quick-commerce style).
export default function ProductRail({ title, subtitle, products, href }) {
  if (!products.length) return null;
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="flex shrink-0 items-center text-sm font-semibold text-brand"
          >
            See all <ChevronRight size={16} />
          </Link>
        )}
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product) => (
          <div key={product.id} className="w-40 shrink-0 snap-start sm:w-44">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

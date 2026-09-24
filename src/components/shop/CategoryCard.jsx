"use client";

import Link from "next/link";

export default function CategoryCard({ category, active = false }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className={`flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center active:scale-95 ${
        active ? "bg-brand-soft" : ""
      }`}
    >
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-3xl">
        {category.icon || "🛒"}
      </span>
      <span className="line-clamp-2 text-xs font-semibold leading-tight text-slate-800">
        {category.name}
      </span>
    </Link>
  );
}

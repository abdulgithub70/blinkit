"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { useCartStore, MAX_QTY } from "@/store/cartStore";
import QuantityStepper from "@/components/shop/QuantityStepper";
import { formatPrice, isRemoteImage } from "@/lib/format";
import { useActiveOffer, applyOffer } from "@/lib/offers";

export default function ProductCard({ product }) {
  // quantity comes straight from the cart so every card, the drawer and the
  // header badge always agree
  const quantity = useCartStore(
    (s) => s.cart.find((p) => p.id === product.id)?.quantity ?? 0
  );
  const addItem = useCartStore((s) => s.addItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const available = product.is_available !== false;
  const offer = useActiveOffer();
  const { price: displayPrice, discounted } = applyOffer(product.price, offer);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-50">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 200px, 45vw"
            unoptimized={isRemoteImage(product.image)}
            className={`object-contain p-2 ${available ? "" : "opacity-40 grayscale"}`}
          />
        ) : (
          <div className="grid h-full place-items-center text-slate-300">
            <Package size={40} />
          </div>
        )}
        {!available && (
          <span className="absolute left-2 top-2 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-white">
            Unavailable
          </span>
        )}
      </div>

      <div className="mt-2 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{product.description}</p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {discounted ? (
          <span className="flex flex-col leading-tight">
            <span className="text-xs font-medium text-slate-400 line-through">
              {formatPrice(product.price)}
            </span>
            <span className="text-sm font-bold text-emerald-700">{formatPrice(displayPrice)}</span>
          </span>
        ) : (
          <span className="text-sm font-bold text-slate-900">{formatPrice(product.price)}</span>
        )}
        {!available ? (
          <span className="text-xs font-medium text-slate-500">Out of stock</span>
        ) : quantity > 0 ? (
          <QuantityStepper
            size="sm"
            quantity={quantity}
            onIncrement={() => addItem(product)}
            onDecrement={() => decrementItem(product.id)}
            disableIncrement={quantity >= MAX_QTY}
          />
        ) : (
          <button
            type="button"
            onClick={() => addItem(product)}
            className="h-9 rounded-full border border-brand px-5 text-sm font-bold text-brand active:bg-brand-soft"
          >
            ADD
          </button>
        )}
      </div>
    </div>
  );
}

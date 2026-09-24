"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { useCartStore, MAX_QTY } from "@/store/cartStore";
import QuantityStepper from "@/components/shop/QuantityStepper";
import { formatPrice, isRemoteImage } from "@/lib/format";
import { useActiveOffer, applyOffer } from "@/lib/offers";

// Read-only by default (the admin order list uses it that way). With
// `editable` it becomes a cart line with a quantity stepper.
export default function CartItem({ item, editable = false }) {
  const addItem = useCartStore((s) => s.addItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  // Called unconditionally (Rules of Hooks) even though only the editable
  // branch below uses it — the read-only branch already shows DB-stored,
  // already-discounted prices from a placed order.
  const offer = useActiveOffer();

  if (!editable) {
    return (
      <div className="border rounded p-2 mb-2 flex justify-between items-center">
        <div>
          <p className="font-semibold">{item.name}</p>
          <p className="text-sm text-gray-600">
            ₹{item.price} x {item.quantity}
          </p>
        </div>
        <p className="font-semibold">₹{item.price * item.quantity}</p>
      </div>
    );
  }

  const { price: unitPrice, discounted } = applyOffer(item.price, offer);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-50">
        {item.image ? (
          <Image
            src={item.image}
            alt=""
            fill
            sizes="56px"
            unoptimized={isRemoteImage(item.image)}
            className="object-contain p-1"
          />
        ) : (
          <div className="grid h-full place-items-center text-slate-300">
            <Package size={22} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</p>
        {item.unavailable ? (
          <p className="text-xs font-medium text-red-600">No longer available</p>
        ) : discounted ? (
          <p className="text-xs text-slate-500">
            <span className="mr-1 text-slate-400 line-through">{formatPrice(item.price)}</span>
            <span className="font-semibold text-emerald-700">{formatPrice(unitPrice)}</span> each
          </p>
        ) : (
          <p className="text-xs text-slate-500">{formatPrice(item.price)} each</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <QuantityStepper
          size="sm"
          quantity={item.quantity}
          onIncrement={() => addItem(item)}
          onDecrement={() => decrementItem(item.id)}
          disableIncrement={item.unavailable || item.quantity >= MAX_QTY}
        />
        <span className="text-sm font-bold text-slate-900">
          {formatPrice(unitPrice * item.quantity)}
        </span>
      </div>
    </div>
  );
}

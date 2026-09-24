import { formatPrice } from "@/lib/format";

export default function BillSummary({ subtotal, deliveryFee, className = "" }) {
  const total = Number(subtotal) + Number(deliveryFee || 0);
  return (
    <dl className={`space-y-1.5 text-sm ${className}`}>
      <div className="flex justify-between text-slate-600">
        <dt>Subtotal</dt>
        <dd>{formatPrice(subtotal)}</dd>
      </div>
      <div className="flex justify-between text-slate-600">
        <dt>Delivery</dt>
        <dd>{Number(deliveryFee) > 0 ? formatPrice(deliveryFee) : "Free"}</dd>
      </div>
      <div className="flex justify-between border-t border-dashed pt-2 text-base font-bold text-slate-900">
        <dt>Total</dt>
        <dd>{formatPrice(total)}</dd>
      </div>
    </dl>
  );
}

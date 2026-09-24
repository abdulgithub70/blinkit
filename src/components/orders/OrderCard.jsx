import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "./OrderStatus";
import { formatDateTime, formatPrice, orderLabel } from "@/lib/format";

// Summary row for the "My orders" list.
export default function OrderCard({ order }) {
  const items = order.order_items ?? [];
  const names = items.slice(0, 2).map((i) => `${i.quantity}× ${i.name}`);
  const more = items.length - names.length;
  const where = [order.hall_no, order.stall_number && `Stall ${order.stall_number}`]
    .filter(Boolean)
    .join(" • ");

  return (
    <Link
      href={`/order/${order.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-slate-900">Order #{orderLabel(order.order_number)}</p>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
        {names.join(", ")}
        {more > 0 ? ` +${more} more` : ""}
      </p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>
          {formatDateTime(order.created_at)}
          {where ? ` · ${where}` : ""}
        </span>
        <span className="flex items-center font-bold text-slate-900">
          {formatPrice(order.total_price)} <ChevronRight size={16} className="text-slate-400" />
        </span>
      </div>
    </Link>
  );
}

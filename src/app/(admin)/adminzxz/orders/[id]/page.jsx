"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ORDER_STATUSES, CANCELLED, statusLabel, statusTone } from "@/lib/orderStatus";
import { formatDateTime, formatPrice, orderLabel } from "@/lib/format";

const NEXT_STATUS = {
  placed: "received",
  received: "preparing",
  preparing: "ready",
  ready: "out_for_delivery",
  out_for_delivery: "delivered",
};

export default function AdminOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [state, setState] = useState({ order: null, loading: true, error: null });
  const [updating, setUpdating] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, exhibitions(name)")
      .eq("id", id)
      .maybeSingle();
    if (error) setState({ order: null, loading: false, error: error.message });
    else setState({ order: data, loading: false, error: data ? null : "Order not found" });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = useCallback(
    async (status) => {
      setUpdating(status);
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) alert(error.message);
      else await load();
      setUpdating(null);
    },
    [id, load]
  );

  const next = useMemo(() => (state.order ? NEXT_STATUS[state.order.status] : null), [state.order]);
  const isFinal = state.order && !["placed", "received", "preparing", "ready", "out_for_delivery"].includes(state.order.status);

  if (state.loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }
  if (state.error || !state.order) {
    return <p className="rounded-xl bg-red-50 p-4 text-red-700">{state.error || "Order not found"}</p>;
  }

  const o = state.order;
  const where = [o.exhibitions?.name, o.hall_no, o.stall_number && `Stall ${o.stall_number}`].filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => router.push("/adminzxz/orders")}
        className="mb-3 flex items-center text-sm font-semibold text-brand"
      >
        <ChevronLeft size={18} /> All orders
      </button>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Order #{orderLabel(o.order_number)}</h1>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(o.status)}`}>
          {statusLabel(o.status)}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">Placed {formatDateTime(o.created_at)}</p>

      <section className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">Customer</h2>
        <p className="text-sm">{o.name} · {o.phone}</p>
        <p className="mt-1 text-sm text-slate-600">{where.join(" • ")}</p>
        {o.stall_name && <p className="text-sm text-slate-600">{o.stall_name}</p>}
        {o.delivery_instructions && (
          <p className="mt-1 text-sm italic text-slate-500">“{o.delivery_instructions}”</p>
        )}
      </section>

      <section className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">Items</h2>
        <ul className="divide-y">
          {(o.order_items ?? []).map((item) => (
            <li key={item.id} className="flex justify-between py-2 text-sm">
              <span>{item.quantity} × {item.name}</span>
              <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span> <span>{formatPrice(o.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Delivery</span> <span>{formatPrice(o.delivery_fee)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span> <span>{formatPrice(o.total_price)}</span>
          </div>
        </div>
      </section>

      {!isFinal && (
        <div className="mt-4 flex flex-wrap gap-2">
          {next && (
            <button
              type="button"
              disabled={Boolean(updating)}
              onClick={() => updateStatus(next)}
              className="h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {updating === next ? "Updating…" : `Mark as ${statusLabel(next)}`}
            </button>
          )}
          <button
            type="button"
            disabled={Boolean(updating)}
            onClick={() => {
              if (confirm("Cancel this order?")) updateStatus(CANCELLED);
            }}
            className="h-11 rounded-xl border border-red-200 px-5 text-sm font-bold text-red-600 disabled:opacity-50"
          >
            {updating === CANCELLED ? "Cancelling…" : "Cancel order"}
          </button>
        </div>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-500">
          Set status manually
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {[...ORDER_STATUSES.map((s) => s.key), CANCELLED].map((key) => (
            <button
              key={key}
              type="button"
              disabled={Boolean(updating) || key === o.status}
              onClick={() => updateStatus(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${statusTone(key)}`}
            >
              {statusLabel(key)}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

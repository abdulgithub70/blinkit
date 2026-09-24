"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useMyOrdersStore } from "@/store/myOrdersStore";
import { TERMINAL_STATUSES } from "@/lib/orderStatus";
import { UUID_RE, formatPrice, orderLabel } from "@/lib/format";
import OrderStatus, { StatusBadge } from "./OrderStatus";
import BillSummary from "@/components/cart/BillSummary";
import { ErrorState, EmptyState } from "@/components/shop/States";

const POLL_MS = 10_000;

// Order confirmation + live tracking. Guests cannot read the orders table, so
// this asks the database for exactly this order by its (unguessable) id.
export default function OrderView({ id }) {
  const justPlaced = useSearchParams().get("placed") === "1";
  const addOrder = useMyOrdersStore((s) => s.addOrder);
  const [state, setState] = useState({ order: null, loading: true, error: null });

  const load = useCallback(async () => {
    if (!UUID_RE.test(id)) {
      setState({ order: null, loading: false, error: null });
      return;
    }
    const { data, error } = await supabase.rpc("get_orders_by_ids", { p_ids: [id] });
    if (error) {
      // keep showing the last good data if a background refresh fails
      setState((s) => ({ ...s, loading: false, error: s.order ? null : error.message }));
      return;
    }
    const order = Array.isArray(data) ? data[0] ?? null : null;
    if (order) addOrder(id);
    setState({ order, loading: false, error: null });
  }, [id, addOrder]);

  useEffect(() => {
    load();
  }, [load]);

  const status = state.order?.status;
  const done = status ? TERMINAL_STATUSES.includes(status) : false;

  // Refresh every 10s while the order is live and the tab is visible.
  useEffect(() => {
    if (!state.order || done) return;
    const tick = () => document.visibilityState === "visible" && load();
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [state.order, done, load]);

  if (state.loading) {
    return <div className="mt-10 h-64 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  }
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;
  if (!state.order) {
    return (
      <EmptyState
        title="We couldn't find this order"
        message="Check the link, or open it on the phone you ordered from."
      >
        <Link href="/" className="mt-4 inline-block font-semibold text-brand">
          Back to shopping
        </Link>
      </EmptyState>
    );
  }

  const o = state.order;
  const items = o.order_items ?? [];
  const where = [o.exhibition_name, o.hall_no, o.stall_number && `Stall ${o.stall_number}`]
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {justPlaced && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="shrink-0" size={28} />
          <div>
            <p className="font-bold">Order placed successfully</p>
            <p className="text-sm">We&apos;ll bring it to your stall. Keep this page open to follow it.</p>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold">Order #{orderLabel(o.order_number)}</h1>
          <StatusBadge status={o.status} />
        </div>
        {!done && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
            <Clock size={16} className="text-brand" />
            Estimated delivery: {o.est_delivery_min}–{o.est_delivery_max} minutes
          </p>
        )}
        <div className="mt-5">
          <OrderStatus status={o.status} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 flex items-center gap-1.5 font-bold">
          <MapPin size={18} className="text-brand" /> Delivering to
        </h2>
        <p className="text-sm text-slate-800">{where.join(" • ")}</p>
        {o.stall_name && <p className="text-sm text-slate-600">{o.stall_name}</p>}
        {o.delivery_instructions && (
          <p className="mt-1 text-sm text-slate-500">“{o.delivery_instructions}”</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">Items</h2>
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-2 text-sm">
              <span className="text-slate-800">
                {item.quantity} × {item.name}
              </span>
              <span className="shrink-0 font-semibold">
                {formatPrice(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <BillSummary subtotal={o.subtotal} deliveryFee={o.delivery_fee} className="mt-3" />
      </section>

      <p className="text-center text-sm text-slate-500">
        Need help?{" "}
        <Link href="/contactus" className="font-semibold text-brand">
          Contact support
        </Link>
      </p>
    </div>
  );
}

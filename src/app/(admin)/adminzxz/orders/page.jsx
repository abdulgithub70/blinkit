"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ORDER_STATUSES, CANCELLED, statusLabel, statusTone } from "@/lib/orderStatus";
import { formatDateTime, formatPrice, orderLabel } from "@/lib/format";

const FILTERS = [{ key: "all", label: "All" }, ...ORDER_STATUSES, { key: CANCELLED, label: "Cancelled" }];
const PAGE_SIZE = 30;

function OrdersList() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status") || "all";
  const [state, setState] = useState({ orders: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    let query = supabase
      .from("orders")
      .select(
        "id,order_number,name,phone,hall_no,stall_number,total_price,status,created_at,exhibitions(name)"
      )
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) setState({ orders: [], loading: false, error: error.message });
    else setState({ orders: data ?? [], loading: false, error: null });
  }, [status]);

  useEffect(() => {
    load();
    // Poll for new orders every 15s so the admin doesn't have to refresh by hand.
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Orders</h1>

      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => router.push(f.key === "all" ? "/adminzxz/orders" : `/adminzxz/orders?status=${f.key}`)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              status === f.key ? "bg-slate-900 text-white" : "border bg-white text-slate-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {state.error ? (
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{state.error}</p>
      ) : state.loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : state.orders.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-500">
          No orders here.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Order</th>
                <th className="hidden px-4 py-2.5 sm:table-cell">Customer</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Location</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="hidden px-4 py-2.5 lg:table-cell">Placed</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    <Link href={`/adminzxz/orders/${o.id}`}>#{orderLabel(o.order_number)}</Link>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {o.name}
                    <div className="text-xs text-slate-500">{o.phone}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                    {o.exhibitions?.name}
                    <div className="text-xs text-slate-500">
                      {[o.hall_no, o.stall_number].filter(Boolean).join(" • ")}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(o.total_price)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusTone(o.status)}`}>
                      {statusLabel(o.status)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                    {formatDateTime(o.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/adminzxz/orders/${o.id}`}>
                      <ChevronRight size={18} className="text-slate-400" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersList />
    </Suspense>
  );
}

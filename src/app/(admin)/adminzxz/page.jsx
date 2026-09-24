"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";

const CARDS = [
  { key: "placed", label: "New orders", tone: "bg-teal-50 text-teal-700" },
  { key: "received", label: "Received", tone: "bg-sky-50 text-sky-700" },
  { key: "preparing", label: "Preparing", tone: "bg-amber-50 text-amber-700" },
  { key: "ready", label: "Ready", tone: "bg-amber-50 text-amber-700" },
  { key: "out_for_delivery", label: "Out for delivery", tone: "bg-indigo-50 text-indigo-700" },
  { key: "delivered_today", label: "Delivered today", tone: "bg-emerald-50 text-emerald-700" },
  { key: "cancelled_today", label: "Cancelled today", tone: "bg-red-50 text-red-700" },
];

export default function AdminDashboard() {
  const [state, setState] = useState({ stats: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase.rpc("admin_order_stats");
    if (error) setState({ stats: null, loading: false, error: error.message });
    else setState({ stats: data, loading: false, error: null });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
        >
          <RefreshCw size={14} className={state.loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {state.error ? (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-700">
          <AlertCircle size={18} /> {state.error}
        </div>
      ) : state.loading && !state.stats ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CARDS.map((c) => (
              <div key={c.key} className={`rounded-2xl p-4 ${c.tone}`}>
                <p className="text-2xl font-extrabold">{state.stats?.[c.key] ?? 0}</p>
                <p className="text-sm font-medium">{c.label}</p>
              </div>
            ))}
            <div className="rounded-2xl bg-slate-900 p-4 text-white">
              <p className="text-2xl font-extrabold">{formatPrice(state.stats?.today_sales)}</p>
              <p className="text-sm font-medium text-white/70">Today&apos;s sales</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-2xl font-extrabold text-slate-900">{state.stats?.today_orders ?? 0}</p>
              <p className="text-sm font-medium text-slate-500">Today&apos;s orders</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/adminzxz/orders?status=placed"
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white"
            >
              View new orders
            </Link>
            <Link
              href="/adminzxz/products"
              className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              Manage products
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

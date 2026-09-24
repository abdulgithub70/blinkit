"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useMyOrdersStore } from "@/store/myOrdersStore";
import { useDeliveryStore } from "@/store/deliveryStore";
import { useMounted } from "@/lib/useMounted";
import OrderCard from "@/components/orders/OrderCard";
import { EmptyState, ErrorState } from "@/components/shop/States";

export default function OrdersPage() {
  const mounted = useMounted();
  const ids = useMyOrdersStore((s) => s.ids);
  const resetDelivery = useDeliveryStore((s) => s.resetDelivery);
  const idsKey = ids.join(",");
  const [state, setState] = useState({ orders: [], loading: true, error: null });

  const load = useCallback(async () => {
    if (!idsKey) {
      setState({ orders: [], loading: false, error: null });
      return;
    }
    const { data, error } = await supabase.rpc("get_orders_by_ids", { p_ids: idsKey.split(",") });
    if (error) setState({ orders: [], loading: false, error: error.message });
    else setState({ orders: Array.isArray(data) ? data : [], loading: false, error: null });
  }, [idsKey]);

  useEffect(() => {
    if (mounted) load();
  }, [mounted, load]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">My orders</h1>
        {ids.length > 0 && (
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1 text-sm font-semibold text-brand"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {!mounted || state.loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={load} />
      ) : state.orders.length === 0 ? (
        <EmptyState
          title="No orders on this device yet"
          message="Orders you place here will show up so you can track them."
        >
          <Link href="/" className="mt-4 inline-block font-semibold text-brand">
            Start shopping
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {state.orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}

      <div className="mt-10 border-t pt-4 text-center text-xs text-slate-500">
        <p>Your name, phone number and stall are remembered on this device for faster checkout.</p>
        <button
          type="button"
          onClick={resetDelivery}
          className="mt-1 font-semibold text-slate-700 underline"
        >
          Clear saved details
        </button>
      </div>
    </div>
  );
}

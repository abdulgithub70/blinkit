"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { invalidateOfferCache } from "@/lib/offers";
import { formatPrice } from "@/lib/format";
import Modal from "@/components/admin/Modal";
import FormField, { fieldClass } from "@/components/admin/FormField";

const EMPTY = { id: null, title: "", amount: "" };

// Fixed-amount offers only (never a percentage) — e.g. "First Day Special,
// ₹50 off". At most one offer can be active at a time; the database enforces
// this, so switching one on here first switches every other one off.
export default function OffersPage() {
  const [state, setState] = useState({ offers: [], loading: true, error: null });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("offers")
      .select("id,title,amount,is_active,created_at")
      .order("created_at", { ascending: false });
    if (error) setState({ offers: [], loading: false, error: error.message });
    else setState({ offers: data ?? [], loading: false, error: null });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e) {
    e.preventDefault();
    const amount = Number(editing.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a discount amount greater than ₹0.");
      return;
    }
    setSaving(true);
    const payload = { title: editing.title.trim(), amount };
    const { error } = editing.id
      ? await supabase.from("offers").update(payload).eq("id", editing.id)
      : await supabase.from("offers").insert(payload);
    setSaving(false);
    if (error) return alert(error.message);
    invalidateOfferCache();
    setEditing(null);
    load();
  }

  // Turning one on switches every other one off first, so the database's
  // "only one active offer" rule never rejects this from the UI.
  async function activate(offer) {
    setBusyId(offer.id);
    const { error: offErr } = await supabase
      .from("offers")
      .update({ is_active: false })
      .neq("id", offer.id);
    const { error: onErr } = offErr
      ? { error: offErr }
      : await supabase.from("offers").update({ is_active: true }).eq("id", offer.id);
    setBusyId(null);
    if (onErr) return alert(onErr.message);
    invalidateOfferCache();
    load();
  }

  async function deactivate(offer) {
    setBusyId(offer.id);
    const { error } = await supabase.from("offers").update({ is_active: false }).eq("id", offer.id);
    setBusyId(null);
    if (error) return alert(error.message);
    invalidateOfferCache();
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Offers</h1>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY })}
          className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-bold text-white"
        >
          <Plus size={16} /> New offer
        </button>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Fixed rupee amounts only — e.g. ₹50 off. Percentage discounts aren&apos;t supported. Only
        one offer can be live at a time; activating one switches the rest off automatically.
      </p>

      {state.error ? (
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{state.error}</p>
      ) : state.loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : state.offers.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-500">
          No offers yet.
        </p>
      ) : (
        <div className="space-y-2">
          {state.offers.map((o) => (
            <div key={o.id} className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{o.title}</p>
                <p className="text-sm text-slate-500">{formatPrice(o.amount)} off</p>
              </div>
              <button
                type="button"
                disabled={busyId === o.id}
                onClick={() => (o.is_active ? deactivate(o) : activate(o))}
                className={`rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50 ${
                  o.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {o.is_active ? "Live" : "Turn on"}
              </button>
              <button
                type="button"
                onClick={() => setEditing({ id: o.id, title: o.title, amount: String(o.amount) })}
                aria-label={`Edit ${o.title}`}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500 active:bg-slate-100"
              >
                <Pencil size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? "Edit offer" : "New offer"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <FormField label="Title" hint="Shown to customers, e.g. “First Day Special”">
              <input
                required
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className={fieldClass}
              />
            </FormField>
            <FormField label="Discount amount (₹)" hint="A flat rupee amount off — not a percentage">
              <input
                required
                type="number"
                min="1"
                step="1"
                value={editing.amount}
                onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                className={fieldClass}
              />
            </FormField>
            <button
              type="submit"
              disabled={saving}
              className="h-11 w-full rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

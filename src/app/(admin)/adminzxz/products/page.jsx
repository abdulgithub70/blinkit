"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, Package, Pencil, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatPrice, isRemoteImage } from "@/lib/format";
import Modal from "@/components/admin/Modal";
import FormField, { fieldClass } from "@/components/admin/FormField";

const EMPTY = {
  id: null,
  name: "",
  description: "",
  price: "",
  image: "",
  category_id: "",
  exhibition_id: "",
  is_available: true,
  is_featured: false,
  offer_eligible: false,
};

export default function ProductsPage() {
  const [state, setState] = useState({ products: [], categories: [], exhibitions: [], loading: true, error: null });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");

  const load = useCallback(async () => {
    const [prods, cats, exs] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id,name,description,price,image,category_id,exhibition_id,is_available,is_featured,offer_eligible"
        )
        .order("name"),
      supabase.from("categories").select("id,name").order("name"),
      supabase.from("exhibitions").select("id,name").order("name"),
    ]);
    const error = prods.error || cats.error || exs.error;
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return;
    }
    setState({
      products: prods.data ?? [],
      categories: cats.data ?? [],
      exhibitions: exs.data ?? [],
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryName = useMemo(
    () => new Map(state.categories.map((c) => [c.id, c.name])),
    [state.categories]
  );
  const visible = filterCategory
    ? state.products.filter((p) => String(p.category_id) === filterCategory)
    : state.products;

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: editing.name.trim(),
      description: editing.description.trim() || null,
      price: Number(editing.price),
      image: editing.image.trim() || null,
      category_id: editing.category_id ? Number(editing.category_id) : null,
      exhibition_id: editing.exhibition_id || null,
      is_available: editing.is_available,
      is_featured: editing.is_featured,
      offer_eligible: editing.offer_eligible,
    };
    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return alert(error.message);
    setEditing(null);
    load();
  }

  async function toggleAvailable(p) {
    const { error } = await supabase
      .from("products")
      .update({ is_available: !p.is_available })
      .eq("id", p.id);
    if (error) alert(error.message);
    else load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Products</h1>
        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-2 text-sm"
          >
            <option value="">All categories</option>
            {state.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setEditing({ ...EMPTY })}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-bold text-white"
          >
            <Plus size={16} /> Add product
          </button>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{state.error}</p>
      ) : state.loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <div key={p.id} className="flex gap-3 rounded-xl border bg-white p-3 shadow-sm">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt=""
                    fill
                    sizes="64px"
                    unoptimized={isRemoteImage(p.image)}
                    className="object-contain p-1"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-slate-300">
                    <Package size={22} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-semibold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-400">{categoryName.get(p.category_id) ?? "Uncategorised"}</p>
                <p className="font-bold">{formatPrice(p.price)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleAvailable(p)}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    p.is_available ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {p.is_available ? "Available" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      ...p,
                      description: p.description ?? "",
                      image: p.image ?? "",
                      category_id: p.category_id ?? "",
                      exhibition_id: p.exhibition_id ?? "",
                    })
                  }
                  aria-label={`Edit ${p.name}`}
                  className="grid h-8 w-8 place-items-center rounded-full text-slate-500 active:bg-slate-100"
                >
                  <Pencil size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? "Edit product" : "New product"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <FormField label="Name">
              <input
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className={fieldClass}
              />
            </FormField>
            <FormField label="Description" hint="Optional — size, pack, etc.">
              <input
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className={fieldClass}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Price (₹)">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                  className={fieldClass}
                />
              </FormField>
              <FormField label="Category">
                <select
                  value={editing.category_id}
                  onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}
                  className={fieldClass}
                >
                  <option value="">Uncategorised</option>
                  {state.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <FormField label="Image URL" hint="Upload elsewhere (e.g. Cloudinary) and paste the link">
              <input
                value={editing.image}
                onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                placeholder="https://…"
                className={fieldClass}
              />
            </FormField>
            <FormField label="Sold at" hint="Leave as “All venues” unless this item is exhibition-specific">
              <select
                value={editing.exhibition_id}
                onChange={(e) => setEditing({ ...editing, exhibition_id: e.target.value })}
                className={fieldClass}
              >
                <option value="">All venues</option>
                {state.exhibitions.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="flex gap-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editing.is_available}
                  onChange={(e) => setEditing({ ...editing, is_available: e.target.checked })}
                />
                Available
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editing.is_featured}
                  onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
                />
                Show in Quick picks
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editing.offer_eligible}
                  onChange={(e) => setEditing({ ...editing, offer_eligible: e.target.checked })}
                />
                Eligible for offer
              </label>
            </div>
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

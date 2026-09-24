"use client";

import { useCallback, useEffect, useState } from "react";
import { GripVertical, Loader2, Pencil, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/admin/Modal";
import FormField, { fieldClass } from "@/components/admin/FormField";

const EMPTY = { id: null, name: "", slug: "", icon: "", is_active: true, sort_order: 0 };

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function CategoriesPage() {
  const [state, setState] = useState({ categories: [], loading: true, error: null });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,icon,is_active,sort_order")
      .order("sort_order")
      .order("name");
    if (error) setState({ categories: [], loading: false, error: error.message });
    else setState({ categories: data ?? [], loading: false, error: null });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: editing.name.trim(),
      slug: editing.slug.trim() || slugify(editing.name),
      icon: editing.icon.trim() || null,
      is_active: editing.is_active,
      sort_order: Number(editing.sort_order) || 0,
    };
    const { error } = editing.id
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);
    setSaving(false);
    if (error) return alert(error.message);
    setEditing(null);
    load();
  }

  async function toggleActive(cat) {
    const { error } = await supabase
      .from("categories")
      .update({ is_active: !cat.is_active })
      .eq("id", cat.id);
    if (error) alert(error.message);
    else load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Categories</h1>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY, sort_order: state.categories.length + 1 })}
          className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-bold text-white"
        >
          <Plus size={16} /> Add category
        </button>
      </div>

      {state.error ? (
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{state.error}</p>
      ) : state.loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {state.categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm"
            >
              <GripVertical size={16} className="shrink-0 text-slate-300" />
              <span className="text-xl">{c.icon || "🛒"}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-400">/{c.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(c)}
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {c.is_active ? "Active" : "Hidden"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(c)}
                aria-label={`Edit ${c.name}`}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500 active:bg-slate-100"
              >
                <Pencil size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? "Edit category" : "New category"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <FormField label="Name">
              <input
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className={fieldClass}
              />
            </FormField>
            <FormField label="Slug" hint="Used in the URL — leave blank to auto-generate">
              <input
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder={slugify(editing.name) || "auto"}
                className={fieldClass}
              />
            </FormField>
            <FormField label="Icon" hint="An emoji, e.g. 🥤">
              <input
                value={editing.icon}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                maxLength={4}
                className={fieldClass}
              />
            </FormField>
            <FormField label="Sort order">
              <input
                type="number"
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })}
                className={fieldClass}
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              Visible to customers
            </label>
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

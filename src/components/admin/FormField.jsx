export const fieldClass =
  "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function FormField({ label, children, hint }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

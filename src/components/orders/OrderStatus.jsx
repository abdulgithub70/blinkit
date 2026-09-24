import { Check, XCircle } from "lucide-react";
import { ORDER_STATUSES, CANCELLED, statusIndex, statusLabel, statusTone } from "@/lib/orderStatus";

export function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

// Vertical progress tracker for the customer.
export default function OrderStatus({ status }) {
  if (status === CANCELLED) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
        <XCircle className="mt-0.5 shrink-0" size={22} />
        <div>
          <p className="font-bold">Order cancelled</p>
          <p className="text-sm">
            If you did not ask for this, please contact support and we will sort it out.
          </p>
        </div>
      </div>
    );
  }

  const current = statusIndex(status);
  return (
    <ol className="space-y-0">
      {ORDER_STATUSES.map((step, i) => {
        const done = i < current || status === "delivered";
        const isCurrent = i === current && status !== "delivered";
        const last = i === ORDER_STATUSES.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span
                className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${
                  done ? "bg-brand" : "bg-slate-200"
                }`}
                aria-hidden="true"
              />
            )}
            <span
              className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 ${
                done
                  ? "border-brand bg-brand text-white"
                  : isCurrent
                  ? "border-brand bg-white"
                  : "border-slate-200 bg-white"
              }`}
              aria-hidden="true"
            >
              {done ? (
                <Check size={16} />
              ) : isCurrent ? (
                <span className="h-3 w-3 animate-pulse rounded-full bg-brand" />
              ) : null}
            </span>
            <div className="pt-1" aria-current={isCurrent ? "step" : undefined}>
              <p
                className={`text-sm font-semibold leading-tight ${
                  done || isCurrent ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {step.label}
              </p>
              {isCurrent && <p className="text-xs text-slate-500">{step.hint}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

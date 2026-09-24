// Customer-facing order flow. Keys must match orders.status in the database.
export const ORDER_STATUSES = [
  { key: "placed", label: "Order placed", hint: "We have your order" },
  { key: "received", label: "Order received", hint: "Our team has accepted it" },
  { key: "preparing", label: "Preparing", hint: "Your items are being packed" },
  { key: "ready", label: "Ready for delivery", hint: "Waiting for a delivery partner" },
  { key: "out_for_delivery", label: "Out for delivery", hint: "On the way to your stall" },
  { key: "delivered", label: "Delivered", hint: "Enjoy!" },
];

export const CANCELLED = "cancelled";
export const TERMINAL_STATUSES = ["delivered", CANCELLED];

export function statusIndex(key) {
  return ORDER_STATUSES.findIndex((s) => s.key === key);
}

export function statusLabel(key) {
  if (key === CANCELLED) return "Cancelled";
  return ORDER_STATUSES.find((s) => s.key === key)?.label ?? key;
}

export function statusTone(key) {
  if (key === CANCELLED) return "bg-red-50 text-red-700";
  if (key === "delivered") return "bg-emerald-50 text-emerald-700";
  if (key === "out_for_delivery") return "bg-amber-50 text-amber-700";
  return "bg-teal-50 text-teal-700";
}

import { Suspense } from "react";
import OrderView from "@/components/orders/OrderView";

export const metadata = { title: "Your order" };

export default async function OrderPage({ params }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <OrderView id={id} />
    </Suspense>
  );
}

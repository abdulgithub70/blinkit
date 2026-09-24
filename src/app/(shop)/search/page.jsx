import { Suspense } from "react";
import SearchView from "@/components/shop/SearchView";

export const metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}

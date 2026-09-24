"use client"; // mandatory for client component rendering

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Dynamic import for client-side only, disable SSR
const Services = dynamic(() => import("@/components/profiles/services"), { ssr: false });

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center mt-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
          <p className="text-sm text-gray-500">Loading Services...</p>
        </div>
      }
    >
      <Services />
    </Suspense>
  );
}

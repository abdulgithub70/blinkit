"use client";

import { useAuthGuard } from "@/lib/useAuthGuard";
import AdminShell from "@/components/admin/AdminShell";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }) {
  const { loading, authorized } = useAuthGuard(["admin"], "/login");

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        <p className="text-sm text-slate-500">Checking access…</p>
      </div>
    );
  }

  // useAuthGuard already redirects unauthorized users; this avoids a flash
  // of admin UI while that redirect is in flight.
  if (!authorized) return null;

  return <AdminShell>{children}</AdminShell>;
}

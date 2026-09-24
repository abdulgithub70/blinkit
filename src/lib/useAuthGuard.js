"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Gates a client page behind Supabase auth + a role stored in `users_register`.
 *
 * IMPORTANT: this only controls what the UI *shows*. It is not a security
 * boundary by itself — a user could still call the Supabase REST API
 * directly with the anon key. The real enforcement has to live in
 * Postgres Row Level Security policies (see supabase/migrations/ in this
 * project). This hook exists so legitimate users get a clean redirect
 * instead of a blank/broken page, and so admin-only UI doesn't even
 * attempt to render for non-admins.
 *
 * @param {string[]} allowedRoles - roles from users_register.role allowed to view the page
 * @param {string} redirectTo - where to send unauthorized/unauthenticated users
 */
export function useAuthGuard(allowedRoles, redirectTo = "/login") {
  const router = useRouter();
  const [state, setState] = useState({
    loading: true,
    authorized: false,
    user: null,
    role: null,
  });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setState({ loading: false, authorized: false, user: null, role: null });
          router.replace(redirectTo);
        }
        return;
      }

      const { data: registration, error } = await supabase
        .from("users_register")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = registration?.role ?? null;
      const authorized = !error && role && allowedRoles.includes(role);

      if (!cancelled) {
        setState({ loading: false, authorized, user, role });
        if (!authorized) {
          router.replace(redirectTo);
        }
      }
    };

    check();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

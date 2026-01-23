import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing supabase env");

  return createServerClient(url, anon, {
    cookies: {
      get: (name) => cookies().get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  });
}

export async function requireSessionUser() {
  const supabase = serverSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error("Not authenticated");
  return { supabase, user: data.user };
}

export async function requireOrgAdminRoute(orgId) {
  const { supabase, user } = await requireSessionUser();

  const { data: m, error } = await supabase
    .from("org_memberships")
    .select("role,is_active")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!m || m.is_active === false) throw new Error("No org access");
  if (!["owner", "admin"].includes(m.role)) throw new Error("Admins only");

  return { supabase, user };
}

/** Backward-compat alias (optional) */
export const requireOrgAdmin = ({ orgId }) => requireOrgAdminRoute(orgId);

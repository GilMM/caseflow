// src/lib/auth/requireOrgAdminRoute.js
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function createSupabaseRouteClient() {
  const url = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = mustEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // Next App Router: cookies() מחזיר cookieStore לקריאה
  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set() {
        // Route handlers כאן לא צריכים לכתוב cookies
      },
      remove() {
        // no-op
      },
    },
  });
}

export async function requireSessionUserRoute() {
  const supabase = await createSupabaseRouteClient();

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) {
    // זה בדיוק “Auth session missing!” כשאין cookies של סשן בדומיין הזה
    const e = new Error("Auth session missing!");
    e.status = 400;
    throw e;
  }

  return { supabase, user: data.user };
}

export async function requireOrgAdminRoute(orgId) {
  if (!orgId) throw new Error("Missing orgId");

  const { supabase, user } = await requireSessionUserRoute();

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

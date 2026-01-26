// src/lib/auth/requireOrgAdminRoute.js
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function createSupabaseRouteClient() {
  const url = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = mustEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

function getBearerTokenFromReq(req) {
  const h = req?.headers?.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

/**
 * ✅ Try cookies session first.
 * ✅ If missing, fallback to Authorization: Bearer <access_token>
 */
export async function requireSessionUserRoute(req) {
  // 1) cookies-based
  const supabase = await createSupabaseRouteClient();
  const { data, error } = await supabase.auth.getUser();

  if (!error && data?.user) {
    return { supabase, user: data.user };
  }

  // 2) bearer fallback
  const token = getBearerTokenFromReq(req);
  if (!token) {
    const e = new Error("Auth session missing!");
    e.status = 401;
    throw e;
  }

  const admin = supabaseAdmin();
  const { data: u, error: uErr } = await admin.auth.getUser(token);

  if (uErr || !u?.user) {
    const e = new Error("Auth session missing!");
    e.status = 401;
    throw e;
  }

  // Note: we still return `supabase` for queries with RLS (membership check)
  return { supabase, user: u.user };
}

export async function requireOrgAdminRoute(req, orgId) {
  const cleanOrgId = String(orgId || "").trim();
  if (!cleanOrgId) throw new Error("Missing orgId");

  const { supabase, user } = await requireSessionUserRoute(req);

  const { data: m, error } = await supabase
    .from("org_memberships")
    .select("role,is_active")
    .eq("org_id", cleanOrgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!m || m.is_active === false) throw new Error("No org access");
  if (!["owner", "admin"].includes(m.role)) throw new Error("Admins only");

  return { supabase, user };
}

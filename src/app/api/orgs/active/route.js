// src/app/api/orgs/active/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function createSupabaseRouteClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // Route handlers here don't need to write cookies
        },
        remove() {
          // no-op
        },
      },
    }
  );
}

export async function POST(req) {
  try {
    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const orgId = body?.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    // validate membership
    const { data: mem, error: memErr } = await supabase
      .from("org_memberships")
      .select("org_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (memErr) throw memErr;
    if (!mem?.org_id) {
      return NextResponse.json(
        { error: "Not a member of this org" },
        { status: 403 }
      );
    }

    // persist active org
    const { error: upErr } = await supabase
      .from("user_workspaces")
      .upsert(
        { user_id: user.id, active_org_id: orgId, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (upErr) throw upErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}

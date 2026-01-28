// src/app/api/audit/log/route.js
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { orgId, entityType, entityId, action, changes } = body || {};

    if (!orgId || !entityType || !entityId || !action) {
      return NextResponse.json({ error: "Missing audit fields" }, { status: 400 });
    }

    // actor = current logged in user (from cookies/session)
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    const actorUserId = data?.user?.id || null;

    const admin = supabaseAdmin();
    const { error } = await admin.from("audit_log").insert({
      org_id: orgId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor_user_id: actorUserId,
      changes: changes || {},
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Audit error" }, { status: 500 });
  }
}

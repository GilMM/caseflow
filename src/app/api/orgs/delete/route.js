// src/app/api/orgs/delete/route.js
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req) {
  try {
    // ✅ חשוב: await
    const supabase = await createServerSupabaseClient();

    // ✅ חשוב: לקרוא לפונקציה כדי לקבל client
    const admin = supabaseAdmin();

    // ✅ המשתמש המחובר (מה-cookies)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const orgId = body?.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    // ✅ בדיקת בעלות (owner) — לפי organizations.owner_user_id
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .select("id, owner_user_id, deleted_at")
      .eq("id", orgId)
      .maybeSingle();

    if (orgErr) throw orgErr;
    if (!org?.id) {
      return NextResponse.json({ error: "Org not found" }, { status: 404 });
    }
    if (org.deleted_at) {
      return NextResponse.json({ error: "Org already deleted" }, { status: 400 });
    }
    if (org.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Only owner can delete org" }, { status: 403 });
    }

    // ✅ Soft delete
    const { error: delErr } = await admin
      .from("organizations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", orgId);

    if (delErr) throw delErr;

    // ✅ אם זה הארגון הפעיל של המשתמש — לנקות active_org_id
    await admin
      .from("user_workspaces")
      .update({ active_org_id: null, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("active_org_id", orgId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to delete organization" },
      { status: 500 }
    );
  }
}

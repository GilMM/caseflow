import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const orgId = body?.orgId;

    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    await requireOrgAdminRoute(orgId);

    const admin = supabaseAdmin();

    await admin.from("org_google_connections").delete().eq("org_id", orgId);

    // optional: clear integration script id/url so you can reinstall cleanly
    await admin
      .from("org_google_sheets_integrations")
      .update({ script_id: null, script_url: null, updated_at: new Date().toISOString() })
      .eq("org_id", orgId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

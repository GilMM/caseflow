import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const orgId = body?.orgId;

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    await requireOrgAdminRoute(req, orgId);

    const admin = supabaseAdmin();

    // Remove OAuth connection / tokens
    const { error: delErr } = await admin
      .from("org_google_connections")
      .delete()
      .eq("org_id", orgId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // Keep sheet info, but clear script so reinstall is clean
    const { error: updErr } = await admin
      .from("org_google_sheets_integrations")
      .update({
        is_enabled: false,
        script_id: null,
        script_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // Also disable Gmail integration on disconnect (best effort)
    await admin
      .from("org_gmail_integrations")
      .update({
        is_enabled: false,
        last_error: "Google disconnected",
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId)
      .then(() => {})
      .catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 },
    );
  }
}

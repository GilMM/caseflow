import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const { orgId, enabled } = body || {};
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    await requireOrgAdminRoute(orgId);

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("org_google_sheets_integrations")
      .update({ is_enabled: !!enabled, updated_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, integration: data || null });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: e?.status || 500 },
    );
  }
}

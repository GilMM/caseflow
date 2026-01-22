import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdmin } from "@/lib/auth/requireOrgAdminRoute";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const { orgId, enabled } = body || {};
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    await requireOrgAdmin({ orgId });

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("org_google_sheets_integrations")
      .update({ is_enabled: !!enabled, updated_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .select("*")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, integration: data || null });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

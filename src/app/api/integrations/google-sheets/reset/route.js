import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

export async function POST(req) {
  try {
    const { orgId } = await req.json().catch(() => ({}));
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    await requireOrgAdminRoute(orgId);

    const admin = supabaseAdmin();

    const { error } = await admin
      .from("org_google_sheets_integrations")
      .update({
        sheet_id: null,
        sheet_url: null,
        script_id: null,
        script_url: null,
        spreadsheet_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Reset failed" }, { status: 500 });
  }
}

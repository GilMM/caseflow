import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

export async function GET(req) {
  try {
    const orgId = new URL(req.url).searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    await requireOrgAdminRoute(req, orgId);

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("org_google_sheets_integrations")
      .select("*")
      .eq("org_id", orgId)
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

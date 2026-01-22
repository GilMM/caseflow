import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    await requireOrgAdminRoute(orgId);

    const admin = supabaseAdmin();

    const { data: integ, error } = await admin
      .from("org_google_sheets_integrations")
      .select(
        [
          "org_id",
          "is_enabled",
          "default_queue_id",
          "spreadsheet_id",
          "sheet_url",
          "worksheet_name",
          "field_mapping",
          "webhook_secret",
          "script_id",
          "script_url",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      is_enabled: integ?.is_enabled ?? true,
      default_queue_id: integ?.default_queue_id ?? null,
      spreadsheet_id: integ?.spreadsheet_id ?? null,
      sheet_url: integ?.sheet_url ?? null,
      worksheet_name: integ?.worksheet_name ?? "Sheet1",
      field_mapping: integ?.field_mapping ?? null,
      script_id: integ?.script_id ?? null,
      script_url: integ?.script_url ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Status failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    await requireOrgAdminRoute(req, orgId);

    const admin = supabaseAdmin();

    const { data: integ, error } = await admin
      .from("org_gmail_integrations")
      .select(
        "org_id, is_enabled, default_queue_id, last_polled_at, emails_processed_count, last_error, created_at, updated_at",
      )
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      // Table may not exist yet — treat as "no integration"
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json({
          ok: true,
          exists: false,
          is_enabled: false,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      exists: !!integ,
      is_enabled: integ?.is_enabled ?? false,
      default_queue_id: integ?.default_queue_id ?? null,
      last_polled_at: integ?.last_polled_at ?? null,
      emails_processed_count: integ?.emails_processed_count ?? 0,
      last_error: integ?.last_error ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Status failed" },
      { status: e?.status || 500 },
    );
  }
}

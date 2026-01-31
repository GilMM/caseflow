import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

/**
 * GET /api/integrations/inbound-email/status?orgId=...
 * Returns the current inbound email configuration and stats.
 */
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
      .from("org_inbound_email")
      .select(
        "org_id, inbound_address, is_enabled, default_queue_id, emails_processed_count, last_received_at, last_error, created_at, updated_at",
      )
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      const msg = String(error.message || "").toLowerCase();
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
      inbound_address: integ?.inbound_address ?? null,
      default_queue_id: integ?.default_queue_id ?? null,
      emails_processed_count: integ?.emails_processed_count ?? 0,
      last_received_at: integ?.last_received_at ?? null,
      last_error: integ?.last_error ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Status failed" },
      { status: e?.status || 500 },
    );
  }
}

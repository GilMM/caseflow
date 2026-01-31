import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

/**
 * POST /api/integrations/inbound-email/disable
 * Body: { orgId }
 * Disables the inbound email integration for the org.
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const orgId = body?.orgId;

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    await requireOrgAdminRoute(req, orgId);
    const admin = supabaseAdmin();

    const { error } = await admin
      .from("org_inbound_email")
      .update({
        is_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Disable failed" },
      { status: e?.status || 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

/**
 * POST /api/integrations/inbound-email/setup
 * Body: { orgId, defaultQueueId }
 * Creates (or re-enables) the inbound email integration for the org.
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const { orgId, defaultQueueId } = body || {};

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }
    if (!defaultQueueId) {
      return NextResponse.json(
        { error: "Missing defaultQueueId" },
        { status: 400 },
      );
    }

    const { user } = await requireOrgAdminRoute(req, orgId);
    const admin = supabaseAdmin();

    // Verify queue belongs to the org
    const { data: queue } = await admin
      .from("queues")
      .select("id")
      .eq("id", defaultQueueId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!queue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 400 });
    }

    // Check if already configured
    const { data: existing } = await admin
      .from("org_inbound_email")
      .select("id, inbound_address")
      .eq("org_id", orgId)
      .maybeSingle();

    const now = new Date().toISOString();

    if (existing) {
      await admin
        .from("org_inbound_email")
        .update({
          is_enabled: true,
          default_queue_id: defaultQueueId,
          configured_by_user_id: user.id,
          last_error: null,
          updated_at: now,
        })
        .eq("org_id", orgId);

      return NextResponse.json({
        ok: true,
        inbound_address: existing.inbound_address,
      });
    }

    // Generate the dedicated inbound address
    const inboundAddress = `org_${orgId}@inbound.case-flow.org`;

    const { error: insErr } = await admin.from("org_inbound_email").insert({
      org_id: orgId,
      inbound_address: inboundAddress,
      is_enabled: true,
      default_queue_id: defaultQueueId,
      configured_by_user_id: user.id,
      created_at: now,
      updated_at: now,
    });

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inbound_address: inboundAddress });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Setup failed" },
      { status: e?.status || 500 },
    );
  }
}

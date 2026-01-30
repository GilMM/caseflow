import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";
import { getGmailProfile } from "@/lib/integrations/google/gmail";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const { orgId, enabled, defaultQueueId } = body || {};

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const { user } = await requireOrgAdminRoute(req, orgId);
    const admin = supabaseAdmin();

    // Check Google is connected
    const { data: conn } = await admin
      .from("org_google_connections")
      .select("org_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!conn) {
      return NextResponse.json(
        { error: "Google not connected. Connect Google first." },
        { status: 400 },
      );
    }

    let initialHistoryId = null;

    if (enabled) {
      if (!defaultQueueId) {
        return NextResponse.json(
          { error: "Missing defaultQueueId" },
          { status: 400 },
        );
      }

      // Verify queue belongs to org
      const { data: queue } = await admin
        .from("queues")
        .select("id")
        .eq("id", defaultQueueId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (!queue) {
        return NextResponse.json(
          { error: "Queue not found in this organization" },
          { status: 400 },
        );
      }

      // Get current historyId from Gmail (marks the "start from now" point)
      try {
        const profile = await getGmailProfile(orgId);
        initialHistoryId = profile?.historyId || null;
      } catch (e) {
        return NextResponse.json(
          {
            error: `Gmail access failed: ${e.message}. Re-connect Google with Gmail permissions.`,
          },
          { status: 400 },
        );
      }
    }

    // Upsert integration row
    const { data: existing } = await admin
      .from("org_gmail_integrations")
      .select("org_id")
      .eq("org_id", orgId)
      .maybeSingle();

    const now = new Date().toISOString();
    const row = {
      org_id: orgId,
      is_enabled: !!enabled,
      connected_by_user_id: user.id,
      default_queue_id: defaultQueueId || null,
      updated_at: now,
      last_error: null,
      ...(enabled && initialHistoryId
        ? { last_history_id: initialHistoryId }
        : {}),
    };

    if (existing) {
      const { error: upErr } = await admin
        .from("org_gmail_integrations")
        .update(row)
        .eq("org_id", orgId);
      if (upErr)
        return NextResponse.json({ error: upErr.message }, { status: 500 });
    } else {
      const { error: insErr } = await admin
        .from("org_gmail_integrations")
        .insert({ ...row, created_at: now });
      if (insErr)
        return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, enabled: !!enabled });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: e?.status || 500 },
    );
  }
}

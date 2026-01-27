import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Valid case statuses in the app
const VALID_STATUSES = ["new", "in_progress", "waiting_customer", "resolved", "closed"];

export async function POST(req) {
  try {
    const secret = (req.headers.get("x-webhook-secret") || "").trim();
    if (!secret) {
      return NextResponse.json({ error: "Missing x-webhook-secret" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: integration, error: intErr } = await supabase
      .from("org_google_sheets_integrations")
      .select("org_id,is_enabled,default_queue_id,connected_by_user_id,create_rule")
      .eq("webhook_secret", secret)
      .maybeSingle();

    if (intErr) {
      console.error("integration lookup error:", intErr);
      return NextResponse.json({ error: "Integration lookup failed" }, { status: 500 });
    }
    if (!integration || !integration.is_enabled) {
      return NextResponse.json({ error: "Integration not found/disabled" }, { status: 404 });
    }

    const action = String(body.action ?? "create").trim().toLowerCase();
    const externalRef = body.external_ref ? String(body.external_ref).trim() : null;

    if (!externalRef) {
      return NextResponse.json({ error: "Missing external_ref" }, { status: 400 });
    }

    // Handle status UPDATE for existing case
    if (action === "update") {
      const caseId = body.case_id ? String(body.case_id).trim() : null;
      const newStatus = String(body.status ?? "").trim().toLowerCase();

      if (!caseId) {
        return NextResponse.json({ error: "Missing case_id for update" }, { status: 400 });
      }
      if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
        return NextResponse.json({
          error: "Invalid status",
          valid: VALID_STATUSES
        }, { status: 400 });
      }

      // Use RPC to update in a single transaction with user context
      const { data: result, error: rpcErr } = await supabase.rpc("update_case_status_webhook", {
        p_case_id: caseId,
        p_new_status: newStatus,
        p_user_id: integration.connected_by_user_id,
        p_org_id: integration.org_id,
      });

      if (rpcErr) {
        console.error("case update error:", rpcErr);
        return NextResponse.json({ error: "Case update failed", details: rpcErr }, { status: 500 });
      }

      if (!result?.ok) {
        return NextResponse.json({ error: result?.error || "Update failed" }, { status: 400 });
      }

      return NextResponse.json({ ok: true, action: result.action, caseId, status: newStatus }, { status: 200 });
    }

    // Handle CREATE (original behavior)
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();

    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

    const rawPriority = String(body.priority ?? "normal").trim().toLowerCase();
    const priority = ["low", "normal", "high", "urgent"].includes(rawPriority) ? rawPriority : "normal";

    // optional rule: statusEquals
    const statusEquals = integration?.create_rule?.statusEquals ?? "new";
    const incomingStatus = String(body.status ?? "").trim().toLowerCase();
    if (statusEquals && incomingStatus && incomingStatus !== String(statusEquals).toLowerCase()) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Rule not matched" }, { status: 200 });
    }

    const caseRow = {
      org_id: integration.org_id,
      queue_id: integration.default_queue_id,
      created_by: integration.connected_by_user_id,

      title,
      description: description || null,
      status: "new",
      priority,

      source: "google_sheets",
      external_ref: externalRef,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("cases")
      .insert(caseRow)
      .select("id")
      .single();

    if (insErr) {
      // Dedupe (unique org_id + external_ref)
      if (insErr.code === "23505") {
        const { data: existing } = await supabase
          .from("cases")
          .select("id")
          .eq("org_id", integration.org_id)
          .eq("external_ref", externalRef)
          .maybeSingle();

        return NextResponse.json({ ok: true, deduped: true, caseId: existing?.id || null }, { status: 200 });
      }

      console.error("case insert error:", insErr);
      return NextResponse.json({ error: "Case insert failed", details: insErr }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: "created", caseId: inserted.id }, { status: 200 });
  } catch (e) {
    console.error("webhook fatal:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

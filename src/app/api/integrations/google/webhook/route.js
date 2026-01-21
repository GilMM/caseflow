import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Webhook endpoint called by Google Apps Script.
 * Identifies org via x-webhook-secret, then creates a Case with required fields:
 * org_id, queue_id, created_by.
 */
export async function POST(req) {
  try {
    const secret = (req.headers.get("x-webhook-secret") || "").trim();
    if (!secret) {
      return NextResponse.json(
        { error: "Missing x-webhook-secret" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // minimal payload validation
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const externalRef = body.external_ref
      ? String(body.external_ref).trim()
      : null;

    if (!title) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    // Normalize priority to your enum values (based on your table: normal/high/urgent)
    const rawPriority = String(body.priority ?? "normal")
      .trim()
      .toLowerCase();
    const priority = ["normal", "high", "urgent"].includes(rawPriority)
      ? rawPriority
      : "normal";

    // Service role client (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // 1) Find integration by secret
    const { data: integration, error: intErr } = await supabase
      .from("org_google_sheets_integrations")
      .select(
        "id, org_id, is_enabled, default_queue_id, connected_by_user_id, create_rule",
      )
      .eq("webhook_secret", secret)
      .maybeSingle();

    if (intErr) {
      console.error("integration lookup error:", intErr);
      return NextResponse.json(
        { error: "Integration lookup failed" },
        { status: 500 },
      );
    }
    if (!integration || !integration.is_enabled) {
      return NextResponse.json(
        { error: "Integration not found/disabled" },
        { status: 404 },
      );
    }

    // 2) Optional rule check (statusEquals)
    const statusEquals = integration?.create_rule?.statusEquals ?? "new";
    const incomingStatus = String(body.status ?? "")
      .trim()
      .toLowerCase();
    if (
      statusEquals &&
      incomingStatus &&
      incomingStatus !== String(statusEquals).toLowerCase()
    ) {
      return NextResponse.json(
        { ok: true, skipped: true, reason: "Rule not matched" },
        { status: 200 },
      );
    }

    // 3) Insert case with required fields
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
      .select("id, org_id, queue_id, title, status, priority, external_ref")
      .single();

    if (insErr) {
      // Duplicate external_ref (org_id, external_ref unique index)
      if (insErr.code === "23505") {
        return NextResponse.json({ ok: true, deduped: true }, { status: 200 });
      }
      console.error("case insert error:", insErr);
      return NextResponse.json({ error: insErr }, { status: 500 });
    }

    // Optional: create case activity (nice for audit trail)
    // If you want this now, tell me ואשלח לך insert מותאם לטבלת case_activities אצלך.

    return NextResponse.json({ ok: true, case: inserted }, { status: 200 });
  } catch (e) {
    console.error("webhook fatal:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

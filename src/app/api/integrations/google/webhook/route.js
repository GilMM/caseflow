import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const externalRef = body.external_ref ? String(body.external_ref).trim() : null;

    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });
    if (!externalRef) return NextResponse.json({ error: "Missing external_ref" }, { status: 400 });

    const rawPriority = String(body.priority ?? "normal").trim().toLowerCase();
    const priority = ["low", "normal", "high", "urgent"].includes(rawPriority) ? rawPriority : "normal";

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

    return NextResponse.json({ ok: true, caseId: inserted.id }, { status: 200 });
  } catch (e) {
    console.error("webhook fatal:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

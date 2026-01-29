import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Valid case statuses in the app
const VALID_STATUSES = [
  "new",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
];

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data: integration, error: intErr } = await supabase
      .from("org_google_sheets_integrations")
      .select(
        "org_id,is_enabled,default_queue_id,connected_by_user_id,create_rule",
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

    const action = String(body.action ?? "create")
      .trim()
      .toLowerCase();

    // ✅ External mapping fields from the sheet
    const externalRef = body.external_ref
      ? String(body.external_ref).trim()
      : null;
    const externalRow =
      body.external_row != null ? toInt(body.external_row) : null;
    const externalSpreadsheetId = body.spreadsheet_id
      ? String(body.spreadsheet_id).trim()
      : null;

    if (!externalRef) {
      return NextResponse.json(
        { error: "Missing external_ref" },
        { status: 400 },
      );
    }

    // Handle status UPDATE for existing case
    if (action === "update") {
      const caseId = body.case_id ? String(body.case_id).trim() : null;
      const newStatus = String(body.status ?? "")
        .trim()
        .toLowerCase();

      if (!caseId) {
        return NextResponse.json(
          { error: "Missing case_id for update" },
          { status: 400 },
        );
      }
      if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
        return NextResponse.json(
          { error: "Invalid status", valid: VALID_STATUSES },
          { status: 400 },
        );
      }

      const { data: result, error: rpcErr } = await supabase.rpc(
        "update_case_status_webhook",
        {
          p_case_id: caseId,
          p_new_status: newStatus,
          p_user_id: integration.connected_by_user_id,
          p_org_id: integration.org_id,
        },
      );

      if (rpcErr) {
        console.error("case update error:", rpcErr);
        return NextResponse.json(
          { error: "Case update failed", details: rpcErr },
          { status: 500 },
        );
      }
      if (!result?.ok) {
        return NextResponse.json(
          { error: result?.error || "Update failed" },
          { status: 400 },
        );
      }

      // ✅ persist mapping (best effort)
      try {
        const patch = { external_ref: externalRef };
        if (externalRow != null) patch.external_row = externalRow;
        if (externalSpreadsheetId)
          patch.external_spreadsheet_id = externalSpreadsheetId;

        await supabase
          .from("cases")
          .update(patch)
          .eq("id", caseId)
          .eq("org_id", integration.org_id);
      } catch (e) {
        console.warn("mapping patch failed (non-blocking):", e);
      }
      // ✅ optional: if email provided, attach requester_contact_id (best effort)
      try {
        const reporter = String(body.reporter ?? "").trim();
        const email = String(body.email ?? "").trim();
        const contactId = await upsertContactFromSheet({
          supabase,
          orgId: integration.org_id,
          email,
          reporter,
        });

        if (contactId) {
          await supabase
            .from("cases")
            .update({ requester_contact_id: contactId })
            .eq("id", caseId)
            .eq("org_id", integration.org_id)
            .is("requester_contact_id", null);
        }
      } catch (e) {
        console.warn("requester_contact attach failed (non-blocking):", e);
      }

      return NextResponse.json(
        { ok: true, action: result.action, caseId, status: newStatus },
        { status: 200 },
      );
    }
    async function upsertContactFromSheet({
      supabase,
      orgId,
      email,
      reporter,
    }) {
      const cleanEmail = String(email || "")
        .trim()
        .toLowerCase();
      const cleanName = String(reporter || "").trim();

      if (!cleanEmail) return null;

      // 1) find existing by org + email
      const { data: existing, error: fErr } = await supabase
        .from("contacts")
        .select("id, full_name, email")
        .eq("org_id", orgId)
        .eq("email", cleanEmail)
        .maybeSingle();

      if (fErr) throw fErr;

      if (existing?.id) {
        // 2) optionally fill missing name
        if (
          cleanName &&
          (!existing.full_name ||
            String(existing.full_name).trim().length === 0)
        ) {
          await supabase
            .from("contacts")
            .update({ full_name: cleanName })
            .eq("id", existing.id)
            .eq("org_id", orgId);
        }
        return existing.id;
      }

      // 3) create new
      const { data: created, error: cErr } = await supabase
        .from("contacts")
        .insert({
          org_id: orgId,
          email: cleanEmail,
          full_name: cleanName || null,
          source: "google_sheets",
        })
        .select("id")
        .single();

      if (cErr) throw cErr;
      return created?.id || null;
    }

    // Handle CREATE
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    if (!title)
      return NextResponse.json({ error: "Missing title" }, { status: 400 });

    const rawPriority = String(body.priority ?? "normal")
      .trim()
      .toLowerCase();
    const priority = ["low", "normal", "high", "urgent"].includes(rawPriority)
      ? rawPriority
      : "normal";

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
    const reporter = String(body.reporter ?? "").trim();
    const email = String(body.email ?? "").trim();

    let requesterContactId = null;
    try {
      requesterContactId = await upsertContactFromSheet({
        supabase,
        orgId: integration.org_id,
        email,
        reporter,
      });
    } catch (e) {
      console.warn("contact upsert failed (non-blocking):", e);
    }

    const caseRow = {
      org_id: integration.org_id,
      queue_id: integration.default_queue_id,
      created_by: integration.connected_by_user_id,

      requester_contact_id: requesterContactId,

      title,
      description: description || null,
      status: "new",
      priority,

      source: "google_sheets",
      external_ref: externalRef,
      external_row: externalRow,
      external_spreadsheet_id: externalSpreadsheetId,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("cases")
      .insert(caseRow)
      .select("id")
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        const { data: existing } = await supabase
          .from("cases")
          .select("id")
          .eq("org_id", integration.org_id)
          .eq("external_ref", externalRef)
          .maybeSingle();

        if (existing?.id) {
          try {
            const patch = {};
            if (externalRow != null) patch.external_row = externalRow;
            if (externalSpreadsheetId)
              patch.external_spreadsheet_id = externalSpreadsheetId;
            if (Object.keys(patch).length) {
              await supabase
                .from("cases")
                .update(patch)
                .eq("id", existing.id)
                .eq("org_id", integration.org_id);
            }
          } catch (e) {
            console.warn("dedupe mapping patch failed (non-blocking):", e);
          }
        }

        return NextResponse.json(
          { ok: true, deduped: true, caseId: existing?.id || null },
          { status: 200 },
        );
      }

      console.error("case insert error:", insErr);
      return NextResponse.json(
        { error: "Case insert failed", details: insErr },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: true, action: "created", caseId: inserted.id },
      { status: 200 },
    );
  } catch (e) {
    console.error("webhook fatal:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

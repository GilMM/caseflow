export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyMailgunSignature } from "@/lib/integrations/mailgun/verify";

export async function POST(req) {
  try {
    const formData = await req.formData();

    const timestamp = String(formData.get("timestamp") || "");
    const token = String(formData.get("token") || "");
    const signature = String(formData.get("signature") || "");

    if (!verifyMailgunSignature({ timestamp, token, signature })) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 406 });
    }

    const recipient = String(formData.get("recipient") || "");
    const from = String(formData.get("from") || "");
    const sender = String(formData.get("sender") || "");
    const subject = String(formData.get("subject") || "");
    const bodyPlain = String(formData.get("body-plain") || "");
    const messageId = String(formData.get("Message-Id") || "");

    console.log("MAILGUN recipient raw:", recipient);

    const orgId = parseOrgIdFromRecipient(recipient);
    if (!orgId) {
      return NextResponse.json({ error: "Invalid recipient", recipient }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { data: integ, error: intErr } = await admin
      .from("org_inbound_email")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_enabled", true)
      .maybeSingle();

    if (intErr) return NextResponse.json({ error: intErr.message }, { status: 500 });
    if (!integ) return NextResponse.json({ error: "Integration not found or disabled" }, { status: 404 });

    const externalRef = `mailgun:${messageId || token}`;

    const { data: existing } = await admin
      .from("cases")
      .select("id")
      .eq("org_id", orgId)
      .eq("external_ref", externalRef)
      .maybeSingle();

    if (existing) return NextResponse.json({ ok: true, deduped: true, caseId: existing.id });

    const { email: senderEmail, name: senderName } = parseFromField(from || sender);

    const requesterContactId = await upsertContactFromEmail(admin, {
      orgId,
      email: senderEmail,
      name: senderName,
    });

    const caseRow = {
      org_id: orgId,
      queue_id: integ.default_queue_id,
      created_by: integ.configured_by_user_id,
      requester_contact_id: requesterContactId,
      title: truncate(subject || "(no subject)", 255),
      description: truncate(bodyPlain, 5000),
      status: "new",
      priority: "normal",
      source: "email",
      external_ref: externalRef,
    };

    const { data: inserted, error: insErr } = await admin
      .from("cases")
      .insert(caseRow)
      .select("id")
      .single();

    if (insErr) {
      if (insErr.code === "23505") return NextResponse.json({ ok: true, deduped: true });
      console.error("MAILGUN INBOUND — case insert error:", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    await admin
      .from("org_inbound_email")
      .update({
        emails_processed_count: (integ.emails_processed_count || 0) + 1,
        last_received_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    return NextResponse.json({ ok: true, caseId: inserted.id });
  } catch (e) {
    console.error("MAILGUN INBOUND ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function parseOrgIdFromRecipient(recipient) {
  const raw = String(recipient || "").trim();
  const first = raw.split(",")[0].trim();
  const emailMatch = first.match(/<([^>]+)>/);
  const email = (emailMatch ? emailMatch[1] : first).trim().toLowerCase();
  const m = email.match(/^org_([a-f0-9-]{36})@/i);
  return m?.[1] || null;
}

function parseFromField(fromStr) {
  const raw = String(fromStr || "");
  const emailMatch = raw.match(/<([^>]+)>/);
  const email = emailMatch ? emailMatch[1].trim().toLowerCase() : raw.trim().toLowerCase();
  const name = emailMatch ? raw.replace(/<[^>]+>/, "").replace(/"/g, "").trim() : "";
  return { email, name };
}

async function upsertContactFromEmail(admin, { orgId, email, name }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();
  if (!cleanEmail) return null;

  const { data: existing, error: fErr } = await admin
    .from("contacts")
    .select("id, full_name")
    .eq("org_id", orgId)
    .eq("email", cleanEmail)
    .maybeSingle();

  if (fErr) throw fErr;

  if (existing?.id) {
    if (cleanName && (!existing.full_name || !existing.full_name.trim())) {
      await admin.from("contacts").update({ full_name: cleanName }).eq("id", existing.id).eq("org_id", orgId);
    }
    return existing.id;
  }

  const { data: created, error: cErr } = await admin
    .from("contacts")
    .insert({ org_id: orgId, email: cleanEmail, full_name: cleanName || null })
    .select("id")
    .single();

  if (cErr) throw cErr;
  return created?.id || null;
}

function truncate(str, maxLen) {
  if (!str) return "";
  return str.length > maxLen ? str.slice(0, maxLen) + "..." : str;
}

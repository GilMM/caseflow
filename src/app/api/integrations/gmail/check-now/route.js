import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";
import {
  getGmailProfile,
  listHistory,
  listInboxMessages,
  getMessage,
  parseGmailMessage,
} from "@/lib/integrations/google/gmail";

/**
 * POST /api/integrations/gmail/check-now
 * Body: { orgId }
 * Auth: user session (not cron secret)
 *
 * Same logic as the poll route, but callable from the UI.
 */
export async function POST(req) {
  let orgId = null;

  try {
    const body = await req.json().catch(() => null);
    orgId = body?.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    await requireOrgAdminRoute(req, orgId);

    const admin = supabaseAdmin();

    const { data: integ, error: intErr } = await admin
      .from("org_gmail_integrations")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_enabled", true)
      .maybeSingle();

    if (intErr) {
      return NextResponse.json({ error: intErr.message }, { status: 500 });
    }
    if (!integ) {
      return NextResponse.json(
        { error: "Gmail integration not enabled" },
        { status: 404 },
      );
    }

    let newMessageIds = [];
    let latestHistoryId = integ.last_history_id;

    if (!integ.last_history_id) {
      const listResult = await listInboxMessages(orgId, { maxResults: 20 });
      newMessageIds = (listResult?.messages || []).map((m) => m.id);

      const profile = await getGmailProfile(orgId);
      latestHistoryId = profile?.historyId || null;
    } else {
      try {
        const historyResult = await listHistory(orgId, integ.last_history_id);
        latestHistoryId = historyResult?.historyId || integ.last_history_id;

        const historyEntries = historyResult?.history || [];
        for (const entry of historyEntries) {
          const added = entry?.messagesAdded || [];
          for (const m of added) {
            if (m?.message?.id) {
              const labels = m.message.labelIds || [];
              if (labels.includes("INBOX")) {
                newMessageIds.push(m.message.id);
              }
            }
          }
        }
      } catch (e) {
        if (e.status === 404 || e.gmailError?.code === 404) {
          const listResult = await listInboxMessages(orgId, {
            maxResults: 20,
          });
          newMessageIds = (listResult?.messages || []).map((m) => m.id);
          const profile = await getGmailProfile(orgId);
          latestHistoryId = profile?.historyId || null;
        } else {
          throw e;
        }
      }
    }

    newMessageIds = [...new Set(newMessageIds)];

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails = [];

    for (const msgId of newMessageIds) {
      try {
        const externalRef = `gmail:${msgId}`;

        const { data: existingCase } = await admin
          .from("cases")
          .select("id")
          .eq("org_id", orgId)
          .eq("external_ref", externalRef)
          .maybeSingle();

        if (existingCase) {
          skipped++;
          continue;
        }

        const raw = await getMessage(orgId, msgId, "full");
        const parsed = parseGmailMessage(raw);

        let requesterContactId = null;
        if (parsed.senderEmail) {
          requesterContactId = await upsertContactFromEmail(admin, {
            orgId,
            email: parsed.senderEmail,
            name: parsed.senderName,
          });
        }

        const caseRow = {
          org_id: orgId,
          queue_id: integ.default_queue_id,
          created_by: integ.connected_by_user_id,
          requester_contact_id: requesterContactId,
          title: truncate(parsed.subject || "(no subject)", 255),
          description: truncate(parsed.bodyText, 5000),
          status: "new",
          priority: "normal",
          source: "gmail",
          external_ref: externalRef,
        };

        const { error: insErr } = await admin.from("cases").insert(caseRow);

        if (insErr) {
          if (insErr.code === "23505") {
            skipped++;
          } else {
            console.error(
              `Case insert failed for message ${msgId}:`,
              insErr,
            );
            errors++;
            errorDetails.push(`${parsed.subject}: ${insErr.message}`);
          }
        } else {
          created++;
        }
      } catch (msgErr) {
        console.error(`Error processing message ${msgId}:`, msgErr);
        errors++;
        errorDetails.push(msgErr?.message || String(msgErr));
      }
    }

    await admin
      .from("org_gmail_integrations")
      .update({
        last_history_id: latestHistoryId,
        last_polled_at: new Date().toISOString(),
        emails_processed_count: (integ.emails_processed_count || 0) + created,
        last_error: errors > 0 ? `${errors} message(s) failed` : null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    return NextResponse.json({
      ok: true,
      messagesFound: newMessageIds.length,
      created,
      skipped,
      errors,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    });
  } catch (e) {
    console.error("GMAIL CHECK-NOW ERROR:", e);

    if (orgId) {
      try {
        const admin = supabaseAdmin();
        await admin
          .from("org_gmail_integrations")
          .update({
            last_error: e?.message || "Check failed",
            last_polled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("org_id", orgId);
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json(
      { error: e?.message || "Check failed" },
      { status: 500 },
    );
  }
}

async function upsertContactFromEmail(admin, { orgId, email, name }) {
  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();
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
      await admin
        .from("contacts")
        .update({ full_name: cleanName })
        .eq("id", existing.id)
        .eq("org_id", orgId);
    }
    return existing.id;
  }

  const { data: created, error: cErr } = await admin
    .from("contacts")
    .insert({
      org_id: orgId,
      email: cleanEmail,
      full_name: cleanName || null,
    })
    .select("id")
    .single();

  if (cErr) throw cErr;
  return created?.id || null;
}

function truncate(str, maxLen) {
  if (!str) return "";
  return str.length > maxLen ? str.slice(0, maxLen) + "..." : str;
}

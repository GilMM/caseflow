import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireSessionUserRoute } from "@/lib/auth/requireOrgAdminRoute"; // יש לך כבר בפנים
import { getValidAccessToken } from "@/lib/integrations/google/tokens";

function parseExternalRef(externalRef) {
  const [sheetId, rowStr] = String(externalRef || "").split(":");
  const row = Number(rowStr);
  if (!sheetId || !row) return null;
  return { sheetId, row };
}

// בדיקת חברות בארגון (לא רק admin)
async function requireOrgMemberRoute(req, orgId) {
  const { supabase, user } = await requireSessionUserRoute(req);

  const { data: m, error } = await supabase
    .from("org_memberships")
    .select("role,is_active")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!m || m.is_active === false) {
    const e = new Error("No org access");
    e.status = 403;
    throw e;
  }

  return { user };
}

async function googleBatchUpdateValues({ accessToken, sheetId, updates }) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: updates,
      }),
    }
  );

  const text = await res.text().catch(() => "");
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }

  if (!res.ok) {
    const msg = body?.error?.message || "Sheets batchUpdate failed";
    const e = new Error(msg);
    e.status = res.status;
    e.details = body;
    throw e;
  }

  return body;
}

export async function POST(req) {
  try {
    const { caseId, status } = await req.json().catch(() => ({}));
    if (!caseId) return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
    if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

    const admin = supabaseAdmin();

    // 1) להביא את הקייס כדי לדעת org_id + external_ref
    const { data: c, error: cErr } = await admin
      .from("cases")
      .select("id, org_id, external_ref")
      .eq("id", caseId)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    const orgId = c.org_id;

    // 2) לוודא שהיוזר מחובר ויש לו גישה לארגון
    await requireOrgMemberRoute(req, orgId);

    // 3) לוודא שיש integration פעיל
    const { data: integ, error: iErr } = await admin
      .from("org_google_sheets_integrations")
      .select("org_id,is_enabled,worksheet_name")
      .eq("org_id", orgId)
      .maybeSingle();

    if (iErr) throw iErr;

    if (!integ || integ.is_enabled === false) {
      return NextResponse.json({ error: "Integration not found/disabled" }, { status: 404 });
    }

    if (!c.external_ref) {
      return NextResponse.json({ ok: true, skipped: true, reason: "No external_ref" });
    }

    const parsed = parseExternalRef(c.external_ref);
    if (!parsed) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Bad external_ref format" });
    }

    const { sheetId, row } = parsed;
    const sheetName = integ.worksheet_name || "Sheet1";

    // 4) עדכון לשיט (Status + sync_source marker)
    const accessToken = await getValidAccessToken(orgId);

    const statusRange = `${sheetName}!F${row}`;
    const syncRange = `${sheetName}!I${row}`;

    await googleBatchUpdateValues({
      accessToken,
      sheetId,
      updates: [
        { range: statusRange, values: [[String(status).toLowerCase()]] },
        { range: syncRange, values: [["caseflow"]] },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Sync failed", details: e?.details || null },
      { status: e?.status || 500 }
    );
  }
}

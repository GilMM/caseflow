import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireSessionUserRoute } from "@/lib/auth/requireOrgAdminRoute";
import { getValidAccessToken } from "@/lib/integrations/google/tokens";

async function googleJson(res) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

function safeTitle(title) {
  // Sheet tab titles may contain quotes etc. Sheets API expects A1 notation strings.
  // The safest is to wrap in single quotes and escape single quotes by doubling them.
  const t = String(title || "Sheet1");
  return `'${t.replace(/'/g, "''")}'`;
}

/**
 * Site -> Sheet (FAST):
 * 1) read case.external_row + case.external_spreadsheet_id
 * 2) if present and matches integration.sheet_id -> direct update (1 request)
 * 3) else fallback: scan column G to find row (slower)
 *
 * Columns:
 * F = status, G = case_id, H = error_message, I = sync_source
 * NOTE: we DO NOT set sync_source="app" because Sheets API updates don't trigger onEdit anyway,
 * and leaving "app" there causes your onEdit to ignore the next human edit.
 */
export async function POST(req) {
  try {
    const { caseId, status } = await req.json().catch(() => ({}));
    if (!caseId) return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
    if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

    const newStatus = String(status).toLowerCase().trim();

    // ✅ must be logged in (cookies) OR Bearer
    const { supabase } = await requireSessionUserRoute(req);

    // ✅ ensure user can access the case (RLS)
    const { data: c, error: cErr } = await supabase
      .from("cases")
      .select("id, org_id, external_row, external_spreadsheet_id")
      .eq("id", caseId)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!c?.org_id) return NextResponse.json({ error: "Case not found / no access" }, { status: 404 });

    const orgId = c.org_id;

    const admin = supabaseAdmin();

    // ✅ integration row: need sheet_id
    const { data: integ, error: iErr } = await admin
      .from("org_google_sheets_integrations")
      .select("org_id,is_enabled,sheet_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (iErr) throw iErr;
    if (!integ || !integ.is_enabled) {
      return NextResponse.json({ error: "Integration not found/disabled" }, { status: 404 });
    }
    if (!integ.sheet_id) {
      return NextResponse.json({ error: "Missing sheet_id. Run create." }, { status: 400 });
    }

    const sheetId = integ.sheet_id;
    const accessToken = await getValidAccessToken(orgId);

    // 1) Get tab title once (still one request, but we avoid scanning when external_row exists)
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const metaBody = await googleJson(metaRes);
    if (!metaRes.ok || metaBody?.error) {
      return NextResponse.json(
        { error: "Sheets metadata fetch failed", details: metaBody, status: metaRes.status },
        { status: 500 }
      );
    }

    const tabTitleRaw = metaBody?.sheets?.[0]?.properties?.title;
    if (!tabTitleRaw) {
      return NextResponse.json({ error: "Could not resolve sheet tab title" }, { status: 500 });
    }
    const tabTitle = safeTitle(tabTitleRaw);

    // ✅ FAST PATH: external_row exists and sheet matches
    const extRow = Number.isFinite(Number(c.external_row)) ? Number(c.external_row) : null;
    const extSheet = c.external_spreadsheet_id ? String(c.external_spreadsheet_id).trim() : null;

    if (extRow && extRow >= 2 && extSheet && extSheet === sheetId) {
      const batchRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data: [
              { range: `${tabTitle}!I${extRow}`, values: [[""]] },        // clear sync_source
              { range: `${tabTitle}!F${extRow}`, values: [[newStatus]] }, // status
              { range: `${tabTitle}!H${extRow}`, values: [[""]] },        // clear error
            ],
          }),
        }
      );

      const batchBody = await googleJson(batchRes);
      if (!batchRes.ok || batchBody?.error) {
        return NextResponse.json(
          { error: "Sheets batchUpdate failed (fast path)", details: batchBody, status: batchRes.status },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        mode: "fast",
        sheetId,
        tabTitle: tabTitleRaw,
        row: extRow,
        status: newStatus,
      });
    }

    // 2) FALLBACK: scan column G for caseId (slower, but works)
    const caseIdsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(
        `${tabTitleRaw}!G2:G`
      )}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const caseIdsBody = await googleJson(caseIdsRes);

    if (!caseIdsRes.ok || caseIdsBody?.error) {
      return NextResponse.json(
        { error: "Sheets values read failed (fallback)", details: caseIdsBody, status: caseIdsRes.status },
        { status: 500 }
      );
    }

    const rows = caseIdsBody?.values || [];
    const target = String(caseId).trim();

    let idx = -1;
    for (let i = 0; i < rows.length; i++) {
      const v = rows[i]?.[0] == null ? "" : String(rows[i][0]).trim();
      if (v === target) {
        idx = i;
        break;
      }
    }

    if (idx === -1) {
      return NextResponse.json(
        { ok: false, mode: "fallback", reason: "case_id not found in sheet", sheetId, tabTitle: tabTitleRaw },
        { status: 200 }
      );
    }

    const rowNumber = idx + 2;

    const batchRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: [
            { range: `${tabTitle}!I${rowNumber}`, values: [[""]] },        // clear sync_source
            { range: `${tabTitle}!F${rowNumber}`, values: [[newStatus]] }, // status
            { range: `${tabTitle}!H${rowNumber}`, values: [[""]] },        // clear error
          ],
        }),
      }
    );

    const batchBody = await googleJson(batchRes);
    if (!batchRes.ok || batchBody?.error) {
      return NextResponse.json(
        { error: "Sheets batchUpdate failed (fallback)", details: batchBody, status: batchRes.status },
        { status: 500 }
      );
    }

    // ✅ optional: persist external_row for next time (best effort)
    try {
      await admin
        .from("cases")
        .update({ external_row: rowNumber, external_spreadsheet_id: sheetId })
        .eq("id", caseId)
        .eq("org_id", orgId);
    } catch (_) {}

    return NextResponse.json({
      ok: true,
      mode: "fallback",
      sheetId,
      tabTitle: tabTitleRaw,
      row: rowNumber,
      status: newStatus,
    });
  } catch (e) {
    console.error("SYNC CASE STATUS (FAST SHEETS API) ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Sync failed", details: e?.details || null },
      { status: 500 }
    );
  }
}

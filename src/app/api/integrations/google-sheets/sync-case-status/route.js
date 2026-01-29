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

/**
 * אופציה B:
 * Update Google Sheet directly via Sheets API (no Apps Script API, no deployment).
 *
 * Sheet schema (your Apps Script setup):
 * A title, B desc, C priority, D reporter, E email, F status, G case_id, H error_message, I sync_source
 */
export async function POST(req) {
  try {
    const { caseId, status } = await req.json().catch(() => ({}));
    if (!caseId)
      return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
    if (!status)
      return NextResponse.json({ error: "Missing status" }, { status: 400 });

    const newStatus = String(status).toLowerCase().trim();

    // ✅ must be logged in (cookies) OR Bearer
    const { supabase } = await requireSessionUserRoute(req);

    // ✅ ensure user can access the case (RLS)
    const { data: c, error: cErr } = await supabase
      .from("cases")
      .select("id, org_id")
      .eq("id", caseId)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!c?.org_id) {
      return NextResponse.json(
        { error: "Case not found / no access" },
        { status: 404 },
      );
    }

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
      return NextResponse.json(
        { error: "Integration not found/disabled" },
        { status: 404 },
      );
    }

    if (!integ.sheet_id) {
      return NextResponse.json(
        { error: "Missing sheet_id. Run create." },
        { status: 400 },
      );
    }

    const sheetId = integ.sheet_id;

    // ✅ token (needs spreadsheets scope — which you already have)
    const accessToken = await getValidAccessToken(orgId);

    // 1) Get the first sheet/tab title (since your Apps Script uses ss.getSheets()[0])
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const metaBody = await googleJson(metaRes);

    if (!metaRes.ok || metaBody?.error) {
      return NextResponse.json(
        {
          error: "Sheets metadata fetch failed",
          details: metaBody,
          status: metaRes.status,
        },
        { status: 500 },
      );
    }

    const tabTitle = metaBody?.sheets?.[0]?.properties?.title;
    if (!tabTitle) {
      return NextResponse.json(
        { error: "Could not resolve sheet tab title" },
        { status: 500 },
      );
    }

    // 2) Read all case_id cells from column G (starting row 2): G2:G
    const caseIdsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(
        `${tabTitle}!G2:G`,
      )}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const caseIdsBody = await googleJson(caseIdsRes);

    if (!caseIdsRes.ok || caseIdsBody?.error) {
      return NextResponse.json(
        {
          error: "Sheets values read failed",
          details: caseIdsBody,
          status: caseIdsRes.status,
        },
        { status: 500 },
      );
    }

    const rows = caseIdsBody?.values || []; // array of [ [case_id], [case_id], ... ]
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
      // Not found in sheet (maybe case created not from sheet)
      return NextResponse.json(
        { ok: false, reason: "case_id not found in sheet", sheetId, tabTitle },
        { status: 200 },
      );
    }

    // Actual row number in sheet = idx + 2 (because we started at G2)
    const rowNumber = idx + 2;

    // 3) Batch update:
    // - I{row} sync_source = "app"   (anti-loop)
    // - F{row} status = newStatus
    // - H{row} error_message = ""   (clear)
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
            { range: `${tabTitle}!I${rowNumber}`, values: [["app"]] },
            { range: `${tabTitle}!F${rowNumber}`, values: [[newStatus]] },
            { range: `${tabTitle}!H${rowNumber}`, values: [[""]] },
          ],
        }),
      },
    );

    const batchBody = await googleJson(batchRes);

    if (!batchRes.ok || batchBody?.error) {
      return NextResponse.json(
        {
          error: "Sheets batchUpdate failed",
          details: batchBody,
          status: batchRes.status,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      sheetId,
      tabTitle,
      row: rowNumber,
      status: newStatus,
      updated: true,
    });
  } catch (e) {
    console.error("SYNC CASE STATUS (SHEETS API) ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Sync failed", details: e?.details || null },
      { status: 500 },
    );
  }
}

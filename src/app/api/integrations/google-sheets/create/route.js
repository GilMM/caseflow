import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";
import { getValidAccessToken } from "@/lib/integrations/google/tokens";

/* ---------------- helpers ---------------- */

async function googleJson(res) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

async function assertGoogleOk(res, label) {
  if (res.ok) return;
  const body = await googleJson(res);
  const msg = body?.error?.message || body?.message || `${label} failed`;
  const e = new Error(msg);
  e.details = body;
  e.status = res.status;
  throw e;
}

function newWebhookSecret() {
  return crypto.randomBytes(24).toString("hex");
}

function defaultFieldMappingB() {
  // עמודות קבועות לפי התבנית שלנו
  return {
    title_col: "A",
    description_col: "B",
    priority_col: "C",
    reporter_col: "D",
    email_col: "E",
    status_col: "F",
    case_id_col: "G",
    error_col: "H",
  };
}

function defaultCreateRule() {
  // כלל ברירת מחדל: יוצרים Case רק כשהסטטוס נהיה new
  return { statusEquals: "new" };
}

async function setupCaseFlowSheetTemplateB({ accessToken, spreadsheetId }) {
  const headers = [
    "Title",
    "Description",
    "Priority",
    "Reporter",
    "Email",
    "Status",
    "case_id",
    "error_message",
  ];

  // 1) headers A1:H1
  let res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:H1?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [headers] }),
    },
  );
  await assertGoogleOk(res, "Set headers");

  // 2) formatting + validations + protection + auto resize
  const batchBody = {
    requests: [
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.93, green: 0.93, blue: 0.93 },
              textFormat: { bold: true },
              horizontalAlignment: "CENTER",
            },
          },
          fields: "userEnteredFormat",
        },
      },

      // Status dropdown (col F = index 5)
      {
        setDataValidation: {
          range: { sheetId: 0, startRowIndex: 1, startColumnIndex: 5, endColumnIndex: 6 },
          rule: {
            condition: {
              type: "ONE_OF_LIST",
              values: [
                { userEnteredValue: "draft" },
                { userEnteredValue: "new" },
                { userEnteredValue: "sent" },
                { userEnteredValue: "error" },
              ],
            },
            strict: true,
            showCustomUi: true,
          },
        },
      },

      // Priority dropdown (col C = index 2)
      {
        setDataValidation: {
          range: { sheetId: 0, startRowIndex: 1, startColumnIndex: 2, endColumnIndex: 3 },
          rule: {
            condition: {
              type: "ONE_OF_LIST",
              values: [
                { userEnteredValue: "low" },
                { userEnteredValue: "normal" },
                { userEnteredValue: "high" },
                { userEnteredValue: "urgent" },
              ],
            },
            strict: true,
            showCustomUi: true,
          },
        },
      },

      // ✅ IMPORTANT:
      // כדי להשתמש ב-unprotectedRanges, חייבים שה-protectedRange יכסה "whole sheet"
      {
        addProtectedRange: {
          protectedRange: {
            range: { sheetId: 0 }, // whole sheet
            description: "Protected by CaseFlow",
            warningOnly: false,
            unprotectedRanges: [
              { sheetId: 0, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 }, // A Title
              { sheetId: 0, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 }, // B Description
              { sheetId: 0, startRowIndex: 1, startColumnIndex: 5, endColumnIndex: 6 }, // F Status
            ],
          },
        },
      },

      // Auto resize columns A:H
      {
        autoResizeDimensions: {
          dimensions: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: 8 },
        },
      },
    ],
  };

  res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batchBody),
    },
  );
  await assertGoogleOk(res, "Batch update");

  // 3) sample row A2:H2
  res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:H2?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [
          [
            "Sample issue title",
            "Describe the issue here",
            "normal",
            "",
            "",
            "draft",
            "",
            "",
          ],
        ],
      }),
    },
  );
  await assertGoogleOk(res, "Set sample row");
}

/* ---------------- POST ---------------- */

export async function POST(req) {
  try {
    const { orgId, defaultQueueId } = await req.json().catch(() => ({}));
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    if (!defaultQueueId)
      return NextResponse.json({ error: "Missing defaultQueueId" }, { status: 400 });

    // must be logged-in org admin, and we need the user id for connected_by_user_id
    const { user } = await requireOrgAdminRoute(orgId);

    const admin = supabaseAdmin();

    // If a sheet already exists - reuse (avoid creating extra Drive files)
    const { data: existing, error: exErr } = await admin
      .from("org_google_sheets_integrations")
      .select("sheet_id,sheet_url")
      .eq("org_id", orgId)
      .maybeSingle();

    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

    if (existing?.sheet_id && existing?.sheet_url) {
      return NextResponse.json({
        ok: true,
        spreadsheetId: existing.sheet_id,
        sheetUrl: existing.sheet_url,
        reused: true,
      });
    }

    const accessToken = await getValidAccessToken(orgId);

    // create spreadsheet
    const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title: "CaseFlow Cases" },
      }),
    });

    const sheet = await googleJson(res);
    if (!res.ok) {
      return NextResponse.json(
        { error: sheet?.error?.message || "Failed to create spreadsheet", details: sheet },
        { status: res.status || 500 },
      );
    }

    const spreadsheetId = sheet.spreadsheetId;
    const sheetUrl = sheet.spreadsheetUrl;

    // optional: worksheet name from response (fallback "Sheet1")
    const worksheetName = sheet?.sheets?.[0]?.properties?.title || "Sheet1";

    await setupCaseFlowSheetTemplateB({ accessToken, spreadsheetId });

    // upsert integration row with ALL required NOT NULL fields in your DB
    const payload = {
      org_id: orgId,
      is_enabled: true,

      connected_by_user_id: user.id,
      default_queue_id: defaultQueueId,

      sheet_id: spreadsheetId,
      sheet_url: sheetUrl,
      worksheet_name: worksheetName,

      field_mapping: defaultFieldMappingB(),
      create_rule: defaultCreateRule(),

      webhook_secret: newWebhookSecret(),

      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await admin
      .from("org_google_sheets_integrations")
      .upsert(payload, { onConflict: "org_id" });

    if (upsertErr) {
      return NextResponse.json(
        { error: `DB upsert failed: ${upsertErr.message}`, details: upsertErr },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, spreadsheetId, sheetUrl });
  } catch (e) {
    console.error("CREATE SHEET ERROR:", e?.message, e?.details || e);
    return NextResponse.json(
      { error: e?.message || "Create sheet failed", details: e?.details || null },
      { status: e?.status || 500 },
    );
  }
}

// src/app/api/integrations/google-sheets/create/route.js
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
  return { statusEquals: "new" };
}

/**
 * ✅ Create a blank Google Spreadsheet using Drive API (NOT Sheets API)
 * This uses drive.file scope (non-sensitive) and avoids requesting spreadsheets scope for your app.
 */
async function createSpreadsheetViaDrive({
  accessToken,
  name = "CaseFlow Cases",
}) {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.spreadsheet",
      }),
    },
  );

  const body = await googleJson(res);
  if (!res.ok) {
    const e = new Error(
      body?.error?.message || "Failed to create spreadsheet via Drive",
    );
    e.details = body;
    e.status = res.status;
    throw e;
  }

  const spreadsheetId = body?.id;
  const sheetUrl =
    body?.webViewLink ||
    (spreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      : null);

  if (!spreadsheetId || !sheetUrl) {
    const e = new Error("Drive created spreadsheet but missing id/url");
    e.details = body;
    e.status = 500;
    throw e;
  }

  return { spreadsheetId, sheetUrl };
}

/**
 * ✅ Option B: Single button flow.
 * We call install endpoint internally (same server) to avoid duplicating logic in UI.
 * NOTE: we call via fetch to localhost-style URL; in Vercel it works with absolute.
 */
function resolveBaseUrl(req) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  return `${proto}://${host}`;
}

async function callInstall({ req, orgId }) {
  const baseUrl = resolveBaseUrl(req);
  const res = await fetch(`${baseUrl}/api/integrations/google-sheets/install`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // important: keep cookies/session
    body: JSON.stringify({ orgId }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = new Error(body?.error || "Install failed");
    e.details = body;
    e.status = res.status;
    throw e;
  }
  return body;
}

/* ---------------- POST ---------------- */

export async function POST(req) {
  try {
    const { orgId, defaultQueueId, installNow } = await req
      .json()
      .catch(() => ({}));

    if (!orgId)
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    if (!defaultQueueId)
      return NextResponse.json(
        { error: "Missing defaultQueueId" },
        { status: 400 },
      );
    console.log(
      "COOKIE header:",
      req.headers.get("cookie")?.slice(0, 120) || "NO COOKIE",
    );

    const { user } = await requireOrgAdminRoute(req, orgId);

    const admin = supabaseAdmin();

    // If a sheet already exists - reuse (avoid extra Drive files)
    const { data: existing, error: exErr } = await admin
      .from("org_google_sheets_integrations")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (exErr)
      return NextResponse.json({ error: exErr.message }, { status: 500 });

    // Ensure webhook_secret exists
    const webhookSecret = existing?.webhook_secret || newWebhookSecret();

    // Ensure sheet exists (via Drive API)
    let sheetId = existing?.sheet_id || null;
    let sheetUrl = existing?.sheet_url || null;
    let reused = true;

    if (!sheetId || !sheetUrl) {
      const accessToken = await getValidAccessToken(orgId);
      const created = await createSpreadsheetViaDrive({
        accessToken,
        name: "CaseFlow Cases",
      });
      sheetId = created.spreadsheetId;
      sheetUrl = created.sheetUrl;
      reused = false;
    }

    const payload = {
      org_id: orgId,
      is_enabled: true,

      connected_by_user_id: user.id,
      default_queue_id: defaultQueueId,

      sheet_id: sheetId,
      sheet_url: sheetUrl,
      worksheet_name: existing?.worksheet_name || "Sheet1",

      field_mapping: existing?.field_mapping || defaultFieldMappingB(),
      create_rule: existing?.create_rule || defaultCreateRule(),

      webhook_secret: webhookSecret,

      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await admin
      .from("org_google_sheets_integrations")
      .upsert(
        existing?.created_at
          ? payload
          : { ...payload, created_at: new Date().toISOString() },
        { onConflict: "org_id" },
      );

    if (upsertErr) {
      return NextResponse.json(
        { error: `DB upsert failed: ${upsertErr.message}`, details: upsertErr },
        { status: 500 },
      );
    }

    // ✅ Option B: single button - run install now
    if (installNow) {
      const installResult = await callInstall({ req, orgId });
      return NextResponse.json({
        ok: true,
        mode: "single",
        spreadsheetId: sheetId,
        sheetUrl,
        reused,
        install: installResult,
      });
    }

    // Option A: only create
    return NextResponse.json({
      ok: true,
      mode: "create-only",
      spreadsheetId: sheetId,
      sheetUrl,
      reused,
      next: "Call /api/integrations/google-sheets/install to bind Apps Script & automation",
    });
  } catch (e) {
    console.error("CREATE SHEET ERROR:", e?.message, e?.details || e);
    return NextResponse.json(
      { error: e?.message || "Create failed", details: e?.details || null },
      { status: e?.status || 500 },
    );
  }
}

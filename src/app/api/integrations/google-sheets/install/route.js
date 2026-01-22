import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";
import { getValidAccessToken } from "@/lib/integrations/google/tokens";

/* ---------------- google helpers ---------------- */

async function googleJson(res) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

async function googlePost(url, accessToken, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await googleJson(res);
  return { ok: res.ok, status: res.status, body };
}

async function googlePut(url, accessToken, payload) {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await googleJson(res);
  return { ok: res.ok, status: res.status, body };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function googlePutWithRetry(url, accessToken, payload, tries = 6) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    const res = await googlePut(url, accessToken, payload);
    if (res.ok) return res;

    last = res;
    const msg = res?.body?.error?.message || "";

    // scopes/permissions errors - no point retrying
    if (/insufficient|permission|scope/i.test(msg)) break;

    await sleep(250 * Math.pow(2, i));
  }
  return last;
}

async function getScriptProjectMeta(scriptId, accessToken) {
  const res = await fetch(
    `https://script.googleapis.com/v1/projects/${encodeURIComponent(scriptId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  const body = await googleJson(res);
  return { ok: res.ok, status: res.status, body };
}

/* ---------------- base url ---------------- */

function resolveBaseUrl(req) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  return `${proto}://${host}`;
}
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const returnTo = searchParams.get("returnTo") || "/en/settings";
  if (!orgId)
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

  await requireOrgAdminRoute(orgId);

  const baseUrl = resolveBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/google/callback`;

  const state = encryptJson({ orgId, returnTo, ts: Date.now() });
  return NextResponse.redirect(buildGoogleAuthUrl({ state, redirectUri }));
}
/* ---------------- Apps Script content (Option B) ---------------- */

function buildCodeGsB({ webhookUrl, spreadsheetId, webhookSecret }) {
  return `const WEBHOOK_URL = "${webhookUrl}";
const SPREADSHEET_ID = "${spreadsheetId}";
const WEBHOOK_SECRET = "${webhookSecret}";

// columns: A title, B desc, C priority, D reporter, E email, F status, G case_id, H error_message
const COL_STATUS = 6;
const COL_CASE_ID = 7;
const COL_ERROR = 8;

function getLang() {
  try {
    const loc = (Session.getActiveUserLocale() || "").toLowerCase();
    if (loc.startsWith("he") || loc.includes("iw")) return "he";
  } catch (e) {}
  return "en";
}

function t(key) {
  const lang = getLang();
  const dict = {
    en: {
      menu: "CaseFlow",
      enable: "Enable automation",
      test: "Run test webhook",
      enabledToast: "Automation enabled ✅",
      testSending: "Sending test…",
      testDone: "Test response: ",
    },
    he: {
      menu: "CaseFlow",
      enable: "הפעל אוטומציה",
      test: "בדיקת webhook",
      enabledToast: "האוטומציה הופעלה ✅",
      testSending: "שולח בדיקה…",
      testDone: "תוצאת בדיקה: ",
    },
  };
  return (dict[lang] && dict[lang][key]) || dict.en[key] || key;
}

function onOpen(e) {
  try {
    SpreadsheetApp.getUi()
      .createMenu(t("menu"))
      .addItem(t("enable"), "setup")
      .addItem(t("test"), "testWebhook")
      .addToUi();
  } catch (err) {
    // swallow - menu will appear after authorization
  }
}


function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some((t) => t.getHandlerFunction() === "onEditInstalled");

  if (!exists) {
    ScriptApp.newTrigger("onEditInstalled").forSpreadsheet(ss).onEdit().create();
    SpreadsheetApp.getActive().toast(t("enabledToast"), t("menu"), 5);
  } else {
    SpreadsheetApp.getActive().toast(
      getLang() === "he" ? "האוטומציה כבר פעילה ✅" : "Automation is already enabled ✅",
      t("menu"),
      5
    );
  }
}


function testWebhook() {
  SpreadsheetApp.getActive().toast(t("testSending"), t("menu"), 3);

  const payload = {
    title: "Test case from Sheet",
    description: "This is a test webhook call",
    priority: "normal",
    reporter: "",
    email: "",
    status: "new",
    external_row: 2,
    spreadsheet_id: SPREADSHEET_ID,
    external_ref: SPREADSHEET_ID + ":2"
  };

  const resp = UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  SpreadsheetApp.getActive().toast(
    t("testDone") + resp.getResponseCode(),
    t("menu"),
    5
  );
}



function onEditInstalled(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return;

  try {
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const col = e.range.getColumn();

    if (row < 2) return;
    if (col !== COL_STATUS) return;

    const statusCell = sheet.getRange(row, COL_STATUS);
    const status = String(statusCell.getValue() || "").toLowerCase().trim();
    if (status !== "new") return;

    const caseIdCell = sheet.getRange(row, COL_CASE_ID);
    const errCell = sheet.getRange(row, COL_ERROR);

    const existingCaseId = String(caseIdCell.getValue() || "").trim();
    if (existingCaseId) return;

    errCell.setValue("");

    const values = sheet.getRange(row, 1, 1, 8).getValues()[0];
    const externalRef = SPREADSHEET_ID + ":" + row;

    const payload = {
      title: values[0] || null,
      description: values[1] || null,
      priority: values[2] || null,
      reporter: values[3] || null,
      email: values[4] || null,
      status: values[5] || null,
      external_row: row,
      spreadsheet_id: SPREADSHEET_ID,
      external_ref: externalRef
    };

    const resp = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = resp.getResponseCode();
    const text = resp.getContentText() || "";

    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (err) {}

    if (code >= 200 && code < 300 && data && data.ok) {
      const caseId = data.caseId || "";
      if (caseId) caseIdCell.setValue(caseId);
      statusCell.setValue("sent");
      errCell.setValue("");
    } else {
      statusCell.setValue("error");
      errCell.setValue(("Webhook failed (" + code + "): " + text).slice(0, 500));
    }
  } catch (err) {
    try {
      const sheet = e?.range?.getSheet();
      const row = e?.range?.getRow();
      if (sheet && row >= 2) {
        sheet.getRange(row, COL_STATUS).setValue("error");
        sheet.getRange(row, COL_ERROR).setValue(String(err).slice(0, 500));
      }
    } catch (_) {}
  } finally {
    lock.releaseLock();
  }
}
`;
}

function buildManifest() {
  return {
    timeZone: "Asia/Jerusalem",
    exceptionLogging: "STACKDRIVER",
    runtimeVersion: "V8",
    oauthScopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/script.projects",
      "https://www.googleapis.com/auth/script.scriptapp",
      "https://www.googleapis.com/auth/script.external_request",
    ],
  };
}

/* ---------------- main ---------------- */

export async function POST(req) {
  try {
    const { orgId } = await req.json().catch(() => ({}));
    if (!orgId)
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    await requireOrgAdminRoute(orgId);

    const admin = supabaseAdmin();
    const accessToken = await getValidAccessToken(orgId);

    const { data: integ, error: integErr } = await admin
      .from("org_google_sheets_integrations")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (integErr)
      return NextResponse.json({ error: integErr.message }, { status: 500 });
    if (!integ?.sheet_id)
      return NextResponse.json(
        { error: "Missing sheet_id. Create Sheet first." },
        { status: 400 },
      );
    if (!integ?.webhook_secret)
      return NextResponse.json(
        { error: "Missing webhook_secret." },
        { status: 500 },
      );

    // ✅ idempotent: reuse script if exists
    let scriptId = integ.script_id || null;
    let createdNew = false;

    const baseUrl = resolveBaseUrl(req);
    const webhookUrl = `${baseUrl}/api/integrations/google/webhook`;

    const contentPayload = {
      files: [
        {
          name: "Code",
          type: "SERVER_JS",
          source: buildCodeGsB({
            webhookUrl,
            spreadsheetId: integ.sheet_id,
            webhookSecret: integ.webhook_secret,
          }),
        },
        {
          name: "appsscript",
          type: "JSON",
          source: JSON.stringify(buildManifest(), null, 2),
        },
      ],
    };
    const desiredParentId = integ.sheet_id;

    // ✅ if script exists, verify it is bound to THIS spreadsheet
    if (scriptId) {
      const meta = await getScriptProjectMeta(scriptId, accessToken);

      // if deleted / not found -> recreate
      if (!meta.ok && meta.status === 404) {
        scriptId = null;
      } else if (!meta.ok) {
        return NextResponse.json(
          {
            error:
              meta?.body?.error?.message || "Failed to read script project",
            details: meta,
          },
          { status: 500 },
        );
      } else {
        const parentId = meta?.body?.parentId || null;

        // If it's not bound to this sheet -> force rebind (create new bound script)
        if (!parentId || parentId !== desiredParentId) {
          scriptId = null; // ✅ this triggers creation of a NEW bound project below
        }
      }
    }

    async function createNewScriptProject() {
      const created = await googlePost(
        "https://script.googleapis.com/v1/projects",
        accessToken,
        {
          title: `CaseFlow - ${orgId}`,
          parentId: integ.sheet_id, // ✅ bound to the spreadsheet
        },
      );
      if (!created.ok) return { ok: false, created };
      const id = created?.body?.scriptId;
      if (!id)
        return {
          ok: false,
          created: {
            ...created,
            body: { ...created.body, message: "scriptId missing" },
          },
        };
      return { ok: true, scriptId: id };
    }

    // 1) if script exists -> update
    if (scriptId) {
      const put = await googlePutWithRetry(
        `https://script.googleapis.com/v1/projects/${encodeURIComponent(scriptId)}/content`,
        accessToken,
        contentPayload,
      );

      // if script deleted/not found -> fallback to new
      if (
        !put.ok &&
        (put.status === 404 ||
          /not found/i.test(put?.body?.error?.message || ""))
      ) {
        scriptId = null;
      } else if (!put.ok) {
        return NextResponse.json(
          {
            error:
              put?.body?.error?.message || "Failed to upload script content",
            details: put,
          },
          { status: 500 },
        );
      }
    }

    // 2) if no script -> create + upload
    if (!scriptId) {
      const created = await createNewScriptProject();
      if (!created.ok) {
        return NextResponse.json(
          {
            error:
              created?.created?.body?.error?.message ||
              "Failed to create script project",
            details: created,
          },
          { status: 500 },
        );
      }
      scriptId = created.scriptId;
      createdNew = true;

      const put = await googlePutWithRetry(
        `https://script.googleapis.com/v1/projects/${encodeURIComponent(scriptId)}/content`,
        accessToken,
        contentPayload,
      );

      if (!put.ok) {
        return NextResponse.json(
          {
            error:
              put?.body?.error?.message || "Failed to upload script content",
            details: put,
          },
          { status: 500 },
        );
      }
    }

    const scriptUrl = `https://script.google.com/d/${scriptId}/edit`;

    await admin
      .from("org_google_sheets_integrations")
      .update({
        script_id: scriptId,
        script_url: scriptUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    return NextResponse.json({
      ok: true,
      scriptId,
      scriptUrl,
      webhookUrl,
      createdNew,
      next: "Open Sheet → Extensions → Apps Script → run setup() once → Authorize",
    });
  } catch (e) {
    console.error("INSTALL SCRIPT ERROR (catch):", e);
    return NextResponse.json(
      { error: e?.message || "Install failed" },
      { status: 500 },
    );
  }
}

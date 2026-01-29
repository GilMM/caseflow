// src/app/api/integrations/google-sheets/install/route.js
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

/* ---------------- Apps Script content (Bound) ---------------- */

function buildCodeGsBound({ webhookUrl, webhookSecret }) {
  return `const WEBHOOK_URL = "${webhookUrl}";
const WEBHOOK_SECRET = "${webhookSecret}";

// columns: A title, B desc, C priority, D reporter, E email, F status, G case_id, H error_message, I sync_source
const COL_STATUS = 6;
const COL_CASE_ID = 7;
const COL_ERROR = 8;
const COL_SYNC = 9;

// App statuses that can be synced (real app statuses)
const APP_STATUSES = ["new", "in_progress", "waiting_customer", "resolved", "closed"];

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
      alreadyEnabled: "Automation is already enabled ✅",
      testSending: "Sending test…",
      testDone: "Test response: ",
      setupDone: "Template updated ✅",
      statusUpdated: "Status updated ✅",
    },
    he: {
      menu: "CaseFlow",
      enable: "הפעל אוטומציה",
      test: "בדיקת webhook",
      enabledToast: "האוטומציה הופעלה ✅",
      alreadyEnabled: "האוטומציה כבר פעילה ✅",
      testSending: "שולח בדיקה…",
      testDone: "תוצאת בדיקה: ",
      setupDone: "התבנית עודכנה ✅",
      statusUpdated: "הסטטוס עודכן ✅",
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
  } catch (err) {}
}

/**
 * ✅ One-shot setup
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];

  // 1) headers (include sync_source)
  const headers = ["Title","Description","Priority","Reporter","Email","Status","case_id","error_message","sync_source"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  sheet.getRange(1,1,1,9)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground("#ededed");

  // 2) dropdown validations
  const statusRange = sheet.getRange(2, COL_STATUS, sheet.getMaxRows() - 1, 1);
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["draft","new","sent","error","in_progress","waiting_customer","resolved","closed"], true)
    .setAllowInvalid(false)
    .build();
  statusRange.setDataValidation(statusRule);

  const prioRange = sheet.getRange(2, 3, sheet.getMaxRows() - 1, 1);
  const prioRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["low","normal","high","urgent"], true)
    .setAllowInvalid(false)
    .build();
  prioRange.setDataValidation(prioRule);

  // 3) conditional formatting
  const rules = [];
  const statusCol = sheet.getRange(2, COL_STATUS, sheet.getMaxRows() - 1, 1);

  function addRule(text, bg, fg, bold) {
    const r = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(text)
      .setRanges([statusCol])
      .setBackground(bg)
      .setFontColor(fg);
    if (bold) r.setBold(true);
    rules.push(r.build());
  }

  addRule("draft",            "#f5f5f5", "#666666", false);
  addRule("new",              "#e6f2ff", "#0d59d8", true);
  addRule("sent",             "#edffed", "#2a8a2a", true);
  addRule("error",            "#ffeded", "#cc1a1a", true);
  addRule("in_progress",      "#fff7e6", "#d48806", true);
  addRule("waiting_customer", "#f9f0ff", "#722ed1", true);
  addRule("resolved",         "#f6ffed", "#389e0d", true);
  addRule("closed",           "#f2f2f2", "#777777", true);

  const fullRow = sheet.getRange(2,1,sheet.getMaxRows()-1,9);
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$F2="closed"')
      .setRanges([fullRow])
      .setFontColor("#8c8c8c")
      .setStrikethrough(true)
      .build()
  );

  sheet.setConditionalFormatRules(rules);

  // 4) protect sheet but allow A,B,F
  try {
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    protections.forEach(p => p.remove());
  } catch (e) {}

  const protection = sheet.protect().setDescription("Protected by CaseFlow");
  protection.setWarningOnly(false);

  protection.setUnprotectedRanges([
    sheet.getRange(2,1,sheet.getMaxRows()-1,1),
    sheet.getRange(2,2,sheet.getMaxRows()-1,1),
    sheet.getRange(2,COL_STATUS,sheet.getMaxRows()-1,1),
  ]);

  // 5) widths
  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 420);
  sheet.setColumnWidth(3, 130);
  sheet.setColumnWidth(4, 170);
  sheet.setColumnWidth(5, 240);
  sheet.setColumnWidth(6, 140);
  sheet.setColumnWidth(7, 160);
  sheet.setColumnWidth(8, 260);
  sheet.setColumnWidth(9, 140);

  // 6) sample
  sheet.getRange(2,1,1,9).setValues([[
    "Sample issue title",
    "Describe the issue here",
    "normal",
    "",
    "",
    "draft",
    "",
    "",
    ""
  ]]);

  // 7) installable trigger
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "onEditInstalled") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onEditInstalled").forSpreadsheet(ss).onEdit().create();

  SpreadsheetApp.getActive().toast(t("setupDone"), t("menu"), 5);
}

function testWebhook() {
  SpreadsheetApp.getActive().toast(t("testSending"), t("menu"), 3);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const payload = {
    title: "Test case from Sheet",
    description: "This is a test webhook call",
    priority: "normal",
    reporter: "",
    email: "",
    status: "new",
    external_row: 2,
    spreadsheet_id: ss.getId(),
    external_ref: ss.getId() + ":2"
  };

  const resp = UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  SpreadsheetApp.getActive().toast(t("testDone") + resp.getResponseCode(), t("menu"), 5);
}

/**
 * ✅ Called from your server (scripts.run) when status changed in the app.
 * Prevents loop by marking sync_source="app", then writing status.
 */
function syncStatusFromApp(caseId, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: "No data rows" };

  const caseIds = sheet.getRange(2, COL_CASE_ID, lastRow - 1, 1).getValues().map(r => String(r[0] || "").trim());
  const idx = caseIds.indexOf(String(caseId || "").trim());

  if (idx === -1) {
    return { ok: false, error: "case_id not found in sheet" };
  }

  const row = idx + 2;

  // mark as app-driven update (anti-loop)
  sheet.getRange(row, COL_SYNC).setValue("app");

  // write status + clear error
  sheet.getRange(row, COL_STATUS).setValue(String(newStatus || "").toLowerCase());
  sheet.getRange(row, COL_ERROR).setValue("");

  return { ok: true, row };
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
    if (status === "draft") return;

    // ✅ log only (no anti-loop)
    sheet.getRange(row, COL_SYNC).setValue("sheet");

    const caseIdCell = sheet.getRange(row, COL_CASE_ID);
    const errCell = sheet.getRange(row, COL_ERROR);
    const existingCaseId = String(caseIdCell.getValue() || "").trim();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const externalRef = ss.getId() + ":" + row;

    // Create
    if (status === "new" && !existingCaseId) {
      errCell.setValue("");

      const values = sheet.getRange(row, 1, 1, 9).getValues()[0];
      const payload = {
        action: "create",
        title: values[0] || null,
        description: values[1] || null,
        priority: values[2] || null,
        reporter: values[3] || null,
        email: values[4] || null,
        status: "new",
        external_row: row,
        spreadsheet_id: ss.getId(),
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

        statusCell.setValue("sent"); // ✅ UI-only marker
        errCell.setValue("");
      } else {
        statusCell.setValue("error");
        errCell.setValue(("Create failed (" + code + "): " + text).slice(0, 500));
      }
      return;
    }

    // Update (only real statuses)
    if (existingCaseId && APP_STATUSES.includes(status)) {
      errCell.setValue("");

      const payload = {
        action: "update",
        case_id: existingCaseId,
        status: status,
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
        errCell.setValue("");
      } else {
        errCell.setValue(("Update failed (" + code + "): " + text).slice(0, 500));
      }
      return;
    }

  } catch (err) {
    try {
      const sheet = e?.range?.getSheet();
      const row = e?.range?.getRow();
      if (sheet && row >= 2) sheet.getRange(row, COL_ERROR).setValue(String(err).slice(0, 500));
    } catch (_) {}
  } finally {
    lock.releaseLock();
  }
}
`;
}

function buildManifest() {
  // This is the Apps Script manifest (scopes for the script runtime).
  // This does NOT require your app to request spreadsheets scope.
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

/* ---------------- scripts.run (attempt) ---------------- */

async function runScriptSetup({ accessToken, scriptId }) {
  const res = await fetch(
    `https://script.googleapis.com/v1/scripts/${encodeURIComponent(scriptId)}:run`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        function: "setup",
        parameters: [],
        devMode: true,
      }),
    },
  );

  const body = await googleJson(res);

  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }

  // Even 200 can contain "error" inside body for Apps Script execution
  if (body?.error) {
    return { ok: false, status: 200, body };
  }

  return { ok: true, status: 200, body };
}

/* ---------------- main POST ---------------- */

export async function POST(req) {
  try {
    const { orgId } = await req.json().catch(() => ({}));
    if (!orgId)
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    await requireOrgAdminRoute(req, orgId);

    const admin = supabaseAdmin();
    const accessToken = await getValidAccessToken(orgId);

    const { data: integ, error: integErr } = await admin
      .from("org_google_sheets_integrations")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (integErr)
      return NextResponse.json({ error: integErr.message }, { status: 500 });
    if (!integ)
      return NextResponse.json(
        { error: "Missing integration row. Run create first." },
        { status: 400 },
      );
    if (!integ?.sheet_id)
      return NextResponse.json(
        { error: "Missing sheet_id. Run create first." },
        { status: 400 },
      );
    if (!integ?.webhook_secret)
      return NextResponse.json(
        { error: "Missing webhook_secret." },
        { status: 500 },
      );

    // idempotent: reuse script if exists (but ensure bound to this sheet)
    let scriptId = integ.script_id || null;
    let createdNew = false;

    const baseUrl = resolveBaseUrl(req);
    const webhookUrl = `${baseUrl}/api/integrations/google/webhook`;

    const contentPayload = {
      files: [
        {
          name: "Code",
          type: "SERVER_JS",
          source: buildCodeGsBound({
            webhookUrl,
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

    if (scriptId) {
      const meta = await getScriptProjectMeta(scriptId, accessToken);

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
        if (!parentId || parentId !== desiredParentId) {
          scriptId = null; // force new bound project
        }
      }
    }

    async function createNewBoundScriptProject() {
      const created = await googlePost(
        "https://script.googleapis.com/v1/projects",
        accessToken,
        {
          title: `CaseFlow - ${orgId}`,
          parentId: desiredParentId, // ✅ bind to spreadsheet
        },
      );

      if (!created.ok) return { ok: false, created };

      const id = created?.body?.scriptId;
      if (!id) {
        return {
          ok: false,
          created: {
            ...created,
            body: { ...created.body, message: "scriptId missing" },
          },
        };
      }
      return { ok: true, scriptId: id };
    }

    // update existing script content
    if (scriptId) {
      const put = await googlePutWithRetry(
        `https://script.googleapis.com/v1/projects/${encodeURIComponent(scriptId)}/content`,
        accessToken,
        contentPayload,
      );

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

    // create + upload
    if (!scriptId) {
      const created = await createNewBoundScriptProject();
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

    const scriptUrl = `https://script.google.com/home/projects/${scriptId}/edit`;

    // persist script info + ensure enabled
    await admin
      .from("org_google_sheets_integrations")
      .update({
        script_id: scriptId,
        script_url: scriptUrl,
        is_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    // ✅ Attempt to run setup automatically (no manual)
    const run = await runScriptSetup({ accessToken, scriptId });

    // Even if run failed, return everything so UI can guide user to authorize once.
    const needsAuth =
      !run.ok &&
      (JSON.stringify(run.body || "")
        .toLowerCase()
        .includes("authorization") ||
        JSON.stringify(run.body || "")
          .toLowerCase()
          .includes("auth") ||
        JSON.stringify(run.body || "")
          .toLowerCase()
          .includes("permission"));

    return NextResponse.json({
      ok: true,
      createdNew,
      scriptId,
      scriptUrl,
      webhookUrl,
      sheetId: integ.sheet_id,
      sheetUrl:
        integ.sheet_url ||
        `https://docs.google.com/spreadsheets/d/${integ.sheet_id}/edit`,
      setup: {
        ok: run.ok,
        needsAuth,
        details: run.ok ? null : run,
      },
      next: run.ok
        ? "Done ✅ Open the Sheet and start using Status=new to create cases"
        : "Open scriptUrl once → Run setup() / authorize → then it will work automatically",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Install failed", details: e?.details || null },
      { status: e?.status || 500 },
    );
  }
}

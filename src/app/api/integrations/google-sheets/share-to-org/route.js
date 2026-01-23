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
    cache: "no-store",
  });
  const body = await googleJson(res);
  return { ok: res.ok, status: res.status, body };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function googlePostWithRetry(url, accessToken, payload, tries = 6) {
  let last = null;

  for (let i = 0; i < tries; i++) {
    const res = await googlePost(url, accessToken, payload);
    if (res.ok) return res;

    last = res;
    const msg = res?.body?.error?.message || res?.body?.raw || "";

    // If already exists / duplicate permission, treat as success-ish in caller
    // If insufficient scopes, stop retry
    if (/insufficient|permission|scope/i.test(msg)) break;

    await sleep(250 * Math.pow(2, i));
  }

  return last;
}

/* ---------------- drive share ---------------- */

async function shareFileToEmail({
  fileId,
  email,
  role = "writer",
  accessToken,
}) {
  // Drive Permissions: https://www.googleapis.com/drive/v3/files/fileId/permissions
  // "sendNotificationEmail=false" = לא שולח מייל (אפשר לשנות ל-true אם תרצה)
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId,
  )}/permissions?sendNotificationEmail=false`;

  const payload = {
    type: "user",
    role, // "writer" | "reader"
    emailAddress: email,
  };

  const res = await googlePostWithRetry(url, accessToken, payload);

  // אם כבר קיימת הרשאה: Drive מחזיר לפעמים 409 או 400 עם הודעה "already exists"
  const msg = res?.body?.error?.message || res?.body?.raw || "";
  const already =
    res?.status === 409 || /already exists|duplicate/i.test(String(msg));

  return {
    ok: res.ok || already,
    already,
    status: res.status,
    body: res.body,
  };
}

/* ---------------- main ---------------- */

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const orgId = body?.orgId;

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    // ✅ רק אדמינים בארגון יכולים לשתף לקבוצה
    await requireOrgAdminRoute(orgId);

    const admin = supabaseAdmin();

    // 1) לוודא שיש Sheet לארגון
    const { data: integ, error: integErr } = await admin
      .from("org_google_sheets_integrations")
      .select("org_id, sheet_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (integErr) {
      return NextResponse.json({ error: integErr.message }, { status: 500 });
    }
    if (!integ?.sheet_id) {
      return NextResponse.json(
        { error: "Missing sheet_id. Create Sheet first." },
        { status: 400 },
      );
    }

    // 2) להביא את כל חברי הארגון
    const { data: members, error: memErr } = await admin
      .from("org_memberships")
      .select("user_id, is_active")
      .eq("org_id", orgId)
      .eq("is_active", true);

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    const userIds = (members || [])
      .map((m) => m.user_id)
      .filter(Boolean);

    // 3) להביא אימיילים של המשתמשים (Supabase Auth)
    // חשוב: זה דורש SERVICE ROLE (יש לך ב-Vercel)
    const emails = [];
    for (const uid of userIds) {
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        const email = data?.user?.email || null;
        if (email) emails.push(email.toLowerCase());
      } catch (e) {
        // אם משתמש לא נגיש - מדלגים
      }
    }

    const uniqueEmails = Array.from(new Set(emails)).filter(Boolean);

    // 4) Access token של Google (Org-level)
    const accessToken = await getValidAccessToken(orgId);

    // 5) לשתף את הקובץ לכל אימייל כ-writer
    const results = [];
    let okCount = 0;
    let failCount = 0;

    for (const email of uniqueEmails) {
      const r = await shareFileToEmail({
        fileId: integ.sheet_id,
        email,
        role: "writer",
        accessToken,
      });

      results.push({
        email,
        ok: !!r.ok,
        already: !!r.already,
        status: r.status,
      });

      if (r.ok) okCount += 1;
      else failCount += 1;
    }

    return NextResponse.json({
      ok: true,
      orgId,
      sheetId: integ.sheet_id,
      role: "writer",
      totalMembers: userIds.length,
      uniqueEmails: uniqueEmails.length,
      sharedOk: okCount,
      sharedFailed: failCount,
      results,
      note:
        "Members will see the shared Sheet in their own Google Drive if they are logged into that Google account.",
    });
  } catch (e) {
    console.error("SHARE TO ORG ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to share" },
      { status: 500 },
    );
  }
}

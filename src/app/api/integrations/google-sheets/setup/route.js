import { NextResponse } from "next/server";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * One-click: Create sheet if missing + (re)install script.
 * Returns sheet + script urls for UI.
 */
export async function POST(req) {
  try {
    const { orgId, defaultQueueId } = await req.json().catch(() => ({}));
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    // ✅ verifies caller is logged-in org admin (uses cookies from THIS request)
    await requireOrgAdminRoute(orgId);

    const admin = supabaseAdmin();

    const { data: integ, error: integErr } = await admin
      .from("org_google_sheets_integrations")
      .select("org_id,sheet_id,sheet_url,default_queue_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (integErr) return NextResponse.json({ error: integErr.message }, { status: 500 });

    // ✅ IMPORTANT: forward auth cookies to internal fetch calls
    const cookie = req.headers.get("cookie") || "";

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("x-forwarded-host") || req.headers.get("host")}`;

    // 1) Ensure Sheet exists
    let sheetId = integ?.sheet_id || null;
    let sheetUrl = integ?.sheet_url || null;

    if (!sheetId || !sheetUrl) {
      if (!defaultQueueId) {
        return NextResponse.json({ error: "Missing defaultQueueId" }, { status: 400 });
      }

      const rCreate = await fetch(`${baseUrl}/api/integrations/google-sheets/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie, // ✅ pass session cookies
        },
        body: JSON.stringify({ orgId, defaultQueueId }),
        cache: "no-store",
      });

      const createJson = await rCreate.json().catch(() => null);
      if (!rCreate.ok) {
        return NextResponse.json(
          { error: createJson?.error || "Create failed", details: createJson?.details || createJson },
          { status: rCreate.status || 500 }
        );
      }

      sheetId = createJson?.spreadsheetId || createJson?.sheet_id || null;
      sheetUrl = createJson?.sheetUrl || createJson?.sheet_url || null;
    }

    // 2) (Re)install/update script ALWAYS
    const rInstall = await fetch(`${baseUrl}/api/integrations/google-sheets/install`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie, // ✅ pass session cookies
      },
      body: JSON.stringify({ orgId }),
      cache: "no-store",
    });

    const installJson = await rInstall.json().catch(() => null);
    if (!rInstall.ok) {
      return NextResponse.json(
        { error: installJson?.error || "Install failed", details: installJson?.details || installJson },
        { status: rInstall.status || 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      sheetId,
      sheetUrl,
      scriptId: installJson?.scriptId || installJson?.script_id || null,
      scriptUrl: installJson?.scriptUrl || installJson?.script_url || null,
      next:
        "פתח את ה-Sheet פעם אחת, וב-Extensions → Apps Script תריץ setup() ותאשר הרשאות. אחרי זה שינוי Status ל-new ייצור Case.",
    });
  } catch (e) {
    console.error("SETUP ERROR:", e);
    return NextResponse.json({ error: e?.message || "Setup failed" }, { status: 500 });
  }
}

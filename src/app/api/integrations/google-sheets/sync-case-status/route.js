import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireSessionUserRoute } from "@/lib/auth/requireOrgAdminRoute"; // יש אצלך בקובץ הזה export
import { getValidAccessToken } from "@/lib/integrations/google/tokens";

async function googleJson(res) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export async function POST(req) {
  try {
    const { caseId, status } = await req.json().catch(() => ({}));
    if (!caseId) return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
    if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

    // ✅ must be logged in (cookies) OR Bearer
    const { supabase } = await requireSessionUserRoute(req);

    // ✅ get case (RLS will ensure user can see it)
    const { data: c, error: cErr } = await supabase
      .from("cases")
      .select("id, org_id")
      .eq("id", caseId)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!c?.org_id) return NextResponse.json({ error: "Case not found / no access" }, { status: 404 });

    const orgId = c.org_id;

    const admin = supabaseAdmin();

    // ✅ integration row
    const { data: integ, error: iErr } = await admin
      .from("org_google_sheets_integrations")
      .select("org_id,is_enabled,script_id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (iErr) throw iErr;
    if (!integ || !integ.is_enabled) {
      return NextResponse.json({ error: "Integration not found/disabled" }, { status: 404 });
    }
    if (!integ.script_id) {
      return NextResponse.json({ error: "Missing script_id. Run install." }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(orgId);

    // ✅ Call Apps Script function
    const runRes = await fetch(
      `https://script.googleapis.com/v1/scripts/${encodeURIComponent(integ.script_id)}:run`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          function: "syncStatusFromApp",
          parameters: [caseId, String(status).toLowerCase()],
          devMode: true,
        }),
      }
    );

    const runBody = await googleJson(runRes);

    if (!runRes.ok || runBody?.error) {
      return NextResponse.json(
        { error: "Apps Script run failed", details: runBody },
        { status: 500 }
      );
    }

    // Apps Script returns response.result
    const result = runBody?.response?.result || null;

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("SYNC CASE STATUS ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Sync failed" },
      { status: 500 }
    );
  }
}

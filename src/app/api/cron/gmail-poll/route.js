import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/gmail-poll
 * Called by Vercel Cron every 2 minutes.
 * Iterates all enabled Gmail integrations and polls each one.
 */
export async function GET(req) {
  try {
    const authHeader = (req.headers.get("authorization") || "").trim();
    const cronSecret = (process.env.CRON_SECRET || "").trim();

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    const { data: integrations, error } = await admin
      .from("org_gmail_integrations")
      .select("org_id")
      .eq("is_enabled", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No enabled integrations",
        polled: 0,
      });
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_APP_URL" },
        { status: 500 },
      );
    }

    const results = [];

    // Poll each org sequentially to avoid Gmail rate limits
    for (const integ of integrations) {
      try {
        const res = await fetch(`${baseUrl}/api/integrations/gmail/poll`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": cronSecret,
          },
          body: JSON.stringify({ orgId: integ.org_id }),
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        results.push({
          orgId: integ.org_id,
          status: res.status,
          ...(data || {}),
        });
      } catch (e) {
        results.push({
          orgId: integ.org_id,
          status: 500,
          error: e?.message || "Poll failed",
        });
      }
    }

    return NextResponse.json({ ok: true, polled: results.length, results });
  } catch (e) {
    console.error("GMAIL CRON ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Cron failed" },
      { status: 500 },
    );
  }
}

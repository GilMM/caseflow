import { NextResponse } from "next/server";
import { decryptJson, encryptJson } from "@/lib/integrations/google/crypto";
import { exchangeCodeForTokens, fetchGoogleEmail } from "@/lib/integrations/google/oauth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

function resolvePublicBaseUrl(req) {
  // 1) הכי אמין אצלך בפיתוח עם ngrok
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  // 2) fallback: forwarded headers (ngrok/proxies)
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const fwdHost = req.headers.get("x-forwarded-host");
  const host = fwdHost || req.headers.get("host");
  return `${proto}://${host}`;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateRaw = searchParams.get("state");

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
    if (!stateRaw) return NextResponse.json({ error: "Missing state" }, { status: 400 });

    const state = decryptJson(stateRaw);
    const orgId = state?.orgId;
    const returnTo = state?.returnTo || "/en/settings";
    if (!orgId) return NextResponse.json({ error: "Bad state" }, { status: 400 });

    // חייב להיות משתמש מחובר (session cookie)
    const { user } = await requireOrgAdminRoute(orgId);

    const tokens = await exchangeCodeForTokens({ code });
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token || null;
    const expiresIn = tokens.expires_in || 3600;

    const profile = await fetchGoogleEmail({ accessToken }); // { email, name, picture }
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const admin = supabaseAdmin();

    const { error } = await admin.from("org_google_connections").upsert(
      {
        org_id: orgId,
        connected_by_user_id: user.id,
        google_email: profile.email,
        access_token_enc: encryptJson({ v: accessToken }),
        refresh_token_enc: refreshToken ? encryptJson({ v: refreshToken }) : null,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const base = resolvePublicBaseUrl(req);

    // אם returnTo הוא נתיב יחסי (כמו /en/settings) זה יעבוד
    // ואם הוא בטעות URL מלא — נשתמש בו כמו שהוא
    const redirectTo =
      /^https?:\/\//i.test(returnTo) ? returnTo : new URL(returnTo, base).toString();

    return NextResponse.redirect(redirectTo);
  } catch (e) {
    console.error("GOOGLE CALLBACK ERROR:", e);
    return NextResponse.json({ error: e?.message || "Callback failed" }, { status: 500 });
  }
}

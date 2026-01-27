// src/app/api/integrations/google/auth/callback/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { decryptJson, encryptJson } from "@/lib/integrations/google/crypto";
import { exchangeCodeForTokens, fetchGoogleEmail } from "@/lib/integrations/google/oauth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const STATE_SKEW_SEC = 15;        // allow small clock skew
const STATE_MAX_AGE_SEC = 10 * 60; // 10 minutes

function canonicalOrigin(req) {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  return `${proto}://${host}`;
}

function safeReturnTo(v) {
  // only allow same-site paths
  const s = String(v || "/en/settings");
  if (!s.startsWith("/")) return "/en/settings";
  return s;
}

export async function GET(req) {
  const url = new URL(req.url);

  try {
    const code = url.searchParams.get("code");
    const stateEnc = url.searchParams.get("state");

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
    if (!stateEnc) return NextResponse.json({ error: "Missing state" }, { status: 400 });

    // 1) decode + validate state
    const state = decryptJson(stateEnc);
    const orgId = state?.orgId;
    const returnTo = safeReturnTo(state?.returnTo || "/en/settings");

    if (!orgId) {
      return NextResponse.json({ error: "Invalid state (missing orgId)" }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const iat = Number(state?.iat || 0);
    const exp = Number(state?.exp || 0);

    // validate exp
    if (!exp || now > exp + STATE_SKEW_SEC) {
      return NextResponse.json({ error: "OAuth state expired" }, { status: 400 });
    }
    // validate age (defense-in-depth)
    if (!iat || now - iat > STATE_MAX_AGE_SEC + STATE_SKEW_SEC) {
      return NextResponse.json({ error: "OAuth state too old" }, { status: 400 });
    }

    // validate nonce cookie
    const cookieStore = await cookies();
    const nonceCookie = cookieStore.get("cf_oauth_nonce")?.value || "";
    const nonceState = String(state?.nonce || "");
    if (!nonceCookie || !nonceState || nonceCookie !== nonceState) {
      return NextResponse.json({ error: "Invalid OAuth state (nonce mismatch)" }, { status: 400 });
    }

    // clear nonce (one-time)
    cookieStore.set("cf_oauth_nonce", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    // 2) redirectUri must match EXACT redirect used in auth step
    const origin = canonicalOrigin(req);
    const redirectUri = state?.redirectUri || `${origin}/api/integrations/google/auth/callback`;

    // 3) exchange code -> tokens
    const tokens = await exchangeCodeForTokens({ code, redirectUri });

    const accessToken = tokens?.access_token;
    const refreshToken = tokens?.refresh_token || null;
    const expiresIn = Number(tokens?.expires_in || 0);

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access_token from Google" }, { status: 500 });
    }

    // 4) fetch user info (email)
    const userInfo = await fetchGoogleEmail({ accessToken });
    const googleEmail = userInfo?.email || null;

    // 5) persist tokens
    const admin = supabaseAdmin();

    const { data: existing, error: exErr } = await admin
      .from("org_google_connections")
      .select("org_id, refresh_token_enc")
      .eq("org_id", orgId)
      .maybeSingle();

    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const accessEnc = encryptJson({ v: accessToken });
    const refreshEnc = refreshToken
      ? encryptJson({ v: refreshToken })
      : existing?.refresh_token_enc || null;

    const row = {
      org_id: orgId,
      google_email: googleEmail,
      access_token_enc: accessEnc,
      refresh_token_enc: refreshEnc,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: upErr } = await admin.from("org_google_connections").update(row).eq("org_id", orgId);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    } else {
      const { error: insErr } = await admin
        .from("org_google_connections")
        .insert({ ...row, created_at: new Date().toISOString() });
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // 6) set a short-lived "post connect" cookie (optional UX helper)
    cookieStore.set(
      "cf_post_connect",
      encryptJson({ orgId, returnTo, ts: Date.now() }),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 5 * 60,
      }
    );

    // 7) redirect back (canonical origin)
    return NextResponse.redirect(new URL(returnTo, origin));
  } catch (e) {
    console.error("GOOGLE CALLBACK ERROR:", e);
    return NextResponse.json(
      { error: "OAuth callback failed", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}

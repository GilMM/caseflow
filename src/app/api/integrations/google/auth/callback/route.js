// src/app/api/integrations/google/auth/callback/route.js

import { NextResponse } from "next/server";
import { decryptJson, encryptJson } from "@/lib/integrations/google/crypto";
import {
  exchangeCodeForTokens,
  fetchGoogleEmail,
} from "@/lib/integrations/google/oauth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

export async function GET(req) {
  const url = new URL(req.url);

  try {
    const code = url.searchParams.get("code");
    const stateEnc = url.searchParams.get("state");

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }
    if (!stateEnc) {
      return NextResponse.json({ error: "Missing state" }, { status: 400 });
    }

    // 1) decode state
    const state = decryptJson(stateEnc);
    const orgId = state?.orgId;
    const returnTo = state?.returnTo || "/en/settings";

    if (!orgId) {
      return NextResponse.json(
        { error: "Invalid state (missing orgId)" },
        { status: 400 },
      );
    }

    // 2) ensure user is allowed (requires session cookie)
    if (!orgId) {
      return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
    }
        // ✅ IMPORTANT: must match EXACT redirect_uri used in the auth step
    const redirectUri =
      state?.redirectUri ||
      `${url.origin}/api/integrations/google/auth/callback`;

    // 3) exchange code -> tokens
    const tokens = await exchangeCodeForTokens({ code, redirectUri });

    const accessToken = tokens?.access_token;
    const refreshToken = tokens?.refresh_token || null;
    const expiresIn = Number(tokens?.expires_in || 0);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing access_token from Google" },
        { status: 500 },
      );
    }

    // 4) fetch user info
    const userInfo = await fetchGoogleEmail({ accessToken });
    const googleEmail = userInfo?.email || null;

    // 5) persist (don't overwrite refresh token with null)
    const admin = supabaseAdmin();

    const { data: existing, error: exErr } = await admin
      .from("org_google_connections")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json({ error: exErr.message }, { status: 500 });
    }

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
      const { error: upErr } = await admin
        .from("org_google_connections")
        .update(row)
        .eq("org_id", orgId);

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    } else {
      const { error: insErr } = await admin
        .from("org_google_connections")
        .insert({ ...row, created_at: new Date().toISOString() });

      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }

    // 6) redirect back
    return NextResponse.redirect(new URL(returnTo, url.origin));
  } catch (e) {
    console.error("GOOGLE CALLBACK ERROR:", e);

    return NextResponse.json(
      {
        error: "OAuth callback failed",
        message: e?.message || String(e),
      },
      { status: 500 },
    );
  }
}

// src/app/api/integrations/google/auth/start/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

import { encryptJson } from "@/lib/integrations/google/crypto";
import { buildGoogleAuthUrl } from "@/lib/integrations/google/oauth";

const OAUTH_STATE_TTL_SEC = 10 * 60;

function resolvePublicBaseUrl(req) {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (env) return env.replace(/\/$/, "");

  const proto = req.headers.get("x-forwarded-proto") || "http";
  const fwdHost = req.headers.get("x-forwarded-host");
  const host = fwdHost || req.headers.get("host");
  return `${proto}://${host}`;
}

function safeReturnTo(v) {
  const s = String(v || "/en/settings");
  if (!s.startsWith("/")) return "/en/settings";
  return s;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const returnTo = safeReturnTo(searchParams.get("returnTo") || "/en/settings");

  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  const baseUrl = resolvePublicBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/google/auth/callback`;

  // ✅ nonce + TTL to prevent CSRF/tampering
  const nonce = crypto.randomBytes(16).toString("hex");
  const now = Math.floor(Date.now() / 1000);

  const state = encryptJson({
    orgId,
    returnTo,
    redirectUri,
    nonce,
    iat: now,
    exp: now + OAUTH_STATE_TTL_SEC,
  });

  const cookieStore = await cookies();
  cookieStore.set("cf_oauth_nonce", nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_TTL_SEC,
  });

  const authUrl = buildGoogleAuthUrl({ state, redirectUri });
  return NextResponse.redirect(authUrl);
}

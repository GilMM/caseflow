// src/lib/integrations/google/oauth.js

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/script.projects",
  "https://www.googleapis.com/auth/script.deployments",
  "https://www.googleapis.com/auth/script.scriptapp",
  "https://www.googleapis.com/auth/script.external_request",
].join(" ");

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// ✅ FIX: הוספנו redirectUri כפרמטר אופציונלי
export function buildGoogleAuthUrl({ state, redirectUri } = {}) {
  const clientId = mustEnv("GOOGLE_OAUTH_CLIENT_ID");

  // אם לא מעבירים redirectUri מבחוץ – משתמשים ב ENV
  const finalRedirect = (redirectUri || mustEnv("GOOGLE_OAUTH_REDIRECT_URI")).trim();

  const params = new URLSearchParams();
  params.set("client_id", clientId);
  params.set("redirect_uri", finalRedirect);
  params.set("response_type", "code");
  params.set("scope", GOOGLE_SCOPES);

  // ✅ important for refresh_token
  params.set("access_type", "offline");
  params.set("prompt", "consent");
  params.set("include_granted_scopes", "true");

  if (state) params.set("state", state);

  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForTokens({ code , redirectUri }) {
  const clientId = mustEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = mustEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const finalRedirectUri = redirectUri || mustEnv("GOOGLE_OAUTH_REDIRECT_URI");

  const body = new URLSearchParams();
  body.set("code", code);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("redirect_uri", finalRedirectUri);
  body.set("grant_type", "authorization_code");


  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error_description || data?.error || "Token exchange failed");
  }
  return data;
}

export async function refreshAccessToken({ refreshToken }) {
  const clientId = mustEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = mustEnv("GOOGLE_OAUTH_CLIENT_SECRET");

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("refresh_token", refreshToken);
  body.set("grant_type", "refresh_token");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error_description || data?.error || "Token refresh failed");
  }
  return data;
}

export async function fetchGoogleEmail({ accessToken }) {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error_description || data?.error || "Failed to fetch user info");
  }
  return {
    email: data?.email || null,
    name: data?.name || null,
    picture: data?.picture || null,
  };
}

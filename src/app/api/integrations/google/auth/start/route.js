import { NextResponse } from "next/server";
import { encryptJson } from "@/lib/integrations/google/crypto";
import { buildGoogleAuthUrl } from "@/lib/integrations/google/oauth";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

function resolvePublicBaseUrl(req) {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (env) return env.replace(/\/$/, "");

  const proto = req.headers.get("x-forwarded-proto") || "http";
  const fwdHost = req.headers.get("x-forwarded-host");
  const host = fwdHost || req.headers.get("host");
  return `${proto}://${host}`;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const returnTo = searchParams.get("returnTo") || "/en/settings";
  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  await requireOrgAdminRoute(orgId);

  const baseUrl = resolvePublicBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/google/callback`;

  const state = encryptJson({ orgId, returnTo, ts: Date.now() });

  return NextResponse.redirect(
    buildGoogleAuthUrl({
      state,
      redirectUri, // ✅ חשוב
    }),
  );
}

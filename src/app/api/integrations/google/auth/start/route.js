import { NextResponse } from "next/server";
import { encryptJson } from "@/lib/integrations/google/crypto";
import { buildGoogleAuthUrl } from "@/lib/integrations/google/oauth";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const returnTo = searchParams.get("returnTo") || "/en/settings";
  if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

  await requireOrgAdminRoute(orgId);

  const state = encryptJson({ orgId, returnTo, ts: Date.now() });
  return NextResponse.redirect(buildGoogleAuthUrl({ state }));
}

import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

function genSecret() {
  return crypto.randomBytes(24).toString("hex");
}

function resolvePublicBaseUrl(req) {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (env) return env.replace(/\/$/, "");

  const proto = req.headers.get("x-forwarded-proto") || "http";
  const fwdHost = req.headers.get("x-forwarded-host");
  const host = fwdHost || req.headers.get("host");
  return `${proto}://${host}`;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const { orgId } = body || {};
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    await requireOrgAdminRoute(orgId);

    const admin = supabaseAdmin();
    const secret = genSecret();

    const { data, error } = await admin
      .from("org_google_sheets_integrations")
      .update({ webhook_secret: secret, updated_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const baseUrl = resolvePublicBaseUrl(req);
    const webhookUrl = `${baseUrl}/api/integrations/google/webhook`;

    return NextResponse.json({
      ok: true,
      integration: data,
      webhookUrl,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: e?.status || 500 },
    );
  }
}

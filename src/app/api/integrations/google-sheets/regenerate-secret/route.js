import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdmin } from "@/lib/auth/requireOrgAdminRoute";

function genSecret() {
  return crypto.randomBytes(24).toString("hex");
}

function webhookUrl(req) {
  const u = new URL(req.url);
  return `${u.origin}/api/integrations/google/webhook`;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const { orgId } = body || {};
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    await requireOrgAdmin({ orgId });

    const admin = supabaseAdmin();
    const secret = genSecret();

    const { data, error } = await admin
      .from("org_google_sheets_integrations")
      .update({ webhook_secret: secret, updated_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, integration: data, webhookUrl: webhookUrl(req) });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

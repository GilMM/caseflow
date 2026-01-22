import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrgAdminRoute } from "@/lib/auth/requireOrgAdminRoute";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    // Verify user has access
    await requireOrgAdminRoute(orgId);

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("org_google_connections")
      .select("google_email, token_expires_at, updated_at")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ connected: false, email: null });
    }

    return NextResponse.json({
      connected: true,
      email: data.google_email,
      expiresAt: data.token_expires_at,
      updatedAt: data.updated_at,
    });
  } catch (e) {
    console.error("GOOGLE CONNECTION STATUS ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to get connection status" },
      { status: e?.status || 500 }
    );
  }
}

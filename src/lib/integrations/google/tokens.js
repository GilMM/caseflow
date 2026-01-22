import { supabaseAdmin } from "@/lib/supabase/admin";
import { decryptJson, encryptJson } from "@/lib/integrations/google/crypto";
import { refreshAccessToken } from "@/lib/integrations/google/oauth";

/**
 * Returns a valid access token for the org.
 * - If not expired -> returns current token
 * - If expired -> refreshes using refresh_token and updates DB
 */
export async function getValidAccessToken(orgId) {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("org_google_connections")
    .select("access_token_enc, refresh_token_enc, token_expires_at")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.access_token_enc) throw new Error("Google not connected");

  const accessToken = decryptJson(data.access_token_enc)?.v;
  const refreshToken = data.refresh_token_enc
    ? decryptJson(data.refresh_token_enc)?.v
    : null;

  if (!accessToken) throw new Error("Missing access token");

  const exp = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
  const expired = exp ? Date.now() > exp - 60_000 : false; // 60s buffer

  if (!expired) return accessToken;

  if (!refreshToken) throw new Error("Token expired and no refresh token");

  const refreshed = await refreshAccessToken(refreshToken);
  const newAccess = refreshed.access_token;
  const expiresIn = refreshed.expires_in || 3600;
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error: upErr } = await admin
    .from("org_google_connections")
    .update({
      access_token_enc: encryptJson({ v: newAccess }),
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId);

  if (upErr) throw new Error(upErr.message);

  return newAccess;
}

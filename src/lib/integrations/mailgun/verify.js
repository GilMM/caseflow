import crypto from "crypto";

export function verifyMailgunSignature({ timestamp, token, signature }) {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) throw new Error("Missing MAILGUN_WEBHOOK_SIGNING_KEY");

  const ts = String(timestamp || "");
  const tk = String(token || "");
  const sig = String(signature || "");

  const computed = crypto
    .createHmac("sha256", signingKey)
    .update(`${ts}${tk}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sig));
  } catch {
    return false;
  }
}

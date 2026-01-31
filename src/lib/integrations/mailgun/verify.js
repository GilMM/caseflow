import crypto from "crypto";

/**
 * Verify a Mailgun webhook signature.
 * Signature = HMAC-SHA256(timestamp + token, signing_key)
 */
export function verifyMailgunSignature({ timestamp, token, signature }) {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) throw new Error("Missing MAILGUN_WEBHOOK_SIGNING_KEY");

  const computed = crypto
    .createHmac("sha256", signingKey)
    .update(timestamp + token)
    .digest("hex");

  return computed === signature;
}

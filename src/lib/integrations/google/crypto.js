import crypto from "crypto";

function getKey() {
  const b64 = process.env.GOOGLE_OAUTH_TOKEN_ENC_KEY;
  if (!b64) throw new Error("Missing GOOGLE_OAUTH_TOKEN_ENC_KEY");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("GOOGLE_OAUTH_TOKEN_ENC_KEY must be 32 bytes base64");
  return key;
}

export function encryptJson(obj) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function decryptJson(token) {
  const key = getKey();
  const [ivB64, tagB64, encB64] = (token || "").split(".");
  if (!ivB64 || !tagB64 || !encB64) throw new Error("Bad encrypted payload");

  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const enc = Buffer.from(encB64, "base64url");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}

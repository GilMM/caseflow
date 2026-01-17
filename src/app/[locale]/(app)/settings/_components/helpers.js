// src/app/(app)/settings/_components/helpers.js
export function initials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || "";
  return (a + b).toUpperCase() || "?";
}

export function safeSrc(url, bust) {
  const u = (url || "").trim();
  if (!u) return null;
  const v = bust ? String(bust) : String(Date.now());
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}v=${encodeURIComponent(v)}`;
}

export function getExt(filename) {
  const parts = String(filename || "").split(".");
  const ext = parts.length > 1 ? parts.pop() : "png";
  return String(ext || "png").toLowerCase();
}

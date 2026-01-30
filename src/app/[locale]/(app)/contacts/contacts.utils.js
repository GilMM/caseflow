export function initials(name) {
  const s = (name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || "";
  return (a + b).toUpperCase() || "?";
}

export function shortId(id, prefix = "CT") {
  if (!id) return `${prefix}-—`;
  const s = String(id).replace(/-/g, "");
  const part = s.slice(-6).toUpperCase();
  return `${prefix}-${part}`;
}

export function timeAgo(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

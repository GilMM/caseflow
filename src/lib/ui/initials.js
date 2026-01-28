export function initials(input) {
  // accepts string OR {full_name,email} OR anything
  const name =
    typeof input === "string"
      ? input
      : input?.full_name || input?.email || "";

  const s = String(name || "").trim();
  if (!s) return "?";

  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || "";
  return (a + b).toUpperCase() || "?";
}

const QUEUE_COLORS = [
  "geekblue",
  "blue",
  "cyan",
  "purple",
  "magenta",
  "gold",
  "lime",
  "green",
  "volcano",
];

export function queueColor(queueName, isDefault) {
  if (isDefault) return "geekblue";

  // ✅ normalize: remove hidden diffs
  const s = String(queueName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " "); // collapse multiple spaces

  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return QUEUE_COLORS[h % QUEUE_COLORS.length];
}

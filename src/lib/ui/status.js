export const statusColor = (s) =>
    ({
      new: "blue",
      in_progress: "gold",
      waiting_customer: "purple",
      resolved: "green",
      closed: "default",
    }[s] || "default");
  // src/lib/ui/status.js
export const CASE_STATUSES = [
    { value: "new", label: "New" },
    { value: "in_progress", label: "In Progress" },
    { value: "waiting_customer", label: "Waiting Customer" },
    { value: "closed", label: "Closed" },
  ];
  
  export function statusLabel(value) {
    return CASE_STATUSES.find((s) => s.value === value)?.label || value || "—";
  }
  
  export function shortId(id) {
    if (!id) return "—";
    return `${String(id).slice(0, 8)}…`;
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
  
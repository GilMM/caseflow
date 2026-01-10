// src/lib/ui/status.js
import {
    InboxOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    PauseCircleOutlined,
  } from "@ant-design/icons";
  
  export const CASE_STATUSES = [
    { value: "new", label: "New" },
    { value: "in_progress", label: "In Progress" },
    { value: "waiting_customer", label: "Waiting Customer" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ];
  
  export function statusLabel(value) {
    return CASE_STATUSES.find((s) => s.value === value)?.label || value || "—";
  }
  
  export function getStatusMeta(value) {
    const v = String(value || "").toLowerCase();
  
    const map = {
      new: { color: "blue", Icon: InboxOutlined, label: "New" },
      in_progress: { color: "gold", Icon: ClockCircleOutlined, label: "In Progress" },
      waiting_customer: { color: "purple", Icon: PauseCircleOutlined, label: "Waiting Customer" },
      resolved: { color: "green", Icon: CheckCircleOutlined, label: "Resolved" },
      closed: { color: "default", Icon: CloseCircleOutlined, label: "Closed" },
    };
  
    return map[v] || { color: "default", Icon: InboxOutlined, label: statusLabel(value) };
  }
  
  // Back-compat (אם יש קוד ישן שקורא statusColor)
  export const statusColor = (s) => getStatusMeta(s).color;
  
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
  

  export function caseKey(id, prefix = "CF") {
    if (!id) return `${prefix}-—`;
    const s = String(id).replace(/-/g, "");
    // לקחת 6 תווים “נעימים” מהסוף/אמצע כדי שיראה פחות "טכני"
    const part = s.slice(-6).toUpperCase();
    return `${prefix}-${part}`;
  }
  
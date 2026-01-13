import React from "react";
import { Tag } from "antd";

export function initials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || "";
  return (a + b).toUpperCase() || "?";
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

export function inviteLinkFromToken(token) {
  // called only client-side
  return `${window.location.origin}/onboarding?invite=${token}`;
}

export function inviteStatusTag(inv) {
  const now = Date.now();
  const exp = inv.expires_at ? new Date(inv.expires_at).getTime() : null;
  if (inv.accepted_at) return <Tag color="green">Accepted</Tag>;
  if (exp && exp < now) return <Tag>Expired</Tag>;
  return <Tag color="blue">Pending</Tag>;
}

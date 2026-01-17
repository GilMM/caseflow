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

export function timeAgo(iso, t) {
  if (!iso) return "—";
  const time = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - time) / 1000));
  if (sec < 60) return t("time.secondsAgo", { count: sec });
  const min = Math.floor(sec / 60);
  if (min < 60) return t("time.minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("time.hoursAgo", { count: hr });
  const d = Math.floor(hr / 24);
  return t("time.daysAgo", { count: d });
}

// export function inviteLinkFromToken(token) {
//   // called only client-side
//   return `${window.location.origin}/onboarding?invite=${token}`;
// }

export function inviteStatusTag(inv, t) {
  const now = Date.now();
  const exp = inv.expires_at ? new Date(inv.expires_at).getTime() : null;
  if (inv.accepted_at) return <Tag color="green">{t("settings.users.accepted")}</Tag>;
  if (exp && exp < now) return <Tag>{t("settings.users.expired")}</Tag>;
  return <Tag color="blue">{t("settings.users.pending")}</Tag>;
}


export function appOrigin() {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").trim();

  // canonical in prod
  if (env) return env.replace(/\/+$/, "");

  // preview + dev + localhost
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // server-side fallback (rarely used here)
  return "http://localhost:3000";
}

export function inviteLinkFromToken(token) {
  return `${appOrigin()}/i/${encodeURIComponent(token)}`;
}

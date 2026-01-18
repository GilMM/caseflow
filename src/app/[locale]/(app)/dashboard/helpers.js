// src/app/(app)/_components/dashboard/helpers.js
import { supabase } from "@/lib/supabase/client";

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export const tagBaseStyle = {
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 26,
  lineHeight: "26px",
  paddingInline: 10,
  borderRadius: 3,
  verticalAlign: "middle",
};

export function presetColorVar(color, level = 6) {
  if (!color || color === "default") {
    return "var(--ant-color-text, rgba(255,255,255,0.85))";
  }
  return `var(--ant-color-${color}-${level}, var(--ant-color-primary, #1677ff))`;
}

// ✅ get user name (metadata -> profiles -> email prefix)

export async function getDisplayNameForCurrentUser() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return "";

  // 1) profiles.full_name (הדבר שאתה עורך ב-Settings)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name?.trim();
  if (fullName) return fullName;

  // 2) fallback
  const metaName = user?.user_metadata?.full_name;
  if (typeof metaName === "string" && metaName.trim()) return metaName.trim();

  // 3) fallback אחרון: חלק לפני @
  return (user?.email || "").split("@")[0] || "";
}

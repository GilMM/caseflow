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
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    let name =
      user?.user_metadata?.first_name ||
      user?.user_metadata?.full_name ||
      "";

    if (!name && user?.id) {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      name = p?.full_name || "";
    }

    if (!name && user?.email) name = user.email.split("@")[0];

    return name || "User";
  } catch {
    return "User";
  }
}

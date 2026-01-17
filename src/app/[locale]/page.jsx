// src/app/[locale]/page.jsx
// Root page - check auth and show dashboard
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import AppShell from "./(app)/AppShell";
import DashboardPage from "./(app)/dashboard/DashboardPage";

export default async function RootPage({ params }) {
  const { locale: rawLocale } = await params;
  const locale = locales.includes(rawLocale) ? rawLocale : "en";
  setRequestLocale(locale);

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const loginPath = locale === "en" ? "/login" : `/${locale}/login`;
  const onboardingPath = locale === "en" ? "/onboarding" : `/${locale}/onboarding`;

  if (!user) {
    redirect(loginPath);
  }

  const { data: membership } = await supabase
    .from("org_memberships")
    .select("org_id, is_active")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.org_id || membership?.is_active !== true) {
    redirect(onboardingPath);
  }

  return (
    <AppShell initialEmail={user.email || ""}>
      <DashboardPage />
    </AppShell>
  );
}

// src/app/[locale]/page.jsx
// Root page - show landing for guests, dashboard for authenticated users
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import AppShell from "./(app)/AppShell";
import DashboardPage from "./(app)/dashboard/DashboardPage";
import LandingPage from "./(auth)/LandingPage";

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

  const onboardingPath = `/${locale}/onboarding`;

  // Show landing page for unauthenticated users
  if (!user) {
    return (
      <>
        <LandingPage />
        {/* Server-rendered links for Google SEO - uses native <a> tags, not Next.js Link */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.95)',
          borderTop: '1px solid #e5e5e5',
          textAlign: 'center',
          fontSize: '13px',
          zIndex: 1000,
        }}>
          <a href={`/${locale}/privacy`} style={{ color: '#1677ff', marginRight: '24px' }}>Privacy Policy</a>
          <a href={`/${locale}/terms`} style={{ color: '#1677ff' }}>Terms of Service</a>
        </div>
      </>
    );
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

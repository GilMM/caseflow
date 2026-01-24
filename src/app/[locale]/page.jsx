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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* SEO nav for Google verification - server-rendered HTML with visible links */}
        <nav style={{
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e5e5e5',
          background: '#fff',
        }}>
          <span style={{ fontWeight: 600, fontSize: '18px' }}>CaseFlow</span>
          <div>
            <a href={`/${locale}/privacy`} style={{ margin: '0 12px', color: '#1677ff' }}>Privacy Policy</a>
            <a href={`/${locale}/terms`} style={{ margin: '0 12px', color: '#1677ff' }}>Terms of Service</a>
          </div>
        </nav>
        <div style={{ flex: 1 }}>
          <LandingPage />
        </div>
      </div>
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

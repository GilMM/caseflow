import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./src/i18n/config";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // Handle locale routing first
  const intlResponse = intlMiddleware(req);

  // If next-intl rewrites/redirects, return it immediately
  if (
    intlResponse.headers.get("x-middleware-rewrite") ||
    intlResponse.status === 307 ||
    intlResponse.status === 308
  ) {
    return intlResponse;
  }

  // Strip locale prefix for path checks
  const pathnameWithoutLocale = pathname.replace(/^\/(en|he)(?=\/|$)/, "") || "/";

  // Public paths that don't require auth
  const isPublic =
    pathnameWithoutLocale === "/" ||
    pathnameWithoutLocale === "/login" ||
    pathnameWithoutLocale === "/register" ||
    pathnameWithoutLocale === "/onboarding" ||
    pathnameWithoutLocale.startsWith("/onboarding/") ||
    pathnameWithoutLocale.startsWith("/i/");

  // For public routes, just return the intl response
  if (isPublic) {
    return intlResponse;
  }

  // Create response we can attach cookies to
  let res = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Keep locale prefix (if present) for redirects
  const localeMatch = pathname.match(/^\/(en|he)(?=\/|$)/);
  const localePrefix = localeMatch ? localeMatch[0] : "";

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = `${localePrefix}/login`;
    url.searchParams.set("next", pathnameWithoutLocale + (search || ""));
    return NextResponse.redirect(url);
  }

  // ✅ Membership check (org + active)
  const { data: membership } = await supabase
    .from("org_memberships")
    .select("org_id, is_active")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.org_id || membership?.is_active !== true) {
    const url = req.nextUrl.clone();
    url.pathname = `${localePrefix}/onboarding`;
    url.searchParams.set("next", pathnameWithoutLocale + (search || ""));
    return NextResponse.redirect(url);
  }

  // Return intl response (locale handling) but ensure cookies are preserved
  // If Supabase set cookies, return `res` but keep any headers from intlResponse
  // Easiest: return intlResponse unless we set cookies.
  // Here we merge by copying cookies to intlResponse when needed.
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    intlResponse.headers.append("set-cookie", setCookie);
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};

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

  // Strip locale prefix for path checks
  const pathnameWithoutLocale = pathname.replace(/^\/(en|he)/, "") || "/";

  // Public paths that don't require auth
  const isPublic =
    pathnameWithoutLocale === "/" ||
    pathnameWithoutLocale === "/login" ||
    pathnameWithoutLocale === "/register" ||
    pathnameWithoutLocale === "/onboarding" ||
    pathnameWithoutLocale.startsWith("/onboarding/") ||
    pathnameWithoutLocale.startsWith("/i/");

  // Handle locale routing first
  const intlResponse = intlMiddleware(req);

  // For public routes, just return the intl response
  if (isPublic) {
    return intlResponse;
  }

  // For protected routes, check authentication
  // We need to create a new response that copies headers from intlResponse
  let res = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  // Copy cookies from intl response if it's a redirect
  if (intlResponse.headers.get("x-middleware-rewrite") || intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

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

  if (!user) {
    const url = req.nextUrl.clone();
    // Keep the locale if present
    const localeMatch = pathname.match(/^\/(en|he)/);
    const localePrefix = localeMatch ? localeMatch[0] : "";
    url.pathname = `${localePrefix}/login`;
    url.searchParams.set("next", pathnameWithoutLocale + (search || ""));
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};

import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { locales, localeDirection } from "@/i18n/config";
import Providers from "./providers";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }) {
  const { locale: rawLocale } = await params;
  // Validate locale - fall back to 'en' if invalid
  const locale = locales.includes(rawLocale) ? rawLocale : "en";
  setRequestLocale(locale);

  const messages = await getMessages();
  const direction = localeDirection[locale] || "ltr";

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers locale={locale} direction={direction}>
        {children}
      </Providers>
    </NextIntlClientProvider>
  );
}

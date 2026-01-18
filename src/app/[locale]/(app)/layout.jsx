import { setRequestLocale } from "next-intl/server";
import AppShell from "./AppShell";

export default async function AppLayout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AppShell>{children}</AppShell>;
}

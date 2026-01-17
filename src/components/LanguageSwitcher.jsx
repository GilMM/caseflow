"use client";

import { usePathname, useRouter } from "next/navigation";
import { Typography } from "antd";
import { GlobalOutlined, CheckOutlined } from "@ant-design/icons";
import { locales, localeNames } from "@/i18n/config";
import { useLocaleContext } from "@/app/[locale]/providers";

const { Text } = Typography;

export function useLanguageSwitcher() {
  const { locale: currentLocale } = useLocaleContext();
  const router = useRouter();
  const pathname = usePathname();

const handleLocaleChange = (newLocale) => {
  if (newLocale === currentLocale) return;

  const segments = pathname.split("/").filter(Boolean);

  // remove existing locale prefix if present
  if (locales.includes(segments[0])) segments.shift();

  const rest = segments.join("/");
  const newPath = `/${newLocale}${rest ? `/${rest}` : ""}`;

  localStorage.setItem("caseflow_locale", newLocale);
  router.push(newPath);
};


  const menuItems = locales.map((loc) => ({
    key: `lang-${loc}`,
    icon: loc === currentLocale ? <CheckOutlined /> : <GlobalOutlined />,
    label: (
      <Text style={{ fontWeight: loc === currentLocale ? 600 : 400 }}>
        {localeNames[loc]}
      </Text>
    ),
    onClick: () => handleLocaleChange(loc),
  }));

  return {
    currentLocale,
    menuItems,
    handleLocaleChange,
  };
}

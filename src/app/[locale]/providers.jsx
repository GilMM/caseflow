"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { App as AntdApp, ConfigProvider, theme as antdTheme } from "antd";
import heIL from "antd/locale/he_IL";
import enUS from "antd/locale/en_US";

const ThemeCtx = createContext(null);
const LocaleCtx = createContext(null);

export function useThemeMode() {
  return useContext(ThemeCtx);
}

export function useLocaleContext() {
  return useContext(LocaleCtx);
}

const antdLocales = {
  en: enUS,
  he: heIL,
};

export default function Providers({ children, locale, direction }) {
  const [mode, setMode] = useState("dark");
  const [mounted, setMounted] = useState(false);

  // Read theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("caseflow_theme");
    if (saved === "dark" || saved === "light") {
      setMode(saved);
    }
    setMounted(true);
  }, []);

  // Persist theme changes
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("caseflow_theme", mode);
    document.documentElement.dataset.theme = mode;
  }, [mode, mounted]);

  // Update HTML lang and dir attributes for locale
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);

  const themeValue = useMemo(
    () => ({
      mode,
      setMode,
      toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")),
    }),
    [mode]
  );

  const localeValue = useMemo(
    () => ({
      locale,
      direction,
      isRTL: direction === "rtl",
    }),
    [locale, direction]
  );

  const antdThemeConfig = useMemo(
    () => ({
      algorithm:
        mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    }),
    [mode]
  );

  // Show minimal loading state before hydration (prevents flash)
  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#141414",
        }}
      />
    );
  }

  return (
    <ThemeCtx.Provider value={themeValue}>
      <LocaleCtx.Provider value={localeValue}>
        <ConfigProvider
          theme={antdThemeConfig}
          direction={direction}
          locale={antdLocales[locale] || enUS}
        >
          <AntdApp>{children}</AntdApp>
        </ConfigProvider>
      </LocaleCtx.Provider>
    </ThemeCtx.Provider>
  );
}

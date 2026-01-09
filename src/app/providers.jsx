"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { App as AntdApp, ConfigProvider, theme as antdTheme } from "antd";


const ThemeCtx = createContext(null);

export function useThemeMode() {
  return useContext(ThemeCtx);
}

export default function Providers({ children }) {
  const [mode, setMode] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("caseflow_theme");
    if (saved === "dark" || saved === "light") setMode(saved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("caseflow_theme", mode);
    document.documentElement.dataset.theme = mode;
  }, [mode, mounted]);

  const value = useMemo(
    () => ({ mode, setMode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) }),
    [mode]
  );

  const antdThemeConfig = useMemo(
    () => ({
      algorithm: mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      // token: { colorPrimary: "#1677ff" }, // אופציונלי
    }),
    [mode]
  );

  if (!mounted) return null;


  
  return (
    <ThemeCtx.Provider value={value}>
      <ConfigProvider theme={antdThemeConfig}>
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </ThemeCtx.Provider>
  );
}

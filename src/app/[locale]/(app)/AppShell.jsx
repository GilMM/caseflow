// src/app/[locale]/(app)/AppShell.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Space,
  Typography,
  Switch,
  Drawer,
  Grid,
  theme,
} from "antd";

import {
  DashboardOutlined,
  InboxOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  MoonOutlined,
  MenuOutlined,
  CalendarOutlined,
  GlobalOutlined,
} from "@ant-design/icons";

import { supabase } from "@/lib/supabase/client";
import { useThemeMode, useLocaleContext } from "@/app/[locale]/providers";
import AnnouncementBanner from "@/app/[locale]/(app)/announcements/AnnouncementBanner";
import { useAnnouncements } from "@/app/[locale]/(app)/announcements/useAnnouncements";
import { useLanguageSwitcher } from "@/components/LanguageSwitcher";
import { locales } from "@/i18n/config";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function AppShell({ children, initialEmail = "" }) {
  const router = useRouter();
  const pathname = usePathname();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { token } = theme.useToken();

  const themeMode = useThemeMode();
  const mode = themeMode?.mode || "light";
  const toggleTheme = themeMode?.toggle || (() => {});

  const { direction, locale } = useLocaleContext();
  const isRTL = direction === "rtl";

  const t = useTranslations();
  const tNav = useTranslations("navigation");
  const tUserMenu = useTranslations("userMenu");
  const tApp = useTranslations("app");

  const { menuItems: languageMenuItems } = useLanguageSwitcher();

  const [userEmail, setUserEmail] = useState(initialEmail);

  // Drawer state (Mobile)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Announcements
  const { items: announcements } = useAnnouncements();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace(`/${locale}/login`);
        return;
      }
      setUserEmail(session.user.email || "");
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, [router, locale]);

  useEffect(() => {
    if (drawerOpen) setDrawerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Helper to get path without locale prefix
  const getBasePath = (path) => {
    for (const loc of locales) {
      if (path.startsWith(`/${loc}/`) || path === `/${loc}`) {
        return path.replace(`/${loc}`, "") || "/";
      }
    }
    return path;
  };

  const selectedKey = useMemo(() => {
    const basePath = getBasePath(pathname);
    if (basePath === "/") return "dashboard";
    if (basePath.startsWith("/cases")) return "cases";
    if (basePath.startsWith("/contacts")) return "contacts";
    if (basePath.startsWith("/queues")) return "queues";
    if (basePath.startsWith("/calendar")) return "calendar";
    if (basePath.startsWith("/settings")) return "settings";
    return "dashboard";
  }, [pathname]);

  const pageTitle = useMemo(() => {
    const map = {
      dashboard: tNav("dashboard"),
      cases: tNav("cases"),
      contacts: tNav("contacts"),
      queues: tNav("queues"),
      calendar: tNav("calendar"),
      settings: tNav("settings"),
    };
    return map[selectedKey] || "CaseFlow";
  }, [selectedKey, tNav]);

  async function logout() {
    await supabase.auth.signOut({ scope: "local" });
    window.location.assign(`/${locale}/login`);
  }

  // Build locale prefix for links
  const linkPrefix = `/${locale}`;

  const userMenu = {
    items: [
      {
        key: "email",
        label: <Text type="secondary">{userEmail}</Text>,
        disabled: true,
      },
      { type: "divider" },
      {
        key: "theme",
        label: (
          <Space style={{ justifyContent: "space-between", width: 210 }}>
            <Space size={8}>
              <MoonOutlined />
              <Text>{tUserMenu("darkMode")}</Text>
            </Space>
            <Switch checked={mode === "dark"} onChange={toggleTheme} />
          </Space>
        ),
      },
      { type: "divider" },
      {
        key: "language",
        label: (
          <Space size={8}>
            <GlobalOutlined />
            <Text>{tUserMenu("language")}</Text>
          </Space>
        ),
        children: languageMenuItems,
      },
      { type: "divider" },
      { key: "logout", label: tUserMenu("logout"), icon: <LogoutOutlined /> },
    ],
    onClick: async ({ key, domEvent }) => {
      if (key !== "logout") return;
      domEvent?.preventDefault?.();
      domEvent?.stopPropagation?.();
      await logout();
    },
  };

  const menuItems = useMemo(
    () => [
      {
        key: "dashboard",
        icon: <DashboardOutlined />,
        label: <Link href={`${linkPrefix}/`}>{tNav("dashboard")}</Link>,
      },
      {
        key: "cases",
        icon: <InboxOutlined />,
        label: <Link href={`${linkPrefix}/cases`}>{tNav("cases")}</Link>,
      },
      {
        key: "contacts",
        icon: <TeamOutlined />,
        label: <Link href={`${linkPrefix}/contacts`}>{tNav("contacts")}</Link>,
      },
      {
        key: "queues",
        icon: <InboxOutlined />,
        label: <Link href={`${linkPrefix}/queues`}>{tNav("queues")}</Link>,
      },
      {
        key: "calendar",
        icon: <CalendarOutlined />,
        label: <Link href={`${linkPrefix}/calendar`}>{tNav("calendar")}</Link>,
      },
      {
        key: "settings",
        icon: <SettingOutlined />,
        label: <Link href={`${linkPrefix}/settings`}>{tNav("settings")}</Link>,
      },
    ],
    [linkPrefix, tNav],
  );

  const Brand = ({ compact = false }) => (
    <div
      style={{
        padding: compact ? "0 12px" : 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: compact ? 56 : "auto",
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Image
          src="/caseflow-icon-512.png"
          alt="CaseFlow"
          width={16}
          height={16}
          priority
        />
      </span>

      <div
        style={{
          fontWeight: 800,
          letterSpacing: 0.2,
          color: token.colorText,
          whiteSpace: "nowrap",
        }}
      >
        CaseFlow
      </div>
    </div>
  );

  const effectiveEmail = userEmail || tUserMenu("account");

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <AnnouncementBanner items={announcements} />

      <Layout
        style={{ flex: 1, overflow: "hidden", background: token.colorBgLayout }}
      >
        {!isMobile && (
          <Sider
            width={240}
            theme={mode === "dark" ? "dark" : "light"}
            style={{
              height: "100vh",
              borderInlineEnd: `1px solid ${token.colorBorder}`,
              background: token.colorBgContainer,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Brand />
              <div style={{ flex: 1, overflow: "auto", paddingBottom: 8 }}>
                <Menu
                  mode="inline"
                  selectedKeys={[selectedKey]}
                  style={{ background: "transparent", borderInlineEnd: 0 }}
                  items={menuItems}
                />
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  fontSize: 11,
                  color: token.colorTextSecondary,
                  borderTop: `1px solid ${
                    token.colorBorderSecondary || token.colorBorder
                  }`,
                  textAlign: "center",
                  lineHeight: 1.4,
                  flexShrink: 0,
                }}
              >
                <div style={{ opacity: 0.75 }}>{tApp("builtBy")}</div>
                <div style={{ fontWeight: 600 }}>GilM</div>
              </div>
            </div>
          </Sider>
        )}

        {isMobile && (
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            placement={isRTL ? "right" : "left"}
            width={280}
            styles={{
              body: { padding: 0 },
              header: {
                padding: 0,
                borderBottom: `1px solid ${token.colorBorder}`,
              },
            }}
            title={<Brand compact />}
          >
            <div style={{ paddingBottom: 8 }}>
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                style={{ background: "transparent", borderInlineEnd: 0 }}
                items={menuItems}
              />
            </div>

            <div
              style={{
                padding: "12px 16px",
                fontSize: 11,
                color: token.colorTextSecondary,
                borderTop: `1px solid ${
                  token.colorBorderSecondary || token.colorBorder
                }`,
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              <div style={{ opacity: 0.75 }}>{tApp("builtBy")}</div>
              <div style={{ fontWeight: 600 }}>GilM</div>
            </div>
          </Drawer>
        )}

        <Layout
          style={{
            background: token.colorBgLayout,
            height: "100%",
            overflow: "hidden",
          }}
        >
          <Header
            style={{
              background: token.colorBgContainer,
              borderBottom: `1px solid ${token.colorBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isMobile ? "0 12px" : "0 16px",
              height: 56,
              lineHeight: "56px",
              flex: "0 0 auto",
              gap: 12,
            }}
          >
            {/* Left side: menu + title */}
            <Space size={10} style={{ minWidth: 0, flex: 1 }}>
              {isMobile && (
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setDrawerOpen(true)}
                  aria-label={t("navigation.dashboard")}
                />
              )}

              <Text
                strong
                style={{
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: isMobile ? 160 : 260,
                }}
              >
                {pageTitle}
              </Text>
            </Space>

            {/* Right side: dropdown */}
            <Dropdown
              menu={userMenu}
              trigger={["click"]}
              placement={isRTL ? "bottomLeft" : "bottomRight"}
            >
              <Button>
                <Space>
                  <Text
                    style={{
                      maxWidth: isMobile ? 120 : 260,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {effectiveEmail}
                  </Text>
                </Space>
              </Button>
            </Dropdown>
          </Header>

          <Content
            style={{
              padding: isMobile ? 12 : 18,
              background: token.colorBgLayout,
              overflowY: "auto",
              overflowX: "hidden",
              flex: "1 1 auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
          </Content>
        </Layout>
      </Layout>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Space,
  Typography,
  Spin,
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
  AppstoreOutlined,
  MoonOutlined,
  MenuOutlined,
} from "@ant-design/icons";

import { useThemeMode } from "@/app/providers";
import { getActiveWorkspace } from "@/lib/db";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { token } = theme.useToken();

  const themeMode = useThemeMode();
  const mode = themeMode?.mode || "light";
  const toggleTheme = themeMode?.toggle || (() => {});

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  // Drawer state (Mobile)
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session) {
          if (mounted) setLoading(false);
          router.replace("/login");
          return;
        }

        // ✅ Workspace guard
        const ws = await getActiveWorkspace();
        if (!ws?.orgId) {
          if (mounted) setLoading(false);
          router.replace("/onboarding");
          return;
        }

        if (mounted) {
          setUserEmail(session.user.email || "");
          setLoading(false);
        }
      } catch (e) {
        console.error("AppLayout init failed:", e);
        if (mounted) {
          setLoading(false);
          router.replace("/login");
        }
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [router]);

  // Close drawer on route change (Mobile)
  useEffect(() => {
    if (drawerOpen) setDrawerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const selectedKey = useMemo(() => {
    if (pathname === "/") return "dashboard";
    if (pathname.startsWith("/cases")) return "cases";
    if (pathname.startsWith("/contacts")) return "contacts";
    if (pathname.startsWith("/queues")) return "queues";
    if (pathname.startsWith("/settings")) return "settings";
    return "dashboard";
  }, [pathname]);

  const pageTitle = useMemo(() => {
    const map = {
      dashboard: "Dashboard",
      cases: "Cases",
      contacts: "Contacts",
      queues: "Queues",
      settings: "Settings",
    };
    return map[selectedKey] || "CaseFlow";
  }, [selectedKey]);

  async function logout() {
    await supabase.auth.signOut({ scope: "local" });
    window.location.assign("/login");
  }

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
              <Text>Dark mode</Text>
            </Space>
            <Switch checked={mode === "dark"} onChange={toggleTheme} />
          </Space>
        ),
      },
      { type: "divider" },
      { key: "logout", label: "Logout", icon: <LogoutOutlined /> },
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
        label: <Link href="/">Dashboard</Link>,
      },
      {
        key: "cases",
        icon: <InboxOutlined />,
        label: <Link href="/cases">Cases</Link>,
      },
      {
        key: "contacts",
        icon: <TeamOutlined />,
        label: <Link href="/contacts">Contacts</Link>,
      },
      {
        key: "queues",
        icon: <InboxOutlined />,
        label: <Link href="/queues">Queues</Link>,
      },
      {
        key: "settings",
        icon: <SettingOutlined />,
        label: <Link href="/settings">Settings</Link>,
      },
    ],
    []
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
        background: "rgba(22,119,255,0.12)",
        border: `1px solid ${token.colorBorder}`,
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


  if (loading) {
    return (
      <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ height: "100dvh", overflow: "hidden", background: token.colorBgLayout }}>
      {/* Desktop Sider */}
      {!isMobile && (
        <Sider
          width={240}
          theme={mode === "dark" ? "dark" : "light"}
          style={{
            height: "100vh",
            borderRight: `1px solid ${token.colorBorder}`,
            background: token.colorBgContainer,
            overflow: "hidden",
          }}
        >
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Brand />

            <div style={{ flex: 1, overflow: "auto", paddingBottom: 8 }}>
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                style={{ background: "transparent", borderRight: 0 }}
                items={menuItems}
              />
            </div>

            <div
              style={{
                padding: "12px 16px",
                fontSize: 11,
                color: token.colorTextSecondary,
                borderTop: `1px solid ${token.colorBorderSecondary || token.colorBorder}`,
                textAlign: "center",
                lineHeight: 1.4,
                flexShrink: 0,
              }}
            >
              <div style={{ opacity: 0.75 }}>Built by</div>
              <div style={{ fontWeight: 600 }}>GilM</div>
            </div>
          </div>
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={280}
          styles={{
            body: { padding: 0 },
            header: { padding: 0, borderBottom: `1px solid ${token.colorBorder}` },
          }}
          title={<Brand compact />}
        >
          <div style={{ paddingBottom: 8 }}>
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              style={{ background: "transparent", borderRight: 0 }}
              items={menuItems}
            />
          </div>

          <div
            style={{
              padding: "12px 16px",
              fontSize: 11,
              color: token.colorTextSecondary,
              borderTop: `1px solid ${token.colorBorderSecondary || token.colorBorder}`,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            <div style={{ opacity: 0.75 }}>Built by</div>
            <div style={{ fontWeight: 600 }}>GilM</div>
          </div>
        </Drawer>
      )}

      <Layout style={{ background: token.colorBgLayout, height: "100%", overflow: "hidden" }}>
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
          <Space size={10} style={{ minWidth: 0 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              />
            )}

            <Text
              strong
              style={{
                fontSize: isMobile ? 14 : 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: isMobile ? 160 : 320,
              }}
            >
              {pageTitle}
            </Text>
          </Space>

          <Dropdown menu={userMenu} trigger={["click"]} placement="bottomRight">
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
                  {userEmail || "Account"}
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
            WebkitOverflowScrolling: "touch", // ✅ iOS smooth scrolling
            overscrollBehavior: "contain",    // ✅ מונע “גלילה שנשפכת” ל-body
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}

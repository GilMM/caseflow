"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Space,
  Typography,
  Spin,
  Switch,
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
} from "@ant-design/icons";

import { useThemeMode } from "@/app/providers";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const { token } = theme.useToken();

  const themeMode = useThemeMode();
  const mode = themeMode?.mode || "light";
  const toggleTheme = themeMode?.toggle || (() => {});

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      if (mounted) {
        setUserEmail(session.user.email || "");
        setLoading(false);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const selectedKey = useMemo(() => {
    if (pathname === "/") return "dashboard";
    if (pathname.startsWith("/cases")) return "cases";
    if (pathname.startsWith("/contacts")) return "contacts";
    if (pathname.startsWith("/queues")) return "queues";
    if (pathname.startsWith("/settings")) return "settings";
    return "dashboard";
  }, [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
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
      {
        key: "logout",
        label: "Logout",
        icon: <LogoutOutlined />,
        onClick: logout,
      },
    ],
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  // ✅ Height lock: prevent whole page scroll
  // ✅ Only Content scrolls
  return (
    <Layout style={{ height: "100vh", overflow: "hidden", background: token.colorBgLayout }}>
      {/* ✅ SIDER stays fixed height */}
      <Sider
  width={240}
  theme={mode === "dark" ? "dark" : "light"}
  style={{
    height: "100vh",
    borderRight: `1px solid ${token.colorBorder}`,
    background: token.colorBgContainer,
    overflow: "hidden", // חשוב: שלא יהיה scroll על הסיידר עצמו
  }}
>
  {/* ✅ Wrapper שמכריח flex על כל הגובה */}
  <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
    {/* Logo */}
    <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 10 }}>
      <AppstoreOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
      <div style={{ fontWeight: 800, letterSpacing: 0.2, color: token.colorText }}>
        CaseFlow
      </div>
    </div>

    {/* ✅ Menu area - תופס את כל האמצע ויכול לגלול אם צריך */}
    <div style={{ flex: 1, overflow: "auto", paddingBottom: 8 }}>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{ background: "transparent", borderRight: 0 }}
        items={[
          { key: "dashboard", icon: <DashboardOutlined />, label: <Link href="/">Dashboard</Link> },
          { key: "cases", icon: <InboxOutlined />, label: <Link href="/cases">Cases</Link> },
          { key: "contacts", icon: <TeamOutlined />, label: <Link href="/contacts">Contacts</Link> },
          { key: "queues", icon: <InboxOutlined />, label: <Link href="/queues">Queues</Link> },
          { key: "settings", icon: <SettingOutlined />, label: <Link href="/settings">Settings</Link> },
        ]}
      />
    </div>

    {/* ✅ Footer - תמיד בתחתית */}
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


      {/* ✅ Right side: header fixed + content scroll */}
      <Layout style={{ background: token.colorBgLayout, height: "100%", overflow: "hidden" }}>
        {/* ✅ Header fixed height */}
        <Header
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            height: 56,
            lineHeight: "56px",
            flex: "0 0 auto",
          }}
        >
          <Space>
            <Text strong style={{ fontSize: 14 }}>
              {selectedKey.charAt(0).toUpperCase() + selectedKey.slice(1)}
            </Text>
          </Space>

          <Dropdown menu={userMenu} trigger={["click"]}>
            <Button>
              <Space>
                <Text>{userEmail || "Account"}</Text>
              </Space>
            </Button>
          </Dropdown>
        </Header>

        {/* ✅ Content scrolls */}
        <Content
          style={{
            padding: 18,
            background: token.colorBgLayout,
            overflowY: "auto",
            overflowX: "hidden",
            flex: "1 1 auto",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}

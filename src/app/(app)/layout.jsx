"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { Layout, Menu, Button, Dropdown, Space, Typography, Spin } from "antd";
import {
  DashboardOutlined,
  InboxOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

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
      { key: "email", label: <Text type="secondary">{userEmail}</Text>, disabled: true },
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

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={240} theme="light" style={{ borderRight: "1px solid #f0f0f0" }}>
        <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <AppstoreOutlined />
          <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>CaseFlow</div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            { key: "dashboard", icon: <DashboardOutlined />, label: <Link href="/">Dashboard</Link> },
            { key: "cases", icon: <InboxOutlined />, label: <Link href="/cases">Cases</Link> },
            { key: "contacts", icon: <TeamOutlined />, label: <Link href="/contacts">Contacts</Link> },
            { key: "queues", icon: <InboxOutlined />, label: <Link href="/queues">Queues</Link> },
            { key: "settings", icon: <SettingOutlined />, label: <Link href="/settings">Settings</Link> },
          ]}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
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

        <Content style={{ padding: 18 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}

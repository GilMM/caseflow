"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Card, Space, Spin, Typography, Tag, theme } from "antd";
import { ClockCircleOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabase/client";

const { Title, Text } = Typography;

export default function WaitingApprovalPage() {
  const router = useRouter();
  const { token } = theme.useToken();

  const [checking, setChecking] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);

  useEffect(() => {
    let alive = true;

    async function checkMembership() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        const { data } = await supabase
          .from("org_memberships")
          .select("org_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (!alive) return;

        setLastCheckedAt(new Date());

        if (data?.org_id) {
          router.replace("/");
        } else {
          setChecking(false);
        }
      } catch {
        if (!alive) return;
        setChecking(false);
      }
    }

    checkMembership();
    const interval = setInterval(checkMembership, 5000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 520, padding: "0 12px" }}>
        <Card
          style={{
            borderRadius: 16,
            border: `1px solid ${token.colorBorder}`,
            background:
              "radial-gradient(900px 450px at 20% 10%, rgba(22,119,255,0.10), transparent 60%), radial-gradient(800px 400px at 80% 20%, rgba(82,196,26,0.08), transparent 55%)",
          }}
        >
          <Space orientation="vertical" size={14} style={{ width: "100%" }}>
            <Space style={{ justifyContent: "space-between", width: "100%" }}>
              <Tag
                icon={<SafetyCertificateOutlined />}
                style={{ borderRadius: 999, padding: "4px 10px" }}
              >
                Pending approval
              </Tag>

              {lastCheckedAt ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Last check: {lastCheckedAt.toLocaleTimeString()}
                </Text>
              ) : null}
            </Space>

            <Space orientation="vertical" size={6} style={{ width: "100%" }}>
              <Title level={4} style={{ margin: 0 }}>
                Waiting for admin approval
              </Title>
              <Text type="secondary">
                Your request was sent to the organization admin.
                You’ll be redirected automatically once approved.
              </Text>
            </Space>

            <Alert
              type="info"
              showIcon
              icon={<ClockCircleOutlined />}
              message={checking ? "Checking membership…" : "Still not approved yet"}
              description="This page refreshes every 5 seconds."
            />

            <div style={{ display: "grid", placeItems: "center", paddingTop: 6 }}>
              <Spin size="large" />
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
}

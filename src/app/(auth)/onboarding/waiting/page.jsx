"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Space, Spin, Typography } from "antd";
import { supabase } from "@/lib/supabase/client";

const { Title, Text } = Typography;

export default function WaitingApprovalPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;

    async function checkMembership() {
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

      if (data?.org_id) {
        router.replace("/");
      } else {
        setChecking(false);
      }
    }

    checkMembership();

    const interval = setInterval(checkMembership, 5000); // כל 5 שניות

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div style={{ height: "80vh", display: "grid", placeItems: "center" }}>
      <Card style={{ width: 420, textAlign: "center", borderRadius: 16 }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Spin size="large" />
          <Title level={4}>Waiting for approval</Title>
          <Text type="secondary">
            Your request was sent to the organization admin.
            <br />
            You’ll be redirected automatically once approved.
          </Text>
        </Space>
      </Card>
    </div>
  );
}

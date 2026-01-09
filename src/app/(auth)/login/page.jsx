"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button, Card, Form, Input, Space, Typography, message } from "antd";
import { LockOutlined, MailOutlined, LoginOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If already logged in -> go to app
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) router.replace("/");
    })();
  }, [router]);

  async function onFinish(values) {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });

      if (error) throw error;

      message.success("Welcome back");
      router.replace("/");
      router.refresh?.();
    } catch (e) {
      message.error(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(22,119,255,0.12), transparent 60%), radial-gradient(1000px 500px at 80% 20%, rgba(82,196,26,0.10), transparent 55%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Card
          style={{
            borderRadius: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
          }}
        >
          <Space orientation="vertical" size={4} style={{ width: "100%", marginBottom: 14 }}>
            <Title level={3} style={{ margin: 0 }}>
              Sign in
            </Title>
            <Text type="secondary">Access your workspace and manage cases.</Text>
          </Space>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="name@company.com" autoComplete="email" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Password is required" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              icon={<LoginOutlined />}
              loading={busy}
              block
              style={{ borderRadius: 12, height: 42 }}
            >
              Sign in
            </Button>
          </Form>

          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Text type="secondary">
              Don&apos;t have an account?{" "}
              <Link href="/register" style={{ fontWeight: 600 }}>
                Create one
              </Link>
            </Text>

            {/* <Link href="/cases" style={{ opacity: 0.7 }}>
              Skip →
            </Link> */}
          </div>
        </Card>

        <div style={{ textAlign: "center", marginTop: 14, opacity: 0.75, fontSize: 12 }}>
          CaseFlow • Dynamics-style mini CRM
        </div>
      </div>
    </div>
  );
}

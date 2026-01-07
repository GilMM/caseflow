"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button, Card, Form, Input, Space, Typography, message } from "antd";
import { LockOutlined, MailOutlined, UserAddOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function RegisterPage() {
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
      const email = values.email.trim();
      const password = values.password;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // If you have email confirmation enabled, user may need to verify first.
          // You can add redirect URL if needed:
          // emailRedirectTo: `${location.origin}/login`,
        },
      });

      if (error) throw error;

      // If email confirmation is ON, session might be null
      if (data?.session) {
        message.success("Account created. You’re in!");
        router.replace("/");
      } else {
        message.success("Account created. Check your email to confirm, then sign in.");
        router.replace("/login");
      }

      router.refresh?.();
    } catch (e) {
      message.error(e?.message || "Registration failed");
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
          "radial-gradient(1200px 600px at 20% 10%, rgba(22,119,255,0.12), transparent 60%), radial-gradient(1000px 500px at 80% 20%, rgba(250,173,20,0.10), transparent 55%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Card
          style={{
            borderRadius: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
          }}
        >
          <Space direction="vertical" size={4} style={{ width: "100%", marginBottom: 14 }}>
            <Title level={3} style={{ margin: 0 }}>
              Create account
            </Title>
            <Text type="secondary">Start managing cases in minutes.</Text>
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
              rules={[
                { required: true, message: "Password is required" },
                { min: 8, message: "Use at least 8 characters" },
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Create a password"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              label="Confirm password"
              name="confirm"
              dependencies={["password"]}
              hasFeedback
              rules={[
                { required: true, message: "Please confirm your password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) return Promise.resolve();
                    return Promise.reject(new Error("Passwords do not match"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              icon={<UserAddOutlined />}
              loading={busy}
              block
              style={{ borderRadius: 12, height: 42 }}
            >
              Create account
            </Button>
          </Form>

          <div style={{ marginTop: 14 }}>
            <Text type="secondary">
              Already have an account?{" "}
              <Link href="/login" style={{ fontWeight: 600 }}>
                Sign in
              </Link>
            </Text>
          </div>
        </Card>

        <div style={{ textAlign: "center", marginTop: 14, opacity: 0.75, fontSize: 12 }}>
          CaseFlow • Secure multi-tenant CRM demo
        </div>
      </div>
    </div>
  );
}

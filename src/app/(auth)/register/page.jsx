"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button, Card, Form, Input, Space, Typography, message } from "antd";
import { LockOutlined, MailOutlined, UserAddOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

function safeNextPath(next) {
  if (!next) return "/";
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  return next;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);

  const nextParam = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    // If already logged in -> go to next (or /)
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        router.replace(nextParam);
        router.refresh?.();
      }
    })();
  }, [router, nextParam]);

  async function onFinish(values) {
    setBusy(true);
    try {
      const email = values.email.trim();
      const password = values.password;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // אם יש לך email confirmation:
          // שים לב: את ה-redirect הזה מומלץ להגדיר גם ב-Supabase Auth settings
          // כדי שלא ייפול על localhost בפרודקשן.
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/login?next=${encodeURIComponent(nextParam)}`
              : undefined,
        },
      });

      if (error) throw error;

      // If email confirmation is ON, session might be null
      if (data?.session) {
        message.success("Account created. You’re in!");
        router.replace(nextParam);
      } else {
        message.success("Account created. Check your email to confirm, then sign in.");
        router.replace(`/login?next=${encodeURIComponent(nextParam)}`);
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
          <Space orientation="vertical" size={4} style={{ width: "100%", marginBottom: 14 }}>
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
              <Link href={`/login?next=${encodeURIComponent(nextParam)}`} style={{ fontWeight: 600 }}>
                Sign in
              </Link>
            </Text>
          </div>
        </Card>

        <div style={{ textAlign: "center", marginTop: 14, opacity: 0.75, fontSize: 12 }}>
          CaseFlow • By GilM
        </div>
      </div>
    </div>
  );
}

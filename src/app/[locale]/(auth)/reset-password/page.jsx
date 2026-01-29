"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { useLocaleContext } from "@/app/[locale]/providers";
import { Button, Card, Form, Input, Space, Typography, message, Result, Spin } from "antd";
import { LockOutlined, CheckCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const { locale: rawLocale } = useLocaleContext();
  const locale = (rawLocale === "en" || rawLocale === "he") ? rawLocale : "en";
  const t = useTranslations("auth.resetPassword");

  const linkPrefix = `/${locale}`;

  useEffect(() => {
    let mounted = true;
    let hasSession = false;

    // Listen for auth state changes - Supabase processes the hash fragment automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        // Token was valid, user can now reset password
        hasSession = true;
        setReady(true);
        setError("");
      }
    });

    // Also check if we already have a session (in case the event already fired)
    const checkSession = async () => {
      // Small delay to let Supabase process the hash fragment
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!mounted || hasSession) return;

      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        setReady(true);
        setError("");
      } else {
        // No session after waiting - invalid or expired link
        setError(t("invalidLink"));
        setReady(true);
      }
    };

    checkSession();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFinish(values) {
    setBusy(true);
    try {
      const password = values.password;

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setSuccess(true);
      message.success(t("success"));
    } catch (e) {
      message.error(e?.message || t("failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
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
          <Card style={{ borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}>
            <Result
              status="error"
              title={t("invalidLinkTitle")}
              subTitle={t("invalidLinkSubtitle")}
              extra={
                <Link href={`${linkPrefix}/forgot-password`}>
                  <Button type="primary">{t("requestNewLink")}</Button>
                </Link>
              }
            />
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
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
          <Card style={{ borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}>
            <Result
              status="success"
              title={t("successTitle")}
              subTitle={t("successSubtitle")}
              extra={
                <Link href={`${linkPrefix}/login`}>
                  <Button type="primary" icon={<CheckCircleOutlined />}>
                    {t("goToLogin")}
                  </Button>
                </Link>
              }
            />
          </Card>
        </div>
      </div>
    );
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
              {t("title")}
            </Title>
            <Text type="secondary">{t("subtitle")}</Text>
          </Space>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              label={t("newPassword")}
              name="password"
              rules={[
                { required: true, message: t("passwordRequired") },
                { min: 8, message: t("passwordMinLength") },
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t("passwordPlaceholder")}
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              label={t("confirmPassword")}
              name="confirm"
              dependencies={["password"]}
              hasFeedback
              rules={[
                { required: true, message: t("confirmRequired") },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) return Promise.resolve();
                    return Promise.reject(new Error(t("passwordMismatch")));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t("confirmPlaceholder")}
                autoComplete="new-password"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              icon={<LockOutlined />}
              loading={busy}
              block
              style={{ borderRadius: 12, height: 42 }}
            >
              {t("resetPassword")}
            </Button>
          </Form>
        </Card>

        <div style={{ textAlign: "center", marginTop: 14, opacity: 0.75, fontSize: 12 }}>
          {t("footer")}
        </div>
      </div>
    </div>
  );
}

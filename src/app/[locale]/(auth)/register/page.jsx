"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { useLocaleContext } from "@/app/[locale]/providers";
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
  const { locale: rawLocale } = useLocaleContext();
  const locale = (rawLocale === "en" || rawLocale === "he") ? rawLocale : "en";
  const t = useTranslations("auth.register");

  const linkPrefix = `/${locale}`;
  const nextParam = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    // If already logged in -> go to next (or /)
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        router.replace(linkPrefix + nextParam);
        router.refresh?.();
      }
    })();
  }, [router, nextParam, linkPrefix]);

  async function onFinish(values) {
    setBusy(true);
    try {
      const email = values.email.trim();
      const password = values.password;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}${linkPrefix}/login?next=${encodeURIComponent(nextParam)}`
              : undefined,
        },
      });

      if (error) throw error;

      // If email confirmation is ON, session might be null
      if (data?.session) {
        message.success(t("success"));
        // New users don't have an organization yet, go directly to onboarding
        router.replace(`${linkPrefix}/onboarding`);
      } else {
        message.success(t("successConfirm"));
        router.replace(`${linkPrefix}/login?next=${encodeURIComponent("/onboarding")}`);
      }

      router.refresh?.();
    } catch (e) {
      message.error(e?.message || t("failed"));
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
              {t("title")}
            </Title>
            <Text type="secondary">{t("subtitle")}</Text>
          </Space>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              label={t("email")}
              name="email"
              rules={[
                { required: true, message: t("emailRequired") },
                { type: "email", message: t("emailInvalid") },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder={t("emailPlaceholder")} autoComplete="email" />
            </Form.Item>

            <Form.Item
              label={t("password")}
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
              icon={<UserAddOutlined />}
              loading={busy}
              block
              style={{ borderRadius: 12, height: 42 }}
            >
              {t("createAccount")}
            </Button>
          </Form>

          <div style={{ marginTop: 14 }}>
            <Text type="secondary">
              {t("hasAccount")}{" "}
              <Link href={`${linkPrefix}/login?next=${encodeURIComponent(nextParam)}`} style={{ fontWeight: 600 }}>
                {t("signIn")}
              </Link>
            </Text>
          </div>
        </Card>

        <div style={{ textAlign: "center", marginTop: 14, opacity: 0.75, fontSize: 12 }}>
          {t("footer")}
        </div>
      </div>
    </div>
  );
}

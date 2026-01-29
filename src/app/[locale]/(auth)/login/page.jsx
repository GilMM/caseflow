"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { useLocaleContext } from "@/app/[locale]/providers";
import { Button, Card, Form, Input, Space, Typography, message } from "antd";
import { LockOutlined, MailOutlined, LoginOutlined, ArrowLeftOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

function safeNextPath(next) {
  // only allow internal paths to prevent open-redirect
  if (!next) return "/";
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  return next;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const { locale: rawLocale } = useLocaleContext();
  const locale = (rawLocale === "en" || rawLocale === "he") ? rawLocale : "en";
  const t = useTranslations("auth.login");

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
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });

      if (error) throw error;

      router.replace(linkPrefix + nextParam);
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
          "radial-gradient(1200px 600px at 20% 10%, rgba(22,119,255,0.12), transparent 60%), radial-gradient(1000px 500px at 80% 20%, rgba(82,196,26,0.10), transparent 55%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 12 }}>
          <Link href={linkPrefix}>
            <Button type="text" icon={<ArrowLeftOutlined />} style={{ padding: "4px 8px" }}>
              {t("backToHome")}
            </Button>
          </Link>
        </div>

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
              rules={[{ required: true, message: t("passwordRequired") }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t("passwordPlaceholder")}
                autoComplete="current-password"
              />
            </Form.Item>

            <div style={{ textAlign: "end", marginTop: -8, marginBottom: 16 }}>
              <Link href={`${linkPrefix}/forgot-password`} style={{ fontSize: 13, color: "inherit", opacity: 0.65 }}>
                {t("forgotPassword")}
              </Link>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              icon={<LoginOutlined />}
              loading={busy}
              block
              style={{ borderRadius: 12, height: 42 }}
            >
              {t("signIn")}
            </Button>
          </Form>

          <div style={{ marginTop: 14, textAlign: "center" }}>
            <Text type="secondary">
              {t("noAccount")}{" "}
              <Link href={`${linkPrefix}/register`} style={{ fontWeight: 600 }}>
                {t("createOne")}
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

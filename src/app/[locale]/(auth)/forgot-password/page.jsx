"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { useLocaleContext } from "@/app/[locale]/providers";
import { Button, Card, Form, Input, Space, Typography, message, Result } from "antd";
import { MailOutlined, ArrowLeftOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { locale: rawLocale } = useLocaleContext();
  const locale = (rawLocale === "en" || rawLocale === "he") ? rawLocale : "en";
  const t = useTranslations("auth.forgotPassword");

  const linkPrefix = `/${locale}`;

  async function onFinish(values) {
    setBusy(true);
    try {
      const email = values.email.trim();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}${linkPrefix}/reset-password`
            : undefined,
      });

      if (error) throw error;

      setSent(true);
      message.success(t("success"));
    } catch (e) {
      message.error(e?.message || t("failed"));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
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
              title={t("sentTitle")}
              subTitle={t("sentSubtitle")}
              extra={
                <Link href={`${linkPrefix}/login`}>
                  <Button type="primary" icon={<ArrowLeftOutlined />}>
                    {t("backToLogin")}
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

            <Button
              type="primary"
              htmlType="submit"
              icon={<MailOutlined />}
              loading={busy}
              block
              style={{ borderRadius: 12, height: 42 }}
            >
              {t("sendLink")}
            </Button>
          </Form>

          <div style={{ marginTop: 14, textAlign: "center" }}>
            <Link href={`${linkPrefix}/login`}>
              <Button type="link" icon={<ArrowLeftOutlined />}>
                {t("backToLogin")}
              </Button>
            </Link>
          </div>
        </Card>

        <div style={{ textAlign: "center", marginTop: 14, opacity: 0.75, fontSize: 12 }}>
          {t("footer")}
        </div>
      </div>
    </div>
  );
}

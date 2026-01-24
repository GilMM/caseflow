"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Button,
  Card,
  Col,
  Divider,
  Row,
  Space,
  Tag,
  Typography,
  theme,
} from "antd";
import {
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  InboxOutlined,
  LoginOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  CloudOutlined,
  GlobalOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

function Pill({ icon, label }) {
  return (
    <Tag
      icon={icon}
      style={{
        borderRadius: 999,
        padding: "4px 10px",
        margin: 0,
        userSelect: "none",
      }}
    >
      {label}
    </Tag>
  );
}

function Feature({ icon, title, desc, token }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: 14,
        borderRadius: 12,
        border: `1px solid ${token.colorBorderSecondary || token.colorBorder}`,
        background: token.colorBgContainer,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          border: `1px solid ${token.colorBorderSecondary || token.colorBorder}`,
          background:
            "radial-gradient(400px 180px at 20% 20%, rgba(22,119,255,0.18), transparent 55%), radial-gradient(360px 160px at 80% 30%, rgba(82,196,26,0.14), transparent 55%)",
          flex: "0 0 auto",
          fontSize: 18,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{ fontWeight: 700, color: token.colorText, lineHeight: 1.2 }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: token.colorTextSecondary,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const params = useParams();
  const rawLocale = params?.locale;
  const locale = (rawLocale === "en" || rawLocale === "he") ? rawLocale : "en";
  const isHebrew = locale === "he";
  const { token } = theme.useToken();

  const linkPrefix = `/${locale}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px 16px",
        background:
          "radial-gradient(1400px 700px at 30% 20%, rgba(22,119,255,0.12), transparent 60%), radial-gradient(1200px 600px at 70% 30%, rgba(82,196,26,0.10), transparent 55%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1120, padding: "0 4px" }}>
        <Card
          style={{
            borderRadius: 24,
            border: `1px solid ${token.colorBorder}`,
            overflow: "hidden",
            background:
              "radial-gradient(1200px 600px at 20% 10%, rgba(22,119,255,0.14), transparent 60%), radial-gradient(1000px 500px at 80% 20%, rgba(82,196,26,0.12), transparent 55%)",
          }}
          styles={{ body: { padding: 0 } }}
        >
          <Row gutter={0} style={{ minHeight: 560 }}>
            {/* Left Column - Features */}
            <Col xs={24} lg={12} style={{ padding: 28 }}>
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <Space wrap size={8}>
                  <Pill
                    icon={<SafetyCertificateOutlined />}
                    label={isHebrew ? "מאובטח" : "Secure"}
                  />
                  <Pill
                    icon={<ThunderboltOutlined />}
                    label={isHebrew ? "מהיר" : "Fast"}
                  />
                  <Pill
                    icon={<TeamOutlined />}
                    label={isHebrew ? "צוותי" : "Team-based"}
                  />
                </Space>

                <div>
                  <Title level={1} style={{ margin: 0, lineHeight: 1.15 }}>
                    {isHebrew ? "ברוכים הבאים ל" : "Welcome to"}{" "}
                    <span style={{ color: token.colorPrimary }}>CaseFlow</span>
                  </Title>
                  <Paragraph
                    style={{
                      fontSize: 16,
                      color: token.colorTextSecondary,
                      marginTop: 12,
                      marginBottom: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {isHebrew
                      ? "מערכת ניהול תיקים ופניות מקצועית לארגונים. נהלו את כל התיקים, המשימות ואנשי הקשר במקום אחד."
                      : "Professional case management system for organizations. Manage all your cases, tasks, and contacts in one place."}
                  </Paragraph>
                </div>

                <Divider style={{ margin: "4px 0" }} />

                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <Feature
                    token={token}
                    icon={<InboxOutlined style={{ color: token.colorPrimary }} />}
                    title={isHebrew ? "ניהול תיקים" : "Case Management"}
                    desc={
                      isHebrew
                        ? "פתחו, עקבו ופתרו פניות עם תורים ועדיפויות. הכל מסודר ונגיש."
                        : "Open, track, and resolve requests with queues and priorities. Everything organized and accessible."
                    }
                  />
                  <Feature
                    token={token}
                    icon={<TeamOutlined style={{ color: token.colorSuccess }} />}
                    title={isHebrew ? "צוותים והרשאות" : "Teams & Roles"}
                    desc={
                      isHebrew
                        ? "מנהלים שולטים, סוכנים מטפלים בתיקים, וצופים יכולים לצפות בלבד."
                        : "Admins manage, agents handle cases, and viewers stay read-only."
                    }
                  />
                  <Feature
                    token={token}
                    icon={
                      <CloudOutlined style={{ color: token.colorPrimary }} />
                    }
                    title={isHebrew ? "אינטגרציה עם Google" : "Google Integration"}
                    desc={
                      isHebrew
                        ? "חברו את Google Sheets ליצירת תיקים אוטומטית מגיליון משותף."
                        : "Connect Google Sheets for automatic case creation from a shared spreadsheet."
                    }
                  />
                  <Feature
                    token={token}
                    icon={
                      <SafetyCertificateOutlined
                        style={{ color: token.colorWarning }}
                      />
                    }
                    title={isHebrew ? "אבטחה ברמת מסד הנתונים" : "Database-level Security"}
                    desc={
                      isHebrew
                        ? "הרשאות נאכפות ברמת Supabase RLS - לא רק בממשק המשתמש."
                        : "Permissions enforced at Supabase RLS level - not just in the UI."
                    }
                  />
                </Space>
              </Space>
            </Col>

            {/* Right Column - Actions */}
            <Col
              xs={24}
              lg={12}
              style={{
                padding: 32,
                background: token.colorBgContainer,
                borderInlineStart: `1px solid ${token.colorBorder}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div style={{ width: "100%", maxWidth: 400 }}>
                <Card
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgElevated,
                  }}
                  styles={{ body: { padding: 28 } }}
                >
                  <Space direction="vertical" size={20} style={{ width: "100%" }}>
                    <div style={{ textAlign: "center" }}>
                      <Title level={3} style={{ margin: 0, marginBottom: 6 }}>
                        {isHebrew ? "כניסה למערכת" : "Access Your Account"}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        {isHebrew
                          ? "התחברו לחשבון קיים או צרו חשבון חדש"
                          : "Sign in to your account or create a new one"}
                      </Text>
                    </div>

                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      <Link href={`${linkPrefix}/login`} style={{ display: "block" }}>
                        <Button
                          type="primary"
                          icon={<LoginOutlined />}
                          size="large"
                          block
                          style={{ height: 48, borderRadius: 10, fontSize: 15 }}
                        >
                          {isHebrew ? "התחברות" : "Sign In"}
                        </Button>
                      </Link>

                      <Link href={`${linkPrefix}/register`} style={{ display: "block" }}>
                        <Button
                          icon={<UserAddOutlined />}
                          size="large"
                          block
                          style={{ height: 48, borderRadius: 10, fontSize: 15 }}
                        >
                          {isHebrew ? "יצירת חשבון" : "Create Account"}
                        </Button>
                      </Link>
                    </Space>

                    <Divider style={{ margin: "4px 0" }} />

                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 14 }} />
                        <Text style={{ fontSize: 13 }}>
                          {isHebrew ? "הקמה מהירה בפחות מדקה" : "Quick setup in under a minute"}
                        </Text>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 14 }} />
                        <Text style={{ fontSize: 13 }}>
                          {isHebrew ? "ללא צורך בכרטיס אשראי" : "No credit card required"}
                        </Text>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 14 }} />
                        <Text style={{ fontSize: 13 }}>
                          {isHebrew ? "תמיכה בעברית ואנגלית" : "Hebrew & English support"}
                        </Text>
                      </div>
                    </Space>
                  </Space>
                </Card>

                {/* Legal Links - outside the card */}
                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <Space split={<span style={{ color: token.colorTextQuaternary }}>|</span>} size={16}>
                    <Link
                      href={`${linkPrefix}/privacy`}
                      style={{ color: token.colorTextSecondary, fontSize: 13 }}
                    >
                      {isHebrew ? "מדיניות פרטיות" : "Privacy Policy"}
                    </Link>
                    <Link
                      href={`${linkPrefix}/terms`}
                      style={{ color: token.colorTextSecondary, fontSize: 13 }}
                    >
                      {isHebrew ? "תנאי שימוש" : "Terms of Service"}
                    </Link>
                  </Space>
                </div>

                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    © {new Date().getFullYear()} CaseFlow. {isHebrew ? "כל הזכויות שמורות" : "All rights reserved"}.
                  </Text>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
}

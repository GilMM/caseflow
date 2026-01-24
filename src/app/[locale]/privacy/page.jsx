"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  Col,
  Grid,
  Row,
  Space,
  Tag,
  Typography,
  Divider,
  Button,
  theme,
} from "antd";
import {
  SafetyOutlined,
  ArrowLeftOutlined,
  MailOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

function Section({ title, children, token }) {
  return (
    <Card
      style={{
        borderRadius: 14,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
      styles={{ body: { padding: 20 } }}
    >
      <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
        {title}
      </Title>
      <div style={{ color: token.colorTextSecondary, lineHeight: 1.8 }}>
        {children}
      </div>
    </Card>
  );
}

export default function PrivacyPage() {
  const params = useParams();
  const rawLocale = params?.locale;
  const locale = (rawLocale === "en" || rawLocale === "he") ? rawLocale : "en";
  const isHebrew = locale === "he";
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();

  const linkPrefix = `/${locale}`;
  const effectiveDate = "January 1, 2026";
  const appName = "CaseFlow";
  const contactEmail = "gmeshulami@gmail.com";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: token.colorBgLayout,
        padding: isMobile ? "20px 14px" : "32px 24px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          {/* Back button */}
          <Link href={`${linkPrefix}/`}>
            <Button type="text" icon={<ArrowLeftOutlined />}>
              {isHebrew ? "חזרה לדף הבית" : "Back to Home"}
            </Button>
          </Link>

          {/* Header */}
          <Card
            style={{
              borderRadius: 16,
              border: `1px solid ${token.colorBorderSecondary}`,
              background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%)`,
            }}
            styles={{ body: { padding: isMobile ? 20 : 28 } }}
          >
            <Row justify="space-between" align="middle" gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Space direction="vertical" size={8}>
                  <Space wrap size={8}>
                    <Tag
                      icon={<SafetyOutlined />}
                      color="blue"
                      style={{ borderRadius: 999 }}
                    >
                      {isHebrew ? "אמינות ופרטיות" : "Trust & Privacy"}
                    </Tag>
                    <Tag style={{ borderRadius: 999 }}>
                      {isHebrew ? "בתוקף מ:" : "Effective:"} {effectiveDate}
                    </Tag>
                  </Space>
                  <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
                    {isHebrew ? "מדיניות פרטיות" : "Privacy Policy"}
                  </Title>
                  <Text type="secondary">
                    {isHebrew
                      ? `מסמך זה מסביר איך ${appName} אוספת, משתמשת ומגנה על מידע.`
                      : `This document explains how ${appName} collects, uses, and protects information.`}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} md={8} style={{ textAlign: isMobile ? "start" : "end" }}>
                <Button
                  icon={<MailOutlined />}
                  href={`mailto:${contactEmail}`}
                >
                  {isHebrew ? "צור קשר" : "Contact Us"}
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Content */}
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Section
              title={isHebrew ? "1. סקירה כללית" : "1. Overview"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew ? (
                  <>
                    <b>{appName}</b> היא מערכת ניהול תיקים ותהליכי עבודה לארגונים.
                    ניתן להפעיל אינטגרציה עם שירותי Google (Sheets/Drive/Apps Script)
                    ליצירת גיליון Intake משותף ואוטומציה של יצירת תיקים.
                  </>
                ) : (
                  <>
                    <b>{appName}</b> provides an organization workspace system for managing
                    cases and workflows. Optional Google integrations (Sheets/Drive/Apps Script)
                    can be enabled to create a shared intake spreadsheet and automate case creation.
                  </>
                )}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "2. מידע שאנחנו אוספים" : "2. Information We Collect"}
              token={token}
            >
              <Paragraph style={{ marginTop: 0 }}>
                <b>{isHebrew ? "2.1 מידע שאתה מספק" : "2.1 Information you provide"}</b>
              </Paragraph>
              <ul style={{ marginTop: 0, paddingInlineStart: 20 }}>
                <li>
                  {isHebrew
                    ? "פרטי חשבון בסיסיים (שם, אימייל) דרך הרשמה או Google Sign-In."
                    : "Basic account details (name, email) via registration or Google Sign-In."}
                </li>
                <li>
                  {isHebrew
                    ? "תוכן שאתה יוצר במערכת (תיקים, הודעות, אנשי קשר)."
                    : "Content you create (cases, announcements, contacts, etc.)."}
                </li>
              </ul>

              <Paragraph>
                <b>{isHebrew ? "2.2 נתוני Google (OAuth)" : "2.2 Google data via OAuth"}</b>
              </Paragraph>
              <Paragraph style={{ marginTop: 0 }}>
                {isHebrew
                  ? "כאשר אתה מחבר חשבון Google, אתה מאשר הרשאות לפי האינטגרציה שהפעלת:"
                  : "When you connect a Google Account, you grant permissions based on the integration:"}
              </Paragraph>
              <ul style={{ marginTop: 0, paddingInlineStart: 20 }}>
                <li>{isHebrew ? "Sheets: יצירה וניהול של גיליון Intake." : "Sheets: creating/managing the intake spreadsheet."}</li>
                <li>{isHebrew ? "Drive: גישה לקובץ הגיליון בלבד." : "Drive: accessing only the spreadsheet file."}</li>
                <li>{isHebrew ? "Apps Script: הרצת אוטומציות." : "Apps Script: running automation scripts."}</li>
              </ul>
            </Section>

            <Section
              title={isHebrew ? "3. שימוש במידע" : "3. How We Use Information"}
              token={token}
            >
              <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                <li>{isHebrew ? "אימות משתמשים וניהול גישה." : "Authenticate users and manage access."}</li>
                <li>{isHebrew ? "הפעלת האינטגרציות שהגדרת." : "Provide the integrations you enable."}</li>
                <li>{isHebrew ? "תמיכה, אבטחה ושיפור השירות." : "Support, security, and service improvements."}</li>
              </ul>
            </Section>

            <Section
              title={isHebrew ? "4. שיתוף מידע" : "4. Data Sharing"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew
                  ? "אנחנו לא מוכרים מידע אישי. שיתוף מתבצע רק עם ספקי שירות תחת חובת סודיות, או כנדרש בחוק."
                  : "We do not sell personal data. We share data only with service providers under confidentiality, or when required by law."}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "5. Google API - Limited Use" : "5. Google API Limited Use"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew
                  ? "השימוש במידע מ-Google APIs עומד בדרישות Google API Services User Data Policy, כולל Limited Use."
                  : "Use and transfer of information from Google APIs adheres to Google API Services User Data Policy, including Limited Use requirements."}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "6. אבטחת מידע" : "6. Data Security"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew
                  ? "אנחנו משתמשים באמצעי אבטחה סטנדרטיים בתעשייה להגנה על המידע שלך, כולל הצפנה ובקרות גישה."
                  : "We use industry-standard security measures to protect your data, including encryption and access controls."}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "7. יצירת קשר" : "7. Contact"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew ? "לשאלות בנושא פרטיות:" : "For privacy questions:"}{" "}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </Paragraph>
            </Section>
          </Space>

          {/* Footer */}
          <Divider style={{ margin: "8px 0" }} />
          <Row justify="space-between" align="middle">
            <Col>
              <Text type="secondary" style={{ fontSize: 13 }}>
                © {new Date().getFullYear()} {appName}. {isHebrew ? "כל הזכויות שמורות" : "All rights reserved"}.
              </Text>
            </Col>
            <Col>
              <Space split={<span style={{ color: token.colorTextQuaternary }}>|</span>} size={12}>
                <Link
                  href={`${linkPrefix}/terms`}
                  style={{ color: token.colorTextSecondary, fontSize: 13 }}
                >
                  {isHebrew ? "תנאי שימוש" : "Terms of Service"}
                </Link>
                <Link
                  href={`${linkPrefix}/`}
                  style={{ color: token.colorTextSecondary, fontSize: 13 }}
                >
                  {isHebrew ? "דף הבית" : "Home"}
                </Link>
              </Space>
            </Col>
          </Row>
        </Space>
      </div>
    </div>
  );
}

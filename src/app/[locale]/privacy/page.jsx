// src/app/[locale]/privacy/page.jsx
"use client";

import { useParams } from "next/navigation";
import {
  ConfigProvider,
  Card,
  Col,
  Grid,
  Row,
  Space,
  Tag,
  Typography,
  Divider,
  theme,
} from "antd";
import {
  SafetyOutlined,
  InfoCircleOutlined,
  LinkOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph, Link } = Typography;
const { useBreakpoint } = Grid;

function Section({ title, children }) {
  const { token } = theme.useToken();

  return (
    <Card
      style={{
        borderRadius: 16,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
      }}
      bodyStyle={{ padding: 18 }}
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Title level={5} style={{ margin: 0, color: token.colorText }}>
          {title}
        </Title>
        <div style={{ color: token.colorTextSecondary, lineHeight: 1.75 }}>
          {children}
        </div>
      </Space>
    </Card>
  );
}

function PageShell({ title, subtitle, rightTags, children, side }) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: token.colorBgLayout,
        padding: isMobile ? 14 : 18,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          {/* Header */}
          <Card
            style={{
              borderRadius: 18,
              border: `1px solid ${token.colorBorderSecondary}`,
              background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 55%, ${token.colorBgElevated} 100%)`,
            }}
            bodyStyle={{ padding: isMobile ? 16 : 20 }}
          >
            <Row justify="space-between" align="middle" gutter={[12, 12]}>
              <Col xs={24} md="auto">
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: token.colorText }}>
                    {title}
                  </Title>

                  <Space wrap size={8}>
                    <Tag icon={<SafetyOutlined />} style={{ borderRadius: 999 }}>
                      Trust & Compliance
                    </Tag>
                    {rightTags}
                  </Space>

                  <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                    {subtitle}
                  </Text>
                </Space>
              </Col>

              <Col xs={24} md="auto">
                <Space wrap>
                  {side}
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Content */}
          <Row gutter={[14, 14]}>
            <Col xs={24} lg={16}>
              {children}
            </Col>

            <Col xs={24} lg={8}>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Card
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer,
                  }}
                  bodyStyle={{ padding: 18 }}
                >
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Title level={5} style={{ margin: 0, color: token.colorText }}>
                      Important Links
                    </Title>
                    <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                      These pages must be publicly accessible for Google Verification.
                    </Text>
                    <Divider style={{ margin: "6px 0" }} />
                    <Space direction="vertical" size={6}>
                      <Link href="./terms">
                        <LinkOutlined /> Terms of Service
                      </Link>
                      <Link href="https://caseflow-system.vercel.app" target="_blank">
                        <LinkOutlined /> Website
                      </Link>
                      <Link href="mailto:gmeshulami@gmail.com">
                        <LinkOutlined /> gmeshulami@gmail.com
                      </Link>
                    </Space>
                  </Space>
                </Card>

                <Card
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer,
                  }}
                  bodyStyle={{ padding: 18 }}
                >
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Title level={5} style={{ margin: 0, color: token.colorText }}>
                      Tip for Google Review
                    </Title>
                    <Text style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.6 }}>
                      In your verification video, show: this page → consent screen → sheet creation → case creation.
                    </Text>
                  </Space>
                </Card>
              </Space>
            </Col>
          </Row>

          {/* Footer */}
          <Card
            style={{
              borderRadius: 16,
              border: `1px solid ${token.colorBorderSecondary}`,
              background: token.colorBgContainer,
            }}
            bodyStyle={{ padding: 14 }}
          >
            <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>
              © {new Date().getFullYear()} CaseFlow. All rights reserved.
            </Text>
          </Card>
        </Space>
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  const params = useParams();
  const locale = params?.locale || "en";
  const isHebrew = locale === "he";

  const effectiveDate = "2026-01-01";
  const appName = "CaseFlow";
  const contactEmail = "gmeshulami@gmail.com";

  return (
    <ConfigProvider
      direction={isHebrew ? "rtl" : "ltr"}
      theme={{
        algorithm: theme.darkAlgorithm, // ✅ דיפולט Dark לעמודים האלה
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 12,
        },
      }}
    >
      <PageShell
        title={isHebrew ? "מדיניות פרטיות" : "Privacy Policy"}
        subtitle={
          isHebrew
            ? "מסמך זה מסביר איך CaseFlow אוספת, משתמשת ומגנה על מידע — כולל אינטגרציות Google."
            : "This document explains how CaseFlow collects, uses, and protects information — including Google integrations."
        }
        rightTags={
          <Tag color="blue" style={{ borderRadius: 999 }}>
            {isHebrew ? "בתוקף מ:" : "Effective:"} {effectiveDate}
          </Tag>
        }
        side={
          <>
            <Tag style={{ borderRadius: 999 }}>{appName}</Tag>
            <Tag icon={<InfoCircleOutlined />} style={{ borderRadius: 999 }}>
              {isHebrew ? "לשאלות:" : "Questions:"} {contactEmail}
            </Tag>
          </>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Section title={isHebrew ? "1. סקירה כללית" : "1. Overview"}>
            <Paragraph style={{ margin: 0 }}>
              {isHebrew ? (
                <>
                  <b>{appName}</b> היא מערכת Workspaces ארגונית לניהול תיקים ותהליכי עבודה.
                  ניתן להפעיל אינטגרציה עם שירותי Google (Sheets/Drive/Apps Script) כדי ליצור
                  גיליון Intake משותף ולבצע אוטומציה של יצירת תיקים.
                </>
              ) : (
                <>
                  <b>{appName}</b> provides an organization workspace system for managing cases and workflows.
                  Optional Google integrations (Sheets/Drive/Apps Script) can be enabled to create a shared
                  intake spreadsheet and automate case creation.
                </>
              )}
            </Paragraph>
          </Section>

          <Section title={isHebrew ? "2. איזה מידע אנחנו אוספים" : "2. Information We Collect"}>
            <Paragraph style={{ marginTop: 0 }}>
              <b>{isHebrew ? "2.1 מידע שאתה מספק" : "2.1 Information you provide"}</b>
            </Paragraph>
            <ul style={{ marginTop: 0, paddingInlineStart: 18 }}>
              <li>
                {isHebrew
                  ? "פרטי חשבון בסיסיים (שם, אימייל, תמונה) לפי מה שזמין ב-Google Sign-In."
                  : "Basic account details (name, email, picture) as available via Google Sign-In."}
              </li>
              <li>
                {isHebrew
                  ? "תוכן שאתה יוצר במערכת (תיקים, הודעות, אנשי קשר ועוד)."
                  : "Content you create in the product (cases, announcements, contacts, etc.)."}
              </li>
            </ul>

            <Paragraph>
              <b>{isHebrew ? "2.2 מידע מגוגל (OAuth)" : "2.2 Google data accessed via OAuth"}</b>
            </Paragraph>
            <Paragraph style={{ marginTop: 0 }}>
              {isHebrew
                ? "כאשר אתה מחבר חשבון Google, אתה מאשר הרשאות בהתאם לאינטגרציה שהפעלת. זה עשוי לכלול:"
                : "When you connect a Google Account, you grant permissions depending on the integration you enable. This may include:"}
            </Paragraph>
            <ul style={{ marginTop: 0, paddingInlineStart: 18 }}>
              <li>{isHebrew ? "Sheets: יצירה/ניהול של גיליון Intake ארגוני." : "Sheets: creating/managing the organization intake spreadsheet."}</li>
              <li>{isHebrew ? "Drive (קבצים ספציפיים): יצירה/גישה לקובץ הגיליון המשויך לאינטגרציה." : "Drive (specific files): creating/accessing the spreadsheet file used by the integration."}</li>
              <li>{isHebrew ? "Apps Script: יצירה/עדכון פרויקט והפצות כדי להריץ אוטומציה." : "Apps Script: creating/updating script projects and deployments to run the automation."}</li>
              <li>{isHebrew ? "External requests: שליחת webhook לשרתי CaseFlow בעת אירוע." : "External requests: sending webhooks to CaseFlow servers when events occur."}</li>
              <li>{isHebrew ? "Offline access: כדי שהאינטגרציה תמשיך לעבוד ללא חיבור מחדש תדיר." : "Offline access: to keep the integration running without frequent re-authentication."}</li>
            </ul>

            <Paragraph style={{ marginBottom: 0 }}>
              {isHebrew
                ? "אנחנו משתמשים בנתוני Google רק כדי לספק את הפיצ'ר שהפעלת."
                : "We use Google data only to provide the feature you explicitly enable."}
            </Paragraph>
          </Section>

          <Section title={isHebrew ? "3. איך אנחנו משתמשים במידע" : "3. How We Use Information"}>
            <ul style={{ marginTop: 0, paddingInlineStart: 18 }}>
              <li>{isHebrew ? "אימות משתמשים וחיבור ל-Workspace." : "Authenticate users and link them to a workspace."}</li>
              <li>{isHebrew ? "יצירת/ניהול גיליון Intake ארגוני." : "Create/manage an organization intake sheet."}</li>
              <li>{isHebrew ? "אוטומציה שמזהה שינויים ושולחת אירועים ל-CaseFlow." : "Automation that detects changes and notifies CaseFlow."}</li>
              <li>{isHebrew ? "תמיכה, ניטור אבטחה ושיפור אמינות." : "Support, security monitoring, and reliability improvements."}</li>
            </ul>
          </Section>

          <Section title={isHebrew ? "4. שיתוף מידע" : "4. Data Sharing"}>
            <Paragraph style={{ margin: 0 }}>
              {isHebrew
                ? "אנחנו לא מוכרים מידע אישי. שיתוף ייעשה רק לספקי שירות תחת התחייבות סודיות, או אם נדרש לפי חוק."
                : "We do not sell personal data. We share limited data only with service providers under confidentiality, or when required by law."}
            </Paragraph>
          </Section>

          <Section title={isHebrew ? "5. Limited Use (Google)" : "5. Google Limited Use"}>
            <Paragraph style={{ margin: 0 }}>
              {isHebrew
                ? "השימוש והעברת מידע שמתקבל מ-Google APIs עומדים במדיניות Google API Services User Data Policy, כולל Limited Use."
                : "Use and transfer of information received from Google APIs follows Google API Services User Data Policy, including Limited Use."}
            </Paragraph>
          </Section>
        </Space>
      </PageShell>
    </ConfigProvider>
  );
}

// src/app/[locale]/terms/page.jsx
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
import { FileTextOutlined, InfoCircleOutlined, LinkOutlined } from "@ant-design/icons";

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
                    <Tag icon={<FileTextOutlined />} style={{ borderRadius: 999 }}>
                      Product Terms
                    </Tag>
                    {rightTags}
                  </Space>

                  <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                    {subtitle}
                  </Text>
                </Space>
              </Col>

              <Col xs={24} md="auto">
                <Space wrap>{side}</Space>
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
                      <Link href="./privacy">
                        <LinkOutlined /> Privacy Policy
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
                      Verification checklist
                    </Title>
                    <ul style={{ margin: 0, paddingInlineStart: 18, color: token.colorTextSecondary, lineHeight: 1.7 }}>
                      <li>Privacy + Terms are public (Incognito test)</li>
                      <li>Consent screen links point to /en/privacy and /en/terms</li>
                      <li>Show these pages in the verification video</li>
                    </ul>
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

export default function TermsPage() {
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
        algorithm: theme.darkAlgorithm, // ✅ Default Dark for this page
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 12,
        },
      }}
    >
      <PageShell
        title={isHebrew ? "תנאי שימוש" : "Terms of Service"}
        subtitle={
          isHebrew
            ? "תנאי השימוש של CaseFlow, כולל שימוש באינטגרציות Google."
            : "CaseFlow terms of service, including use of Google integrations."
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
          <Section title={isHebrew ? "1. הסכמה לתנאים" : "1. Acceptance of Terms"}>
            <Paragraph style={{ margin: 0 }}>
              {isHebrew
                ? `בשימוש ב-${appName} (“השירות”), אתה מסכים לתנאי שימוש אלה. אם אינך מסכים, אין להשתמש בשירות.`
                : `By accessing or using ${appName} (“Service”), you agree to these Terms. If you do not agree, do not use the Service.`}
            </Paragraph>
          </Section>

          <Section title={isHebrew ? "2. תיאור השירות" : "2. Description of the Service"}>
            <Paragraph style={{ margin: 0 }}>
              {isHebrew
                ? `${appName} היא מערכת Workspaces ארגונית לניהול תיקים (Cases), הודעות (Announcements), אנשי קשר ופעולות נוספות.`
                : `${appName} provides an organization workspace for managing cases, announcements, contacts, and related workflow features.`}
            </Paragraph>
          </Section>

          <Section title={isHebrew ? "3. חשבונות והרשאות" : "3. Accounts and Permissions"}>
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              <li>
                {isHebrew
                  ? "אתה אחראי על שמירת פרטי ההתחברות והגישה לחשבון שלך."
                  : "You are responsible for safeguarding your account access and credentials."}
              </li>
              <li>
                {isHebrew
                  ? "מנהלי הארגון אחראים לניהול משתמשים והרשאות בתוך ה-Workspace."
                  : "Organization administrators manage membership and permissions within the workspace."}
              </li>
            </ul>
          </Section>

          <Section title={isHebrew ? "4. אינטגרציות Google" : "4. Google Integrations"}>
            <Paragraph style={{ margin: 0 }}>
              {isHebrew ? (
                <>
                  השימוש באינטגרציות Google הוא אופציונלי ומופעל על ידי מנהלי הארגון.
                  בעת חיבור חשבון Google, תתבקש לאשר הרשאות (OAuth) בהתאם לפיצ׳ר
                  שהפעלת. ניתן לבטל גישה בכל עת דרך חשבון Google.
                </>
              ) : (
                <>
                  Google integrations are optional and may be enabled by organization admins.
                  When connecting a Google Account, you will be asked to grant OAuth permissions
                  required for the enabled feature. You can revoke access at any time from your Google Account.
                </>
              )}
            </Paragraph>
          </Section>

          <Section title={isHebrew ? "5. שימוש מותר" : "5. Acceptable Use"}>
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              <li>
                {isHebrew
                  ? "אין לבצע גישה לא מורשית, ניסיון חדירה או פגיעה בזמינות השירות."
                  : "No unauthorized access attempts, intrusion, or disruption of service availability."}
              </li>
              <li>
                {isHebrew
                  ? "אין להעלות תוכן זדוני, לא חוקי או שמפר זכויות."
                  : "No malicious, unlawful, or rights-infringing content."}
              </li>
              <li>
                {isHebrew
                  ? "אין להשתמש בשירות כדי לעקוף מגבלות אבטחה או הרשאות."
                  : "Do not bypass security controls or permission boundaries."}
              </li>
            </ul>
          </Section>

          <Section title={isHebrew ? "6. זמינות ושינויים" : "6. Availability and Changes"}>
            <Paragraph style={{ margin: 0 }}>
              {isHebrew
                ? "אנחנו עשויים לשפר, לשנות או להפסיק חלקים מהשירות. ננסה להודיע מראש כשסביר."
                : "We may improve, modify, or discontinue parts of the Service. We will try to provide notice when reasonable."}
            </Paragraph>
          </Section>

          <Section title={isHebrew ? "7. הגבלת אחריות" : "7. Limitation of Liability"}>
            <Paragraph style={{ margin: 0 }}>
              {isHebrew
                ? "השירות מסופק “כפי שהוא”. במידה המותרת בחוק, לא נהיה אחראים לנזקים עקיפים/תוצאתיים."
                : "The Service is provided “as is”. To the maximum extent permitted by law, we are not liable for indirect or consequential damages."}
            </Paragraph>
          </Section>

          <Section title={isHebrew ? "8. פרטיות" : "8. Privacy"}>
            <Paragraph style={{ margin: 0 }}>
              {isHebrew ? (
                <>
                  מדיניות הפרטיות היא חלק בלתי נפרד מתנאים אלה. קרא אותה כאן:{" "}
                  <Link href="./privacy">מדיניות פרטיות</Link>
                </>
              ) : (
                <>
                  Our Privacy Policy is part of these Terms. Read it here:{" "}
                  <Link href="./privacy">Privacy Policy</Link>
                </>
              )}
            </Paragraph>
          </Section>

          <Section title={isHebrew ? "9. יצירת קשר" : "9. Contact"}>
            <Paragraph style={{ margin: 0 }}>
              <Link href={`mailto:${contactEmail}`}>{contactEmail}</Link>
            </Paragraph>
          </Section>
        </Space>
      </PageShell>
    </ConfigProvider>
  );
}

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
  FileTextOutlined,
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

export default function TermsPage() {
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
        <Space orientation="vertical" size={20} style={{ width: "100%" }}>
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
                <Space orientation="vertical" size={8}>
                  <Space wrap size={8}>
                    <Tag
                      icon={<FileTextOutlined />}
                      color="blue"
                      style={{ borderRadius: 999 }}
                    >
                      {isHebrew ? "תנאים משפטיים" : "Legal Terms"}
                    </Tag>
                    <Tag style={{ borderRadius: 999 }}>
                      {isHebrew ? "בתוקף מ:" : "Effective:"} {effectiveDate}
                    </Tag>
                  </Space>
                  <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
                    {isHebrew ? "תנאי שימוש" : "Terms of Service"}
                  </Title>
                  <Text type="secondary">
                    {isHebrew
                      ? `התנאים החלים על השימוש ב-${appName}.`
                      : `The terms that govern your use of ${appName}.`}
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
          <Space orientation="vertical" size={14} style={{ width: "100%" }}>
            <Section
              title={isHebrew ? "1. הסכמה לתנאים" : "1. Acceptance of Terms"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew
                  ? `בשימוש ב-${appName} ("השירות"), אתה מסכים לתנאי שימוש אלה. אם אינך מסכים, אין להשתמש בשירות.`
                  : `By accessing or using ${appName} ("Service"), you agree to these Terms. If you do not agree, do not use the Service.`}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "2. תיאור השירות" : "2. Description of Service"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew
                  ? `${appName} היא מערכת ניהול תיקים (Cases), הודעות, אנשי קשר ותהליכי עבודה לארגונים.`
                  : `${appName} provides an organization workspace for managing cases, announcements, contacts, and workflow features.`}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "3. חשבונות והרשאות" : "3. Accounts and Permissions"}
              token={token}
            >
              <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                <li>
                  {isHebrew
                    ? "אתה אחראי על שמירת פרטי ההתחברות שלך."
                    : "You are responsible for safeguarding your account credentials."}
                </li>
                <li>
                  {isHebrew
                    ? "מנהלי הארגון אחראים על ניהול משתמשים והרשאות."
                    : "Organization administrators manage membership and permissions."}
                </li>
              </ul>
            </Section>

            <Section
              title={isHebrew ? "4. אינטגרציות Google" : "4. Google Integrations"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew ? (
                  <>
                    השימוש באינטגרציות Google הוא אופציונלי. בעת חיבור חשבון Google,
                    תתבקש לאשר הרשאות (OAuth) לפי הפיצ'ר שהפעלת.
                    ניתן לבטל גישה בכל עת דרך חשבון Google שלך.
                  </>
                ) : (
                  <>
                    Google integrations are optional. When connecting a Google Account,
                    you will grant OAuth permissions required for the enabled feature.
                    You can revoke access at any time from your Google Account settings.
                  </>
                )}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "5. שימוש מותר" : "5. Acceptable Use"}
              token={token}
            >
              <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                <li>
                  {isHebrew
                    ? "אין לבצע גישה לא מורשית או לפגוע בזמינות השירות."
                    : "No unauthorized access or disruption of service."}
                </li>
                <li>
                  {isHebrew
                    ? "אין להעלות תוכן זדוני, לא חוקי או שמפר זכויות."
                    : "No malicious, unlawful, or rights-infringing content."}
                </li>
                <li>
                  {isHebrew
                    ? "אין לעקוף מגבלות אבטחה או הרשאות."
                    : "Do not bypass security controls or permissions."}
                </li>
              </ul>
            </Section>

            <Section
              title={isHebrew ? "6. זמינות ושינויים" : "6. Availability and Changes"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew
                  ? "אנחנו עשויים לעדכן או לשנות חלקים מהשירות. ננסה להודיע מראש כשאפשר."
                  : "We may update or modify parts of the Service. We will try to provide notice when reasonable."}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "7. הגבלת אחריות" : "7. Limitation of Liability"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew
                  ? 'השירות מסופק "כפי שהוא". במידה המותרת בחוק, לא נהיה אחראים לנזקים עקיפים.'
                  : 'The Service is provided "as is". To the maximum extent permitted by law, we are not liable for indirect damages.'}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "8. פרטיות" : "8. Privacy"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew ? (
                  <>
                    מדיניות הפרטיות היא חלק מתנאים אלה.{" "}
                    <Link href={`${linkPrefix}/privacy`}>קרא את מדיניות הפרטיות</Link>
                  </>
                ) : (
                  <>
                    Our Privacy Policy is part of these Terms.{" "}
                    <Link href={`${linkPrefix}/privacy`}>Read Privacy Policy</Link>
                  </>
                )}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "9. יצירת קשר" : "9. Contact"}
              token={token}
            >
              <Paragraph style={{ margin: 0 }}>
                {isHebrew ? "לשאלות:" : "For questions:"}{" "}
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
              <Space separator={<span style={{ color: token.colorTextQuaternary }}>|</span>} size={12}>
                <Link
                  href={`${linkPrefix}/privacy`}
                  style={{ color: token.colorTextSecondary, fontSize: 13 }}
                >
                  {isHebrew ? "מדיניות פרטיות" : "Privacy Policy"}
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

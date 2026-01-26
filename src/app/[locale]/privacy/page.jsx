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
  const locale = rawLocale === "en" || rawLocale === "he" ? rawLocale : "en";
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
          <Link href={`${linkPrefix}/`}>
            <Button type="text" icon={<ArrowLeftOutlined />}>
              {isHebrew ? "חזרה לדף הבית" : "Back to Home"}
            </Button>
          </Link>

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
                    <Tag icon={<SafetyOutlined />} color="blue">
                      {isHebrew ? "אמינות ופרטיות" : "Trust & Privacy"}
                    </Tag>
                    <Tag>
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
              <Col
                xs={24}
                md={8}
                style={{ textAlign: isMobile ? "start" : "end" }}
              >
                <Button icon={<MailOutlined />} href={`mailto:${contactEmail}`}>
                  {isHebrew ? "צור קשר" : "Contact Us"}
                </Button>
              </Col>
            </Row>
          </Card>

          <Space orientation="vertical" size={14} style={{ width: "100%" }}>
            <Section
              title={isHebrew ? "1. סקירה כללית" : "1. Overview"}
              token={token}
            >
              <Paragraph>
                {isHebrew
                  ? "CaseFlow היא מערכת לניהול תיקים ותהליכי עבודה לארגונים, עם אפשרות לאינטגרציה עם Google ליצירת גיליון Intake ואוטומציה."
                  : "CaseFlow provides an organizational workspace for managing cases and workflows, with optional Google integrations for spreadsheet-based intake automation."}
              </Paragraph>
            </Section>

            <Section
              title={
                isHebrew ? "2. מידע שאנחנו אוספים" : "2. Information We Collect"
              }
              token={token}
            >
              <Paragraph>
                <b>{isHebrew ? "מידע חשבון" : "Account Information"}</b>
              </Paragraph>
              <ul style={{ marginTop: 6, paddingInlineStart: 22 }}>
                <li>{isHebrew ? "שם ואימייל" : "Name and email address"}</li>
                <li>
                  {isHebrew
                    ? "תוכן שאתה יוצר במערכת"
                    : "Content created within the platform"}
                </li>
              </ul>

              <Paragraph>
                <b>
                  {isHebrew
                    ? "נתוני Google באמצעות OAuth"
                    : "Google Data via OAuth"}
                </b>
              </Paragraph>

              <Paragraph>
                {isHebrew ? (
                  <>
                    CaseFlow מקבלת גישה רק לקובץ הגיליון הספציפי שהמשתמש יוצר או
                    בוחר במפורש באמצעות הרשאת
                    <b> drive.file</b>. הגישה משמשת לקריאה וכתיבה בגיליון לצורך
                    אוטומציית יצירת תיקים. בנוסף, המערכת יוצרת סקריפט Apps
                    Script הצמוד לגיליון להפעלת האוטומציה. אין גישה לקבצים אחרים
                    בדרייב.
                  </>
                ) : (
                  <>
                    CaseFlow accesses only the specific Google Drive spreadsheet
                    file that the user explicitly creates or selects using the{" "}
                    <b>drive.file</b> permission. This access is used solely to
                    read and write data within that spreadsheet for workflow
                    automation. An Apps Script bound to the spreadsheet is
                    created to enable automation. No other Google Drive files
                    are accessed.
                  </>
                )}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "3. שימוש במידע" : "3. How We Use Information"}
              token={token}
            >
<ul style={{ marginTop: 6, paddingInlineStart: 22 }}>
                <li>
                  {isHebrew
                    ? "אימות וניהול משתמשים"
                    : "Authentication and access management"}
                </li>
                <li>
                  {isHebrew
                    ? "הפעלת אינטגרציות"
                    : "Providing enabled integrations"}
                </li>
                <li>{isHebrew ? "אבטחה ותמיכה" : "Security and support"}</li>
              </ul>
            </Section>

            <Section
              title={
                isHebrew
                  ? "4. Google API Limited Use"
                  : "4. Google API Limited Use"
              }
              token={token}
            >
              <Paragraph>
                {isHebrew
                  ? "השימוש בנתוני Google עומד במדיניות Google Limited Use. המידע אינו משמש לפרסום ואינו משמש לאימון מודלי AI."
                  : "Use of Google data complies with Google API Services User Data Policy (Limited Use). Data is not used for advertising or for training AI/ML models."}
              </Paragraph>
            </Section>

            <Section
              title={
                isHebrew
                  ? "5. שמירת מידע ומחיקה"
                  : "5. Data Retention & Deletion"
              }
              token={token}
            >
<ul style={{ marginTop: 6, paddingInlineStart: 22 }}>
                <li>
                  {isHebrew
                    ? "המידע נשמר כל עוד החשבון פעיל"
                    : "Data is retained while the account is active"}
                </li>
                <li>
                  {isHebrew
                    ? "ניתוק Google מוחק טוקנים מיידית"
                    : "Disconnecting Google deletes tokens immediately"}
                </li>
                <li>
                  {isHebrew
                    ? "מחיקה מלאה תוך 30 יום"
                    : "Full deletion within 30 days upon request"}
                </li>
              </ul>
              <Paragraph>
                {isHebrew
                  ? "ניתן גם לבטל הרשאות דרך הגדרות האבטחה של חשבון Google."
                  : "Users may also revoke access at any time from their Google Account security settings."}
              </Paragraph>
            </Section>

            <Section
              title={isHebrew ? "6. יצירת קשר" : "6. Contact"}
              token={token}
            >
              <Paragraph>
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </Paragraph>
            </Section>
          </Space>

          <Divider />

          <Row justify="space-between">
            <Text type="secondary">
              © {new Date().getFullYear()} {appName}
            </Text>
            <Space>
              <Link href={`${linkPrefix}/terms`}>
                {isHebrew ? "תנאים" : "Terms"}
              </Link>
              <Link href={`${linkPrefix}/`}>{isHebrew ? "בית" : "Home"}</Link>
            </Space>
          </Row>
        </Space>
      </div>
    </div>
  );
}

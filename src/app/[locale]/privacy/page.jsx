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
  LockOutlined,
  ShareAltOutlined,
  GoogleOutlined,
  DeleteOutlined,
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

  const t = {
    he: {
      back: "חזרה לדף הבית",
      tagTrust: "אמינות ופרטיות",
      effective: "בתוקף מ:",
      title: "מדיניות פרטיות",
      subtitle: `מסמך זה מסביר איך ${appName} אוספת, משתמשת, משתפת ומגנה על מידע, כולל נתוני Google במסגרת האינטגרציה.`,
      contact: "צור קשר",

      s1: "1. סקירה כללית",
      s1p:
        "CaseFlow היא מערכת לניהול פניות ותהליכי עבודה לארגונים. המערכת מאפשרת אינטגרציות אופציונליות עם Google (למשל Google Sheets) לצורך יצירת גיליון Intake וסנכרון סטטוסים, רק בהסכמת המשתמש.",

      s2: "2. מידע שאנחנו אוספים",
      s2a: "מידע חשבון (במערכת CaseFlow)",
      s2a_li1: "שם ואימייל (כפי שהמשתמש מזין/מאשר)",
      s2a_li2: "תוכן שהמשתמש יוצר במערכת (כמו פניות, תגובות, קבצים שהמשתמש מעלה, והגדרות ארגון)",
      s2b: "נתוני Google באמצעות OAuth (אינטגרציית Google Sheets)",
      s2b_p1:
        "כאשר המשתמש מחבר את חשבון Google לארגון שלו, CaseFlow מבקשת גישה אך ורק לצורך הפעלת האינטגרציה ולמתן הפיצ'ר שסופק למשתמש. הגישה מתייחסת לגיליון ה־Google Sheets הספציפי שהמשתמש יוצר או בוחר במפורש.",
      s2b_p2:
        "CaseFlow משתמשת בנתוני Google רק כדי לקרוא ולכתוב בתוך אותו גיליון לצורך יצירת פניות מהשיטס וסנכרון סטטוס. אין גישה לקבצים אחרים בדרייב מעבר למה שהמשתמש יוצר/בוחר במסגרת החיבור.",

      s3: "3. איך אנחנו משתמשים במידע",
      s3_li1: "אימות וניהול משתמשים והרשאות",
      s3_li2: "הפעלת פיצ'רים במערכת (כולל אינטגרציות שהמשתמש הפעיל)",
      s3_li3: "אבטחה, מניעת הונאה, וניטור שימוש לרבות לוגים תפעוליים",
      s3_li4: "תמיכה טכנית לפי בקשת המשתמש",

      s4: "4. שיתוף, העברה או גילוי נתונים (כולל נתוני Google)",
      s4_p1:
        "CaseFlow אינה מוכרת נתונים, ואינה משתפת או מעבירה נתוני Google של משתמשים לצדדים שלישיים לצרכי פרסום.",
      s4_p2a: "אנו עשויים לשתף/לגלות נתונים רק במקרים הבאים:",
      s4_li1:
        "לספקי תשתית הכרחיים להפעלת השירות (למשל שירותי אירוח/בסיס נתונים) — בהתאם להסכמי עיבוד נתונים ומדיניות אבטחה",
      s4_li2:
        "כדי לציית לחוק, צו משפטי, או בקשה מחייבת מרשות מוסמכת",
      s4_li3:
        "כדי להגן על זכויות, אבטחת המערכת, או למנוע שימוש לרעה משמעותי (ככל שהדבר נדרש וסביר)",

      s5: "5. מנגנוני אבטחה והגנה על מידע רגיש",
      s5_p1:
        "אנו מיישמים מנגנוני אבטחה תעשייתיים להגנת מידע (כולל מידע רגיש) כגון:",
      s5_li1: "תקשורת מוצפנת (HTTPS/TLS) בין הלקוח לשרתים",
      s5_li2:
        "בקרת גישה והרשאות מבוססות תפקידים (Role-Based Access Control) בתוך הארגון",
      s5_li3:
        "בידוד נתונים בין ארגונים (Multi-tenant isolation) ואכיפת הרשאות ברמת מסד הנתונים (RLS)",
      s5_li4: "גישה מוגבלת לטוקנים ונתוני אינטגרציה, ושמירה מאובטחת שלהם",
      s5_li5:
        "ניטור לוגים, זיהוי אנומליות, ושיפורים מתמשכים של אבטחה לפי הצורך",

      s6: "6. Google API Services User Data Policy (Limited Use)",
      s6_p1:
        "השימוש בנתוני Google עומד במדיניות Google API Services User Data Policy (Limited Use). נתוני Google אינם משמשים לפרסום, ואינם משמשים לאימון מודלים של AI/ML.",

      s7: "7. שמירת מידע, ביטול הרשאות ומחיקה",
      s7_p1:
        "המשתמש יכול לנתק את אינטגרציית Google בכל עת מתוך הגדרות המערכת. ניתוק מוחק/מבטל את הטוקנים הדרושים לסנכרון ומפסיק את השימוש בנתוני Google.",
      s7_li1: "המידע נשמר כל עוד החשבון/הארגון פעיל",
      s7_li2:
        "ניתוק Google מבטל גישה לטוקנים הדרושים לסנכרון ומפסיק את הסנכרון",
      s7_li3:
        "מחיקה מלאה של נתוני חשבון/ארגון תתבצע לפי בקשה תוך עד 30 יום (בכפוף לחובות חוקיות/אבטחתיות לשמירת לוגים מינימליים)",
      s7_p2:
        "ניתן גם לבטל הרשאות דרך הגדרות האבטחה של חשבון Google (Google Account > Security > Third-party access).",

      s8: "8. יצירת קשר",
      footerTerms: "תנאים",
      footerHome: "בית",
    },
    en: {
      back: "Back to Home",
      tagTrust: "Trust & Privacy",
      effective: "Effective:",
      title: "Privacy Policy",
      subtitle: `This document explains how ${appName} collects, uses, shares/discloses, and protects information, including Google user data for the Google Sheets integration.`,
      contact: "Contact Us",

      s1: "1. Overview",
      s1p:
        "CaseFlow provides an organizational workspace for managing cases and workflows. Optional Google integrations (such as Google Sheets) can be enabled by the user to create an intake spreadsheet and synchronize case statuses, only with the user’s explicit consent.",

      s2: "2. Information We Collect",
      s2a: "Account Information (within CaseFlow)",
      s2a_li1: "Name and email address (as provided/confirmed by the user)",
      s2a_li2:
        "Content created within the platform (such as cases, comments, uploaded files, and organization settings)",
      s2b: "Google Data via OAuth (Google Sheets Integration)",
      s2b_p1:
        "When a user connects Google to their organization, CaseFlow requests access only to enable the feature the user chose to use. Access is limited to the specific Google Sheets file that the user explicitly creates or selects.",
      s2b_p2:
        "CaseFlow uses Google data solely to read and write within that spreadsheet to create cases from the sheet and synchronize case status. No other Google Drive files are accessed beyond what the user creates/selects as part of the integration.",

      s3: "3. How We Use Information",
      s3_li1: "Authentication, access control, and account management",
      s3_li2: "Providing platform features, including user-enabled integrations",
      s3_li3:
        "Security, fraud prevention, and operational logging/monitoring",
      s3_li4: "Technical support upon user request",

      s4: "4. Data Sharing, Transfer, or Disclosure (including Google user data)",
      s4_p1:
        "CaseFlow does not sell data, and does not share or transfer Google user data to third parties for advertising purposes.",
      s4_p2a: "We may share/disclose data only in the following cases:",
      s4_li1:
        "With essential infrastructure providers required to operate the service (e.g., hosting/database), under appropriate contractual and security safeguards",
      s4_li2:
        "To comply with applicable law, a court order, or a valid legal request",
      s4_li3:
        "To protect rights, system security, or prevent significant abuse, as reasonably necessary",

      s5: "5. Security & Data Protection for Sensitive Data",
      s5_p1:
        "We use industry-standard security measures to protect information (including sensitive data), such as:",
      s5_li1: "Encrypted connections (HTTPS/TLS) between clients and servers",
      s5_li2:
        "Role-based access controls within organizations",
      s5_li3:
        "Multi-tenant isolation and database-level authorization (Row Level Security / RLS)",
      s5_li4:
        "Restricted access and secure storage of integration tokens and related data",
      s5_li5:
        "Logging/monitoring for anomaly detection and continuous security improvements",

      s6: "6. Google API Services User Data Policy (Limited Use)",
      s6_p1:
        "Use of Google data complies with the Google API Services User Data Policy (Limited Use). Google user data is not used for advertising and is not used to train AI/ML models.",

      s7: "7. Data Retention, Revocation & Deletion",
      s7_p1:
        "Users can disconnect the Google integration at any time from the app settings. Disconnecting revokes/invalidates the tokens required for synchronization and stops the use of Google data.",
      s7_li1: "Data is retained while the account/organization remains active",
      s7_li2:
        "Disconnecting Google revokes/invalidates access tokens required for synchronization",
      s7_li3:
        "Account/organization deletion requests are processed within up to 30 days (subject to minimal legal/security log retention obligations)",
      s7_p2:
        "Users may also revoke access at any time from their Google Account security settings (Google Account > Security > Third-party access).",

      s8: "8. Contact",
      footerTerms: "Terms",
      footerHome: "Home",
    },
  }[isHebrew ? "he" : "en"];

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
              {t.back}
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
                      {t.tagTrust}
                    </Tag>
                    <Tag>
                      {t.effective} {effectiveDate}
                    </Tag>
                  </Space>
                  <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
                    {t.title}
                  </Title>
                  <Text type="secondary">{t.subtitle}</Text>
                </Space>
              </Col>
              <Col
                xs={24}
                md={8}
                style={{ textAlign: isMobile ? "start" : "end" }}
              >
                <Button icon={<MailOutlined />} href={`mailto:${contactEmail}`}>
                  {t.contact}
                </Button>
              </Col>
            </Row>
          </Card>

          <Space orientation="vertical" size={14} style={{ width: "100%" }}>
            <Section title={t.s1} token={token}>
              <Paragraph>{t.s1p}</Paragraph>
            </Section>

            <Section title={t.s2} token={token}>
              <Paragraph>
                <b>{t.s2a}</b>
              </Paragraph>
              <ul style={{ marginTop: 6, paddingInlineStart: 22 }}>
                <li>{t.s2a_li1}</li>
                <li>{t.s2a_li2}</li>
              </ul>

              <Divider style={{ margin: "14px 0" }} />

              <Paragraph>
                <Space size={8}>
                  <GoogleOutlined />
                  <b>{t.s2b}</b>
                </Space>
              </Paragraph>

              <Paragraph>{t.s2b_p1}</Paragraph>
              <Paragraph>{t.s2b_p2}</Paragraph>
            </Section>

            <Section title={t.s3} token={token}>
              <ul style={{ marginTop: 6, paddingInlineStart: 22 }}>
                <li>{t.s3_li1}</li>
                <li>{t.s3_li2}</li>
                <li>{t.s3_li3}</li>
                <li>{t.s3_li4}</li>
              </ul>
            </Section>

            <Section title={t.s4} token={token}>
              <Paragraph>
                <Space size={8}>
                  <ShareAltOutlined />
                  <span>{t.s4_p1}</span>
                </Space>
              </Paragraph>
              <Paragraph>{t.s4_p2a}</Paragraph>
              <ul style={{ marginTop: 6, paddingInlineStart: 22 }}>
                <li>{t.s4_li1}</li>
                <li>{t.s4_li2}</li>
                <li>{t.s4_li3}</li>
              </ul>
            </Section>

            <Section title={t.s5} token={token}>
              <Paragraph>
                <Space size={8}>
                  <LockOutlined />
                  <span>{t.s5_p1}</span>
                </Space>
              </Paragraph>
              <ul style={{ marginTop: 6, paddingInlineStart: 22 }}>
                <li>{t.s5_li1}</li>
                <li>{t.s5_li2}</li>
                <li>{t.s5_li3}</li>
                <li>{t.s5_li4}</li>
                <li>{t.s5_li5}</li>
              </ul>
            </Section>

            <Section title={t.s6} token={token}>
              <Paragraph>{t.s6_p1}</Paragraph>
            </Section>

            <Section title={t.s7} token={token}>
              <Paragraph>
                <Space size={8}>
                  <DeleteOutlined />
                  <span>{t.s7_p1}</span>
                </Space>
              </Paragraph>
              <ul style={{ marginTop: 6, paddingInlineStart: 22 }}>
                <li>{t.s7_li1}</li>
                <li>{t.s7_li2}</li>
                <li>{t.s7_li3}</li>
              </ul>
              <Paragraph>{t.s7_p2}</Paragraph>
            </Section>

            <Section title={t.s8} token={token}>
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
              <Link href={`${linkPrefix}/terms`}>{t.footerTerms}</Link>
              <Link href={`${linkPrefix}/`}>{t.footerHome}</Link>
            </Space>
          </Row>
        </Space>
      </div>
    </div>
  );
}

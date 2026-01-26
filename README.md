# CaseFlow - מערכת ניהול פניות מקצועית

<div align="center">

![CaseFlow Logo](https://img.shields.io/badge/CaseFlow-Case%20Management-blue?style=for-the-badge)

**מערכת ניהול פניות, לקוחות ותורים לארגונים**

[English](#english) | [עברית](#hebrew)

</div>

---

<a name="hebrew"></a>

## תוכן עניינים

- [סקירה כללית](#סקירה-כללית)
- [טכנולוגיות](#טכנולוגיות)
- [מבנה הפרויקט](#מבנה-הפרויקט)
- [תכונות עיקריות](#תכונות-עיקריות)
- [סכמת מסד הנתונים](#סכמת-מסד-הנתונים)
- [נתיבי API](#נתיבי-api)
- [מערכת האימות](#מערכת-האימות)
- [אינטגרציות](#אינטגרציות)
- [התקנה והפעלה](#התקנה-והפעלה)
- [משתני סביבה](#משתני-סביבה)
- [תרומה לפרויקט](#תרומה-לפרויקט)

---

## סקירה כללית

**CaseFlow** היא מערכת ניהול פניות מקצועית המיועדת לארגונים. המערכת מאפשרת ניהול פניות, לקוחות, תורים ו-workspaces עם בקרת גישה מבוססת תפקידים, תמיכה בריבוי ארגונים ואינטגרציה עם Google Sheets.

### יכולות מרכזיות:
- ניהול פניות מקצה לקצה
- ניהול תורים וחלוקת עבודה
- ניהול אנשי קשר
- יומן ולוח שנה
- Dashboard עם סטטיסטיקות
- אינטגרציה עם Google Sheets
- תמיכה בעברית ואנגלית (כולל RTL)
- בדיקת איות חכמה עם AI

---

## טכנולוגיות

| טכנולוגיה | גרסה | תפקיד |
|-----------|-------|--------|
| Next.js | 16.1.1 | Framework, API Routes, SSR |
| React | 19.2.3 | ספריית UI |
| Ant Design | 6.1.4 | ספריית קומפוננטות |
| Supabase | 2.90.0 | מסד נתונים ואימות |
| next-intl | 4.7.0 | בינלאומיות |
| OpenAI | 6.16.0 | בדיקת איות AI |

---

## מבנה הפרויקט

```
caseflow/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # נתיבי API
│   │   │   ├── ai/spellcheck/       # בדיקת איות עם OpenAI
│   │   │   ├── integrations/        # אינטגרציות חיצוניות
│   │   │   │   ├── google/          # Google OAuth & webhooks
│   │   │   │   │   ├── auth/        # זרימת OAuth
│   │   │   │   │   ├── callback/    # OAuth callback
│   │   │   │   │   ├── connection/  # בדיקת חיבור
│   │   │   │   │   ├── disconnect/  # ניתוק חיבור
│   │   │   │   │   ├── start/       # התחלת OAuth
│   │   │   │   │   └── webhook/     # קבלת עדכונים מ-Sheet
│   │   │   │   └── google-sheets/   # API לאינטגרציה
│   │   │   │       ├── create/      # יצירת Sheet חדש
│   │   │   │       ├── get/         # שליפת פרטי Sheet
│   │   │   │       ├── install/     # התקנת Apps Script
│   │   │   │       ├── setup/       # הגדרת אינטגרציה
│   │   │   │       ├── status/      # בדיקת סטטוס
│   │   │   │       ├── toggle/      # הפעלה/כיבוי
│   │   │   │       ├── reset/       # איפוס
│   │   │   │       ├── regenerate-secret/  # חידוש secret
│   │   │   │       └── share-to-org/       # שיתוף לחברי הארגון
│   │   │   └── orgs/                # APIs לארגונים
│   │   │       ├── active/          # הגדרת ארגון פעיל
│   │   │       └── delete/          # מחיקת ארגון
│   │   ├── [locale]/               # ניתוב לפי שפה (en, he)
│   │   │   ├── (app)/              # דפים מאומתים
│   │   │   │   ├── page.jsx         # Dashboard
│   │   │   │   ├── layout.jsx       # App Shell & ניווט
│   │   │   │   ├── AppShell.jsx     # קומפוננטת Layout ראשית
│   │   │   │   ├── announcements/   # הודעות ארגון
│   │   │   │   ├── calendar/        # ניהול יומן
│   │   │   │   ├── cases/           # ניהול פניות
│   │   │   │   │   ├── page.jsx     # רשימת פניות
│   │   │   │   │   ├── new/         # יצירת פנייה
│   │   │   │   │   └── [id]/        # צפייה ועריכת פנייה
│   │   │   │   ├── contacts/        # ניהול אנשי קשר
│   │   │   │   ├── dashboard/       # Dashboard וסטטיסטיקות
│   │   │   │   ├── organizations/   # יצירת ארגון
│   │   │   │   ├── queues/          # ניהול תורים
│   │   │   │   ├── settings/        # הגדרות ארגון
│   │   │   │   └── i/[token]/       # קבלת הזמנה
│   │   │   ├── (auth)/              # דפי אימות
│   │   │   │   ├── login/           # כניסה
│   │   │   │   ├── register/        # הרשמה
│   │   │   │   └── onboarding/      # הגדרת ארגון ראשון
│   │   │   └── providers.jsx        # Theme & Context providers
│   │   └── layout.js                # Root HTML layout
│   ├── components/                  # קומפוננטות משותפות
│   │   ├── cases/                   # קומפוננטות לפניות
│   │   ├── LandingPublic.jsx        # דף נחיתה ציבורי
│   │   ├── LanguageSwitcher.jsx     # בחירת שפה
│   │   └── OrgSwitcher.jsx          # מעבר בין ארגונים
│   ├── contexts/                    # React Context
│   │   ├── UserContext.js           # Context למשתמש
│   │   └── WorkspaceContext.js      # Context ל-workspace
│   ├── lib/                         # ספריות עזר
│   │   ├── db.js                    # פונקציות מסד נתונים
│   │   ├── auth/                    # כלי אימות
│   │   │   └── requireOrgAdminRoute.js  # Middleware לאדמין
│   │   ├── integrations/google/     # כלי אינטגרציה
│   │   │   ├── oauth.js             # זרימת OAuth
│   │   │   ├── tokens.js            # ניהול טוקנים
│   │   │   ├── authz.js             # הרשאות
│   │   │   └── crypto.js            # הצפנה
│   │   ├── supabase/                # לקוחות Supabase
│   │   │   ├── client.js            # צד לקוח
│   │   │   ├── server.js            # צד שרת
│   │   │   └── admin.js             # Admin client
│   │   └── ui/                      # כלי UI
│   │       ├── activity.js          # מיפוי סוגי פעילות
│   │       ├── priority.js          # כלי עדיפות
│   │       ├── status.js            # כלי סטטוס
│   │       └── queue.js             # כלי תורים
│   └── i18n/                        # בינלאומיות
│       ├── config.js                # הגדרות i18n
│       └── request.js               # טיפול בבקשות
├── messages/                        # קבצי תרגום (JSON)
├── public/                          # קבצים סטטיים
├── middleware.js                    # Middleware (אימות, שפה)
├── next.config.mjs                  # הגדרות Next.js
└── package.json                     # תלויות
```

---

## תכונות עיקריות

### 1. ניהול פניות (Cases)
- **יצירת פניות**: טופס מלא עם כותרת, תיאור, עדיפות, פונה, מטפל
- **צפייה בפניות**: רשימה עם דפדוף, סינון לפי סטטוס/עדיפות/תור
- **עריכת פניות**: עדכון כל השדות
- **הקצאת פניות**: הקצאה לחברי צוות
- **מעקב סטטוס**: זרימת עבודה (new → in_progress → resolved → closed)
- **רמות עדיפות**: נמוכה, רגילה, גבוהה, דחופה
- **קבצים מצורפים**: העלאה והורדה של קבצים
- **היסטוריית פנייה**: תיעוד פעולות, הערות, שינויי סטטוס

### 2. ניהול תורים (Queues)
- **יצירה ועריכה**: ארגון פניות לפי מחלקה או קטגוריה
- **תור ברירת מחדל**: כל ארגון מקבל תור "General"
- **חברי תור**: הקצאת חברי צוות לתורים ספציפיים
- **קוד תור**: מזהה ייחודי לכל תור לצורך ניתוב

### 3. ניהול אנשי קשר (Contacts)
- **יצירת אנשי קשר**: שמירת פרטי פונים/לקוחות
- **מאגר אנשי קשר**: שם מלא, אימייל, טלפון, מחלקה
- **קישור לפניות**: בחירת איש קשר כפונה בפנייה
- **חיפוש וסינון**: מציאת אנשי קשר לפי שם/אימייל

### 4. ניהול ארגונים
- **ריבוי ארגונים**: משתמשים יכולים להיות חברים במספר ארגונים
- **מעבר בין ארגונים**: מחליף מהיר לשינוי ארגון פעיל
- **הגדרות ארגון**: שם, לוגו, הודעה ל-Dashboard
- **תפקידים**: Owner, Admin, Agent, Viewer
- **ניהול חברים**: הזמנה, הפעלה, השבתה, הסרה
- **בקשות הצטרפות**: אישור/דחייה של בקשות

### 5. Dashboard וסטטיסטיקות
- **כרטיסי KPI**: סה"כ פניות, פתוחות, דחופות, חדשות היום, נפתרו השבוע
- **התפלגות סטטוסים**: תרשים עוגה/עמודות לפי סטטוס
- **העבודה שלי**: רשימת פניות מוקצות למשתמש
- **פעילות אחרונה**: ציר זמן של פעילות ארגונית
- **אירועים קרובים**: אירועי יומן קרובים
- **פעילות בזמן אמת**: עדכונים על שינויים

### 6. יומן (Calendar)
- **תצוגת חודש**: תצוגת יומן ויזואלית
- **תצוגת שבוע**: תצוגה שבועית מפורטת
- **תצוגה לנייד**: יומן מותאם למגע
- **יצירת אירועים**: קישור לפניות או עצמאיים
- **מאפייני אירוע**: כותרת, תיאור, מיקום, צבע, כל היום
- **גרירה ושחרור**: העברת אירועים בין תאריכים

### 7. אימות ואבטחה
- **Supabase Auth**: אימייל/סיסמה, מבוסס session
- **חברות בארגון**: בקרת גישה דרך טבלת org_memberships
- **הרשאות מבוססות תפקיד**: Admin, Agent, Viewer
- **מדיניות RLS**: אבטחה ברמת שורה במסד הנתונים
- **ניהול Sessions**: התנתקות אוטומטית בסגירת לשונית
- **נתיבים מוגנים**: Middleware מפנה משתמשים לא מאומתים

### 8. אינטגרציית Google Sheets
- **יצירת פניות אוטומטית**: המרת שורות בגיליון לפניות
- **סנכרון דו-כיווני**: עדכונים בגיליון יוצרים פניות
- **מערכת Webhook**: הגיליון מעדכן את האפליקציה
- **מיפוי שדות**: התאמה של עמודות לשדות פנייה
- **Apps Script**: התקנה אוטומטית של סקריפט
- **מניעת כפילויות**: מניעת פניות כפולות מאותה שורה

### 9. תכונות AI
- **בדיקת איות**: תיקון שגיאות בעברית ואנגלית עם OpenAI (gpt-4o-mini)
- **תמיכה רב-לשונית**: prompt מותאם לשפה

### 10. בינלאומיות
- **שפות**: אנגלית (en) ועברית (he)
- **תמיכת RTL**: החלפת כיוון Layout אוטומטית לעברית
- **קבצי תרגום**: קבצי JSON בתיקיית `/messages`
- **next-intl**: Framework לניהול תרגומים

---

## סכמת מסד הנתונים

### טבלאות עיקריות:

#### organizations
| עמודה | סוג | תיאור |
|-------|-----|--------|
| id | UUID, PK | מזהה ייחודי |
| name | text | שם הארגון |
| created_by | UUID, FK | יוצר הארגון |
| owner_user_id | UUID, FK | בעלים |
| logo_url | text | כתובת לוגו |
| deleted_at | timestamp | מחיקה רכה |
| dashboard_update | text | הודעה ל-Dashboard |
| created_at | timestamp | תאריך יצירה |
| updated_at | timestamp | תאריך עדכון |

#### org_memberships
| עמודה | סוג | תיאור |
|-------|-----|--------|
| id | UUID, PK | מזהה ייחודי |
| org_id | UUID, FK | מזהה ארגון |
| user_id | UUID, FK | מזהה משתמש |
| role | enum | תפקיד (owner/admin/agent/viewer) |
| is_active | boolean | פעיל/לא פעיל |
| created_at | timestamp | תאריך יצירה |

#### queues
| עמודה | סוג | תיאור |
|-------|-----|--------|
| id | UUID, PK | מזהה ייחודי |
| org_id | UUID, FK | מזהה ארגון |
| name | text | שם התור |
| is_default | boolean | תור ברירת מחדל |
| is_active | boolean | פעיל/לא פעיל |
| queue_code | text | קוד ייחודי |
| created_at | timestamp | תאריך יצירה |

#### cases
| עמודה | סוג | תיאור |
|-------|-----|--------|
| id | UUID, PK | מזהה ייחודי |
| org_id | UUID, FK | מזהה ארגון |
| queue_id | UUID, FK | מזהה תור |
| title | text | כותרת |
| description | text | תיאור |
| status | enum | סטטוס (new/in_progress/resolved/closed) |
| priority | enum | עדיפות (low/normal/high/urgent) |
| assigned_to | UUID, FK | מוקצה ל |
| requester_contact_id | UUID, FK | איש קשר פונה |
| created_by | UUID, FK | נוצר על ידי |
| source | enum | מקור (manual/google_sheets) |
| external_ref | text | מפתח למניעת כפילויות |
| created_at | timestamp | תאריך יצירה |

#### contacts
| עמודה | סוג | תיאור |
|-------|-----|--------|
| id | UUID, PK | מזהה ייחודי |
| org_id | UUID, FK | מזהה ארגון |
| full_name | text | שם מלא |
| email | text | אימייל |
| phone | text | טלפון |
| department | text | מחלקה |
| created_by | UUID, FK | נוצר על ידי |
| created_at | timestamp | תאריך יצירה |

#### case_activities
| עמודה | סוג | תיאור |
|-------|-----|--------|
| id | UUID, PK | מזהה ייחודי |
| org_id | UUID, FK | מזהה ארגון |
| case_id | UUID, FK | מזהה פנייה |
| type | enum | סוג פעילות (note/status_changed/assigned/...) |
| body | text | תוכן (להערות) |
| meta | jsonb | מידע מובנה |
| created_by | UUID, FK | נוצר על ידי |
| created_at | timestamp | תאריך יצירה |

#### calendar_events
| עמודה | סוג | תיאור |
|-------|-----|--------|
| id | UUID, PK | מזהה ייחודי |
| org_id | UUID, FK | מזהה ארגון |
| case_id | UUID, FK | מזהה פנייה (אופציונלי) |
| title | text | כותרת |
| description | text | תיאור |
| location | text | מיקום |
| start_at | timestamp | התחלה |
| end_at | timestamp | סיום |
| all_day | boolean | כל היום |
| color | text | צבע |
| created_by | UUID, FK | נוצר על ידי |

#### org_google_sheets_integrations
| עמודה | סוג | תיאור |
|-------|-----|--------|
| org_id | UUID, PK | מזהה ארגון |
| is_enabled | boolean | מופעל |
| connected_by_user_id | UUID | מי חיבר |
| default_queue_id | UUID | תור ברירת מחדל |
| sheet_id | text | מזהה Google Sheet |
| sheet_url | text | כתובת Sheet |
| webhook_secret | text | סוד לאימות webhook |
| script_id | text | מזהה Apps Script |
| script_url | text | כתובת Apps Script |
| field_mapping | jsonb | מיפוי עמודות |
| created_at | timestamp | תאריך יצירה |

---

## נתיבי API

### ארגונים

| נתיב | שיטה | תיאור |
|------|-------|--------|
| `/api/orgs/active` | POST | הגדרת ארגון פעיל |
| `/api/orgs/delete` | POST | מחיקת ארגון (soft delete) |

### אינטגרציית Google Sheets

| נתיב | שיטה | תיאור |
|------|-------|--------|
| `/api/integrations/google-sheets/create` | POST | יצירת Sheet חדש |
| `/api/integrations/google-sheets/install` | POST | התקנת Apps Script |
| `/api/integrations/google-sheets/status` | GET | סטטוס אינטגרציה |
| `/api/integrations/google-sheets/toggle` | POST | הפעלה/כיבוי |
| `/api/integrations/google-sheets/setup` | POST | הגדרה מלאה |
| `/api/integrations/google-sheets/reset` | POST | איפוס |
| `/api/integrations/google-sheets/regenerate-secret` | POST | חידוש secret |
| `/api/integrations/google-sheets/share-to-org` | POST | שיתוף לחברי ארגון |

### Google OAuth

| נתיב | שיטה | תיאור |
|------|-------|--------|
| `/api/integrations/google/auth/start` | GET/POST | התחלת OAuth |
| `/api/integrations/google/auth/callback` | GET | OAuth callback |
| `/api/integrations/google/connection` | GET | בדיקת חיבור |
| `/api/integrations/google/disconnect` | POST | ניתוק חיבור |
| `/api/integrations/google/webhook` | POST | קבלת עדכונים מ-Sheet |

### AI

| נתיב | שיטה | תיאור |
|------|-------|--------|
| `/api/ai/spellcheck` | POST | בדיקת איות עם AI |

---

## מערכת האימות

### זרימת אימות:

1. **הרשמה**: משתמש נרשם דרך `/register`
2. **Supabase Auth**: אימייל/סיסמה נשמרים ב-`auth.users`
3. **יצירת פרופיל**: טבלת `profiles` שומרת `full_name`, `avatar_url`
4. **Onboarding**: משתמש חדש יוצר/מצטרף לארגון
5. **חברות**: שורה ב-`org_memberships` עם הקצאת תפקיד
6. **Session**: Cookie של Supabase נשמר בדפדפן
7. **בדיקת Middleware**: `middleware.js` מוודא אימות בכל בקשה

### כלי אימות:

**requireOrgAdminRoute.js**
- `requireSessionUserRoute(req)`: שליפת משתמש מ-cookies או Bearer token
- `requireOrgAdminRoute(req, orgId)`: אימות שהמשתמש הוא admin/owner של הארגון

---

## אינטגרציות

### אינטגרציית Google Sheets

#### תהליך הגדרה:
1. Admin לוחץ "Connect Google Sheets"
2. הפנייה ל-Google OAuth (scopes: spreadsheets, drive.file, script.*)
3. משתמש מאשר הרשאות
4. קוד מומר לטוקנים → נשמרים מוצפנים ב-DB
5. האפליקציה יוצרת Google Sheet ריק דרך Drive API
6. Admin מגדיר מיפוי שדות
7. Apps Script מותקן בחשבון Google של המשתמש
8. הסקריפט יוצר triggers על עריכת גיליון
9. כששורה נוספת/מתעדכנת → הסקריפט שולח ל-webhook
10. האפליקציה מקבלת עדכון → יוצרת רשומת פנייה

#### מיפוי שדות:
```json
{
  "title_col": "A",
  "description_col": "B",
  "priority_col": "C",
  "reporter_col": "D",
  "email_col": "E",
  "status_col": "F",
  "case_id_col": "G",
  "error_col": "H"
}
```

#### OAuth Scopes:
- `openid`, `email`, `profile` - מידע בסיסי
- `spreadsheets` - קריאה/כתיבה לגיליונות
- `drive.file` - יצירה/ניהול גיליונות שנוצרו על ידי האפליקציה
- `script.projects` - ניהול Apps Script
- `script.deployments` - פריסת סקריפטים
- `script.external_request` - בקשות HTTP מהסקריפט

#### הערות חשובות לאינטגרציה:
- **חשוב מאוד**: תמיד להריץ Setup מהפרודקשן, לא מ-localhost
- אם ה-Setup רץ מ-localhost, ה-webhook URL יהיה שגוי
- ה-`setup()` צריך לרוץ ידנית פעם ראשונה מה-Apps Script לאישור הרשאות
- ב-Triggers יכולים להצטבר כפילויות - הקוד מוחק אותם אוטומטית

---

## התקנה והפעלה

### דרישות מקדימות:
- Node.js 18+
- חשבון Supabase
- חשבון Google Cloud (לאינטגרציה)
- מפתח OpenAI (לבדיקת איות)

### התקנה:
```bash
# שכפול הפרויקט
git clone <repo-url>
cd caseflow

# התקנת תלויות
npm install

# הגדרת משתני סביבה
cp .env.example .env.local
# ערוך את .env.local עם הערכים שלך

# הפעלת שרת פיתוח
npm run dev
```

### בנייה ופריסה:
```bash
# יצירת build מוכן לפרודקשן
npm run build

# הפעלת שרת פרודקשן
npm run start
```

---

## משתני סביבה

צור קובץ `.env.local` עם המשתנים הבאים:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=your-client-id.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=https://your-domain.com/api/integrations/google/auth/callback

# OpenAI (לבדיקת איות)
OPENAI_API_KEY=sk-your-openai-key

# כתובת האפליקציה (חשוב לפרודקשן!)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### הערות חשובות:
- **NEXT_PUBLIC_APP_URL** - חשוב להגדיר בפרודקשן! אחרת ה-webhook URL של Google Sheets יצביע על localhost
- **SUPABASE_SERVICE_ROLE_KEY** - לעולם לא לחשוף בצד הלקוח
- **GOOGLE_OAUTH_REDIRECT_URI** - חייב להתאים למה שמוגדר ב-Google Cloud Console

---

## אבטחה

### אמצעי אבטחה:
- **מדיניות RLS**: כל הטבלאות מוגנות ברמת מסד הנתונים
- **Service Role Key**: פעולות admin משתמשות בהרשאות מורחבות
- **אימות HMAC**: Webhook secret מאמת את אותנטיות הסקריפט
- **הצפנת טוקנים**: טוקני OAuth מוצפנים במסד הנתונים
- **CORS**: אימות origin קפדני ב-middleware
- **Session Cookies**: HTTP-only, Secure flags
- **אימות קלט**: אימות בצד שרת בכל נתיבי API

---

## ביצועים

### אופטימיזציות:
- **Auth Cache**: מטמון session של 30 שניות למניעת קריאות מיותרות
- **Workspace Cache**: מטמון בזיכרון לארגון פעיל (צד לקוח)
- **אופטימיזציית תמונות**: קומפוננטת Image של Next.js עם lazy loading
- **Code Splitting**: imports דינמיים לקומפוננטות כבדות
- **שאילתות מסד נתונים**: בחירת שדות סלקטיבית (לא SELECT *)

---

## נגישות

- **ARIA Labels**: Ant Design מספק HTML סמנטי
- **ניווט מקלדת**: תמיכה מלאה במקלדת
- **ניגודיות צבעים**: ערכות בהירה/כהה עומדות ב-WCAG
- **תמיכת RTL**: עברית נתמכת במלואה עם היפוך Layout

---

<a name="english"></a>

## English Documentation

### Overview

**CaseFlow** is a professional case management system for organizations. It enables management of cases, contacts, queues, and workspaces with role-based access control, multi-organization support, and Google Sheets integration.

### Key Features:
- End-to-end case management
- Queue management and work distribution
- Contact management
- Calendar and scheduling
- Dashboard with statistics
- Google Sheets integration
- Hebrew and English support (including RTL)
- AI-powered spell checking

### Quick Start:
```bash
npm install
npm run dev
```

For detailed documentation, please refer to the Hebrew section above or contact the development team.

---

## License

This project is proprietary software. All rights reserved.

---

## Contact

For questions or support, please contact the development team.

---

<div align="center">
  <sub>Built with Next.js, Supabase, and Ant Design</sub>
</div>

import { formatDateTime } from "@/lib/ui/datetime";
import React from "react";
import { Tag } from "antd";

/**
 * Helpers
 */
const labelMap = (locale, he, en) => (locale === "he" ? he : en);

const renderBool = (v, locale) => {
  const yes = labelMap(locale, "כן", "Yes");
  const no = labelMap(locale, "לא", "No");
  if (v === true) return yes;
  if (v === false) return no;
  return "—";
};

const renderEnum = (v) => (v ? String(v) : "—");

const renderSource = (v, locale) => {
  if (!v) return "—";
  const map = {
    manual: labelMap(locale, "ידני", "Manual"),
    google_sheets: labelMap(locale, "Google Sheets", "Google Sheets"),
  };
  return map[v] || String(v);
};

const renderStatus = (v, locale) => {
  if (!v) return "—";
  const map = {
    new: labelMap(locale, "חדש", "New"),
    in_progress: labelMap(locale, "בטיפול", "In progress"),
    resolved: labelMap(locale, "נפתר", "Resolved"),
    closed: labelMap(locale, "סגור", "Closed"),
  };
  return map[v] || String(v);
};

const renderPriority = (v, locale) => {
  if (!v) return "—";
  const map = {
    low: labelMap(locale, "נמוכה", "Low"),
    normal: labelMap(locale, "רגילה", "Normal"),
    high: labelMap(locale, "גבוהה", "High"),
    urgent: labelMap(locale, "דחופה", "Urgent"),
  };
  return map[v] || String(v);
};

// Optional: simple tag rendering (nice UX)
const tag = (text) => <Tag style={{ marginInlineEnd: 0 }}>{text}</Tag>;

const renderStatusTag = (v, locale) => {
  const label = renderStatus(v, locale);
  return label === "—" ? "—" : tag(label);
};

const renderPriorityTag = (v, locale) => {
  const label = renderPriority(v, locale);
  return label === "—" ? "—" : tag(label);
};

const dateCol = (locale) => ({
  width: 170,
  ellipsis: true,
  render: (v) => formatDateTime(v, locale === "he" ? "he-IL" : "en-US"),
});

/**
 * Factory that returns report definitions according to locale
 * Usage: const REPORTS = getReports(locale)
 */
export function getReports(locale = "en") {
  return {
    cases: {
      key: "cases",
      label: labelMap(locale, "פניות", "Cases"),
      columns: [
        {
          title: labelMap(locale, "כותרת", "Title"),
          dataIndex: "title",
          sorter: true,
          ellipsis: true,
          width: 220,
        },
        {
          title: labelMap(locale, "סטטוס", "Status"),
          dataIndex: "status",
          sorter: true,
          width: 140,
          render: (v) => renderStatusTag(v, locale),
        },
        {
          title: labelMap(locale, "עדיפות", "Priority"),
          dataIndex: "priority",
          sorter: true,
          width: 140,
          render: (v) => renderPriorityTag(v, locale),
        },
        {
          title: labelMap(locale, "תור", "Queue"),
          dataIndex: "queue_name",
          ellipsis: true,
          width: 160,
        },
        {
          title: labelMap(locale, "פונה", "Requester"),
          dataIndex: "requester_name",
          width: 130, // קטן כברירת מחדל
          ellipsis: true,
          render: (v) => v || "—",
        },

        {
          title: labelMap(locale, "אימייל פונה", "Requester Email"),
          dataIndex: "requester_email",
          width: 160,
          ellipsis: true,
          render: (v) => v || "—",
        },

        {
          title: labelMap(locale, "מוקצה ל", "Assignee"),
          dataIndex: "assigned_to_name",
          ellipsis: true,
          width: 170,
        },
        {
          title: labelMap(locale, "נוצר בתאריך", "Created"),
          dataIndex: "created_at",
          sorter: true,
          ...dateCol(locale),
        },
        {
          title: labelMap(locale, "עודכן", "Updated"),
          dataIndex: "updated_at",
          sorter: true,
          ...dateCol(locale),
        },
        {
          title: labelMap(locale, "מקור", "Source"),
          dataIndex: "source",
          width: 140,
          render: (v) => renderSource(v, locale),
        },
      ],
    },

    activities: {
      key: "activities",
      label: labelMap(locale, "פעילויות", "Activities"),
      columns: [
        {
          title: labelMap(locale, "מזהה פנייה", "Case ID"),
          dataIndex: "case_id",
          ellipsis: true,
          width: 220,
        },
        {
          title: labelMap(locale, "סוג", "Type"),
          dataIndex: "type",
          sorter: true,
          width: 160,
          render: renderEnum,
        },
        {
          title: labelMap(locale, "תוכן", "Body"),
          dataIndex: "body",
          ellipsis: true,
          width: 320,
        },
        {
          title: labelMap(locale, "נוצר ע״י", "Created by"),
          dataIndex: "created_by_name",
          ellipsis: true,
          width: 200,
        },
        {
          title: labelMap(locale, "נוצר בתאריך", "Created"),
          dataIndex: "created_at",
          sorter: true,
          ...dateCol(locale),
        },
      ],
    },

    contacts: {
      key: "contacts",
      label: labelMap(locale, "אנשי קשר", "Contacts"),
      columns: [
        {
          title: labelMap(locale, "שם", "Name"),
          dataIndex: "full_name",
          sorter: true,
          ellipsis: true,
          width: 220,
        },
        {
          title: labelMap(locale, "אימייל", "Email"),
          dataIndex: "email",
          ellipsis: true,
          width: 240,
        },
        {
          title: labelMap(locale, "טלפון", "Phone"),
          dataIndex: "phone",
          ellipsis: true,
          width: 170,
        },
        {
          title: labelMap(locale, "מחלקה", "Department"),
          dataIndex: "department",
          ellipsis: true,
          width: 180,
        },
        {
          title: labelMap(locale, "תפקיד", "Job Title"),
          dataIndex: "job_title",
          ellipsis: true,
          width: 180,
        },
        {
          title: labelMap(locale, "מיקום", "Location"),
          dataIndex: "location",
          ellipsis: true,
          width: 180,
        },
        {
          title: labelMap(locale, "פעיל", "Active"),
          dataIndex: "is_active",
          width: 110,
          render: (v) => renderBool(v, locale),
        },
        {
          title: labelMap(locale, "נוצר בתאריך", "Created"),
          dataIndex: "created_at",
          sorter: true,
          ...dateCol(locale),
        },
      ],
    },

    audit: {
      key: "audit",
      label: labelMap(locale, "Audit Log", "Audit Log"),
      columns: [
        {
          title: labelMap(locale, "סוג ישות", "Entity Type"),
          dataIndex: "entity_type",
          sorter: true,
          width: 170,
          render: renderEnum,
        },
        {
          title: labelMap(locale, "פעולה", "Action"),
          dataIndex: "action",
          sorter: true,
          width: 170,
          render: renderEnum,
        },
        {
          title: labelMap(locale, "מזהה ישות", "Entity ID"),
          dataIndex: "entity_id",
          ellipsis: true,
          width: 240,
        },
        {
          title: labelMap(locale, "מבצע", "Actor"),
          dataIndex: "actor_name",
          ellipsis: true,
          width: 200,
        },
        {
          title: labelMap(locale, "נוצר בתאריך", "Created"),
          dataIndex: "created_at",
          sorter: true,
          ...dateCol(locale),
        },
      ],
    },

    calendar: {
      key: "calendar",
      label: labelMap(locale, "יומן", "Calendar"),
      columns: [
        {
          title: labelMap(locale, "כותרת", "Title"),
          dataIndex: "title",
          sorter: true,
          ellipsis: true,
          width: 240,
        },
        {
          title: labelMap(locale, "התחלה", "Start"),
          dataIndex: "start_at",
          sorter: true,
          ...dateCol(locale),
        },
        {
          title: labelMap(locale, "סיום", "End"),
          dataIndex: "end_at",
          sorter: true,
          ...dateCol(locale),
        },
        {
          title: labelMap(locale, "מיקום", "Location"),
          dataIndex: "location",
          ellipsis: true,
          width: 180,
        },
        {
          title: labelMap(locale, "כל היום", "All day"),
          dataIndex: "all_day",
          width: 120,
          render: (v) => renderBool(v, locale),
        },
        {
          title: labelMap(locale, "מזהה פנייה", "Case ID"),
          dataIndex: "case_id",
          ellipsis: true,
          width: 220,
        },
        {
          title: labelMap(locale, "נוצר בתאריך", "Created"),
          dataIndex: "created_at",
          sorter: true,
          ...dateCol(locale),
        },
      ],
    },
  };
}

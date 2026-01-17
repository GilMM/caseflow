// src/lib/ui/useActivityMeta.js
"use client";

import { useTranslations } from "next-intl";
import {
  CommentOutlined,
  EditOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  UserSwitchOutlined,
  TagsOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
} from "@ant-design/icons";

/**
 * Hook for getting activity metadata with translations
 * Use this in React components instead of getActivityMeta
 */
export function useActivityMeta(type) {
  const t = useTranslations("cases.activity");
  const actType = String(type || "").toLowerCase();

  const map = {
    comment: { color: "geekblue", Icon: CommentOutlined, label: t("comment") },
    note: { color: "geekblue", Icon: CommentOutlined, label: t("note") },

    status_change: { color: "gold", Icon: SwapOutlined, label: t("status") },
    status: { color: "gold", Icon: SwapOutlined, label: t("status") },

    priority_change: { color: "volcano", Icon: ThunderboltOutlined, label: t("priority") },
    priority: { color: "volcano", Icon: ThunderboltOutlined, label: t("priority") },

    assigned: { color: "cyan", Icon: UserSwitchOutlined, label: t("assigned") },
    assignment: { color: "cyan", Icon: UserSwitchOutlined, label: t("assigned") },

    resolved: { color: "green", Icon: CheckCircleOutlined, label: t("resolved") },

    updated: { color: "purple", Icon: EditOutlined, label: t("updated") },
    tag: { color: "purple", Icon: TagsOutlined, label: t("tag") },

    calendar_created: { color: "blue", Icon: CalendarOutlined, label: t("calendarCreated") },
    calendar_updated: { color: "geekblue", Icon: CalendarOutlined, label: t("calendarUpdated") },
    calendar_moved: { color: "purple", Icon: CalendarOutlined, label: t("calendarMoved") },
    calendar_deleted: { color: "red", Icon: CalendarOutlined, label: t("calendarDeleted") },
  };

  return map[actType] || { color: "default", Icon: EditOutlined, label: type || t("updated") };
}

// src/lib/ui/useStatusMeta.js
"use client";

import { useTranslations } from "next-intl";
import {
  InboxOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
} from "@ant-design/icons";

/**
 * Hook for getting status metadata with translations
 * Use this in React components instead of getStatusMeta
 */
export function useStatusMeta(value) {
  const t = useTranslations("cases.status");
  const v = String(value || "").toLowerCase();

  const map = {
    new: { color: "blue", Icon: InboxOutlined, label: t("new") },
    in_progress: { color: "gold", Icon: ClockCircleOutlined, label: t("inProgress") },
    waiting_customer: { color: "purple", Icon: PauseCircleOutlined, label: t("waitingCustomer") },
    resolved: { color: "green", Icon: CheckCircleOutlined, label: t("resolved") },
    closed: { color: "default", Icon: CloseCircleOutlined, label: t("closed") },
  };

  return map[v] || { color: "default", Icon: InboxOutlined, label: value || "—" };
}

/**
 * Hook for getting all statuses with translations
 */
export function useAllStatuses() {
  const t = useTranslations("cases.status");

  return [
    { value: "new", label: t("new") },
    { value: "in_progress", label: t("inProgress") },
    { value: "waiting_customer", label: t("waitingCustomer") },
    { value: "resolved", label: t("resolved") },
    { value: "closed", label: t("closed") },
  ];
}

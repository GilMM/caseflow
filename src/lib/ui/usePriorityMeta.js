// src/lib/ui/usePriorityMeta.js
"use client";

import { useTranslations } from "next-intl";
import {
  ThunderboltOutlined,
  FireOutlined,
  MinusCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

/**
 * Hook for getting priority metadata with translations
 * Use this in React components instead of getPriorityMeta
 */
export function usePriorityMeta(value) {
  const t = useTranslations("cases.priority");
  const v = String(value || "").toLowerCase();

  const map = {
    urgent: { color: "red", Icon: ThunderboltOutlined, label: t("urgent") },
    high: { color: "volcano", Icon: FireOutlined, label: t("high") },
    normal: { color: "default", Icon: InfoCircleOutlined, label: t("normal") },
    low: { color: "cyan", Icon: MinusCircleOutlined, label: t("low") },
  };

  return map[v] || { color: "default", Icon: InfoCircleOutlined, label: value || "—" };
}

/**
 * Hook for getting all priorities with translations
 */
export function useAllPriorities() {
  const t = useTranslations("cases.priority");

  return [
    { value: "low", label: t("low") },
    { value: "normal", label: t("normal") },
    { value: "high", label: t("high") },
    { value: "urgent", label: t("urgent") },
  ];
}

// src/app/(app)/_components/dashboard/DashboardTags.jsx
"use client";

import { Tag, Typography, Space } from "antd";
import { AppstoreOutlined, UserOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

import { queueColor } from "@/lib/ui/queue";
import { useStatusMeta } from "@/lib/ui/useStatusMeta";
import { usePriorityMeta } from "@/lib/ui/usePriorityMeta";

import { tagBaseStyle } from "./helpers";

const { Text } = Typography;

export function TagIcon({ children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}>
      {children}
    </span>
  );
}

export function QueueTag({ name, isDefault = false }) {
  const t = useTranslations();

  return (
    <Tag
      color={queueColor(name, isDefault)}
      style={{
        ...tagBaseStyle,
        maxWidth: 220,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      <TagIcon>
        <AppstoreOutlined style={{ fontSize: 12 }} />
      </TagIcon>
      {name || t("common.noQueue")}
    </Tag>
  );
}

export function StatusTag({ status }) {
  const meta = useStatusMeta(status);
  return (
    <Tag color={meta.color} style={tagBaseStyle}>
      <TagIcon>{meta.Icon ? <meta.Icon style={{ fontSize: 12 }} /> : null}</TagIcon>
      {meta.label}
    </Tag>
  );
}

export function PriorityTag({ priority }) {
  const meta = usePriorityMeta(priority);
  return (
    <Tag color={meta.color} style={tagBaseStyle}>
      <TagIcon>{meta.Icon ? <meta.Icon style={{ fontSize: 12 }} /> : null}</TagIcon>
      {meta.label}
    </Tag>
  );
}

export function AssignmentChange({ fromU, toU, displayUser }) {
  const t = useTranslations();

  const Arrow = (
    <Text type="secondary" style={{ fontSize: 12 }}>
      →
    </Text>
  );

  return (
    <Space size={6} wrap align="center">
      <Tag style={tagBaseStyle}>
        <TagIcon>
          <UserOutlined style={{ fontSize: 12 }} />
        </TagIcon>
        {fromU ? displayUser(fromU) : t("common.unassigned")}
      </Tag>
      {Arrow}
      <Tag color="cyan" style={tagBaseStyle}>
        <TagIcon>
          <UserOutlined style={{ fontSize: 12 }} />
        </TagIcon>
        {toU ? displayUser(toU) : t("common.unassigned")}
      </Tag>
    </Space>
  );
}

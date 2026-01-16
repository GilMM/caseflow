// src/app/(app)/_components/dashboard/KpiCard.jsx
"use client";

import { Card, Progress, Space, Statistic, Typography } from "antd";

const { Text } = Typography;

export default function KpiCard({
  loading,
  title,
  icon,
  value,
  extra,
  progress,
  footer,
  compact = false,
}) {
  return (
    <Card
      loading={loading}
      style={{ borderRadius: 16, width: "100%" }}
      styles={{
        body: {
          minHeight: compact ? 108 : 140,
          padding: compact ? 12 : 16,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        },
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Space size={6}>
          {icon}
          <Text type="secondary" style={{ fontSize: compact ? 12 : 13 }}>
            {title}
          </Text>
        </Space>

        <div style={{ marginInlineStart: "auto" }}>{extra}</div>
      </div>

      <div style={{ marginTop: compact ? 6 : 10 }}>
        {compact ? (
          <Text style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>{value}</Text>
        ) : (
          <Statistic value={value} styles={{ content: { fontSize: 34, lineHeight: 1.15 } }} />
        )}
      </div>

      <div style={{ marginTop: compact ? 8 : 10 }}>
        {typeof progress === "number" ? (
          <Progress percent={progress} showInfo={false} size={compact ? "small" : "default"} />
        ) : null}

        {footer ? (
          <Text type="secondary" style={{ fontSize: compact ? 11 : 12 }}>
            {footer}
          </Text>
        ) : null}
      </div>
    </Card>
  );
}

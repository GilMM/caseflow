// src/app/(app)/dashboard/StatusDistributionCard.jsx
"use client";

import { Card, Progress, Space, Tag, Typography } from "antd";
import { PieChartOutlined } from "@ant-design/icons";
import { getStatusMeta } from "@/lib/ui/status";
import { tagBaseStyle } from "./helpers";

const { Text } = Typography;

export default function StatusDistributionCard({ loading, total, statusChips }) {
  if (!statusChips?.length && !loading) return null;

  return (
    <Card
      loading={loading}
      style={{ borderRadius: 16 }}
      title={
        <Space size={8}>
          <PieChartOutlined />
          <span>Status distribution</span>
        </Space>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {total} total
        </Text>
      }
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {statusChips.map(([status, count]) => {
          const meta = getStatusMeta(status);
          const percent = total ? Math.round((count / total) * 100) : 0;

          return (
            <div key={status}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <Tag color={meta.color} style={{ ...tagBaseStyle, height: 22, lineHeight: "22px" }}>
                  {meta.label}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {count} ({percent}%)
                </Text>
              </div>
              <Progress
                percent={percent}
                showInfo={false}
                strokeColor={meta.color === "default" ? undefined : `var(--ant-color-${meta.color}-6, #1677ff)`}
                size="small"
              />
            </div>
          );
        })}
      </Space>
    </Card>
  );
}

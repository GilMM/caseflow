"use client";

import { Card, Space, Tag, Typography } from "antd";
import { MessageOutlined, SwapOutlined, ClockCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

const iconByType = {
  note: <MessageOutlined />,
  status_change: <SwapOutlined />,
};

export default function CaseTimeline({ items }) {
  if (!items?.length) {
    return <Text type="secondary">No activity yet</Text>;
  }

  return (
    <Space orientation="vertical" size={10} style={{ width: "100%" }}>
      {items.map((it) => (
        <Card key={it.id} size="small">
          <Space orientation="vertical" size={4}>
            <Space>
              <Tag>{it.type}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {it.created_by}
              </Text>
            </Space>

            <Text>{it.body || "—"}</Text>

            <Space>
              {iconByType[it.type] || <ClockCircleOutlined />}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {new Date(it.created_at).toLocaleString()}
              </Text>
            </Space>
          </Space>
        </Card>
      ))}
    </Space>
  );
}

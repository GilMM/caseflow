"use client";

import { Card, Space, Tag, Typography } from "antd";
import { priorityColor } from "@/lib/ui/priority";

const { Text } = Typography;

export default function NewCaseSidebar({ orgId, orgName, queueId, priority }) {
  return (
    <>
      <Card title="Quick tips" style={{ borderRadius: 16 }}>
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          <Text>• Keep the title short and searchable.</Text>
          <Text>• Put steps + error messages in the description.</Text>
          <Text>
            • Use <Tag color="red">urgent</Tag> only for escalations.
          </Text>

          <div
            style={{
              height: 1,
              background: "var(--ant-color-border, #f0f0f0)",
              margin: "6px 0",
            }}
          />

          <Space orientation="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Defaults
            </Text>
            <Space wrap>
              {orgId ? <Tag color="blue">{orgName || "Workspace"}</Tag> : <Tag>Workspace: none</Tag>}
              {queueId ? <Tag color="geekblue">Queue selected</Tag> : <Tag>Queue: none</Tag>}
              <Tag color={priorityColor(priority || "normal")}>
                Priority: {priority || "normal"}
              </Tag>
            </Space>
          </Space>
        </Space>
      </Card>

      <Card style={{ borderRadius: 16, marginTop: 12 }}>
        <Space orientation="vertical" size={6}>
          <Text strong>Next polish (optional)</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            On create: auto add activity note + “Assign to me”.
          </Text>
        </Space>
      </Card>
    </>
  );
}

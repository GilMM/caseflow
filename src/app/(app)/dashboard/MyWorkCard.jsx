// src/app/(app)/_components/dashboard/MyWorkCard.jsx
"use client";

import { Badge, Button, Card, Col, Empty, Row, Space, Tag, Typography } from "antd";
import { getPriorityMeta } from "@/lib/ui/priority";
import { getStatusMeta, caseKey, timeAgo } from "@/lib/ui/status";
import { QueueTag, PriorityTag, StatusTag } from "./DashboardTags";
import { tagBaseStyle } from "./helpers";

const { Text } = Typography;

export default function MyWorkCard({ loading, myCases, onOpenCase, onViewAll }) {
  return (
    <Card
      loading={loading}
      title="My work"
      extra={
        <Button type="link" onClick={onViewAll} style={{ padding: 0 }}>
          View all →
        </Button>
      }
      style={{ borderRadius: 16 }}
    >
      {myCases?.length ? (
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          {myCases.map((c) => {
            const queueName = c?.queues?.name || "No queue";
            const queueIsDefault = !!c?.queues?.is_default;

            const isOpen = ["new", "in_progress", "waiting_customer"].includes(c.status);
            const accentColor = isOpen ? "var(--ant-color-primary, #1677ff)" : "transparent";
            const cardBg = isOpen
              ? "linear-gradient(90deg, rgba(22,119,255,0.06), rgba(22,119,255,0.00) 40%)"
              : "rgba(255,255,255,0.015)";

            return (
              <Card
                key={c.id}
                size="small"
                hoverable
                style={{
                  borderRadius: 14,
                  position: "relative",
                  overflow: "hidden",
                  background: cardBg,
                }}
                styles={{ body: { padding: 12 } }}
                onClick={() => onOpenCase(c.id)}
              >
                <div
                  style={{
                    position: "absolute",
                    insetBlock: 0,
                    insetInlineStart: 0,
                    width: 3,
                    background: accentColor,
                    borderTopLeftRadius: 14,
                    borderBottomLeftRadius: 14,
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: "none",
                  }}
                />

                <Row justify="space-between" align="top" gutter={[10, 10]}>
                  <Col flex="auto" style={{ minWidth: 0 }}>
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      <Space size={10} align="baseline" wrap style={{ width: "100%" }}>
                        <Text strong style={{ fontSize: 14 }}>
                          {c.title || "Untitled"}
                        </Text>

                        <Text
                          type="secondary"
                          style={{
                            fontSize: 12,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          }}
                        >
                          {caseKey(c.id)}
                        </Text>
                      </Space>

                      <Space wrap size={8} align="center">
                        <StatusTag status={c.status} />
                        <PriorityTag priority={c.priority} />
                        <QueueTag name={queueName} isDefault={queueIsDefault} />
                      </Space>
                    </Space>
                  </Col>

                  <Col>
                    <Space direction="vertical" size={6} align="end">
                      <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                        Created {timeAgo(c.created_at)}
                      </Text>

                      <Space size={10} align="center">
                        <Badge status={isOpen ? "processing" : "default"} />
                        <Text type="secondary">{isOpen ? "Open" : "Closed"}</Text>
                      </Space>

                      <Tag
                        color="geekblue"
                        style={{ ...tagBaseStyle, height: 24, lineHeight: "24px" }}
                      >
                        Assigned
                      </Tag>
                    </Space>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </Space>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={2}>
              <Text>No assigned open cases</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Tip: add “Assign” action next
              </Text>
            </Space>
          }
        />
      )}
    </Card>
  );
}

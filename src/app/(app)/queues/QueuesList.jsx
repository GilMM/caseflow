"use client";

import { Button, Card, Divider, Empty, Row, Col, Space, Typography, Badge, Tag, Tooltip, Switch } from "antd";
import { StarFilled } from "@ant-design/icons";

import QueueInlineActions from "./QueueInlineActions";
import { shortId, timeAgo } from "./queues.utils";

const { Text } = Typography;

export default function QueuesList({
  isMobile,
  workspace,
  tableAvailable,
  rows,
  onEdit,
  onSetDefault,
  onToggleActive,
  onViewCases,
  onOpenFuture,
}) {
  return (
    <Card
      title="Queues"
      style={{ borderRadius: 16 }}
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          Showing {rows?.length || 0}
        </Text>
      }
    >
      {!workspace?.orgId ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation="vertical" size={2}>
              <Text>No workspace</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Create org + membership to start managing queues.
              </Text>
            </Space>
          }
        />
      ) : !tableAvailable ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation="vertical" size={2}>
              <Text>Queues table not available</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Create the <Text code>queues</Text> table (and RLS), then this page will light up.
              </Text>
            </Space>
          }
        />
      ) : rows?.length ? (
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          {rows.map((row) => {
            const isActive = (row.is_active ?? true) !== false;
            const isDefault = !!row.is_default;

            return (
              <Card
                key={row.id}
                size="small"
                hoverable
                style={{ borderRadius: 14 }}
                bodyStyle={{ padding: isMobile ? 12 : 16 }}
              >
                <Row justify="space-between" align="middle" gutter={[12, 12]}>
                  <Col xs={24} md flex="auto">
                    <Space orientation="vertical" size={4} style={{ width: "100%" }}>
                      <Space wrap size={8} style={{ width: "100%", justifyContent: "space-between" }}>
                        <Space wrap size={8}>
                          <Text strong style={{ fontSize: 14 }}>
                            {row.name || "Untitled queue"}
                          </Text>

                          {isDefault ? (
                            <Tag color="gold" icon={<StarFilled />}>
                              Default
                            </Tag>
                          ) : null}

                          <Badge status={isActive ? "success" : "default"} text={isActive ? "Active" : "Inactive"} />
                        </Space>

                        {/* שמרתי גם את ה-switch בצד ימין כמו שהיה אצלך */}
                        <Tooltip title="Activate / Deactivate queue">
                          <Switch checked={isActive} onChange={(v) => onToggleActive(row.id, v)} />
                        </Tooltip>
                      </Space>

                      <Space wrap size={10}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ID: {shortId(row.id)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Created {timeAgo(row.created_at)}
                        </Text>
                      </Space>
                    </Space>
                  </Col>

                  <Col xs={24} md="auto">
                    <QueueInlineActions
                      isMobile={isMobile}
                      isActive={isActive}
                      isDefault={isDefault}
                      onToggleActive={(v) => onToggleActive(row.id, v)}
                      onEdit={() => onEdit(row)}
                      onSetDefault={() => onSetDefault(row.id)}
                      onViewCases={() => onViewCases(row.id)}
                    />
                  </Col>
                </Row>

                <Divider style={{ margin: "10px 0" }} />

                <Space style={{ justifyContent: "space-between", width: "100%" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Next: routing rules, SLA, auto-assignment.
                  </Text>
                  <Button type="link" style={{ padding: 0 }} onClick={onOpenFuture}>
                    Open →
                  </Button>
                </Space>
              </Card>
            );
          })}
        </Space>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation="vertical" size={2}>
              <Text>No queues match your filters</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Try clearing filters or create a new queue.
              </Text>
            </Space>
          }
        />
      )}
    </Card>
  );
}

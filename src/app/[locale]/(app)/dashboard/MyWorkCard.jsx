// src/app/(app)/_components/dashboard/MyWorkCard.jsx
"use client";

import { Badge, Button, Card, Col, Empty, Row, Space, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { getPriorityMeta } from "@/lib/ui/priority";
import { getStatusMeta, caseKey, timeAgo } from "@/lib/ui/status";
import { QueueTag, PriorityTag, StatusTag } from "./DashboardTags";
import { tagBaseStyle } from "./helpers";

const { Text } = Typography;

export default function MyWorkCard({ loading, myCases, onOpenCase, onViewAll }) {
  const t = useTranslations();

  return (
    <Card
      loading={loading}
      title={t("dashboard.myWork.title")}
      extra={
        <Button type="link" onClick={onViewAll} style={{ padding: 0 }}>
          {t("dashboard.myWork.viewAll")} →
        </Button>
      }
      style={{ borderRadius: 16 }}
    >
      {myCases?.length ? (
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          {myCases.map((c) => {
            const queueName = c?.queues?.name || t("common.noQueue");
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
                          {c.title || t("common.untitled")}
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
                        {t("dashboard.myWork.created")} {timeAgo(c.created_at)}
                      </Text>

                      <Space size={10} align="center">
                        <Badge status={isOpen ? "processing" : "default"} />
                        <Text type="secondary">{isOpen ? t("common.open") : t("common.closed")}</Text>
                      </Space>

                      <Tag
                        color="geekblue"
                        style={{ ...tagBaseStyle, height: 24, lineHeight: "24px" }}
                      >
                        {t("dashboard.myWork.assigned")}
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
              <Text>{t("dashboard.myWork.noCases")}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("dashboard.myWork.tip")}
              </Text>
            </Space>
          }
        />
      )}
    </Card>
  );
}

// src/app/(app)/_components/dashboard/MyWorkCard.jsx
"use client";

import {
  Badge,
  Button,
  Card,
  Empty,
  Space,
  Tag,
  Typography,
  Tooltip,
} from "antd";
import { useTranslations } from "next-intl";
import { caseKey, timeAgo } from "@/lib/ui/status";
import { QueueTag, PriorityTag, StatusTag } from "./DashboardTags";
import { tagBaseStyle } from "./helpers";

const { Text } = Typography;

export default function MyWorkCard({
  loading,
  myCases,
  onOpenCase,
  onViewAll,
}) {
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

            const isOpen = ["new", "in_progress", "waiting_customer"].includes(
              c.status,
            );

            const accentColor = isOpen
              ? "var(--ant-color-primary, #1677ff)"
              : "transparent";

            const cardBg = isOpen
              ? "linear-gradient(90deg, rgba(22,119,255,0.06), rgba(22,119,255,0.00) 40%)"
              : "rgba(255,255,255,0.015)";

            const title = c.title || t("common.untitled");
            const caseCode = caseKey(c.id);

            return (
              <Card
                key={c.id}
                size="small"
                hoverable
                onClick={() => onOpenCase(c.id)}
                style={{
                  borderRadius: 14,
                  position: "relative",
                  overflow: "hidden",
                  background: cardBg,
                  cursor: "pointer",
                }}
                styles={{ body: { padding: 12 } }}
              >
                {/* Left accent line */}
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

                {/* ✅ Grid layout: main row + footer row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gridTemplateRows: "auto auto",
                    columnGap: 14,
                    rowGap: 10,
                    alignItems: "start",
                    minWidth: 0,
                  }}
                >
                  {/* LEFT / main */}
                  <div style={{ minWidth: 0 }}>
                    <Space
                      direction="vertical"
                      size={6}
                      style={{ width: "100%" }}
                    >
                      <Tooltip title={title}>
                        <Text
                          strong
                          style={{
                            fontSize: 14,
                            display: "block",
                            minWidth: 0,
                          }}
                          ellipsis
                        >
                          {title}
                        </Text>
                      </Tooltip>

                      <Space wrap size={8} align="center">
                        <StatusTag status={c.status} />
                        <PriorityTag priority={c.priority} />
                        <QueueTag name={queueName} isDefault={queueIsDefault} />
                      </Space>
                    </Space>
                  </div>

                  {/* RIGHT / meta */}
                  <div>
                    <Space direction="vertical" size={6} align="end">
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, whiteSpace: "nowrap" }}
                      >
                        {t("dashboard.myWork.created")} {timeAgo(c.created_at)}
                      </Text>

                      <Space size={10} align="center">
                        <Badge status={isOpen ? "processing" : "default"} />
                        <Text type="secondary">
                          {isOpen ? t("common.open") : t("common.closed")}
                        </Text>
                      </Space>
                    </Space>
                  </div>

                  {/* FOOTER LEFT: ✅ Case code bottom-left */}
                  <div style={{ alignSelf: "end", minWidth: 0 }}>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 12,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        whiteSpace: "nowrap",
                        opacity: 0.9,
                      }}
                    >
                      {caseCode}
                    </Text>
                  </div>

                  {/* FOOTER RIGHT: ✅ Assigned bottom-right */}
                  <div style={{ justifySelf: "end", alignSelf: "end" }}>
                    <Tag
                      color="geekblue"
                      style={{
                        ...tagBaseStyle,
                        height: 24,
                        lineHeight: "24px",
                        whiteSpace: "nowrap",
                        margin: 0,
                      }}
                    >
                      {t("dashboard.myWork.assigned")}
                    </Tag>
                  </div>
                </div>
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

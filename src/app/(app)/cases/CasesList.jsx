"use client";

import {
  Badge,
  Button,
  Card,
  Divider,
  Row,
  Col,
  Space,
  Tag,
  Typography,
} from "antd";
import { ArrowRightOutlined, AppstoreOutlined } from "@ant-design/icons";
import { queueColor } from "@/lib/ui/queue";

import CaseInlineActions from "@/app/(app)/cases/CaseInlineActions";
import { getStatusMeta, timeAgo, caseKey } from "@/lib/ui/status";
import { getPriorityMeta } from "@/lib/ui/priority";

const { Text } = Typography;

/* ------------------------------------------------------------ */
/* Queue color helper (nice + consistent) */
/* ------------------------------------------------------------ */


export default function CasesList({ filtered, onOpenCase, onRefresh }) {
  const list = filtered || [];

  return (
    <Card
      title="Latest cases"
      extra={<Text type="secondary">Showing {list.length}</Text>}
      style={{ borderRadius: 16 }}
    >
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        {list.map((c) => {
          const sm = getStatusMeta(c.status);
          const pm = getPriorityMeta(c.priority);

          const queueName = c?.queues?.name || "No queue";
          const queueIsDefault = Boolean(c?.queues?.is_default);
          const qColor = queueColor(queueName, queueIsDefault);
console.log("CASES QUEUE:", JSON.stringify(queueName), queueIsDefault, qColor);

          const isOpen = ["new", "in_progress", "waiting_customer"].includes(
            c.status
          );
          const accentColor = isOpen
            ? "var(--ant-color-primary, #1677ff)"
            : "transparent";

          const cardBg = isOpen
            ? "linear-gradient(90deg, rgba(22,119,255,0.06), rgba(22,119,255,0.00) 40%)"
            : "rgba(255,255,255,0.015)";

          const tagBaseStyle = {
            margin: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 26,
            lineHeight: "26px",
            paddingInline: 10,
            borderRadius: 3,
            verticalAlign: "middle",
          };
          const titleOpacity = isOpen ? 1 : 0.65;

          return (
            <Card
              key={c.id}
              hoverable
              style={{
                borderRadius: 14,
                position: "relative",
                overflow: "hidden", // ✅ גורם לפס להיחתך לפי הרדיוס
                background: cardBg,
              }}
              styles={{ body: { padding: 16 } }}
              onClick={() => onOpenCase?.(c.id)}
            >
              {" "}
              <div
                style={{
                  position: "absolute",
                  insetBlock: 0, // top/bottom = 0
                  insetInlineStart: 0, // left = 0
                  width: 3,
                  background: accentColor,
                  borderTopLeftRadius: 14,
                  borderBottomLeftRadius: 14,
                  opacity: isOpen ? 1 : 0,
                  pointerEvents: "none",
                }}
              />
              <Row justify="space-between" align="top" gutter={[12, 12]}>
                {/* LEFT */}
                <Col flex="auto">
                  <Space
                    orientation="vertical"
                    size={6}
                    style={{ width: "100%" }}
                  >
                    {/* Title row: Title + CaseKey inline */}
                    <Space
                      size={10}
                      align="baseline"
                      wrap
                      style={{ width: "100%" }}
                    >
                      <Text
                        strong
                        style={{ fontSize: 16, opacity: titleOpacity }}
                      >
                        {c.title || "Untitled"}
                      </Text>

                      <Text
                        type="secondary"
                        style={{
                          fontSize: 12,
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                        }}
                      >
                        {caseKey(c.id)}
                      </Text>
                    </Space>

                    {/* Tags */}
                    <Space wrap size={8} align="center">
                      <Tag color={sm.color} style={tagBaseStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            lineHeight: 0,
                          }}
                        >
                          {sm.Icon ? (
                            <sm.Icon style={{ fontSize: 12 }} />
                          ) : null}
                        </span>
                        {sm.label}
                      </Tag>

                      <Tag color={pm.color} style={tagBaseStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            lineHeight: 0,
                          }}
                        >
                          {pm.Icon ? (
                            <pm.Icon style={{ fontSize: 12 }} />
                          ) : null}
                        </span>
                        {pm.label}
                      </Tag>

                      <Tag
                        color={qColor}
                        style={{
                          ...tagBaseStyle,
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            lineHeight: 0,
                          }}
                        >
                          <AppstoreOutlined style={{ fontSize: 12 }} />
                        </span>
                        {queueName}
                      </Tag>
                    </Space>
                  </Space>
                </Col>

                {/* RIGHT */}
                <Col>
                  <Space
                    direction="vertical"
                    size={6}
                    align="end"
                    style={{ width: "100%" }}
                  >
                    {/* Created time on top-right */}
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, whiteSpace: "nowrap" }}
                    >
                      Created {timeAgo(c.created_at)}
                    </Text>

                    {/* Open/Closed */}
                    <Space size={10} align="center">
                      <Badge status={isOpen ? "processing" : "default"} />
                      <Text type="secondary">{isOpen ? "Open" : "Closed"}</Text>
                    </Space>
                  </Space>
                </Col>
              </Row>
              <Divider style={{ margin: "12px 0" }} />
              <Row justify="space-between" align="middle" gutter={[12, 12]}>
                <Col flex="auto">
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CaseInlineActions
                      caseId={c.id}
                      orgId={c.org_id}
                      status={c.status}
                      priority={c.priority}
                      assignedTo={c.assigned_to}
                      compact
                      onChanged={() => onRefresh?.()}
                    />
                  </div>
                </Col>

                <Col>
                  <Button
                    type="link"
                    style={{ padding: 0 }}
                    icon={<ArrowRightOutlined />}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenCase?.(c.id);
                    }}
                  >
                    Open
                  </Button>
                </Col>
              </Row>
            </Card>
          );
        })}
      </Space>
    </Card>
  );
}

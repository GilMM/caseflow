// src/app/(app)/_components/dashboard/LiveActivityCard.jsx
"use client";

import { Button, Card, Divider, Empty, Row, Col, Space, Tag, Typography } from "antd";
import { WifiOutlined, UserOutlined } from "@ant-design/icons";

import { getActivityMeta, activityBg } from "@/lib/ui/activity";
import { caseKey, timeAgo } from "@/lib/ui/status";

import { presetColorVar, tagBaseStyle } from "./helpers";
import { QueueTag, TagIcon, AssignmentChange, StatusTag, PriorityTag } from "./DashboardTags";

const { Text } = Typography;

function renderActivityChange({ a, displayUser }) {
  const t = String(a?.type || "").toLowerCase();
  const meta = a?.meta || {};

  if ((t === "status_change" || t === "status") && meta?.from && meta?.to) {
    return (
      <Space size={6} wrap align="center">
        <StatusTag status={meta.from} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          →
        </Text>
        <StatusTag status={meta.to} />
      </Space>
    );
  }

  if ((t === "priority_change" || t === "priority") && meta?.from && meta?.to) {
    return (
      <Space size={6} wrap align="center">
        <PriorityTag priority={meta.from} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          →
        </Text>
        <PriorityTag priority={meta.to} />
      </Space>
    );
  }

  if (
    (t === "assignment" || t === "assigned") &&
    (meta?.from_user || meta?.to_user || meta?.from || meta?.to)
  ) {
    const fromU = meta?.from_user ?? meta?.from;
    const toU = meta?.to_user ?? meta?.to;
    return <AssignmentChange fromU={fromU} toU={toU} displayUser={displayUser} />;
  }

  return null;
}

export default function LiveActivityCard({ loading, activity, displayUser, onOpenCase }) {
  return (
    <Card
      loading={loading}
      title={
        <Space size={8} align="center">
          <span>Live activity</span>
          <Tag color="green" style={tagBaseStyle}>
            <TagIcon>
              <WifiOutlined style={{ fontSize: 12 }} />
            </TagIcon>
            realtime
          </Tag>
        </Space>
      }
      style={{ borderRadius: 16 }}
    >
      {activity?.length ? (
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          {activity.map((a) => {
            const am = getActivityMeta(a.type);
            const Accent = presetColorVar(am.color, 6);

            const queueName = a?.cases?.queues?.name || "No queue";
            const queueIsDefault = !!a?.cases?.queues?.is_default;

            return (
              <Card
                key={a.id}
                size="small"
                hoverable
                style={{
                  borderRadius: 14,
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: `linear-gradient(135deg, ${activityBg(am.color)}, rgba(0,0,0,0))`,
                }}
                onClick={() => onOpenCase(a.case_id)}
              >
                <div
                  style={{
                    position: "absolute",
                    insetInlineStart: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: Accent,
                    opacity: 0.95,
                  }}
                />

                <Space direction="vertical" size={8} style={{ width: "100%", paddingInlineStart: 8 }}>
                  <Row justify="space-between" align="middle" gutter={[8, 8]}>
                    <Col flex="auto" style={{ minWidth: 0 }}>
                      <Space wrap size={8} align="center">
                        <Tag color={am.color} style={tagBaseStyle}>
                          <TagIcon>
                            {am.icon ? (
                              <span style={{ display: "inline-flex", lineHeight: 0 }}>{am.icon}</span>
                            ) : null}
                          </TagIcon>
                          {am.label}
                        </Tag>

                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {displayUser(a.created_by)}
                        </Text>

                        <Tag
                          color="default"
                          style={{
                            ...tagBaseStyle,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          }}
                        >
                          {caseKey(a.case_id)}
                        </Tag>

                        <QueueTag name={queueName} isDefault={queueIsDefault} />
                      </Space>
                    </Col>

                    <Col>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {timeAgo(a.created_at)}
                      </Text>
                    </Col>
                  </Row>

                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.35,
                      padding: "8px 10px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Text>{a.body || "—"}</Text>
                  </div>

                  <Divider style={{ margin: "6px 0" }} />

                  <Space style={{ justifyContent: "space-between", width: "100%", marginTop: 2 }}>
                    {renderActivityChange({ a, displayUser }) || <span />}

                    <Button
                      type="link"
                      style={{ padding: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCase(a.case_id);
                      }}
                    >
                      Open →
                    </Button>
                  </Space>
                </Space>
              </Card>
            );
          })}
        </Space>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={2}>
              <Text>No recent activity</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Add a note or change a status to see it here
              </Text>
            </Space>
          }
        />
      )}
    </Card>
  );
}

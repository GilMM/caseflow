"use client";

import { Card, Space, Tag, Typography, Tooltip } from "antd";
import {
  MessageOutlined,
  SwapOutlined,
  ClockCircleOutlined,
  UserSwitchOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

function shortId(id) {
  if (!id) return "—";
  return `${String(id).slice(0, 8)}…`;
}

function displayUser(userId, userMap) {
  if (!userId) return "unknown";
  return userMap?.[userId] || shortId(userId);
}

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function typeTag(type) {
  switch (type) {
    case "note":
      return <Tag>NOTE</Tag>;
    case "status_change":
      return <Tag color="blue">STATUS</Tag>;
    case "assignment":
      return <Tag color="purple">ASSIGN</Tag>;
    default:
      return <Tag>{String(type || "ACTIVITY").toUpperCase()}</Tag>;
  }
}

function typeIcon(type) {
  switch (type) {
    case "note":
      return <MessageOutlined />;
    case "status_change":
      return <SwapOutlined />;
    case "assignment":
      return <UserSwitchOutlined />;
    default:
      return <ClockCircleOutlined />;
  }
}

function renderBody(it, userMap) {
  if (it.type !== "assignment") {
    return it.body || "—";
  }

  const fromId = it?.meta?.from ?? null;
  const toId = it?.meta?.to ?? null;

  if (fromId !== null || toId !== null) {
    return (
      <Space wrap size={8}>
        <Space size={6}>
          <UserOutlined style={{ opacity: 0.7 }} />
          <Text>Assignment:</Text>
        </Space>

        <Tag>
          {fromId ? displayUser(fromId, userMap) : "Unassigned"}
        </Tag>

        <Text style={{ opacity: 0.6 }}>→</Text>

        <Tag color="geekblue">
          {toId ? displayUser(toId, userMap) : "Unassigned"}
        </Tag>
      </Space>
    );
  }

  return it.body || "Assigned";
}

export default function CaseTimeline({ items, userMap = {} }) {
  if (!items || items.length === 0) {
    return <Text type="secondary">No activity yet</Text>;
  }

  return (
    <Space orientation="vertical" size={10} style={{ width: "100%" }}>
      {items.map((it) => (
        <Card key={it.id} size="small" style={{ borderRadius: 14 }}>
          <Space orientation="vertical" size={6} style={{ width: "100%" }}>
            {/* Header */}
            <Space style={{ justifyContent: "space-between", width: "100%" }}>
              <Space size={8} wrap>
                <span style={{ opacity: 0.75 }}>{typeIcon(it.type)}</span>
                {typeTag(it.type)}

                <Tooltip title={it.created_by || ""}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {displayUser(it.created_by, userMap)}
                  </Text>
                </Tooltip>
              </Space>

              <Tooltip title={new Date(it.created_at).toLocaleString()}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {timeAgo(it.created_at)}
                </Text>
              </Tooltip>
            </Space>

            {/* Body */}
            <div style={{ whiteSpace: "pre-wrap" }}>
              {renderBody(it, userMap)}
            </div>

            {/* Footer */}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(it.created_at).toLocaleString()}
            </Text>
          </Space>
        </Card>
      ))}
    </Space>
  );
}

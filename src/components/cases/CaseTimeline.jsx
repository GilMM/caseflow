"use client";

import { useMemo } from "react";
import { Avatar, Empty, Space, Tag, Typography, Tooltip, Grid } from "antd";
import {
  MessageOutlined,
  SwapOutlined,
  FlagOutlined,
  UserSwitchOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";

import { initials } from "@/lib/ui/initials";
import { getStatusMeta } from "@/lib/ui/status";
import { getPriorityMeta } from "@/lib/ui/priority";

const { Text } = Typography;
const { useBreakpoint } = Grid;

function shortId(id) {
  if (!id) return "—";
  const s = String(id);
  return s.length > 10 ? `${s.slice(0, 8)}…` : s;
}

function safeLocaleString(ts, locale) {
  try {
    return new Date(ts).toLocaleString(locale || undefined);
  } catch {
    return String(ts || "—");
  }
}

function timeAgo(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - t) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}

function useSafeT() {
  const t = useTranslations();
  return (key, fallback, values) => {
    try {
      return t(key, values);
    } catch {
      return fallback;
    }
  };
}

function pickMap(userMap, profilesById) {
  const m = userMap || profilesById || {};
  return m && typeof m === "object" ? m : {};
}

function getUserLabel(userId, map) {
  if (!userId) return "—";
  const v = map?.[userId];

  if (!v) return shortId(userId);
  if (typeof v === "string") return v;

  if (typeof v === "object") {
    return v.full_name || v.email || shortId(userId);
  }

  return shortId(userId);
}

function getUserAvatarUrl(userId, map) {
  const v = userId ? map?.[userId] : null;
  if (v && typeof v === "object") return v.avatar_url || null;
  return null;
}

function activityMeta(type, safeT) {
  const t = String(type || "").toLowerCase();

  if (t === "note") {
    return { color: "default", icon: <MessageOutlined />, label: safeT("caseDetails.timeline.type.note", "Note") };
  }
  if (t === "status_change" || t === "status") {
    return { color: "blue", icon: <SwapOutlined />, label: safeT("caseDetails.timeline.type.status", "Status") };
  }
  if (t === "priority_change" || t === "priority") {
    return { color: "gold", icon: <FlagOutlined />, label: safeT("caseDetails.timeline.type.priority", "Priority") };
  }
  if (t === "assignment" || t === "assigned" || t === "assignment_change") {
    return { color: "purple", icon: <UserSwitchOutlined />, label: safeT("caseDetails.timeline.type.assignment", "Assignment") };
  }
  return { color: "default", icon: <ClockCircleOutlined />, label: safeT("caseDetails.timeline.type.activity", "Activity") };
}

function StatusPill({ value }) {
  const sm = getStatusMeta(value);
  const Icon = sm?.Icon;
  return (
    <Tag color={sm?.color || "default"} style={{ borderRadius: 999, paddingInline: 10, margin: 0 }}>
      <Space size={6} align="center">
        {Icon ? <Icon style={{ fontSize: 12 }} /> : null}
        <span style={{ fontSize: 12 }}>{String(value || "—").replaceAll("_", " ")}</span>
      </Space>
    </Tag>
  );
}

function PriorityPill({ value }) {
  const pm = getPriorityMeta(value);
  const Icon = pm?.Icon;
  return (
    <Tag color={pm?.color || "default"} style={{ borderRadius: 999, paddingInline: 10, margin: 0 }}>
      <Space size={6} align="center">
        {Icon ? <Icon style={{ fontSize: 12 }} /> : null}
        <span style={{ fontSize: 12 }}>{String(value || "—").replaceAll("_", " ")}</span>
      </Space>
    </Tag>
  );
}

function ChangeInline({ type, meta, map, safeT }) {
  const t = String(type || "").toLowerCase();
  const m = meta || {};

  if ((t === "status_change" || t === "status") && m?.from && m?.to) {
    return (
      <Space size={8} wrap align="center">
        <StatusPill value={m.from} />
        <Text type="secondary" style={{ fontSize: 12 }}>→</Text>
        <StatusPill value={m.to} />
      </Space>
    );
  }

  if ((t === "priority_change" || t === "priority") && m?.from && m?.to) {
    return (
      <Space size={8} wrap align="center">
        <PriorityPill value={m.from} />
        <Text type="secondary" style={{ fontSize: 12 }}>→</Text>
        <PriorityPill value={m.to} />
      </Space>
    );
  }

  if (t === "assignment" || t === "assigned" || t === "assignment_change") {
    const fromU = m?.from_user ?? m?.from ?? null;
    const toU = m?.to_user ?? m?.to ?? null;

    if (fromU !== null || toU !== null) {
      const fromLabel = fromU ? getUserLabel(fromU, map) : safeT("caseDetails.timeline.unassigned", "Unassigned");
      const toLabel = toU ? getUserLabel(toU, map) : safeT("caseDetails.timeline.unassigned", "Unassigned");

      return (
        <Space size={8} wrap align="center">
          <Tag style={{ borderRadius: 999, paddingInline: 10, margin: 0 }}>{fromLabel}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>→</Text>
          <Tag color="geekblue" style={{ borderRadius: 999, paddingInline: 10, margin: 0 }}>{toLabel}</Tag>
        </Space>
      );
    }
  }

  return null;
}

export default function CaseTimeline({ items = [], profilesById, userMap, locale }) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const safeT = useSafeT();
  const map = pickMap(userMap, profilesById);

  const sorted = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];
    arr.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
    return arr;
  }, [items]);

  // ✅ Guarantee: if items exists -> render something
  if (!sorted.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical" size={2}>
            <Text>{safeT("caseDetails.timeline.emptyTitle", "No activity yet")}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {safeT("caseDetails.timeline.emptyHint", "Notes, status updates and assignments will appear here.")}
            </Text>
          </Space>
        }
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: 10, width: "100%" }}>
      {sorted.map((it, idx) => {
        const am = activityMeta(it?.type, safeT);

        // ✅ Make sure these are always strings
        const createdBy = it?.created_by ? String(it.created_by) : "";
        const actorLabel = getUserLabel(createdBy, map);
        const avatarSrc = getUserAvatarUrl(createdBy, map);

        const exact = it?.created_at ? safeLocaleString(it.created_at, locale) : "—";
        const rel = it?.created_at ? timeAgo(it.created_at) : "—";

        const body = String(it?.body || "").trim();
        const change = (
          <ChangeInline type={it?.type} meta={it?.meta || {}} map={map} safeT={safeT} />
        );

        return (
          <div
            key={it?.id || `${idx}-${it?.created_at || "x"}`}
            style={{
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              padding: isMobile ? 12 : 14,
              display: "grid",
              gap: 8,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Space size={10} wrap style={{ minWidth: 0 }}>
                <Tag color={am.color} style={{ borderRadius: 999, paddingInline: 10, margin: 0 }}>
                  <Space size={6} align="center">
                    <span style={{ display: "inline-flex", alignItems: "center" }}>{am.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{am.label}</span>
                  </Space>
                </Tag>

                <Space size={8} style={{ minWidth: 0 }}>
                  <Avatar
                    size={24}
                    src={avatarSrc}
                    icon={<UserOutlined />}
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    {initials(actorLabel)}
                  </Avatar>

                  <Tooltip title={actorLabel}>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      {actorLabel}
                    </Text>
                  </Tooltip>
                </Space>
              </Space>

              <Tooltip title={exact}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {rel}
                </Text>
              </Tooltip>
            </div>

            {/* Change */}
            {change ? (
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {change}
              </div>
            ) : null}

            {/* Body */}
            {body ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.14)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: 1.45,
                }}
              >
                <Text>{body}</Text>
              </div>
            ) : null}

            {!isMobile ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {exact}
              </Text>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

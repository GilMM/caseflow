"use client";

import { useMemo } from "react";
import { Badge, Button, Card, Empty, Space, Tag, Typography } from "antd";
import { CalendarOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { timeAgo, caseKey } from "@/lib/ui/status";

const { Text } = Typography;

function formatWhen(e, t) {
  try {
    const s = e?.start_at ? new Date(e.start_at) : null;
    const en = e?.end_at ? new Date(e.end_at) : null;

    if (!s) return "—";

    const dateOpts = { weekday: "short", month: "short", day: "2-digit" };
    const timeOpts = { hour: "2-digit", minute: "2-digit" };

    if (e?.all_day) {
      return `${s.toLocaleDateString(undefined, dateOpts)} • ${t("dashboard.upcomingEvents.allDay")}`;
    }

    const startStr = `${s.toLocaleDateString(undefined, dateOpts)} ${s.toLocaleTimeString(
      undefined,
      timeOpts
    )}`;

    if (!en) return startStr;

    const endStr = en.toLocaleTimeString(undefined, timeOpts);
    return `${startStr} → ${endStr}`;
  } catch {
    return "—";
  }
}

function colorDot(color) {
  if (!color) return null;
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: color,
        display: "inline-block",
        boxShadow: "0 0 0 2px rgba(0,0,0,0.08)",
      }}
    />
  );
}

export default function UpcomingEventsCard({
  loading,
  events,
  onOpenCalendar,
  onOpenCase,
  isMobile,
}) {
  const t = useTranslations();
  const rows = useMemo(() => events || [], [events]);

  return (
    <Card
      loading={loading}
      title={
        <Space size={8} align="center">
          <CalendarOutlined />
          <span>{t("dashboard.upcomingEvents.title")}</span>
          <Tag color="blue" style={{ marginInlineStart: 4 }}>
            {t("dashboard.kpis.live")}
          </Tag>
        </Space>
      }
      extra={
        <Button type="link" onClick={onOpenCalendar} style={{ padding: 0 }}>
          {t("dashboard.upcomingEvents.openCalendar")} →
        </Button>
      }
      style={{ borderRadius: 16 }}
      styles={{ body: { padding: isMobile ? 12 : 16 } }}
    >
      {rows.length ? (
        <Space orientation ="vertical" size={10} style={{ width: "100%" }}>
          {rows.map((e) => {
            const when = formatWhen(e, t);
            const hasCase = !!e.case_id;

            return (
              <div
                key={e.id}
                style={{
                  borderRadius: 12,
                  padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <Space orientation ="vertical" size={6} style={{ width: "100%" }}>
                  <Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
                    <Space size={10} style={{ minWidth: 0 }}>
                      {colorDot(e.color)}
                      <Text strong style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.title || t("dashboard.upcomingEvents.untitledEvent")}
                      </Text>
                    </Space>

                    <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {timeAgo(e.start_at)}
                    </Text>
                  </Space>

                  <Space wrap size={8} align="center">
                    <Tag color="default" style={{ margin: 0 }}>
                      {when}
                    </Tag>

                    {e.location ? (
                      <Tag color="default" style={{ margin: 0 }}>
                        <Space size={6}>
                          <EnvironmentOutlined />
                          <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {e.location}
                          </span>
                        </Space>
                      </Tag>
                    ) : null}

                    {hasCase ? (
                      <Tag
                        color="geekblue"
                        style={{ margin: 0, cursor: "pointer" }}
                        onClick={() => onOpenCase?.(e.case_id)}
                      >
                        {caseKey(e.case_id)}
                      </Tag>
                    ) : (
                      <Tag color="blue" style={{ margin: 0 }}>
                        {t("dashboard.upcomingEvents.event")}
                      </Tag>
                    )}
                  </Space>

                  {hasCase ? (
                    <Space style={{ justifyContent: "space-between", width: "100%" }}>
                      <span />
                      <Button type="link" style={{ padding: 0 }} onClick={() => onOpenCase?.(e.case_id)}>
                        {t("dashboard.upcomingEvents.openCase")} →
                      </Button>
                    </Space>
                  ) : null}
                </Space>
              </div>
            );
          })}
        </Space>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation ="vertical" size={2}>
              <Text>{t("dashboard.upcomingEvents.noEvents")}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("dashboard.upcomingEvents.noEventsHint")}
              </Text>
            </Space>
          }
        />
      )}
    </Card>
  );
}

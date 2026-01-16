"use client";

import { useMemo, useState } from "react";
import { Button, Card, Divider, Empty, List, Space, Tag, Typography } from "antd";
import { LeftOutlined, RightOutlined, PlusOutlined, EnvironmentOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

function sameDay(aISO, bDayjs) {
  if (!aISO) return false;
  return dayjs(aISO).isSame(bDayjs, "day");
}

function formatTimeRange(e) {
  const start = e?.start_at ? dayjs(e.start_at) : null;
  const end = e?.end_at ? dayjs(e.end_at) : null;

  if (!start) return "";

  if (e?.all_day) return "All-day";

  const s = start.format("HH:mm");
  const en = end ? end.format("HH:mm") : "";
  return en ? `${s}–${en}` : s;
}

function colorDot(color) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: color || "var(--ant-color-primary, #1677ff)",
        display: "inline-block",
        boxShadow: "0 0 0 2px rgba(0,0,0,0.04)",
      }}
    />
  );
}

export default function CalendarMobile({
  cursor,
  onCursorChange,
  events,
  onSelectRange,
  onOpenEvent,
}) {
  // selected day inside the visible week
  const [selectedDay, setSelectedDay] = useState(() => cursor.startOf("day"));

  // week days based on cursor
  const weekDays = useMemo(() => {
    const start = cursor.startOf("week");
    return Array.from({ length: 7 }).map((_, i) => start.add(i, "day"));
  }, [cursor]);

  // keep selectedDay in current week when cursor changes
  useMemo(() => {
    const start = cursor.startOf("week");
    const end = cursor.endOf("week");
    if (selectedDay.isBefore(start, "day") || selectedDay.isAfter(end, "day")) {
      setSelectedDay(cursor.startOf("day"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const dayEvents = useMemo(() => {
    const list = (events || []).filter((e) => sameDay(e?.start_at, selectedDay));
    list.sort((a, b) => (a.start_at || "").localeCompare(b.start_at || ""));
    return list;
  }, [events, selectedDay]);

  function goPrevWeek() {
    onCursorChange?.(cursor.subtract(1, "week"));
  }
  function goNextWeek() {
    onCursorChange?.(cursor.add(1, "week"));
  }

  function createOnSelectedDay() {
    // prefill as 1 hour event at 10:00 for convenience (or all-day)
    const start = selectedDay.hour(10).minute(0).second(0);
    const end = start.add(1, "hour");

    onSelectRange?.({
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: false,
    });
  }

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      {/* Week strip */}
      <Card style={{ borderRadius: 14 }} bodyStyle={{ padding: 12 }}>
        <Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
          <Space size={8}>
            <Button icon={<LeftOutlined />} onClick={goPrevWeek} />
            <Button icon={<RightOutlined />} onClick={goNextWeek} />
          </Space>

          <Text type="secondary" style={{ fontSize: 12 }}>
            {cursor.format("MMM YYYY")}
          </Text>

          <Button type="primary" icon={<PlusOutlined />} onClick={createOnSelectedDay}>
            New
          </Button>
        </Space>

        <Divider style={{ margin: "10px 0" }} />

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {weekDays.map((d) => {
            const isSel = d.isSame(selectedDay, "day");
            const hasEvents = (events || []).some((e) => sameDay(e?.start_at, d));

            return (
              <button
                key={d.format("YYYY-MM-DD")}
                onClick={() => setSelectedDay(d)}
                style={{
                  border: `1px solid ${
                    isSel ? "var(--ant-color-primary, #1677ff)" : "rgba(0,0,0,0.08)"
                  }`,
                  background: isSel ? "rgba(22,119,255,0.10)" : "transparent",
                  color: "inherit",
                  borderRadius: 12,
                  padding: "10px 12px",
                  minWidth: 64,
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.75 }}>{d.format("ddd")}</div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>
                  {d.format("D")}
                </div>
                <div style={{ marginTop: 6, height: 10 }}>
                  {hasEvents ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: 18,
                        height: 4,
                        borderRadius: 999,
                        background: "var(--ant-color-primary, #1677ff)",
                        opacity: 0.75,
                      }}
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Events list for selected day */}
      <Card
        style={{ borderRadius: 14 }}
        title={
          <Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
            <span>{selectedDay.format("dddd, MMM D")}</span>
            <Tag color="geekblue">{dayEvents.length} events</Tag>
          </Space>
        }
      >
        {dayEvents.length ? (
          <List
            itemLayout="horizontal"
            dataSource={dayEvents}
            renderItem={(e) => (
              <List.Item
                style={{ cursor: "pointer" }}
                onClick={() => onOpenEvent?.(e.id)}
              >
                <List.Item.Meta
                  avatar={colorDot(e.color)}
                  title={
                    <Space size={10} wrap>
                      <Text strong>{e.title}</Text>
                      <Tag style={{ margin: 0 }}>{formatTimeRange(e)}</Tag>
                      {e.all_day ? <Tag color="blue">All-day</Tag> : null}
                    </Space>
                  }
                  description={
                    <Space orientation="vertical" size={2}>
                      {e.location ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <EnvironmentOutlined /> {e.location}
                        </Text>
                      ) : null}
                      {e.description ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {e.description}
                        </Text>
                      ) : null}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty
            description={
              <Space orientation="vertical" size={2}>
                <Text>No events</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Tap “New” to create one for this day
                </Text>
              </Space>
            }
          />
        )}
      </Card>
    </Space>
  );
}

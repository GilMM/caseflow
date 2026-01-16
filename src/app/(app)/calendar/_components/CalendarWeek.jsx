"use client";

import { useMemo } from "react";
import { Button, Card, Col, Row, Space, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

function hourSlots() {
  const arr = [];
  for (let h = 0; h < 24; h++) arr.push(h);
  return arr;
}

/**
 * Simple AntD-styled week view (custom).
 * Shows days as columns + hours as rows.
 */
export default function CalendarWeek({
  cursor,
  onCursorChange,
  events,
  onSelectRange,
  onOpenEvent,
}) {
  const weekStart = useMemo(() => cursor.startOf("week"), [cursor]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day")),
    [weekStart]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const e of events || []) {
      const d = dayjs(e.start_at).format("YYYY-MM-DD");
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(e);
    }
    return map;
  }, [events]);

  const hours = useMemo(() => hourSlots(), []);

  return (
    <Space orientation="vertical" size={10} style={{ width: "100%" }}>
      <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
        <Space>
          <Button
            size="small"
            icon={<LeftOutlined />}
            onClick={() => onCursorChange?.(cursor.subtract(1, "week"))}
          />
          <Button
            size="small"
            icon={<RightOutlined />}
            onClick={() => onCursorChange?.(cursor.add(1, "week"))}
          />
          <Button size="small" onClick={() => onCursorChange?.(dayjs())}>
            Today
          </Button>
        </Space>

        <Text strong style={{ fontSize: 14 }}>
          {weekStart.format("MMM D")} – {weekStart.add(6, "day").format("MMM D, YYYY")}
        </Text>
      </Space>

      <Row gutter={[8, 8]}>
        {/* Left time column */}
        <Col flex="120px">
          <Card size="small" style={{ borderRadius: 12 }} bodyStyle={{ padding: 8 }}>
            <div style={{ height: 36 }} />
            {hours.map((h) => (
              <div
                key={h}
                style={{
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 12,
                }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </Card>
        </Col>

        {/* Days */}
        {days.map((d) => {
          const key = d.format("YYYY-MM-DD");
          const list = eventsByDay.get(key) || [];

          return (
            <Col key={key} flex="1 1 0">
              <Card size="small" style={{ borderRadius: 12 }} bodyStyle={{ padding: 8 }}>
                <div style={{ height: 36, display: "flex", alignItems: "center" }}>
                  <Text strong>{d.format("ddd")}</Text>
                  <Text type="secondary" style={{ marginInlineStart: 8 }}>
                    {d.format("D")}
                  </Text>
                </div>

                {/* Grid */}
                <div style={{ position: "relative" }}>
                  {hours.map((h) => (
                    <div
                      key={h}
                      onClick={() => {
                        const start = d.hour(h).minute(0).second(0);
                        const end = start.add(1, "hour");
                        onSelectRange?.({
                          start_at: start.toISOString(),
                          end_at: end.toISOString(),
                          all_day: false,
                        });
                      }}
                      style={{
                        height: 44,
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        cursor: "pointer",
                      }}
                    />
                  ))}

                  {/* Event pills (simple) */}
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    {list.map((e) => {
                      const s = dayjs(e.start_at);
                      const top = s.hour() * 44 + 2;
                      return (
                        <div
                          key={e.id}
                          style={{
                            position: "absolute",
                            top,
                            left: 6,
                            right: 6,
                            padding: "4px 8px",
                            borderRadius: 10,
                            background: "rgba(22,119,255,0.14)",
                            border: `1px solid ${e.color || "rgba(22,119,255,0.28)"}`,
                            fontSize: 12,
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            pointerEvents: "auto",
                            cursor: "pointer",
                          }}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onOpenEvent?.(e.id);
                          }}
                          title={e.title}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: 8,
                              height: 8,
                              borderRadius: 99,
                              marginInlineEnd: 8,
                              background: e.color || "#1677ff",
                            }}
                          />
                          {e.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Space>
  );
}

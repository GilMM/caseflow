"use client";

import { useMemo, useRef } from "react";
import { Badge, Button, Calendar, Space, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

const { Text } = Typography;

/**
 * Month view using AntD <Calendar />
 * Props:
 * - cursor (dayjs)
 * - onCursorChange(dayjs)
 * - events (rows from calendar_events)
 * - onSelectRange(prefill)  // create
 * - onOpenEvent(eventId)    // edit
 */
export default function CalendarMonth({
  cursor,
  onCursorChange,
  events,
  onSelectRange,
  onOpenEvent,
}) {
  const t = useTranslations();
  const ignoreNextSelectRef = useRef(false);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const e of events || []) {
      const d = dayjs(e.start_at).format("YYYY-MM-DD");
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(e);
    }
    return map;
  }, [events]);

  function markIgnoreNextSelect() {
    // antd Calendar may fire onSelect when changing month via header
    ignoreNextSelectRef.current = true;
    setTimeout(() => {
      ignoreNextSelectRef.current = false;
    }, 0);
  }

  function headerRender({ value, onChange }) {
    const cur = value; // dayjs
    return (
      <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
        <Space>
          <Button
            size="small"
            icon={<LeftOutlined />}
            onClick={() => {
              markIgnoreNextSelect();
              const next = cur.subtract(1, "month");
              onChange(next);
              onCursorChange?.(next);
            }}
          />
          <Button
            size="small"
            icon={<RightOutlined />}
            onClick={() => {
              markIgnoreNextSelect();
              const next = cur.add(1, "month");
              onChange(next);
              onCursorChange?.(next);
            }}
          />
        </Space>

        <Text strong style={{ fontSize: 14 }}>
          {cur.format("MMMM YYYY")}
        </Text>

        <Space>
          <Button
            size="small"
            onClick={() => {
              markIgnoreNextSelect();
              const next = dayjs();
              onChange(next);
              onCursorChange?.(next);
            }}
          >
            {t("calendar.event.today")}
          </Button>
        </Space>
      </Space>
    );
  }

  function dateCellRender(value) {
    const key = value.format("YYYY-MM-DD");
    const list = eventsByDay.get(key) || [];
    if (!list.length) return null;

    return (
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
        {list.slice(0, 3).map((e) => (
          <div
            key={e.id}
            onClick={(ev) => {
              ev.stopPropagation();
              onOpenEvent?.(e.id);
            }}
            style={{
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 8,
              fontSize: 12,
              background: "rgba(22,119,255,0.12)",
              border: "1px solid rgba(22,119,255,0.18)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={e.title}
          >
            <Badge color={e.color || "#1677ff"} text={e.title} />
          </div>
        ))}

        {list.length > 3 ? (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {t("calendar.event.more", { count: list.length - 3 })}
          </Text>
        ) : null}
      </div>
    );
  }

  return (
    <Calendar
      value={cursor}
      onChange={(v) => {
        // month navigation via panel also triggers onChange
        onCursorChange?.(v);
      }}
      headerRender={headerRender}
      cellRender={dateCellRender}
      fullscreen
      onSelect={(v) => {
        // ✅ prevent "fake select" coming from month navigation buttons
        if (ignoreNextSelectRef.current) return;

        // click on a date creates a 1h event starting at current hour
        const start = v.hour(dayjs().hour()).minute(0).second(0);
        const end = start.add(1, "hour");

        onSelectRange?.({
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          all_day: false,
        });
      }}
    />
  );
}

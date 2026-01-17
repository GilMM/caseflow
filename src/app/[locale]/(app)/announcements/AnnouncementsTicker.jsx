// src/app/(app)/_components/announcements/AnnouncementsTicker.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Space, Tag, Typography, theme } from "antd";
import { NotificationOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Announcements ticker (infinite scroll).
 * - Duplicates the items list to create a seamless loop.
 * - Speed controlled by pixelsPerSecond.
 */
export default function AnnouncementsTicker({
  items = [],
  compact = false,
  pixelsPerSecond = 70,
  maxWidth = 520,
}) {
  const { token } = theme.useToken();

  const containerRef = useRef(null);
  const trackRef = useRef(null);

  const [duration, setDuration] = useState(16); // seconds fallback
  const [paused, setPaused] = useState(false);

  const hasItems = items?.length > 0;

  const normalized = useMemo(() => {
    // Map to a simple model; also allow title/body.
    return (items || [])
      .filter((x) => (x?.body || "").trim())
      .map((x) => ({
        id: x.id,
        title: x.title || "",
        body: x.body || "",
      }));
  }, [items]);

  // Seamless loop requires at least 1 element; we duplicate anyway.
  const loopItems = useMemo(() => {
    if (!normalized.length) return [];
    return [...normalized, ...normalized];
  }, [normalized]);

  useEffect(() => {
    if (!hasItems) return;

    const calc = () => {
      const track = trackRef.current;
      if (!track) return;

      // half width is the original items width (before duplication)
      const totalWidth = track.scrollWidth;
      const half = totalWidth / 2;

      // duration = distance / speed
      const seconds = Math.max(8, Math.round((half / pixelsPerSecond) * 10) / 10);
      setDuration(seconds);
    };

    calc();

    // recalc on resize
    const ro = new ResizeObserver(() => calc());
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", calc);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calc);
    };
  }, [hasItems, loopItems, pixelsPerSecond]);

  if (!hasItems) return null;

  const pillStyle = {
    borderRadius: 999,
    margin: 0,
    height: compact ? 22 : 24,
    lineHeight: compact ? "22px" : "24px",
    paddingInline: compact ? 8 : 10,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: `1px solid ${token.colorBorderSecondary || token.colorBorder}`,
    background: token.colorBgContainer,
  };

  const boxStyle = {
    maxWidth,
    minWidth: compact ? 180 : 260,
    overflow: "hidden",
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary || token.colorBorder}`,
    background: token.colorBgElevated || token.colorBgContainer,
  };

  const trackStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    whiteSpace: "nowrap",
    willChange: "transform",
    animation: paused ? "none" : `cf_marquee ${duration}s linear infinite`,
  };

  return (
    <div
      ref={containerRef}
      style={boxStyle}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-label="Announcements"
      title="Hover to pause"
    >
      <style jsx global>{`
        @keyframes cf_marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      <div style={{ padding: compact ? "6px 8px" : "7px 10px" }}>
        <div ref={trackRef} style={trackStyle}>
          {loopItems.map((a, idx) => (
            <Tag key={`${a.id}-${idx}`} style={pillStyle}>
              <Space size={8}>
                <NotificationOutlined style={{ fontSize: compact ? 12 : 13, opacity: 0.85 }} />
                <Text
                  style={{
                    fontSize: compact ? 12 : 12,
                    maxWidth: compact ? 240 : 340,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.title ? `${a.title}: ` : ""}
                  {a.body}
                </Text>
              </Space>
            </Tag>
          ))}
        </div>
      </div>
    </div>
  );
}

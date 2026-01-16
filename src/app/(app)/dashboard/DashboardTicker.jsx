// src/app/(app)/dashboard/DashboardTicker.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Typography, theme } from "antd";
import { NotificationOutlined } from "@ant-design/icons";
import { useAnnouncements } from "@/app/(app)/announcements/useAnnouncements";

const { Text } = Typography;

export default function DashboardTicker() {
  const { token } = theme.useToken();
  const { items } = useAnnouncements();

  const trackRef = useRef(null);
  const [duration, setDuration] = useState(15);
  const [paused, setPaused] = useState(false);

  const announcements = useMemo(() => {
    return (items || [])
      .filter((x) => x?.is_active !== false)
      .filter((x) => (x?.body || "").trim())
      .map((x) => ({
        id: x.id,
        title: x.title || "",
        body: x.body || "",
      }));
  }, [items]);

  // Calculate animation duration based on content width
  useEffect(() => {
    if (!announcements.length) return;

    const calc = () => {
      const track = trackRef.current;
      if (!track) return;

      // Get width of just the first copy (half of total)
      const trackWidth = track.scrollWidth / 2;
      // Duration based on content width (pixels per second = 50)
      const seconds = Math.max(8, Math.round(trackWidth / 50));
      setDuration(seconds);
    };

    const timer = setTimeout(calc, 100);

    const ro = new ResizeObserver(() => calc());
    if (trackRef.current) ro.observe(trackRef.current);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [announcements]);

  const hasAnnouncements = announcements.length > 0;

  // Build the display text
  const displayItems = announcements.map((a) => ({
    id: a.id,
    text: a.title ? `${a.title}: ${a.body}` : a.body,
  }));

  // Duplicate items for seamless loop
  const loopItems = [...displayItems, ...displayItems];

  return (
    <div
      style={{
        background: token.colorBgContainer,
        borderRadius: 12,
        border: `1px solid ${token.colorBorderSecondary || token.colorBorder}`,
        overflow: "hidden",
        position: "relative",
        height: 44,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes dashboard_scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Background label */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          color: token.colorTextQuaternary,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: 1,
          textTransform: "uppercase",
          opacity: hasAnnouncements ? 0.4 : 0.6,
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      >
        Announcements
      </div>

      {/* Left fade */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 24,
          background: `linear-gradient(90deg, ${token.colorBgContainer}, transparent)`,
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* Right fade */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 24,
          background: `linear-gradient(270deg, ${token.colorBgContainer}, transparent)`,
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {hasAnnouncements && (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            ref={trackRef}
            style={{
              display: "inline-flex",
              alignItems: "center",
              whiteSpace: "nowrap",
              animation: !paused
                ? `dashboard_scroll ${duration}s linear infinite`
                : "none",
            }}
          >
            {loopItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  paddingLeft: 40,
                  paddingRight: 40,
                }}
              >
                <NotificationOutlined
                  style={{
                    color: token.colorPrimary,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ fontSize: 13 }}>{item.text}</Text>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

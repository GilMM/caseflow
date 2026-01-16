// src/app/(app)/dashboard/DashboardTicker.jsx
"use client";

import { useMemo } from "react";
import { Typography, theme } from "antd";
import { NotificationOutlined } from "@ant-design/icons";
import Marquee from "react-fast-marquee";
import { useAnnouncements } from "@/app/(app)/announcements/useAnnouncements";

const { Text } = Typography;

export default function DashboardTicker() {
  const { token } = theme.useToken();
  const { items } = useAnnouncements();

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

  const hasAnnouncements = announcements.length > 0;

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
    >
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
            position: "relative",
            zIndex: 1,
          }}
        >
          <Marquee
            speed={40}
            pauseOnHover
            gradient={false}
          >
            {announcements.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  paddingLeft: 32,
                  paddingRight: 32,
                }}
              >
                <NotificationOutlined
                  style={{
                    color: token.colorPrimary,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ fontSize: 13 }}>
                  {a.title ? `${a.title}: ${a.body}` : a.body}
                </Text>
              </div>
            ))}
          </Marquee>
        </div>
      )}
    </div>
  );
}

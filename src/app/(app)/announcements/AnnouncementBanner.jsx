// src/app/(app)/announcements/AnnouncementBanner.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Space, Typography, theme } from "antd";
import { CloseOutlined, NotificationOutlined } from "@ant-design/icons";

const { Text } = Typography;

const DISMISSED_KEY = "cf_dismissed_announcements";

function getDismissedIds() {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveDismissedIds(ids) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export default function AnnouncementBanner({ items = [] }) {
  const { token } = theme.useToken();
  const [dismissedIds, setDismissedIds] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDismissedIds(getDismissedIds());
    setMounted(true);
  }, []);

  const visibleItems = useMemo(() => {
    if (!mounted) return [];
    return (items || [])
      .filter((x) => (x?.body || "").trim())
      .filter((x) => !dismissedIds.includes(x.id));
  }, [items, dismissedIds, mounted]);

  function handleDismiss(id) {
    const newIds = [...dismissedIds, id];
    setDismissedIds(newIds);
    saveDismissedIds(newIds);
  }

  if (!visibleItems.length) return null;

  // Show only the first announcement (stack them)
  const current = visibleItems[0];

  return (
    <div
      style={{
        background: `linear-gradient(90deg, ${token.colorPrimary}, ${token.colorPrimaryActive || token.colorPrimary})`,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        position: "relative",
        minHeight: 44,
      }}
    >
      <Space size={10} style={{ flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
        <NotificationOutlined style={{ color: "#fff", fontSize: 14 }} />
        <Text
          style={{
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {current.title ? (
            <span style={{ fontWeight: 600 }}>{current.title}: </span>
          ) : null}
          {current.body}
        </Text>

        {visibleItems.length > 1 && (
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 12,
            }}
          >
            +{visibleItems.length - 1} more
          </Text>
        )}
      </Space>

      <Button
        type="text"
        size="small"
        icon={<CloseOutlined style={{ color: "#fff", fontSize: 12 }} />}
        onClick={() => handleDismiss(current.id)}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.1)",
          border: "none",
          borderRadius: 4,
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Dismiss announcement"
      />
    </div>
  );
}

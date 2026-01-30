"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  Dropdown,
  Empty,
  Grid,
  List,
  Spin,
  Typography,
  theme,
} from "antd";
import {
  BellOutlined,
  CheckOutlined,
  InboxOutlined,
  UserSwitchOutlined,
  EditOutlined,
  MessageOutlined,
} from "@ant-design/icons";

import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/contexts";
import { useLocaleContext } from "@/app/[locale]/providers";
import { timeAgo } from "@/lib/ui/status";

const { Text } = Typography;

const NOTIFICATION_ICONS = {
  case_assigned: <UserSwitchOutlined />,
  case_updated: <EditOutlined />,
  case_comment: <MessageOutlined />,
  case_status_changed: <CheckOutlined />,
  default: <InboxOutlined />,
};

export default function NotificationBell() {
  const router = useRouter();
  const { token } = theme.useToken();
  const { locale } = useLocaleContext();
  const { user } = useUser();
  const t = useTranslations("notifications");

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, case_id, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (notificationId) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.case_id) {
      router.push(`/${locale}/cases/${notification.case_id}`);
      setOpen(false);
    }
  };

  const dropdownContent = (
    <div
      style={{
        width: isMobile ? "calc(100vw - 32px)" : 360,
        maxWidth: 360,
        maxHeight: isMobile ? "70vh" : 440,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: token.colorBgElevated,
        borderRadius: 12,
        boxShadow: token.boxShadowSecondary,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text strong style={{ fontSize: 15 }}>
          {t("title")}
        </Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead}>
            {t("markAllRead")}
          </Button>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("empty")}
            style={{ padding: "40px 20px" }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                onClick={() => handleNotificationClick(item)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  background: item.is_read
                    ? "transparent"
                    : token.colorPrimaryBg,
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = token.colorFillSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = item.is_read
                    ? "transparent"
                    : token.colorPrimaryBg;
                }}
              >
                <div style={{ display: "flex", gap: 12, width: "100%" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: item.is_read
                        ? token.colorFillSecondary
                        : token.colorPrimary,
                      color: item.is_read ? token.colorTextSecondary : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {NOTIFICATION_ICONS[item.type] ||
                      NOTIFICATION_ICONS.default}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: item.is_read ? 400 : 600,
                        color: token.colorText,
                        marginBottom: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.title}
                    </div>
                    {item.body && (
                      <div
                        style={{
                          fontSize: 12,
                          color: token.colorTextSecondary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.body}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 11,
                        color: token.colorTextTertiary,
                        marginTop: 4,
                      }}
                    >
                      {timeAgo(item.created_at)}
                    </div>
                  </div>
                  {!item.is_read && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: token.colorPrimary,
                        flexShrink: 0,
                        alignSelf: "center",
                      }}
                    />
                  )}
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && unreadCount > 0) markAllAsRead();
      }}
      trigger={["click"]}
      placement="bottomRight"
      dropdownRender={() => dropdownContent}
      overlayStyle={isMobile ? { position: "fixed", left: 16, right: 16, width: "auto" } : undefined}
    >
      <Badge count={unreadCount} size="small" offset={[-4, 4]}>
        <Button
          icon={<BellOutlined style={{ fontSize: 16 }} />}
          style={{
            height: 32,
            borderRadius: 10,
            border: `1px solid ${token.colorBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 10px",
          }}
        />
      </Badge>
    </Dropdown>
  );
}

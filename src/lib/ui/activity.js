// src/lib/ui/activity.js
import {
  CommentOutlined,
  EditOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  UserSwitchOutlined,
  TagsOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
} from "@ant-design/icons";

export function getActivityMeta(type) {
  const t = String(type || "").toLowerCase();

  const map = {
    comment: { color: "geekblue", Icon: CommentOutlined, label: "Comment" },
    note: { color: "geekblue", Icon: CommentOutlined, label: "Note" },

    status_change: { color: "gold", Icon: SwapOutlined, label: "Status" },
    status: { color: "gold", Icon: SwapOutlined, label: "Status" },

    priority_change: { color: "volcano", Icon: ThunderboltOutlined, label: "Priority" },
    priority: { color: "volcano", Icon: ThunderboltOutlined, label: "Priority" },

    assigned: { color: "cyan", Icon: UserSwitchOutlined, label: "Assigned" },
    assignment: { color: "cyan", Icon: UserSwitchOutlined, label: "Assigned" },

    resolved: { color: "green", Icon: CheckCircleOutlined, label: "Resolved" },

    updated: { color: "purple", Icon: EditOutlined, label: "Updated" },
    tag: { color: "purple", Icon: TagsOutlined, label: "Tag" },

    // ✅ Calendar activities (NEW)
    calendar_created: { color: "blue", Icon: CalendarOutlined, label: "Event created" },
    calendar_updated: { color: "geekblue", Icon: CalendarOutlined, label: "Event updated" },
    calendar_moved: { color: "purple", Icon: CalendarOutlined, label: "Event moved" },
    calendar_deleted: { color: "red", Icon: CalendarOutlined, label: "Event removed" },
  };

  return map[t] || { color: "default", Icon: EditOutlined, label: type || "Activity" };
}

export function activityBg(color) {
  const by = {
    geekblue: "rgba(24,144,255,0.10)",
    gold: "rgba(250,173,20,0.10)",
    volcano: "rgba(250,84,28,0.10)",
    red: "rgba(245,34,45,0.10)",
    green: "rgba(82,196,26,0.10)",
    cyan: "rgba(19,194,194,0.10)",
    purple: "rgba(114,46,209,0.10)",
    blue: "rgba(22,119,255,0.10)", // ✅ new
    default: "rgba(255,255,255,0.06)",
  };
  return by[color] || by.default;
}

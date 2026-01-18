"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Dropdown, Input, Space, Tag, Typography, message } from "antd";
import {
  DownOutlined,
  UserOutlined,
  CheckOutlined,
  ThunderboltOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";

import { getStatusMeta, CASE_STATUSES } from "@/lib/ui/status";
import { getPriorityMeta, PRIORITY_OPTIONS } from "@/lib/ui/priority";
import { supabase } from "@/lib/supabase/client";

import {
  assignCase,
  getOrgMembers,
  updateCaseStatus,
  updateCasePriority,
} from "@/lib/db";

const { Text } = Typography;

/** Prevent Card onClick navigation when using dropdowns inside */
function stop(e) {
  e.preventDefault?.();
  e.stopPropagation?.();
}

function presetColorVar(color, level = 6) {
  if (!color || color === "default")
    return "var(--ant-color-text, rgba(255,255,255,0.85))";
  return `var(--ant-color-${color}-${level}, var(--ant-color-primary, #1677ff))`;
}

function chipStyle(color) {
  const accent = presetColorVar(color, 6);
  return {
    borderRadius: 999,
    border: `1px solid rgba(255,255,255,0.10)`,
    background: "rgba(255,255,255,0.02)",
    color: "inherit",
    height: 30,
    paddingInline: 10,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    userSelect: "none",
    outline: "none",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.0)",
  };
}

/** Little colored dot (nice premium look) */
function Dot({ color }) {
  const c = presetColorVar(color, 6);
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: c,
        boxShadow: `0 0 0 2px rgba(0,0,0,0.25)`,
        opacity: 0.9,
      }}
    />
  );
}

export default function CaseInlineActions({
  caseId,
  orgId,
  status,
  priority,
  assignedTo,
  compact = false,
  onChanged,
}) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);

  // members (for assignment menu)
  const [members, setMembers] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setMe(data?.session?.user || null);
    })();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const list = await getOrgMembers(orgId);
        setMembers(list || []);
      } catch {
        setMembers([]);
      }
    })();
  }, [orgId]);

  const statusMeta = getStatusMeta(status);
  const prMeta = getPriorityMeta(priority);

  const assigneeLabel = useMemo(() => {
    if (!assignedTo) return t("common.unassigned") || "Unassigned";
    const m = members.find((x) => x.user_id === assignedTo);
    return m?.full_name || m?.email || String(assignedTo).slice(0, 8) + "…";
  }, [assignedTo, members, t]);

  const filteredMembers = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const s = `${m.full_name || ""} ${m.email || ""} ${m.role || ""} ${
        m.user_id || ""
      }`.toLowerCase();
      return s.includes(q);
    });
  }, [members, assigneeSearch]);

  async function doStatus(next) {
    if (!caseId || !orgId) return;
    if (String(next) === String(status)) return;

    setBusy(true);
    try {
      // db signature is ({ caseId, status }) but extra fields won't hurt
      await updateCaseStatus({ caseId, status: next });
      message.success(t("cases.messages.statusUpdated") || "Status updated");
      onChanged?.();
    } catch (e) {
      message.error(e?.message || t("cases.messages.statusFailed") || "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  async function doAssign(nextUserId) {
    if (!caseId || !orgId) return;
    setBusy(true);
    try {
      await assignCase({ caseId, toUserId: nextUserId || null });
      message.success(t("cases.messages.assignmentUpdated") || "Assignment updated");
      onChanged?.();
    } catch (e) {
      message.error(e?.message || t("cases.messages.assignmentFailed") || "Failed to assign");
    } finally {
      setBusy(false);
    }
  }

  async function doPriority(next) {
    if (!caseId || !orgId) return;
    if (String(next) === String(priority)) return;

    setBusy(true);
    try {
      await updateCasePriority({ caseId, priority: next }); // ✅ FIX
      message.success(t("cases.messages.priorityUpdated") || "Priority updated");
      onChanged?.();
    } catch (e) {
      message.error(e?.message || t("cases.messages.priorityFailed") || "Failed to update priority");
    } finally {
      setBusy(false);
    }
  }

  /** Important: stop propagation from menu click too */
  const statusMenu = {
    items: CASE_STATUSES.map((s) => {
      const m = getStatusMeta(s.value);
      return {
        key: s.value,
        label: (
          <Space size={10}>
            <Dot color={m.color} />
            <Tag
              color={m.color}
              icon={m.Icon ? <m.Icon /> : null}
              style={{ margin: 0 }}
            >
              {m.label}
            </Tag>
          </Space>
        ),
        onClick: ({ domEvent }) => {
          stop(domEvent);
          doStatus(s.value);
        },
      };
    }),
  };

  const priorityMenu = {
    items: PRIORITY_OPTIONS.map((p) => {
      const m = getPriorityMeta(p.value);
      return {
        key: p.value,
        label: (
          <Space size={10}>
            <Dot color={m.color} />
            <Tag
              color={m.color}
              icon={m.Icon ? <m.Icon /> : null}
              style={{ margin: 0 }}
            >
              {m.label}
            </Tag>
          </Space>
        ),
        onClick: ({ domEvent }) => {
          stop(domEvent);
          doPriority(p.value);
        },
      };
    }),
  };

  // Assignee menu items (without search – search goes into dropdownRender)
  const assignMenuItems = useMemo(() => {
    const items = [];

    if (me?.id) {
      items.push({
        key: "__me",
        label: (
          <Space>
            <UserOutlined />
            <span>{t("cases.actions.assignToMe") || "Assign to me"}</span>
          </Space>
        ),
        onClick: ({ domEvent }) => {
          stop(domEvent);
          doAssign(me.id);
        },
      });
    }

    items.push({
      key: "__unassign",
      label: (
        <Space>
          <SwapOutlined />
          <span>{t("cases.actions.unassign") || "Unassign"}</span>
        </Space>
      ),
      onClick: ({ domEvent }) => {
        stop(domEvent);
        doAssign(null);
      },
    });

    items.push({ type: "divider" });

    filteredMembers.forEach((m) => {
      items.push({
        key: m.user_id,
        label: (
          <Space style={{ width: 280, justifyContent: "space-between" }}>
            <Space size={8} style={{ minWidth: 0 }}>
              <UserOutlined />
              <span
                style={{
                  maxWidth: 180,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.full_name || m.email || String(m.user_id).slice(0, 8) + "…"}
              </span>
            </Space>
            <Tag style={{ margin: 0 }}>{m.role}</Tag>
          </Space>
        ),
        onClick: ({ domEvent }) => {
          stop(domEvent);
          doAssign(m.user_id);
        },
      });
    });

    return items;
  }, [filteredMembers, me?.id]);

  const assignMenu = {
    items: assignMenuItems,
  };

  // --- UI ---
  if (compact) {
    return (
      <Space size={8} wrap onClick={stop} onMouseDown={stop}>
        {/* Status */}
        <Dropdown
          menu={statusMenu}
          trigger={["click"]}
          disabled={busy}
          placement="bottomLeft"
        >
          <div
            style={chipStyle(statusMeta.color)}
            onClick={stop}
            onMouseDown={stop}
          >
            {statusMeta.Icon ? <statusMeta.Icon /> : <CheckOutlined />}
            <span>{statusMeta.label}</span>
            <DownOutlined style={{ fontSize: 10, opacity: 0.8 }} />
          </div>
        </Dropdown>

        {/* Priority */}
        <Dropdown
          menu={priorityMenu}
          trigger={["click"]}
          disabled={busy}
          placement="bottomLeft"
        >
          <div style={chipStyle(prMeta.color)} onClick={stop} onMouseDown={stop}>
            {prMeta.Icon ? <prMeta.Icon /> : <ThunderboltOutlined />}
            <span>{prMeta.label}</span>
            <DownOutlined style={{ fontSize: 10, opacity: 0.8 }} />
          </div>
        </Dropdown>

        {/* Assignee */}
        <Dropdown
          menu={assignMenu}
          trigger={["click"]}
          disabled={busy || !orgId}
          placement="bottomLeft"
          popupRender={(menu) => (
            <div onClick={stop} onMouseDown={stop}>
              <div
                style={{
                  padding: 10,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Input
                  placeholder={t("cases.actions.searchMember") || "Search member…"}
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  allowClear
                  size="small"
                  onClick={stop}
                  onMouseDown={stop}
                />
              </div>
              {menu}
            </div>
          )}
        >
          <div
            style={chipStyle(assignedTo ? "cyan" : "default")}
            onClick={stop}
            onMouseDown={stop}
          >
            <UserOutlined />
            <span
              style={{
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {assigneeLabel}
            </span>
            <DownOutlined style={{ fontSize: 10, opacity: 0.8 }} />
          </div>
        </Dropdown>
      </Space>
    );
  }

  // non-compact (optional)
  return (
    <Space size={10} wrap onClick={stop} onMouseDown={stop}>
      <Dropdown menu={statusMenu} trigger={["click"]} disabled={busy}>
        <Button icon={<SwapOutlined />} onClick={stop} onMouseDown={stop}>
          {t("cases.actions.status") || "Status"} <DownOutlined />
        </Button>
      </Dropdown>

      <Dropdown menu={priorityMenu} trigger={["click"]} disabled={busy}>
        <Button icon={<ThunderboltOutlined />} onClick={stop} onMouseDown={stop}>
          {t("cases.new.priority")} <DownOutlined />
        </Button>
      </Dropdown>

      <Dropdown
        menu={assignMenu}
        trigger={["click"]}
        disabled={busy || !orgId}
        popupRender ={(menu) => (
          <div onClick={stop} onMouseDown={stop}>
            <div
              style={{
                padding: 10,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Input
                placeholder={t("cases.actions.searchMember") || "Search member…"}
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                allowClear
                size="small"
                onClick={stop}
                onMouseDown={stop}
              />
            </div>
            {menu}
          </div>
        )}
      >
        <Button icon={<UserOutlined />} onClick={stop} onMouseDown={stop}>
          {t("cases.actions.assignee") || "Assignee"} <DownOutlined />
        </Button>
      </Dropdown>
    </Space>
  );
}

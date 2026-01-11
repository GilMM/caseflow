"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { queueColor } from "@/lib/ui/queue";
import Image from "next/image";

import { supabase } from "@/lib/supabase/client";
import {
  getActiveWorkspace,
  getDashboardStats,
  getMyOpenCases,
  getRecentActivity,
  getOrgMembers,
} from "@/lib/db";

import { getStatusMeta, shortId, timeAgo, caseKey } from "@/lib/ui/status";
import { getPriorityMeta } from "@/lib/ui/priority";
import { getActivityMeta, activityBg } from "@/lib/ui/activity";

import {
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
  Grid,
} from "antd";

import {
  ReloadOutlined,
  InboxOutlined,
  FireOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowRightOutlined,
  WifiOutlined,
  AppstoreOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

/* ---------------- helpers ---------------- */

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function presetColorVar(color, level = 6) {
  if (!color || color === "default") {
    return "var(--ant-color-text, rgba(255,255,255,0.85))";
  }
  return `var(--ant-color-${color}-${level}, var(--ant-color-primary, #1677ff))`;
}

/**
 * ✅ Tag style like "solution #1":
 * - No Tag icon prop
 * - Manual icon span with lineHeight:0
 * - Fixed height + inline-flex => perfect alignment
 */
const tagBaseStyle = {
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 26,
  lineHeight: "26px",
  paddingInline: 10,
  borderRadius: 999,
  verticalAlign: "middle",
};

function TagIcon({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 0,
      }}
    >
      {children}
    </span>
  );
}

function QueueTag({ name, isDefault = false }) {
  console.log("DASH QUEUE:", JSON.stringify(name), isDefault, queueColor(name, isDefault));

  return (
    <Tag
      color={queueColor(name, isDefault)}
      style={{
        ...tagBaseStyle,
        maxWidth: 220,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      
    >
      
      <TagIcon>
        <AppstoreOutlined style={{ fontSize: 12 }} />
      </TagIcon>
      {name || "No queue"}
    </Tag>
  );
  
}


function StatusTag({ meta }) {
  return (
    <Tag color={meta.color} style={tagBaseStyle}>
      <TagIcon>
        {meta.Icon ? <meta.Icon style={{ fontSize: 12 }} /> : null}
      </TagIcon>
      {meta.label}
    </Tag>
  );
}

function PriorityTag({ meta }) {
  return (
    <Tag color={meta.color} style={tagBaseStyle}>
      <TagIcon>
        {meta.Icon ? <meta.Icon style={{ fontSize: 12 }} /> : null}
      </TagIcon>
      {meta.label}
    </Tag>
  );
}

/** Renders a consistent "change chips" row for live activity (status/priority/assignment) */
function renderActivityChange({ a, displayUser }) {
  const t = String(a?.type || "").toLowerCase();
  const meta = a?.meta || {};

  const Arrow = (
    <Text type="secondary" style={{ fontSize: 12 }}>
      →
    </Text>
  );

  // STATUS
  if ((t === "status_change" || t === "status") && meta?.from && meta?.to) {
    const fromM = getStatusMeta(meta.from);
    const toM = getStatusMeta(meta.to);

    return (
      <Space size={6} wrap align="center">
        <StatusTag meta={fromM} />
        {Arrow}
        <StatusTag meta={toM} />
      </Space>
    );
  }

  // PRIORITY
  if ((t === "priority_change" || t === "priority") && meta?.from && meta?.to) {
    const fromM = getPriorityMeta(meta.from);
    const toM = getPriorityMeta(meta.to);

    return (
      <Space size={6} wrap align="center">
        <PriorityTag meta={fromM} />
        {Arrow}
        <PriorityTag meta={toM} />
      </Space>
    );
  }

  // ASSIGNMENT
  if (
    (t === "assignment" || t === "assigned") &&
    (meta?.from_user || meta?.to_user || meta?.from || meta?.to)
  ) {
    const fromU = meta?.from_user ?? meta?.from;
    const toU = meta?.to_user ?? meta?.to;

    return (
      <Space size={6} wrap align="center">
        <Tag style={tagBaseStyle}>
          <TagIcon>
            <UserOutlined style={{ fontSize: 12 }} />
          </TagIcon>
          {fromU ? displayUser(fromU) : "Unassigned"}
        </Tag>
        {Arrow}
        <Tag color="cyan" style={tagBaseStyle}>
          <TagIcon>
            <UserOutlined style={{ fontSize: 12 }} />
          </TagIcon>
          {toU ? displayUser(toU) : "Unassigned"}
        </Tag>
      </Space>
    );
  }

  return null;
}

/** KPI card (responsive compact/normal) */
function KpiCard({
  loading,
  title,
  icon,
  value,
  extra,
  progress,
  footer,
  compact = false,
}) {
  return (
    <Card
      loading={loading}
      style={{ borderRadius: 16, width: "100%" }}
      styles={{
        body: {
          minHeight: compact ? 108 : 140,
          padding: compact ? 12 : 16,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        },
      }}
    >
      {/* Header line */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Space size={6}>
          {icon}
          <Text type="secondary" style={{ fontSize: compact ? 12 : 13 }}>
            {title}
          </Text>
        </Space>

        <div style={{ marginInlineStart: "auto" }}>{extra}</div>
      </div>

      {/* Value */}
      <div style={{ marginTop: compact ? 6 : 10 }}>
        {compact ? (
          <Text style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>
            {value}
          </Text>
        ) : (
          <Statistic
            value={value}
            valueStyle={{ fontSize: 34, lineHeight: 1.15 }}
          />
        )}
      </div>

      {/* Progress / footer */}
      <div style={{ marginTop: compact ? 8 : 10 }}>
        {typeof progress === "number" ? (
          <Progress
            percent={progress}
            showInfo={false}
            size={compact ? "small" : "default"}
          />
        ) : null}

        {footer ? (
          <Text type="secondary" style={{ fontSize: compact ? 11 : 12 }}>
            {footer}
          </Text>
        ) : null}
      </div>
    </Card>
  );
}

/* ---------------- page ---------------- */

export default function DashboardPage() {
  const router = useRouter();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [workspace, setWorkspace] = useState(null);
  const [stats, setStats] = useState(null);
  const [myCases, setMyCases] = useState([]);
  const [activity, setActivity] = useState([]);
  const [userMap, setUserMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const lastToastRef = useRef(0);

  const displayUser = (userId) => {
    if (!userId) return "unknown";
    return userMap?.[userId] || shortId(userId);
  };

  async function loadAll({ silent = false } = {}) {
    try {
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      const ws = await getActiveWorkspace();
      setWorkspace(ws);

      if (!ws?.orgId) {
        setStats(null);
        setMyCases([]);
        setActivity([]);
        setUserMap({});
        return;
      }

      const [s, a] = await Promise.all([
        getDashboardStats(ws.orgId),
        getRecentActivity(ws.orgId), // ✅ must include cases -> queues join
      ]);

      setStats(s);
      setActivity(a);

      // Names map
      try {
        const members = await getOrgMembers(ws.orgId);
        const map = {};
        for (const m of members)
          map[m.user_id] = m.full_name || m.email || null;
        setUserMap(map);
      } catch {
        setUserMap({});
      }

      if (user?.id) {
        const mine = await getMyOpenCases(ws.orgId, user.id); // ✅ must include queues join
        setMyCases(mine);
      } else {
        setMyCases([]);
      }

      setLastUpdated(new Date());
    } catch (e) {
      message.error(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel("dashboard-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "case_activities" },
        () => {
          loadAll({ silent: true });

          const now = Date.now();
          if (now - lastToastRef.current > 8000) {
            lastToastRef.current = now;
            message.success({ content: "Live update received", duration: 1.2 });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusChips = useMemo(() => {
    const map = stats?.byStatus || {};
    const entries = Object.entries(map);
    const order = [
      "new",
      "in_progress",
      "waiting_customer",
      "resolved",
      "closed",
    ];
    entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    return entries;
  }, [stats]);

  const total = stats?.total || 0;
  const openCount = stats?.openCount || 0;
  const urgentOpenCount = stats?.urgentOpenCount || 0;
  const newTodayCount = stats?.newTodayCount || 0;
  const resolvedThisWeekCount = stats?.resolvedThisWeekCount || 0;

  const urgentShare = openCount
    ? Math.round((urgentOpenCount / openCount) * 100)
    : 0;
  const openShare = total ? Math.round((openCount / total) * 100) : 0;

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      {/* Header */}
      <Card
        loading={loading}
        style={{
          borderRadius: 16,
          background:
            "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
        }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space orientation="vertical" size={2}>
              <Title level={3} style={{ margin: 0 }}>
                {greeting()},{" "}
                <span style={{ opacity: 0.9 }}>
                  {workspace?.orgName || "CaseFlow"}
                </span>
              </Title>

              <Space wrap size={8} align="center">
                {workspace?.orgName ? (
<Tag color="blue" style={tagBaseStyle}>
  <TagIcon>
    <Image
      src="/caseflow-icon-512.png"
      alt="CaseFlow"
      width={14}
      height={14}
      style={{ borderRadius: 4 }}
    />
  </TagIcon>
  Workspace: {workspace.orgName}
</Tag>
                ) : (
                  <Tag style={tagBaseStyle}>Workspace: none</Tag>
                )}

                {workspace?.role ? (
                  <Tag color="geekblue" style={tagBaseStyle}>
                    Role: {workspace.role}
                  </Tag>
                ) : null}

                <Tag color="green" style={tagBaseStyle}>
                  <TagIcon>
                    <WifiOutlined style={{ fontSize: 12 }} />
                  </TagIcon>
                  Realtime
                </Tag>

                <Text type="secondary" style={{ fontSize: 12 }}>
                  {lastUpdated
                    ? `Updated ${lastUpdated.toLocaleTimeString()}`
                    : "—"}
                </Text>
              </Space>
            </Space>
          </Col>

          <Col>
            <Space wrap>
              <Tooltip title="Refresh dashboard data">
                <Button
                  icon={<ReloadOutlined />}
                  loading={refreshing}
                  onClick={() => loadAll({ silent: true })}
                >
                  Refresh
                </Button>
              </Tooltip>

              <Button
                type="primary"
                icon={<InboxOutlined />}
                onClick={() => router.push("/cases")}
              >
                Go to Cases
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* KPI Cards */}
      <Row gutter={[12, 12]} align="stretch">
        <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
          <KpiCard
            loading={loading}
            compact={isMobile}
            title="Open"
            icon={<ClockCircleOutlined />}
            value={openCount}
            extra={
              <Tooltip title="Share of open cases out of all cases in the workspace">
                <Tag
                  style={{
                    ...tagBaseStyle,
                    height: 24,
                    lineHeight: "24px",
                    paddingInline: 8,
                  }}
                >
                  {openShare}%
                </Tag>
              </Tooltip>
            }
            progress={openShare}
            footer={
              isMobile ? "Not closed" : "Not closed • quick workload indicator"
            }
          />
        </Col>

        <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
          <KpiCard
            loading={loading}
            compact={isMobile}
            title="New today"
            icon={<ThunderboltOutlined />}
            value={newTodayCount}
            extra={
              <Tag
                color="blue"
                style={{
                  ...tagBaseStyle,
                  height: 24,
                  lineHeight: "24px",
                  paddingInline: 8,
                }}
              >
                <TagIcon>
                  <ArrowUpOutlined style={{ fontSize: 12 }} />
                </TagIcon>
                live
              </Tag>
            }
            footer={
              isMobile
                ? "Since 00:00"
                : "Created since 00:00 • triage queue candidate"
            }
          />
        </Col>

        <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
          <KpiCard
            loading={loading}
            compact={isMobile}
            title="Resolved"
            icon={<ArrowRightOutlined />}
            value={resolvedThisWeekCount}
            footer={
              isMobile
                ? "This week"
                : "Simple weekly throughput • good for demos"
            }
          />
        </Col>

        <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
          <KpiCard
            loading={loading}
            compact={isMobile}
            title="Urgent open"
            icon={<FireOutlined />}
            value={urgentOpenCount}
            extra={
              <Tooltip title="Urgent cases as a % of open cases">
                <Tag
                  color={urgentShare >= 20 ? "red" : "gold"}
                  style={{
                    ...tagBaseStyle,
                    height: 24,
                    lineHeight: "24px",
                    paddingInline: 8,
                  }}
                >
                  {urgentShare}%
                </Tag>
              </Tooltip>
            }
            progress={urgentShare}
            footer={
              isMobile
                ? "Priority: urgent"
                : "Priority = urgent • escalation signal"
            }
          />
        </Col>
      </Row>

      {/* Status distribution */}
      <Card
        loading={loading}
        title={
          <Space size={8} align="center">
            <span>Status distribution</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({total} total)
            </Text>
          </Space>
        }
        style={{ borderRadius: 16 }}
      >
        {statusChips.length ? (
          <Space wrap size={10} align="center">
            {statusChips.map(([k, v]) => {
              const sm = getStatusMeta(k);
              return (
                <Badge
                  key={k}
                  count={v}
                  overflowCount={999}
                  style={{ backgroundColor: "#1677ff" }}
                >
                  <Tag
                    color={sm.color}
                    style={{ ...tagBaseStyle, marginInlineEnd: 8 }}
                  >
                    <TagIcon>
                      {sm.Icon ? <sm.Icon style={{ fontSize: 12 }} /> : null}
                    </TagIcon>
                    {sm.label}
                  </Tag>
                </Badge>
              );
            })}
          </Space>
        ) : (
          <Empty description="No data yet" />
        )}
      </Card>

      {/* Two columns */}
      <Row gutter={[12, 12]}>
        {/* My Work */}
        <Col xs={24} lg={12}>
          <Card
            loading={loading}
            title="My work"
            extra={
              <Button
                type="link"
                onClick={() => router.push("/cases")}
                style={{ padding: 0 }}
              >
                View all →
              </Button>
            }
            style={{ borderRadius: 16 }}
          >
            {myCases.length ? (
              <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                {myCases.map((c) => {
                  const sm = getStatusMeta(c.status);
                  const pm = getPriorityMeta(c.priority);

                  const queueName = c?.queues?.name || "No queue";
                  const queueIsDefault = !!c?.queues?.is_default;

                  const isOpen = [
                    "new",
                    "in_progress",
                    "waiting_customer",
                  ].includes(c.status);

                  const accentColor = isOpen
                    ? "var(--ant-color-primary, #1677ff)"
                    : "transparent";

                  const cardBg = isOpen
                    ? "linear-gradient(90deg, rgba(22,119,255,0.06), rgba(22,119,255,0.00) 40%)"
                    : "rgba(255,255,255,0.015)";

                  return (
                    <Card
                      key={c.id}
                      size="small"
                      hoverable
                      style={{
                        borderRadius: 14,
                        position: "relative",
                        overflow: "hidden",
                        background: cardBg,
                      }}
                      styles={{ body: { padding: 12 } }}
                      onClick={() => router.push(`/cases/${c.id}`)}
                    >
                      {/* Accent bar (clipped) */}
                      <div
                        style={{
                          position: "absolute",
                          insetBlock: 0,
                          insetInlineStart: 0,
                          width: 3,
                          background: accentColor,
                          borderTopLeftRadius: 14,
                          borderBottomLeftRadius: 14,
                          opacity: isOpen ? 1 : 0,
                          pointerEvents: "none",
                        }}
                      />

                      <Row
                        justify="space-between"
                        align="top"
                        gutter={[10, 10]}
                      >
                        {/* LEFT */}
                        <Col flex="auto" style={{ minWidth: 0 }}>
                          <Space
                            orientation="vertical"
                            size={6}
                            style={{ width: "100%" }}
                          >
                            {/* Title + CaseKey */}
                            <Space
                              size={10}
                              align="baseline"
                              wrap
                              style={{ width: "100%" }}
                            >
                              <Text strong style={{ fontSize: 14 }}>
                                {c.title || "Untitled"}
                              </Text>

                              <Text
                                type="secondary"
                                style={{
                                  fontSize: 12,
                                  fontFamily:
                                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                                }}
                              >
                                {caseKey(c.id)}
                              </Text>
                            </Space>

                            {/* Tags row */}
                            <Space wrap size={8} align="center">
                              <StatusTag meta={sm} />
                              <PriorityTag meta={pm} />
                              <QueueTag
                                name={queueName}
                                isDefault={queueIsDefault}
                                
                              />
                            </Space>
                          </Space>
                        </Col>

                        {/* RIGHT */}
                        <Col>
                          <Space direction="vertical" size={6} align="end">
                            <Text
                              type="secondary"
                              style={{ fontSize: 12, whiteSpace: "nowrap" }}
                            >
                              Created {timeAgo(c.created_at)}
                            </Text>

                            <Space size={10} align="center">
                              <Badge
                                status={isOpen ? "processing" : "default"}
                              />
                              <Text type="secondary">
                                {isOpen ? "Open" : "Closed"}
                              </Text>
                            </Space>

                            <Tag
                              color="geekblue"
                              style={{
                                ...tagBaseStyle,
                                height: 24,
                                lineHeight: "24px",
                              }}
                            >
                              Assigned
                            </Tag>
                          </Space>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}
              </Space>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space orientation="vertical" size={2}>
                    <Text>No assigned open cases</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tip: add “Assign” action next
                    </Text>
                  </Space>
                }
              />
            )}
          </Card>
        </Col>

        {/* Live activity */}
        <Col xs={24} lg={12}>
          <Card
            loading={loading}
            title={
              <Space size={8} align="center">
                <span>Live activity</span>
                <Tag color="green" style={tagBaseStyle}>
                  <TagIcon>
                    <WifiOutlined style={{ fontSize: 12 }} />
                  </TagIcon>
                  realtime
                </Tag>
              </Space>
            }
            style={{ borderRadius: 16 }}
          >
            {activity.length ? (
              <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                {activity.map((a) => {
                  const am = getActivityMeta(a.type);
                  const Accent = presetColorVar(am.color, 6);

                  const queueName = a?.cases?.queues?.name || "No queue";
                  const queueIsDefault = !!a?.cases?.queues?.is_default;

                  return (
                    <Card
                      key={a.id}
                      size="small"
                      hoverable
                      style={{
                        borderRadius: 14,
                        position: "relative",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.06)",
                        background: `linear-gradient(135deg, ${activityBg(
                          am.color
                        )}, rgba(0,0,0,0))`,
                      }}
                      onClick={() => router.push(`/cases/${a.case_id}`)}
                    >
                      <div
                        style={{
                          position: "absolute",
                          insetInlineStart: 0,
                          top: 0,
                          bottom: 0,
                          width: 4,
                          background: Accent,
                          opacity: 0.95,
                        }}
                      />

                      <Space
                        orientation="vertical"
                        size={8}
                        style={{ width: "100%", paddingInlineStart: 8 }}
                      >
                        <Row
                          justify="space-between"
                          align="middle"
                          gutter={[8, 8]}
                        >
                          <Col flex="auto" style={{ minWidth: 0 }}>
                            <Space wrap size={8} align="center">
                              <Tag color={am.color} style={tagBaseStyle}>
                                <TagIcon>
                                  {am.icon ? (
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        lineHeight: 0,
                                      }}
                                    >
                                      {am.icon}
                                    </span>
                                  ) : null}
                                </TagIcon>
                                {am.label}
                              </Tag>

                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {displayUser(a.created_by)}
                              </Text>

                              <Tag
                                color="default"
                                style={{
                                  ...tagBaseStyle,
                                  fontFamily:
                                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                                }}
                              >
                                {caseKey(a.case_id)}
                              </Tag>

                              <QueueTag
                              
                                name={queueName}
                                isDefault={queueIsDefault}
                              />
                            </Space>
                          </Col>

                          <Col>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {timeAgo(a.created_at)}
                            </Text>
                          </Col>
                        </Row>

                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.35,
                            padding: "8px 10px",
                            borderRadius: 12,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <Text>{a.body || "—"}</Text>
                        </div>

                        <Divider style={{ margin: "6px 0" }} />

                        <Space
                          style={{
                            justifyContent: "space-between",
                            width: "100%",
                            marginTop: 2,
                          }}
                        >
                          {renderActivityChange({ a, displayUser }) || <span />}

                          <Button
                            type="link"
                            style={{ padding: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/cases/${a.case_id}`);
                            }}
                          >
                            Open →
                          </Button>
                        </Space>
                      </Space>
                    </Card>
                  );
                })}
              </Space>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space orientation="vertical" size={2}>
                    <Text>No recent activity</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Add a note or change a status to see it here
                    </Text>
                  </Space>
                }
              />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

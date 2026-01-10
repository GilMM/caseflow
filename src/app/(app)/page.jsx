"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

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
      <Space size={6} wrap>
        <Tag
          color={fromM.color}
          icon={fromM.Icon ? <fromM.Icon /> : null}
          style={{ margin: 0 }}
        >
          {fromM.label}
        </Tag>
        {Arrow}
        <Tag
          color={toM.color}
          icon={toM.Icon ? <toM.Icon /> : null}
          style={{ margin: 0 }}
        >
          {toM.label}
        </Tag>
      </Space>
    );
  }

  // PRIORITY
  if ((t === "priority_change" || t === "priority") && meta?.from && meta?.to) {
    const fromM = getPriorityMeta(meta.from);
    const toM = getPriorityMeta(meta.to);

    return (
      <Space size={6} wrap>
        <Tag
          color={fromM.color}
          icon={fromM.Icon ? <fromM.Icon /> : null}
          style={{ margin: 0 }}
        >
          {fromM.label}
        </Tag>
        {Arrow}
        <Tag
          color={toM.color}
          icon={toM.Icon ? <toM.Icon /> : null}
          style={{ margin: 0 }}
        >
          {toM.label}
        </Tag>
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

    if (!fromU && !toU) return null;

    return (
      <Space size={6} wrap>
        {fromU ? (
          <Tag style={{ margin: 0 }}>{displayUser(fromU)}</Tag>
        ) : (
          <Tag style={{ margin: 0 }}>Unassigned</Tag>
        )}
        {Arrow}
        {toU ? (
          <Tag color="cyan" style={{ margin: 0 }}>
            {displayUser(toU)}
          </Tag>
        ) : (
          <Tag style={{ margin: 0 }}>Unassigned</Tag>
        )}
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
      style={{
        borderRadius: 16,
        width: "100%",
      }}
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
          <Statistic value={value} valueStyle={{ fontSize: 34, lineHeight: 1.15 }} />
        )}
      </div>

      {/* Progress / footer */}
      <div style={{ marginTop: compact ? 8 : 10 }}>
        {typeof progress === "number" ? (
          <Progress percent={progress} showInfo={false} size={compact ? "small" : "default"} />
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
        getRecentActivity(ws.orgId),
      ]);

      setStats(s);
      setActivity(a);

      // Names map
      try {
        const members = await getOrgMembers(ws.orgId);
        const map = {};
        for (const m of members) map[m.user_id] = m.full_name || m.email || null;
        setUserMap(map);
      } catch {
        setUserMap({});
      }

      if (user?.id) {
        const mine = await getMyOpenCases(ws.orgId, user.id);
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
    const order = ["new", "in_progress", "waiting_customer", "resolved", "closed"];
    entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    return entries;
  }, [stats]);

  const total = stats?.total || 0;
  const openCount = stats?.openCount || 0;
  const urgentOpenCount = stats?.urgentOpenCount || 0;
  const newTodayCount = stats?.newTodayCount || 0;
  const resolvedThisWeekCount = stats?.resolvedThisWeekCount || 0;

  const urgentShare = openCount ? Math.round((urgentOpenCount / openCount) * 100) : 0;
  const openShare = total ? Math.round((openCount / total) * 100) : 0;

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      {/* Header */}
      <Card
        loading={loading}
        style={{
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
        }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space orientation="vertical" size={2}>
              <Title level={3} style={{ margin: 0 }}>
                {greeting()},{" "}
                <span style={{ opacity: 0.9 }}>{workspace?.orgName || "CaseFlow"}</span>
              </Title>
              <Space wrap size={8}>
                {workspace?.orgName ? (
                  <Tag color="blue">Workspace: {workspace.orgName}</Tag>
                ) : (
                  <Tag>Workspace: none</Tag>
                )}
                {workspace?.role ? <Tag color="geekblue">Role: {workspace.role}</Tag> : null}
                <Tag color="green" icon={<WifiOutlined />}>
                  Realtime
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "—"}
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
              <Button type="primary" icon={<InboxOutlined />} onClick={() => router.push("/cases")}>
                Go to Cases
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* KPI Cards
          ✅ Mobile: 2x2 (xs=12)
          ✅ Desktop: 4 in a row (lg=6)
      */}
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
                <Tag style={{ margin: 0 }}>{openShare}%</Tag>
              </Tooltip>
            }
            progress={openShare}
            footer={isMobile ? "Not closed" : "Not closed • quick workload indicator"}
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
              <Tag color="blue" icon={<ArrowUpOutlined />} style={{ margin: 0 }}>
                live
              </Tag>
            }
            footer={isMobile ? "Since 00:00" : "Created since 00:00 • triage queue candidate"}
          />
        </Col>

        <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
          <KpiCard
            loading={loading}
            compact={isMobile}
            title="Resolved"
            icon={<ArrowRightOutlined />}
            value={resolvedThisWeekCount}
            footer={isMobile ? "This week" : "Simple weekly throughput • good for demos"}
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
                <Tag color={urgentShare >= 20 ? "red" : "gold"} style={{ margin: 0 }}>
                  {urgentShare}%
                </Tag>
              </Tooltip>
            }
            progress={urgentShare}
            footer={isMobile ? "Priority: urgent" : "Priority = urgent • escalation signal"}
          />
        </Col>
      </Row>

      {/* Status distribution */}
      <Card
        loading={loading}
        title={
          <Space size={8}>
            <span>Status distribution</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({total} total)
            </Text>
          </Space>
        }
        style={{ borderRadius: 16 }}
      >
        {statusChips.length ? (
          <Space wrap size={10}>
            {statusChips.map(([k, v]) => {
              const sm = getStatusMeta(k);
              return (
                <Badge key={k} count={v} overflowCount={999} style={{ backgroundColor: "#1677ff" }}>
                  <Tag
                    color={sm.color}
                    icon={sm.Icon ? <sm.Icon /> : null}
                    style={{ marginInlineEnd: 8 }}
                  >
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
              <Button type="link" onClick={() => router.push("/cases")} style={{ padding: 0 }}>
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

                  return (
                    <Card
                      key={c.id}
                      size="small"
                      hoverable
                      style={{ borderRadius: 14 }}
                      onClick={() => router.push(`/cases/${c.id}`)}
                    >
                      <Row justify="space-between" align="top" gutter={[10, 10]}>
                        <Col flex="auto">
                          <Space orientation="vertical" size={4} style={{ width: "100%" }}>
                            <Space wrap size={8}>
                              <Text strong style={{ fontSize: 14 }}>
                                {c.title}
                              </Text>

                              <Tag color={sm.color} icon={sm.Icon ? <sm.Icon /> : null}>
                                {sm.label}
                              </Tag>

                              <Tag color={pm.color} icon={pm.Icon ? <pm.Icon /> : null}>
                                {pm.label}
                              </Tag>
                            </Space>

                            <Space wrap size={10}>
                              <Text
                                type="secondary"
                                style={{
                                  fontSize: 12,
                                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                }}
                              >
                                {caseKey(c.id)}
                              </Text>

                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Created {timeAgo(c.created_at)}
                              </Text>
                            </Space>
                          </Space>
                        </Col>

                        <Col>
                          <Tag color="geekblue">Assigned</Tag>
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
              <Space size={8}>
                <span>Live activity</span>
                <Tag color="green" icon={<WifiOutlined />}>
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
                        background: `linear-gradient(135deg, ${activityBg(am.color)}, rgba(0,0,0,0))`,
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

                      <Space orientation="vertical" size={8} style={{ width: "100%", paddingInlineStart: 8 }}>
                        <Row justify="space-between" align="middle" gutter={[8, 8]}>
                          <Col flex="auto" style={{ minWidth: 0 }}>
                            <Space wrap size={8}>
                              <Tag
                                color={am.color}
                                icon={am.icon ? am.icon : null}
                                style={{ margin: 0 }}
                              >
                                {am.label}
                              </Tag>

                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {displayUser(a.created_by)}
                              </Text>

                              <Tag
                                style={{
                                  margin: 0,
                                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                }}
                                color="default"
                              >
                                {caseKey(a.case_id)}
                              </Tag>
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

                        {(() => {
                          const change = renderActivityChange({ a, displayUser });

                          return (
                            <Space style={{ justifyContent: "space-between", width: "100%", marginTop: 2 }}>
                              {change ? change : <span />}

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
                          );
                        })()}
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

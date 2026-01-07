"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  getActiveWorkspace,
  getDashboardStats,
  getMyOpenCases,
  getRecentActivity,
} from "@/lib/db";

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

const statusColor = (s) =>
  ({
    new: "blue",
    in_progress: "gold",
    waiting_customer: "purple",
    resolved: "green",
    closed: "default",
  }[s] || "default");

const priorityColor = (p) =>
  ({
    urgent: "red",
    high: "volcano",
    normal: "default",
    low: "cyan",
  }[p] || "default");

// tiny helper for pretty “live” timestamps
function timeAgo(iso) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();

  const [workspace, setWorkspace] = useState(null);
  const [stats, setStats] = useState(null);
  const [myCases, setMyCases] = useState([]);
  const [activity, setActivity] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const lastToastRef = useRef(0);

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
        return;
      }

      const [s, a] = await Promise.all([
        getDashboardStats(ws.orgId),
        getRecentActivity(ws.orgId),
      ]);

      setStats(s);
      setActivity(a);

      if (user?.id) {
        const mine = await getMyOpenCases(ws.orgId, user.id);
        setMyCases(mine);
      } else {
        setMyCases([]);
      }

      setLastUpdated(new Date());
    } catch (e) {
      message.error(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();

    // Realtime “alive” feel: when activity inserted, refresh quietly
    const channel = supabase
      .channel("dashboard-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "case_activities" },
        () => {
          loadAll({ silent: true });

          // tiny UX: don’t spam toast
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

  // nice little “health” meters
  const urgentShare = openCount ? Math.round((urgentOpenCount / openCount) * 100) : 0;
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
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} style={{ borderRadius: 16 }}>
            <Space orientation="vertical" size={6} style={{ width: "100%" }}>
              <Statistic
                title={
                  <Space size={6}>
                    <ClockCircleOutlined />
                    <span>Open</span>
                    <Tooltip title="Share of open cases out of all cases in the workspace">
                      <Tag style={{ marginInlineStart: 6 }}>{openShare}%</Tag>
                    </Tooltip>
                  </Space>
                }
                value={openCount}
              />
              <Progress percent={openShare} showInfo={false} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Not closed • quick workload indicator
              </Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} style={{ borderRadius: 16 }}>
            <Space orientation="vertical" size={6} style={{ width: "100%" }}>
              <Statistic
                title={
                  <Space size={6}>
                    <ThunderboltOutlined />
                    <span>New today</span>
                    <Tag color="blue" icon={<ArrowUpOutlined />}>
                      live
                    </Tag>
                  </Space>
                }
                value={newTodayCount}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Created since 00:00 • triage queue candidate
              </Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} style={{ borderRadius: 16 }}>
            <Space orientation="vertical" size={6} style={{ width: "100%" }}>
              <Statistic
                title={
                  <Space size={6}>
                    <ArrowRightOutlined />
                    <span>Resolved (week)</span>
                  </Space>
                }
                value={resolvedThisWeekCount}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Simple weekly throughput • good for demos
              </Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} style={{ borderRadius: 16 }}>
            <Space orientation="vertical" size={6} style={{ width: "100%" }}>
              <Statistic
                title={
                  <Space size={6}>
                    <FireOutlined />
                    <span>Urgent open</span>
                    <Tooltip title="Urgent cases as a % of open cases">
                      <Tag color={urgentShare >= 20 ? "red" : "gold"}>{urgentShare}%</Tag>
                    </Tooltip>
                  </Space>
                }
                value={urgentOpenCount}
              />
              <Progress
                percent={urgentShare}
                showInfo={false}
                status={urgentShare >= 20 ? "exception" : "active"}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Priority = urgent • escalation signal
              </Text>
            </Space>
          </Card>
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
            {statusChips.map(([k, v]) => (
              <Badge key={k} count={v} overflowCount={999} style={{ backgroundColor: "#1677ff" }}>
                <Tag color={statusColor(k)} style={{ marginInlineEnd: 8 }}>
                  {k}
                </Tag>
              </Badge>
            ))}
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
                {myCases.map((c) => (
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
                            <Text strong style={{ fontSize: 14 }}>{c.title}</Text>
                            <Tag color={statusColor(c.status)}>{c.status}</Tag>
                            <Tag color={priorityColor(c.priority)}>{c.priority}</Tag>
                          </Space>

                          <Space wrap size={10}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              ID: {String(c.id).slice(0, 8)}…
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
                ))}
              </Space>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space orientation="vertical" size={2}>
                    <Text>No assigned open cases</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tip: add “Assign” action next (we’ll do it)
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
                <Tag color="green" icon={<WifiOutlined />}>realtime</Tag>
              </Space>
            }
            style={{ borderRadius: 16 }}
          >
            {activity.length ? (
              <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                {activity.map((a) => (
                  <Card
                    key={a.id}
                    size="small"
                    hoverable
                    style={{ borderRadius: 14 }}
                    onClick={() => router.push(`/cases/${a.case_id}`)}
                  >
                    <Space orientation="vertical" size={6} style={{ width: "100%" }}>
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Space wrap size={8}>
                            <Tag>{a.type}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {String(a.created_by).slice(0, 8)}…
                            </Text>
                          </Space>
                        </Col>
                        <Col>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {timeAgo(a.created_at)}
                          </Text>
                        </Col>
                      </Row>

                      <Text style={{ whiteSpace: "pre-wrap" }}>{a.body || "—"}</Text>

                      <Divider style={{ margin: "6px 0" }} />

                      <Space style={{ justifyContent: "space-between", width: "100%" }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Case: {String(a.case_id).slice(0, 8)}…
                        </Text>
                        <Button type="link" style={{ padding: 0 }} onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/cases/${a.case_id}`);
                        }}>
                          Open →
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                ))}
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

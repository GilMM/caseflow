"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";

import {
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
  Spin,
  Grid,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  InboxOutlined,
  SearchOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

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

function shortId(id) {
  if (!id) return "—";
  return `${String(id).slice(0, 8)}…`;
}

function timeAgo(iso) {
  if (!iso) return "—";
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

export default function CasesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [workspace, setWorkspace] = useState(null);

  const [queues, setQueues] = useState([]);
  const [queueId, setQueueId] = useState(searchParams.get("queue") || "all");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const lastToastRef = useRef(0);

  // keep state in sync with URL (?queue=...)
  useEffect(() => {
    setQueueId(searchParams.get("queue") || "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function loadAll({ silent = false } = {}) {
    try {
      setError("");
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const ws = await getActiveWorkspace();
      setWorkspace(ws);

      if (!ws?.orgId) {
        setQueues([]);
        setRows([]);
        return;
      }

      // 1) load queues for filter dropdown
      const { data: qData, error: qErr } = await supabase
        .from("queues")
        .select("id,name,is_default")
        .eq("org_id", ws.orgId)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (qErr) throw qErr;
      setQueues(qData || []);

      // 2) load cases (optionally filtered by queue_id)
      let query = supabase
        .from("cases")
        .select("id,title,status,priority,created_at,assigned_to,queue_id")
        .eq("org_id", ws.orgId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (queueId && queueId !== "all") {
        query = query.eq("queue_id", queueId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRows(data || []);

      const now = Date.now();
      if (silent && now - lastToastRef.current > 7000) {
        lastToastRef.current = now;
        message.success({ content: "Cases refreshed", duration: 1.1 });
      }
    } catch (e) {
      setError(e?.message || "Failed to load cases");
      message.error(e?.message || "Failed to load cases");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // reload when queueId changes (URL or select) so list stays synced
  useEffect(() => {
    loadAll({ silent: false });

    const channel = supabase
      .channel("cases-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "case_activities" },
        () => loadAll({ silent: true })
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueId]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (rows || []).filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (priority !== "all" && c.priority !== priority) return false;
      if (!qq) return true;
      return (
        (c.title || "").toLowerCase().includes(qq) ||
        String(c.id || "").toLowerCase().includes(qq)
      );
    });
  }, [rows, q, status, priority]);

  const total = rows.length;
  const openCount = rows.filter((r) => r.status !== "closed").length;
  const urgentOpen = rows.filter(
    (r) => r.status !== "closed" && r.priority === "urgent"
  ).length;

  function setQueueFilter(nextQueueId) {
    setQueueId(nextQueueId);

    const params = new URLSearchParams(searchParams.toString());
    if (!nextQueueId || nextQueueId === "all") params.delete("queue");
    else params.set("queue", nextQueueId);

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const headerRight = (
    <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
      <Tooltip title="Refresh cases list">
        <Button
          icon={<ReloadOutlined />}
          loading={refreshing}
          onClick={() => loadAll({ silent: true })}
          block={isMobile}
        >
          {isMobile ? "Refresh" : "Refresh"}
        </Button>
      </Tooltip>

      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => router.push("/cases/new")}
        block={isMobile}
      >
        New case
      </Button>
    </Space>
  );

  if (loading) {
    return (
      <div style={{ height: "60vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      {/* Header */}
      <Card
        style={{
          borderRadius: 16,
          background:
            "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
        }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col xs={24} md="auto">
            <Space orientation="vertical" size={2} style={{ width: "100%" }}>
              <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                Cases
              </Title>
              <Space wrap size={8}>
                {workspace?.orgName ? (
                  <Tag color="blue">Workspace: {workspace.orgName}</Tag>
                ) : (
                  <Tag>Workspace: none</Tag>
                )}
                <Tag icon={<InboxOutlined />}>List</Tag>
                {queueId !== "all" ? <Tag color="gold">Queue filtered</Tag> : null}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {filtered.length} shown • {total} total
                </Text>
              </Space>
            </Space>
          </Col>

          <Col xs={24} md="auto">
            {headerRight}
          </Col>
        </Row>
      </Card>

      {/* KPIs + Filters */}
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={10}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={8}>
              <Card style={{ borderRadius: 16 }}>
                <Space orientation="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Total
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: 800 }}>{total}</Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card style={{ borderRadius: 16 }}>
                <Space orientation="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Open
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: 800 }}>
                    {openCount}
                  </Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card style={{ borderRadius: 16 }}>
                <Space orientation="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Urgent open
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: 800 }}>
                    {urgentOpen}
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Col>

        <Col xs={24} lg={14}>
          <Card style={{ borderRadius: 16 }}>
            <Row gutter={[10, 10]} align="middle">
              <Col xs={24} md={8}>
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by title or ID…"
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </Col>

              {/* במובייל: כל Select שורה מלאה כדי לא להידחס */}
              <Col xs={24} sm={12} md={5}>
                <Select
                  value={queueId}
                  onChange={setQueueFilter}
                  style={{ width: "100%" }}
                  options={[
                    { value: "all", label: "All queues" },
                    ...(queues || []).map((qq) => ({
                      value: qq.id,
                      label: qq.is_default ? `${qq.name} (Default)` : qq.name,
                    })),
                  ]}
                />
              </Col>

              <Col xs={24} sm={12} md={5}>
                <Select
                  value={status}
                  onChange={setStatus}
                  style={{ width: "100%" }}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "new", label: "new" },
                    { value: "in_progress", label: "in_progress" },
                    { value: "waiting_customer", label: "waiting_customer" },
                    { value: "resolved", label: "resolved" },
                    { value: "closed", label: "closed" },
                  ]}
                />
              </Col>

              <Col xs={24} sm={12} md={5}>
                <Select
                  value={priority}
                  onChange={setPriority}
                  style={{ width: "100%" }}
                  options={[
                    { value: "all", label: "All priorities" },
                    { value: "urgent", label: "urgent" },
                    { value: "high", label: "high" },
                    { value: "normal", label: "normal" },
                    { value: "low", label: "low" },
                  ]}
                />
              </Col>

              <Col xs={24}>
                <Space
                  wrap
                  size={8}
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <Button
                    onClick={() => {
                      setQ("");
                      setStatus("all");
                      setPriority("all");
                      setQueueFilter("all"); // also clears URL
                    }}
                  >
                    Clear filters
                  </Button>
                  {!isMobile && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tip: click a case card to open details
                    </Text>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {error ? (
        <Card style={{ borderRadius: 16, borderColor: "#ffccc7" }}>
          <Text style={{ color: "#cf1322" }}>{error}</Text>
        </Card>
      ) : null}

      {/* List */}
      <Card
        title="Latest cases"
        style={{ borderRadius: 16 }}
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            Showing {filtered.length}
          </Text>
        }
      >
        {!workspace?.orgId ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space orientation="vertical" size={2}>
                <Text>No workspace</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Create org + membership to start seeing cases.
                </Text>
              </Space>
            }
          />
        ) : filtered.length ? (
          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            {filtered.map((c) => (
              <Card
                key={c.id}
                size="small"
                hoverable
                style={{
                  borderRadius: 14,
                  cursor: "pointer",
                }}
                bodyStyle={{
                  padding: isMobile ? 12 : 16,
                }}
                onClick={() => router.push(`/cases/${c.id}`)}
              >
                <Row justify="space-between" align="top" gutter={[10, 10]}>
                  <Col flex="auto">
                    <Space
                      orientation="vertical"
                      size={6}
                      style={{ width: "100%" }}
                    >
                      <Space
                        wrap
                        size={8}
                        style={{ width: "100%", justifyContent: "space-between" }}
                      >
                        <Text
                          strong
                          style={{
                            fontSize: 14,
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.title || "(untitled)"}
                        </Text>

                        <Badge
                          status={
                            c.status === "closed" ? "default" : "processing"
                          }
                          text={c.status === "closed" ? "Closed" : "Open"}
                        />
                      </Space>

                      <Space wrap size={8}>
                        <Tag color={statusColor(c.status)}>{c.status}</Tag>
                        <Tag color={priorityColor(c.priority)}>{c.priority}</Tag>
                      </Space>

                      <Space wrap size={10}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ID: {shortId(c.id)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Created {timeAgo(c.created_at)}
                        </Text>
                      </Space>
                    </Space>
                  </Col>
                </Row>

                {/* במובייל לא חייבים Divider + "Open →" כי כל הכרטיס קליקבילי */}
                {!isMobile && (
                  <>
                    <Divider style={{ margin: "10px 0" }} />
                    <Space
                      style={{ justifyContent: "space-between", width: "100%" }}
                    >
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Open in details
                      </Text>
                      <Link
                        href={`/cases/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open →
                      </Link>
                    </Space>
                  </>
                )}
              </Card>
            ))}
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space orientation="vertical" size={2}>
                <Text>No cases match your filters</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Try clearing filters or create a new case.
                </Text>
              </Space>
            }
          />
        )}
      </Card>
    </Space>
  );
}

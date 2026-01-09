"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";

import {
  App,
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  Spin,
} from "antd";
import {
  AppstoreOutlined,
  ReloadOutlined,
  SearchOutlined,
  PlusOutlined,
  StarFilled,
  InboxOutlined,
  EditOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

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

export default function QueuesPage() {
  const router = useRouter();
  // const [form] = Form.useForm();
  const [formKey, setFormKey] = useState(0);
  const [formInitials, setFormInitials] = useState({
    name: "",
    is_active: true,
    is_default: false,
  });

  const [workspace, setWorkspace] = useState(null);

  const [rows, setRows] = useState([]);
  const [tableAvailable, setTableAvailable] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [active, setActive] = useState("all"); // all / active / inactive
  const [defaultOnly, setDefaultOnly] = useState(false);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editing, setEditing] = useState(null); // queue row
  const [saving, setSaving] = useState(false);

  const lastToastRef = useRef(0);

  async function loadAll({ silent = false } = {}) {
    try {
      setError("");
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const ws = await getActiveWorkspace();
      setWorkspace(ws);

      if (!ws?.orgId) {
        setRows([]);
        return;
      }

      const res = await supabase
        .from("queues")
        .select("id,org_id,name,is_default,is_active,created_at,updated_at")
        .eq("org_id", ws.orgId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);

      if (res.error) {
        const msg = String(res.error.message || "").toLowerCase();
        const looksLikeMissing =
          msg.includes("does not exist") ||
          msg.includes("relation") ||
          msg.includes("schema cache");

        if (looksLikeMissing) {
          setTableAvailable(false);
          setRows([]);
          return;
        }
        throw res.error;
      }

      setTableAvailable(true);
      setRows(res.data || []);

      const now = Date.now();
      if (silent && now - lastToastRef.current > 7000) {
        lastToastRef.current = now;
        message.success({ content: "Queues refreshed", duration: 1.1 });
      }
    } catch (e) {
      setError(e?.message || "Failed to load queues");
      message.error(e?.message || "Failed to load queues");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (rows || []).filter((r) => {
      const isActive = (r.is_active ?? true) !== false;
      if (active === "active" && !isActive) return false;
      if (active === "inactive" && isActive) return false;

      if (defaultOnly && !r.is_default) return false;

      if (!qq) return true;

      return (
        (r.name || "").toLowerCase().includes(qq) ||
        String(r.id || "")
          .toLowerCase()
          .includes(qq)
      );
    });
  }, [rows, q, active, defaultOnly]);

  const total = rows.length;
  const activeCount = rows.filter(
    (r) => (r.is_active ?? true) !== false
  ).length;
  const defaultCount = rows.filter((r) => !!r.is_default).length;

  function openCreate() {
    setMode("create");
    setEditing(null);
    setFormInitials({
      name: "",
      is_active: true,
      is_default: rows.length === 0,
    });
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(queue) {
    setMode("edit");
    setEditing(queue);
    setFormInitials({
      name: queue.name || "",
      is_active: (queue.is_active ?? true) !== false,
      is_default: !!queue.is_default,
    });
    setFormKey((k) => k + 1);
    setModalOpen(true);
  }

  async function setDefaultQueue(queueId) {
    if (!workspace?.orgId) return;

    try {
      message.loading({ content: "Setting default…", key: "setdefault" });

      const { error: e1 } = await supabase
        .from("queues")
        .update({ is_default: false })
        .eq("org_id", workspace.orgId);

      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("queues")
        .update({ is_default: true })
        .eq("org_id", workspace.orgId)
        .eq("id", queueId);

      if (e2) throw e2;

      message.success({
        content: "Default queue updated",
        key: "setdefault",
        duration: 1.2,
      });
      await loadAll({ silent: true });
    } catch (e) {
      message.error({
        content: e?.message || "Failed to set default",
        key: "setdefault",
      });
    }
  }

  async function toggleActive(queueId, nextActive) {
    if (!workspace?.orgId) return;

    try {
      const { error } = await supabase
        .from("queues")
        .update({ is_active: nextActive })
        .eq("org_id", workspace.orgId)
        .eq("id", queueId);

      if (error) throw error;

      message.success(nextActive ? "Queue activated" : "Queue deactivated");
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || "Failed to update queue");
    }
  }

  async function onSave(values) {
    if (!workspace?.orgId) {
      message.error("No workspace selected");
      return;
    }

    const name = String(values.name || "").trim();
    const is_active = !!values.is_active;
    const is_default = !!values.is_default;

    if (!name) {
      message.error("Queue name is required");
      return;
    }

    try {
      setSaving(true);

      // If setting default -> unset defaults first (within org)
      if (is_default) {
        const { error: e1 } = await supabase
          .from("queues")
          .update({ is_default: false })
          .eq("org_id", workspace.orgId);

        if (e1) throw e1;
      }

      if (mode === "create") {
        const { data, error } = await supabase
          .from("queues")
          .insert({
            org_id: workspace.orgId,
            name,
            is_active,
            is_default,
          })
          .select("id")
          .single();

        if (error) throw error;

        message.success("Queue created");
        setModalOpen(false);
        await loadAll({ silent: true });

        // optional nice UX: if first queue created, keep user on page
        // router.push(`/queues/${data.id}`) // if you later add details page
        return;
      }

      // edit
      const { error } = await supabase
        .from("queues")
        .update({
          name,
          is_active,
          is_default,
        })
        .eq("org_id", workspace.orgId)
        .eq("id", editing.id);

      if (error) throw error;

      message.success("Queue updated");
      setModalOpen(false);
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const headerRight = (
    <Space wrap>
      <Tooltip title="Refresh queues list">
        <Button
          icon={<ReloadOutlined />}
          loading={refreshing}
          onClick={() => loadAll({ silent: true })}
        >
          Refresh
        </Button>
      </Tooltip>

      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
        New queue
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
          <Col>
            <Space orientation="vertical" size={2}>
              <Title level={3} style={{ margin: 0 }}>
                Queues
              </Title>

              <Space wrap size={8}>
                <Tag icon={<AppstoreOutlined />}>Routing</Tag>

                {workspace?.orgName ? (
                  <Tag color="blue">Workspace: {workspace.orgName}</Tag>
                ) : (
                  <Tag>Workspace: none</Tag>
                )}

                <Text type="secondary" style={{ fontSize: 12 }}>
                  {filtered.length} shown • {total} total
                </Text>
              </Space>
            </Space>
          </Col>

          <Col>{headerRight}</Col>
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
                    Active
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: 800 }}>
                    {activeCount}
                  </Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card style={{ borderRadius: 16 }}>
                <Space orientation="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Default
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: 800 }}>
                    {defaultCount}
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Col>

        <Col xs={24} lg={14}>
          <Card style={{ borderRadius: 16 }}>
            <Row gutter={[10, 10]} align="middle">
              <Col xs={24} md={10}>
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search queue by name or ID…"
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </Col>

              <Col xs={12} md={7}>
                <Select
                  value={active}
                  onChange={setActive}
                  style={{ width: "100%" }}
                  options={[
                    { value: "all", label: "All states" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
              </Col>

              <Col xs={12} md={7}>
                <Select
                  value={defaultOnly ? "default" : "all"}
                  onChange={(v) => setDefaultOnly(v === "default")}
                  style={{ width: "100%" }}
                  options={[
                    { value: "all", label: "All queues" },
                    { value: "default", label: "Default only" },
                  ]}
                />
              </Col>

              <Col xs={24}>
                <Space wrap size={8}>
                  <Button
                    onClick={() => {
                      setQ("");
                      setActive("all");
                      setDefaultOnly(false);
                    }}
                  >
                    Clear filters
                  </Button>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Default queue is used for “New Case” routing (MVP).
                  </Text>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {error ? (
        <Card style={{ borderRadius: 16, borderColor: "#ffccc7" }}>
          <Alert
            type="error"
            showIcon
            message="Couldn’t load queues"
            description={error}
          />
        </Card>
      ) : null}

      {/* List */}
      <Card
        title="Queues"
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
                  Create org + membership to start managing queues.
                </Text>
              </Space>
            }
          />
        ) : !tableAvailable ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space orientation="vertical" size={2}>
                <Text>Queues table not available</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Create the <Text code>queues</Text> table (and RLS), then this
                  page will light up.
                </Text>
              </Space>
            }
          />
        ) : filtered.length ? (
          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            {filtered.map((row) => {
              const isActive = (row.is_active ?? true) !== false;

              return (
                <Card
                  key={row.id}
                  size="small"
                  hoverable
                  style={{ borderRadius: 14 }}
                >
                  <Row justify="space-between" align="middle" gutter={[12, 12]}>
                    <Col flex="auto">
                      <Space
                        orientation="vertical"
                        size={4}
                        style={{ width: "100%" }}
                      >
                        <Space wrap size={8}>
                          <Text strong style={{ fontSize: 14 }}>
                            {row.name || "Untitled queue"}
                          </Text>

                          {row.is_default ? (
                            <Tag color="gold" icon={<StarFilled />}>
                              Default
                            </Tag>
                          ) : null}

                          <Badge
                            status={isActive ? "success" : "default"}
                            text={isActive ? "Active" : "Inactive"}
                          />
                        </Space>

                        <Space wrap size={10}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ID: {shortId(row.id)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Created {timeAgo(row.created_at)}
                          </Text>
                        </Space>
                      </Space>
                    </Col>

                    <Col>
                      <Space wrap>
                        <Tooltip title="Activate / Deactivate queue">
                          <Switch
                            checked={isActive}
                            onChange={(v) => toggleActive(row.id, v)}
                          />
                        </Tooltip>

                        {!row.is_default ? (
                          <Button onClick={() => setDefaultQueue(row.id)}>
                            Set default
                          </Button>
                        ) : (
                          <Button disabled>Default</Button>
                        )}

                        <Button
                          icon={<EditOutlined />}
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </Button>

                        <Button
                          type="primary"
                          icon={<InboxOutlined />}
                          onClick={() => router.push(`/cases?queue=${row.id}`)}
                        >
                          View cases
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Divider style={{ margin: "10px 0" }} />

                  <Space
                    style={{ justifyContent: "space-between", width: "100%" }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Next: routing rules, SLA, auto-assignment.
                    </Text>
                    <Button
                      type="link"
                      style={{ padding: 0 }}
                      onClick={() => message.info("Next: queue details page")}
                    >
                      Open →
                    </Button>
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
                <Text>No queues match your filters</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Try clearing filters or create a new queue.
                </Text>
              </Space>
            }
          />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={mode === "create" ? "New queue" : "Edit queue"}
        okText={mode === "create" ? "Create" : "Save"}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form
          key={formKey}
          layout="vertical"
          onFinish={onSave}
          initialValues={formInitials}
        >
          <Form.Item
            label="Queue name"
            name="name"
            rules={[
              { required: true, message: "Please enter a queue name" },
              { min: 2, message: "Name should be at least 2 characters" },
            ]}
          >
            <Input
              placeholder="e.g., Support, Billing, Onboarding…"
              maxLength={60}
              showCount
            />
          </Form.Item>

          <Row gutter={[12, 12]}>
            <Col span={12}>
              <Form.Item
                label="Active"
                name="is_active"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Default"
                name="is_default"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            type="info"
            showIcon
            title="Note"
            description="Setting a queue as Default will unset Default from other queues in this workspace."
          />
        </Form>
      </Modal>
    </Space>
  );
}

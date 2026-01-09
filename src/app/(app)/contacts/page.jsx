"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";

import {
  Alert,
  App,
  Avatar,
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
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  TeamOutlined,
  ReloadOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

function initials(name) {
  const s = (name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : (parts[0]?.[1] || "");
  return (a + b).toUpperCase() || "?";
}

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

export default function ContactsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [workspace, setWorkspace] = useState(null);

  const [rows, setRows] = useState([]);
  const [tableAvailable, setTableAvailable] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [active, setActive] = useState("active"); // all / active / inactive
  const [dept, setDept] = useState("all");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editing, setEditing] = useState(null);
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
        .from("contacts")
        .select(
          "id,org_id,full_name,email,phone,department,job_title,location,notes,is_active,created_at,updated_at"
        )
        .eq("org_id", ws.orgId)
        .order("is_active", { ascending: false })
        .order("full_name", { ascending: true })
        .limit(800);

      if (res.error) {
        const msg = String(res.error.message || "").toLowerCase();
        const looksMissing =
          msg.includes("does not exist") || msg.includes("relation") || msg.includes("schema cache");
        if (looksMissing) {
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
        message.success({ content: "Contacts refreshed", duration: 1.1 });
      }
    } catch (e) {
      setError(e?.message || "Failed to load contacts");
      message.error(e?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deptOptions = useMemo(() => {
    const set = new Set();
    for (const r of rows) if (r.department) set.add(r.department);
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return (rows || []).filter((r) => {
      const isActive = (r.is_active ?? true) !== false;

      if (active === "active" && !isActive) return false;
      if (active === "inactive" && isActive) return false;

      if (dept !== "all" && (r.department || "") !== dept) return false;

      if (!qq) return true;

      return (
        (r.full_name || "").toLowerCase().includes(qq) ||
        (r.email || "").toLowerCase().includes(qq) ||
        (r.phone || "").toLowerCase().includes(qq) ||
        (r.department || "").toLowerCase().includes(qq) ||
        (r.job_title || "").toLowerCase().includes(qq) ||
        (r.location || "").toLowerCase().includes(qq) ||
        String(r.id || "").toLowerCase().includes(qq)
      );
    });
  }, [rows, q, active, dept]);

  const total = rows.length;
  const activeCount = rows.filter((r) => (r.is_active ?? true) !== false).length;

  function openCreate() {
    setMode("create");
    setEditing(null);
    form.setFieldsValue({
      full_name: "",
      email: "",
      phone: "",
      department: "",
      job_title: "",
      location: "",
      is_active: true,
      notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setMode("edit");
    setEditing(row);
    form.setFieldsValue({
      full_name: row.full_name || "",
      email: row.email || "",
      phone: row.phone || "",
      department: row.department || "",
      job_title: row.job_title || "",
      location: row.location || "",
      is_active: (row.is_active ?? true) !== false,
      notes: row.notes || "",
    });
    setModalOpen(true);
  }

  async function toggleActive(contactId, nextActive) {
    if (!workspace?.orgId) return;

    try {
      const { error } = await supabase
        .from("contacts")
        .update({ is_active: nextActive })
        .eq("org_id", workspace.orgId)
        .eq("id", contactId);

      if (error) throw error;

      message.success(nextActive ? "Contact activated" : "Contact deactivated");
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || "Failed to update contact");
    }
  }

  async function onSave(values) {
    if (!workspace?.orgId) {
      message.error("No workspace selected");
      return;
    }

    const payload = {
      org_id: workspace.orgId,
      full_name: String(values.full_name || "").trim(),
      email: values.email ? String(values.email).trim() : null,
      phone: values.phone ? String(values.phone).trim() : null,
      department: values.department ? String(values.department).trim() : null,
      job_title: values.job_title ? String(values.job_title).trim() : null,
      location: values.location ? String(values.location).trim() : null,
      notes: values.notes ? String(values.notes).trim() : null,
      is_active: !!values.is_active,
    };

    if (!payload.full_name) {
      message.error("Full name is required");
      return;
    }

    try {
      setSaving(true);

      if (mode === "create") {
        const { error } = await supabase.from("contacts").insert(payload);
        if (error) throw error;

        message.success("Contact created");
        setModalOpen(false);
        await loadAll({ silent: true });
        return;
      }

      const { error } = await supabase
        .from("contacts")
        .update({
          full_name: payload.full_name,
          email: payload.email,
          phone: payload.phone,
          department: payload.department,
          job_title: payload.job_title,
          location: payload.location,
          notes: payload.notes,
          is_active: payload.is_active,
        })
        .eq("org_id", workspace.orgId)
        .eq("id", editing.id);

      if (error) throw error;

      message.success("Contact updated");
      setModalOpen(false);
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

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
          background: "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
        }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space orientation="vertical" size={2}>
              <Title level={3} style={{ margin: 0 }}>
                Contacts
              </Title>

              <Space wrap size={8}>
                <Tag icon={<TeamOutlined />}>Directory</Tag>
                {workspace?.orgName ? (
                  <Tag color="blue">Workspace: {workspace.orgName}</Tag>
                ) : (
                  <Tag>Workspace: none</Tag>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {filtered.length} shown • {total} total • {activeCount} active
                </Text>
              </Space>
            </Space>
          </Col>

          <Col>
            <Space wrap>
              <Tooltip title="Refresh contacts">
                <Button
                  icon={<ReloadOutlined />}
                  loading={refreshing}
                  onClick={() => loadAll({ silent: true })}
                >
                  Refresh
                </Button>
              </Tooltip>

              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                New contact
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {error ? (
        <Card style={{ borderRadius: 16, borderColor: "#ffccc7" }}>
          <Alert type="error" showIcon message="Couldn’t load contacts" description={error} />
        </Card>
      ) : null}

      {/* Filters */}
      <Card style={{ borderRadius: 16 }}>
        <Row gutter={[10, 10]} align="middle">
          <Col xs={24} md={10}>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, phone, department…"
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
              value={dept}
              onChange={setDept}
              style={{ width: "100%" }}
              options={deptOptions.map((d) => ({ value: d, label: d === "all" ? "All departments" : d }))}
            />
          </Col>

          <Col xs={24}>
            <Space wrap size={8}>
              <Button
                onClick={() => {
                  setQ("");
                  setActive("active");
                  setDept("all");
                }}
              >
                Clear filters
              </Button>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Contacts are internal employees. We’ll link them to cases as “Requester”.
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* List */}
      <Card title="People" style={{ borderRadius: 16 }}>
        {!workspace?.orgId ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space orientation="vertical" size={2}>
                <Text>No workspace</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Create org + membership to start managing contacts.
                </Text>
              </Space>
            }
          />
        ) : !tableAvailable ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space orientation="vertical" size={2}>
                <Text>Contacts table not available</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Create the <Text code>contacts</Text> table (and RLS), then this page will light up.
                </Text>
              </Space>
            }
          />
        ) : filtered.length ? (
          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            {filtered.map((c) => {
              const isActive = (c.is_active ?? true) !== false;

              return (
                <Card key={c.id} size="small" hoverable style={{ borderRadius: 14 }}>
                  <Row justify="space-between" align="middle" gutter={[12, 12]}>
                    <Col flex="auto">
                      <Space align="start" size={12}>
                        <Avatar>{initials(c.full_name)}</Avatar>

                        <Space orientation="vertical" size={2} style={{ width: "100%" }}>
                          <Space wrap size={8}>
                            <Text strong style={{ fontSize: 14 }}>
                              {c.full_name}
                            </Text>
                            <Badge status={isActive ? "success" : "default"} text={isActive ? "Active" : "Inactive"} />
                            {c.department ? <Tag color="geekblue">{c.department}</Tag> : null}
                            {c.job_title ? <Tag>{c.job_title}</Tag> : null}
                          </Space>

                          <Space wrap size={12}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              ID: {shortId(c.id)}
                            </Text>

                            {c.email ? (
                              <Space size={6}>
                                <MailOutlined />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {c.email}
                                </Text>
                              </Space>
                            ) : null}

                            {c.phone ? (
                              <Space size={6}>
                                <PhoneOutlined />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {c.phone}
                                </Text>
                              </Space>
                            ) : null}

                            {c.location ? (
                              <Space size={6}>
                                <EnvironmentOutlined />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {c.location}
                                </Text>
                              </Space>
                            ) : null}
                          </Space>

                          {c.notes ? (
                            <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: c.notes }}>
                              {c.notes}
                            </Text>
                          ) : null}

                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Updated {timeAgo(c.updated_at)} • Created {timeAgo(c.created_at)}
                          </Text>
                        </Space>
                      </Space>
                    </Col>

                    <Col>
                      <Space wrap>
                        <Tooltip title="Activate / Deactivate">
                          <Switch checked={isActive} onChange={(v) => toggleActive(c.id, v)} />
                        </Tooltip>

                        <Button icon={<EditOutlined />} onClick={() => openEdit(c)}>
                          Edit
                        </Button>

                        <Button
                          type="primary"
                          onClick={() => {
                            // Next step: create case with requester preselected
                            router.push(`/cases/new?requester=${c.id}`);
                          }}
                        >
                          New case
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Divider style={{ margin: "10px 0" }} />

                  <Space style={{ justifyContent: "space-between", width: "100%" }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Next: contact details page (all cases for this person).
                    </Text>
                    <Button type="link" style={{ padding: 0 }} onClick={() => message.info("Next: /contacts/[id]")}>
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
                <Text>No contacts match your filters</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Try clearing filters or create a new contact.
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
        title={mode === "create" ? "New contact" : "Edit contact"}
        okText={mode === "create" ? "Create" : "Save"}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Row gutter={[12, 12]}>
            <Col span={24}>
              <Form.Item
                label="Full name"
                name="full_name"
                rules={[{ required: true, message: "Full name is required" }]}
              >
                <Input placeholder="e.g., David Cohen" maxLength={80} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Email" name="email" rules={[{ type: "email", message: "Invalid email" }]}>
                <Input placeholder="name@company.com" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="+972..." />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Department" name="department">
                <Input placeholder="e.g., IT, HR, Marketing" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Job title" name="job_title">
                <Input placeholder="e.g., Helpdesk Specialist" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Location" name="location">
                <Input placeholder="e.g., HQ / Remote" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Active" name="is_active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={3} placeholder="Internal notes…" />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            type="info"
            showIcon
            message="Tip"
            description="Next we’ll link this contact to cases as “Requester” and show all cases per person."
          />
        </Form>
      </Modal>
    </Space>
  );
}

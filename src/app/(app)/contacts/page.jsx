"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import {
  getActiveWorkspace,
  getOrgMembers,
  addOrgMember,
  updateOrgMemberRole,
  setOrgMemberActive,
} from "@/lib/db";

import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
  Spin,
  Switch,
} from "antd";
import {
  ReloadOutlined,
  TeamOutlined,
  SearchOutlined,
  UserAddOutlined,
  CrownOutlined,
  SafetyOutlined,
  EyeOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

function shortId(id) {
  if (!id) return "—";
  return `${String(id).slice(0, 8)}…`;
}

function initials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : (parts[0]?.[1] || "");
  return (a + b).toUpperCase() || "?";
}

const roleColor = (role) =>
  ({
    admin: "gold",
    agent: "blue",
    viewer: "default",
  }[role] || "default");

const roleIcon = (role) =>
  ({
    admin: <CrownOutlined />,
    agent: <SafetyOutlined />,
    viewer: <EyeOutlined />,
  }[role] || <EyeOutlined />);

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "").trim()
  );
}

export default function ContactsPage() {
  const router = useRouter();

  const [workspace, setWorkspace] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [active, setActive] = useState("all"); // all / active / inactive

  // invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviteInput, setInviteInput] = useState(""); // email OR uuid
  const [inviting, setInviting] = useState(false);

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

      const members = await getOrgMembers(ws.orgId);

      // normalize
      const normalized = (members || []).map((m) => ({
        user_id: m.user_id,
        full_name: m.full_name || "",
        email: m.email || "", // may be empty depending on your view
        avatar_url: m.avatar_url || null,
        role: m.role || "viewer",
        is_active: m.is_active ?? true,
      }));

      setRows(normalized);

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

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return (rows || []).filter((r) => {
      if (role !== "all" && r.role !== role) return false;
      if (active === "active" && r.is_active === false) return false;
      if (active === "inactive" && r.is_active !== false) return false;

      if (!qq) return true;

      const hay = [
        r.full_name,
        r.email,
        r.user_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [rows, q, role, active]);

  const total = rows.length;
  const activeCount = rows.filter((r) => r.is_active !== false).length;
  const adminsCount = rows.filter((r) => r.role === "admin").length;

  async function onInvite() {
    const ws = workspace;
    if (!ws?.orgId) return message.error("No workspace selected");

    const value = inviteInput.trim();
    if (!value) return message.error("Enter email or user UUID");

    try {
      setInviting(true);

      // If it's UUID -> directly add membership
      if (isUuid(value)) {
        await addOrgMember({ orgId: ws.orgId, userId: value, role: inviteRole });
        message.success("Member added");
        setInviteOpen(false);
        setInviteInput("");
        await loadAll({ silent: true });
        return;
      }

      // Otherwise, try resolve email -> profile id (only works if profiles.email exists + is readable)
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", value.toLowerCase())
        .maybeSingle();

      if (profErr) {
        // likely: profiles.email doesn't exist OR RLS blocks it
        message.error(
          "Email lookup isn't available yet. Paste the user's UUID instead (auth.users.id)."
        );
        return;
      }

      if (!prof?.id) {
        message.error("No user found for this email. Ask them to register first, then add by UUID.");
        return;
      }

      await addOrgMember({ orgId: ws.orgId, userId: prof.id, role: inviteRole });
      message.success("Member added");
      setInviteOpen(false);
      setInviteInput("");
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function onChangeRole(userId, nextRole) {
    try {
      await updateOrgMemberRole({ orgId: workspace.orgId, userId, role: nextRole });
      message.success("Role updated");
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || "Failed to update role");
    }
  }

  async function onToggleActive(userId, nextActive) {
    try {
      await setOrgMemberActive({ orgId: workspace.orgId, userId, isActive: nextActive });
      message.success(nextActive ? "Member activated" : "Member deactivated");
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || "Failed to update status");
    }
  }

  const headerRight = (
    <Space wrap>
      <Tooltip title="Refresh directory">
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
        icon={<UserAddOutlined />}
        onClick={() => setInviteOpen(true)}
      >
        Invite member
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
                {workspace?.orgName ? (
                  <Tag color="blue">Workspace: {workspace.orgName}</Tag>
                ) : (
                  <Tag>Workspace: none</Tag>
                )}

                <Tag icon={<TeamOutlined />}>Directory: org members</Tag>

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
                  <Text style={{ fontSize: 22, fontWeight: 800 }}>{activeCount}</Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card style={{ borderRadius: 16 }}>
                <Space orientation="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Admins
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: 800 }}>{adminsCount}</Text>
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
                  placeholder="Search name / email / user id…"
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </Col>

              <Col xs={12} md={7}>
                <Select
                  value={role}
                  onChange={setRole}
                  style={{ width: "100%" }}
                  options={[
                    { value: "all", label: "All roles" },
                    { value: "admin", label: "admin" },
                    { value: "agent", label: "agent" },
                    { value: "viewer", label: "viewer" },
                  ]}
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

              <Col xs={24}>
                <Space wrap size={8}>
                  <Button
                    onClick={() => {
                      setQ("");
                      setRole("all");
                      setActive("all");
                    }}
                  >
                    Clear filters
                  </Button>

                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Admins can invite, change roles, and deactivate members.
                  </Text>
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

      {/* Directory */}
      <Card
        title="Directory"
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
                  Create org + membership to start seeing members.
                </Text>
              </Space>
            }
          />
        ) : filtered.length ? (
          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            {filtered.map((m) => {
              const name = m.full_name || "Unnamed";
              const isActive = m.is_active !== false;

              return (
                <Card key={m.user_id} size="small" hoverable style={{ borderRadius: 14 }}>
                  <Row justify="space-between" align="middle" gutter={[12, 12]}>
                    <Col flex="auto">
                      <Space size={12} align="start">
                        <Avatar size={40} src={m.avatar_url || undefined}>
                          {initials(name || m.email)}
                        </Avatar>

                        <Space orientation="vertical" size={2} style={{ width: "100%" }}>
                          <Space wrap size={8}>
                            <Text strong style={{ fontSize: 14 }}>
                              {name}
                            </Text>

                            <Tag color={roleColor(m.role)} icon={roleIcon(m.role)}>
                              {m.role}
                            </Tag>

                            <Badge
                              status={isActive ? "success" : "default"}
                              text={isActive ? "Active" : "Inactive"}
                            />
                          </Space>

                          <Space wrap size={10}>
                            {m.email ? (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {m.email}
                              </Text>
                            ) : (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                ID: {shortId(m.user_id)}
                              </Text>
                            )}

                            {!m.email ? null : (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                ID: {shortId(m.user_id)}
                              </Text>
                            )}
                          </Space>
                        </Space>
                      </Space>
                    </Col>

                    <Col>
                      <Space wrap>
                        {/* Role change */}
                        <Select
                          size="middle"
                          value={m.role}
                          style={{ width: 140 }}
                          onChange={(next) => onChangeRole(m.user_id, next)}
                          options={[
                            { value: "admin", label: "admin" },
                            { value: "agent", label: "agent" },
                            { value: "viewer", label: "viewer" },
                          ]}
                        />

                        {/* Activate / Deactivate */}
                        <Tooltip title={isActive ? "Deactivate member" : "Activate member"}>
                          <Switch
                            checked={isActive}
                            onChange={(checked) => onToggleActive(m.user_id, checked)}
                          />
                        </Tooltip>

                        {/* Quick action */}
                        <Button type="primary" onClick={() => router.push("/cases/new")}>
                          New case
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Divider style={{ margin: "10px 0" }} />

                  <Space style={{ justifyContent: "space-between", width: "100%" }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Member actions are enforced by RLS (admin-only updates/inserts).
                    </Text>
                    <Button type="link" style={{ padding: 0 }} onClick={() => message.info("Next: member profile drawer")}>
                      Open profile →
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
                <Text>No members match your filters</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Try clearing filters.
                </Text>
              </Space>
            }
          />
        )}
      </Card>

      {/* Invite Modal */}
      <Modal
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        title="Invite member"
        okText="Add"
        onOk={onInvite}
        confirmLoading={inviting}
      >
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          <Text type="secondary">
            Paste a user UUID (recommended). If your <Text code>profiles</Text> table has an{" "}
            <Text code>email</Text> column, you can also type an email.
          </Text>

          <Input
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            placeholder="User UUID (auth.users.id) or email"
            autoFocus
          />

          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Role
            </Text>
            <Select
              value={inviteRole}
              onChange={setInviteRole}
              style={{ width: "100%", marginTop: 6 }}
              options={[
                { value: "admin", label: "admin" },
                { value: "agent", label: "agent" },
                { value: "viewer", label: "viewer" },
              ]}
            />
          </div>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Tip: easiest workflow is: user registers → sends you their UUID → you add them here.
          </Text>
        </Space>
      </Modal>
    </Space>
  );
}

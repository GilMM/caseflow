"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace, createOrgInvite, getOrgInvites, revokeOrgInvite } from "@/lib/db";

import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  SettingOutlined,
  ReloadOutlined,
  WifiOutlined,
  UserOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  SafetyOutlined,
  PlusOutlined,
  CopyOutlined,
  StopOutlined,
  MailOutlined,
  KeyOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

function initials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : (parts[0]?.[1] || "");
  return (a + b).toUpperCase() || "?";
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

export default function SettingsPage() {
  const router = useRouter();
  const [profileForm] = Form.useForm();
  const [inviteForm] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);

  const isAdmin = workspace?.role === "admin";

  // Invites
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const userLabel = useMemo(() => {
    const name = profileForm.getFieldValue("full_name");
    const email = sessionUser?.email;
    return name || email || "Account";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser]);

  async function loadAll({ silent = false } = {}) {
    try {
      setError("");
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user || null;
      setSessionUser(user);

      const ws = await getActiveWorkspace();
      setWorkspace(ws);

      // MVP profile (placeholder)
      profileForm.setFieldsValue({
        full_name: "",
        avatar_url: "",
      });
    } catch (e) {
      const msg = e?.message || "Failed to load settings";
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadInvites(orgId) {
    if (!orgId) return;
    try {
      setInvitesLoading(true);
      const data = await getOrgInvites(orgId);
      setInvites(data || []);
    } catch (e) {
      console.error("getOrgInvites failed:", e);
      message.error(e?.message || "Failed to load invites");
      setInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  }
  

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAdmin || !workspace?.orgId) return;
    loadInvites(workspace.orgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, workspace?.orgId]);

  async function logout() {
    // לוקאלי לפעמים נתקע עם refresh token -> זה הכי "חזק"
    await supabase.auth.signOut({ scope: "local" });
    window.location.assign("/login");
  }

  async function onSaveProfile() {
    message.success("Saved (MVP placeholder)");
  }

  function inviteLinkFromToken(token) {
    return `${window.location.origin}/onboarding?invite=${token}`;
  }

  async function onCreateInvite(values) {
    if (!workspace?.orgId) return;

    try {
      setCreatingInvite(true);

      const invite = await createOrgInvite({
        orgId: workspace.orgId,
        email: values.email,
        role: values.role,
      });

      const link = inviteLinkFromToken(invite.token);

      try {
        await navigator.clipboard.writeText(invite.token);
        message.success("Invite created & link copied");
      } catch {
        message.success("Invite created");
        message.info("Copy manually from the table (Copy button)");
      }

      inviteForm.resetFields();
      loadInvites(workspace.orgId);
    } catch (e) {
      message.error(e?.message || "Failed to create invite");
    } finally {
      setCreatingInvite(false);
    }
  }

  async function onRevokeInvite(inviteId) {
    try {
      await revokeOrgInvite(inviteId);
      message.success("Invite revoked");
      loadInvites(workspace.orgId);
    } catch (e) {
      message.error(e?.message || "Failed to revoke");
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
                Settings
              </Title>

              <Space wrap size={8}>
                <Tag icon={<SettingOutlined />}>Configuration</Tag>

                {workspace?.orgName ? (
                  <Tag color="blue">Workspace: {workspace.orgName}</Tag>
                ) : (
                  <Tag>Workspace: none</Tag>
                )}

                {workspace?.role ? <Tag color="geekblue">Role: {workspace.role}</Tag> : null}

                <Tag color="green" icon={<WifiOutlined />}>
                  Realtime enabled
                </Tag>

                <Text type="secondary" style={{ fontSize: 12 }}>
                  Account & workspace preferences
                </Text>
              </Space>
            </Space>
          </Col>

          <Col>
            <Space wrap>
              <Tooltip title="Refresh settings">
                <Button
                  icon={<ReloadOutlined />}
                  loading={refreshing}
                  onClick={() => loadAll({ silent: true })}
                >
                  Refresh
                </Button>
              </Tooltip>

              <Button danger icon={<LogoutOutlined />} onClick={logout}>
                Logout
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {error ? (
        <Card style={{ borderRadius: 16, borderColor: "#ffccc7" }}>
          <Alert type="error" showIcon message="Couldn’t load settings" description={error} />
        </Card>
      ) : null}

      <Row gutter={[12, 12]}>
        {/* Profile */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space size={8}>
                <UserOutlined />
                <span>Profile</span>
              </Space>
            }
            style={{ borderRadius: 16 }}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>{sessionUser?.email || ""}</Text>}
          >
            <Row gutter={[12, 12]} align="middle">
              <Col>
                <Avatar size={56} src={profileForm.getFieldValue("avatar_url") || undefined}>
                  {initials(userLabel)}
                </Avatar>
              </Col>
              <Col flex="auto">
                <Space orientation="vertical" size={0} style={{ width: "100%" }}>
                  <Text strong style={{ fontSize: 14 }}>
                    {userLabel}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Demo profile section (next: persist in profiles table).
                  </Text>
                </Space>
              </Col>
            </Row>

            <Divider style={{ margin: "12px 0" }} />

            <Form form={profileForm} layout="vertical" onFinish={onSaveProfile}>
              <Form.Item label="Display name" name="full_name">
                <Input placeholder="e.g., Gil Meshou" />
              </Form.Item>

              <Form.Item label="Avatar URL" name="avatar_url">
                <Input placeholder="https://…" />
              </Form.Item>

              <Space>
                <Button onClick={() => profileForm.resetFields()}>Reset</Button>
                <Button type="primary" htmlType="submit">
                  Save
                </Button>
              </Space>
            </Form>
          </Card>

          {/* Admin: Invites */}
          {isAdmin ? (
            <Card
              style={{ borderRadius: 16, marginTop: 12 }}
              title={
                <Space size={8}>
                  <KeyOutlined />
                  <span>Invites</span>
                </Space>
              }
              extra={<Text type="secondary">{invites.length} total</Text>}
            >
              {!workspace?.orgId ? (
                <Alert
                  type="warning"
                  showIcon
                  message="No active workspace"
                  description="Create an organization first."
                />
              ) : (
                <>
                  <Form
                    form={inviteForm}
                    layout="inline"
                    onFinish={onCreateInvite}
                    initialValues={{ role: "agent" }}
                    style={{ marginBottom: 12 }}
                  >
                    <Form.Item
                      name="email"
                      rules={[
                        { required: true, message: "Email is required" },
                        { type: "email", message: "Invalid email" },
                      ]}
                    >
                      <Input
                        prefix={<MailOutlined />}
                        placeholder="user@company.com"
                        style={{ width: 260 }}
                        disabled={creatingInvite}
                      />
                    </Form.Item>

                    <Form.Item name="role">
                      <Select
                        style={{ width: 140 }}
                        disabled={creatingInvite}
                        options={[
                          { value: "agent", label: "Agent" },
                          { value: "viewer", label: "Viewer" },
                        ]}
                      />
                    </Form.Item>

                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      htmlType="submit"
                      loading={creatingInvite}
                    >
                      Create invite
                    </Button>
                  </Form>

                  <Table
                    size="small"
                    rowKey="id"
                    loading={invitesLoading}
                    dataSource={invites}
                    pagination={false}
                    columns={[
                      {
                        title: "Email",
                        dataIndex: "email",
                        render: (v) => <Text>{v}</Text>,
                      },
                      {
                        title: "Role",
                        dataIndex: "role",
                        width: 110,
                        render: (v) => <Tag>{v}</Tag>,
                      },
                      {
                        title: "Status",
                        width: 120,
                        render: (_, r) => {
                          const now = Date.now();
const exp = r.expires_at ? new Date(r.expires_at).getTime() : null;
                          if (r.accepted_at) return <Tag color="green">Accepted</Tag>;
                          if (exp && exp < now) return <Tag>Expired</Tag>;
                          return <Tag color="blue">Pending</Tag>;
                        },
                      },
                      {
                        title: "Created",
                        width: 120,
                        render: (_, r) => <Text type="secondary">{timeAgo(r.created_at)}</Text>,
                      },
                      {
                        title: "",
                        align: "right",
                        width: 120,
                        render: (_, r) => {
                          const canAct = !r.accepted_at;
                          return canAct ? (
                            <Space>
                              <Tooltip title="Copy invite link">
                                <Button
                                  size="small"
                                  icon={<CopyOutlined />}
                                  onClick={async () => {
                                    const link = inviteLinkFromToken(r.token);
                                    await navigator.clipboard.writeText(link);
                                    message.success("Link copied");
                                  }}
                                />
                              </Tooltip>

                              <Tooltip title="Revoke invite">
                                <Button
                                  size="small"
                                  danger
                                  icon={<StopOutlined />}
                                  onClick={() => onRevokeInvite(r.id)}
                                />
                              </Tooltip>
                            </Space>
                          ) : null;
                        },
                      },
                    ]}
                  />

                  <div style={{ marginTop: 10 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tip: send users the link, they will land on onboarding and join instantly.
                    </Text>
                  </div>
                </>
              )}
            </Card>
          ) : null}
        </Col>

        {/* Workspace */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space size={8}>
                <AppstoreOutlined />
                <span>Workspace</span>
              </Space>
            }
            style={{ borderRadius: 16 }}
          >
            {workspace?.orgId ? (
              <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                <Space wrap size={8}>
                  <Tag color="blue">Org</Tag>
                  <Text strong>{workspace.orgName || workspace.orgId}</Text>
                </Space>

                <Space wrap size={8}>
                  <Tag color="geekblue">Role</Tag>
                  <Text>{workspace.role || "—"}</Text>
                </Space>

                <Space wrap size={8}>
                  <Tag color="green" icon={<WifiOutlined />}>
                    Realtime
                  </Tag>
                  <Text type="secondary">Subscribed to activity streams (postgres_changes)</Text>
                </Space>

                <Divider style={{ margin: "10px 0" }} />

                <Space wrap>
                  <Button onClick={() => message.info("Next: workspace switcher UI")}>
                    Switch workspace
                  </Button>
                  <Button onClick={() => message.info("Next: members table + role editor")}>
                    Manage members
                  </Button>
                </Space>

                <Text type="secondary" style={{ fontSize: 12 }}>
                  Next step (Portfolio): workspace switcher + members management (admin/agent/viewer).
                </Text>
              </Space>
            ) : (
              <Alert
                type="warning"
                showIcon
                message="No active workspace"
                description="Create an organization + membership first. Then settings will show org context."
              />
            )}
          </Card>

          <Card style={{ borderRadius: 16, marginTop: 12 }}>
            <Space orientation="vertical" size={6}>
              <Space size={8}>
                <SafetyOutlined />
                <Text strong>Security (RLS)</Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Data is always scoped by org membership using Row Level Security (RLS).
                Next we can add a “Policies status” / diagnostics panel.
              </Text>

              <Button onClick={() => message.info("Next: RLS diagnostics panel")}>
                Open diagnostics
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Roadmap */}
      <Card style={{ borderRadius: 16 }}>
        <Space orientation="vertical" size={6}>
          <Text strong>Next settings upgrades</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            • Persist profile in <Text code>profiles</Text> (self update RLS) • Workspace switcher • Notifications • SLA per queue
          </Text>
        </Space>
      </Card>
    </Space>
  );
}

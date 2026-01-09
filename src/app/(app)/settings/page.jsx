"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import {
  getActiveWorkspace,
  updateOrgSettings,
  diagnosticsOrgAccess,
} from "@/lib/db";

import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from "antd";

import {
  SettingOutlined,
  ReloadOutlined,
  WifiOutlined,
  UserOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  SafetyOutlined,
  TeamOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

/* ---------------- helpers ---------------- */

function initials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || "";
  return (a + b).toUpperCase() || "?";
}

/* ---------------- child cards (Solution A) ---------------- */

function ProfileCard({ sessionUser, onSaveProfile }) {
  const [profileForm] = Form.useForm();

  // MVP prefill (placeholder)
  useEffect(() => {
    profileForm.setFieldsValue({
      full_name: "",
      avatar_url: "",
    });
  }, [profileForm]);

  // ✅ userLabel computed INSIDE component that actually renders the <Form>
  const userLabel = useMemo(() => {
    const name = profileForm.getFieldValue("full_name");
    const email = sessionUser?.email;
    return name || email || "Account";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser]);

  const avatarUrl = profileForm.getFieldValue("avatar_url") || undefined;

  return (
    <Card
      title={
        <Space size={8}>
          <UserOutlined />
          <span>Profile</span>
        </Space>
      }
      style={{ borderRadius: 16 }}
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {sessionUser?.email || ""}
        </Text>
      }
    >
      <Row gutter={[12, 12]} align="middle">
        <Col>
          <Avatar size={56} src={avatarUrl}>
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
  );
}

function OrgSettingsCard({ workspace, savingOrg, onSaveOrg }) {
  const [orgForm] = Form.useForm();

  // Prefill כשיש workspace
  useEffect(() => {
    if (!workspace?.orgId) return;
    orgForm.setFieldsValue({
      name: workspace?.orgName || "",
      logo_url: "",
    });
  }, [orgForm, workspace?.orgId, workspace?.orgName]);

  return (
    <Card
      style={{ borderRadius: 16, marginTop: 12 }}
      title={
        <Space size={8}>
          <EditOutlined />
          <span>Organization</span>
        </Space>
      }
      extra={<Tag color="blue">Admin</Tag>}
    >
      <Form form={orgForm} layout="vertical" onFinish={onSaveOrg}>
        <Form.Item
          name="name"
          label="Organization name"
          rules={[
            { required: true, message: "Name is required" },
            { min: 2, message: "Too short" },
          ]}
        >
          <Input placeholder="e.g., Acme Support" />
        </Form.Item>

        <Form.Item name="logo_url" label="Logo URL (optional)">
          <Input placeholder="https://…" />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={savingOrg}>
          Save organization
        </Button>

        <div style={{ marginTop: 10 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Next: upload logo to Supabase Storage (instead of URL).
          </Text>
        </div>
      </Form>
    </Card>
  );
}

/* ---------------- page ---------------- */

export default function SettingsPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);

  const isAdmin = workspace?.role === "admin";

  // Org settings
  const [savingOrg, setSavingOrg] = useState(false);

  // Diagnostics
  const [diag, setDiag] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  async function loadAll({ silent = false } = {}) {
    try {
      setError("");
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user || null;

      // אם אין session → החוצה
      if (!user) {
        router.replace("/login");
        return;
      }

      setSessionUser(user);

      const ws = await getActiveWorkspace();
      setWorkspace(ws);
    } catch (e) {
      const msg = e?.message || "Failed to load settings";
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function runDiagnostics(orgId) {
    if (!orgId) return;
    try {
      setDiagLoading(true);
      const res = await diagnosticsOrgAccess(orgId);
      setDiag(res);
    } catch (e) {
      setDiag(null);
      message.error(e?.message || "Diagnostics failed");
    } finally {
      setDiagLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAdmin || !workspace?.orgId) return;
    runDiagnostics(workspace.orgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, workspace?.orgId]);

  async function logout() {
    await supabase.auth.signOut({ scope: "local" });
    window.location.assign("/login");
  }

  async function onSaveProfile() {
    message.success("Saved (MVP placeholder)");
  }

  async function onSaveOrg(values) {
    if (!workspace?.orgId) return;

    try {
      setSavingOrg(true);
      await updateOrgSettings({
        orgId: workspace.orgId,
        name: values.name,
        logoUrl: values.logo_url || null,
      });
      message.success("Organization updated");
      await loadAll({ silent: true }); // ירענן orgName
      await runDiagnostics(workspace.orgId);
    } catch (e) {
      message.error(e?.message || "Failed to save organization");
    } finally {
      setSavingOrg(false);
    }
  }

  return (
    <Spin spinning={loading} size="large">
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
            <Alert type="error" showIcon title="Couldn’t load settings" description={error} />
          </Card>
        ) : null}

        <Row gutter={[12, 12]}>
          {/* LEFT COLUMN */}
          <Col xs={24} lg={12}>
            {/* ✅ Profile moved to child component (Solution A) */}
            <ProfileCard sessionUser={sessionUser} onSaveProfile={onSaveProfile} />
          </Col>

          {/* RIGHT COLUMN */}
          <Col xs={24} lg={12}>
            {/* Workspace */}
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
                    <Button
                      type="primary"
                      icon={<TeamOutlined />}
                      onClick={() => router.push("/settings/users")}
                    >
                      Manage users
                    </Button>
                  </Space>

                  <Text type="secondary" style={{ fontSize: 12 }}>
                    User management moved to a dedicated page for a larger, cleaner table experience.
                  </Text>
                </Space>
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  title="No active workspace"
                  description="Create an organization + membership first. Then settings will show org context."
                />
              )}
            </Card>

            {/* Admin: Organization settings */}
            {isAdmin && workspace?.orgId ? (
              <OrgSettingsCard workspace={workspace} savingOrg={savingOrg} onSaveOrg={onSaveOrg} />
            ) : null}

            {/* Security diagnostics */}
            <Card style={{ borderRadius: 16, marginTop: 12 }}>
              <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                <Space size={8}>
                  <SafetyOutlined />
                  <Text strong>Security (RLS)</Text>
                </Space>

                <Text type="secondary" style={{ fontSize: 12 }}>
                  Data is scoped by org membership using Row Level Security (RLS).
                </Text>

                {isAdmin && workspace?.orgId ? (
                  <Space wrap>
                    <Button
                      icon={<ReloadOutlined />}
                      loading={diagLoading}
                      onClick={() => runDiagnostics(workspace.orgId)}
                    >
                      Run diagnostics
                    </Button>

                    {diag ? (
                      <Space wrap>
                        <Tag
                          icon={diag.is_member ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                          color={diag.is_member ? "green" : "red"}
                        >
                          Member
                        </Tag>
                        <Tag
                          icon={diag.is_admin ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                          color={diag.is_admin ? "green" : "red"}
                        >
                          Admin
                        </Tag>

                        {diag.member_role ? <Tag color="blue">role: {diag.member_role}</Tag> : null}
                        {typeof diag.active_members_count === "number" ? (
                          <Tag>active members: {diag.active_members_count}</Tag>
                        ) : null}
                      </Space>
                    ) : (
                      <Tag>Not loaded</Tag>
                    )}
                  </Space>
                ) : (
                  <Alert
                    type="info"
                    showIcon
                    title="Diagnostics available for admins"
                    description="Create an organization and make sure you are an admin."
                  />
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Roadmap */}
        <Card style={{ borderRadius: 16 }}>
          <Space orientation="vertical" size={6}>
            <Text strong>Next settings upgrades</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              • Persist profile in <Text code>profiles</Text> (self update RLS) • Workspace switcher • Notifications • SLA
              per queue
            </Text>
          </Space>
        </Card>
      </Space>
    </Spin>
  );
}

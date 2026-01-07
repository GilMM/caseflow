"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";

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
  Space,
  Spin,
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

export default function SettingsPage() {
  const router = useRouter();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);

  const userLabel = useMemo(() => {
    const name = form.getFieldValue("full_name");
    const email = sessionUser?.email;
    return name || email || "Account";
  }, [sessionUser, form]);

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

      // profile values (MVP)
      form.setFieldsValue({
        full_name: "",
        avatar_url: "",
      });
    } catch (e) {
      setError(e?.message || "Failed to load settings");
      message.error(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function onSaveProfile(values) {
    // MVP: בלי כתיבה ל-profiles עדיין.
    // אם תרצה — נחבר ל-profiles table + RLS (self update) ונשמור באמת.
    message.success("Saved (MVP placeholder)");
    // console.log(values);
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
                <Avatar size={56} src={form.getFieldValue("avatar_url") || undefined}>
                  {initials(userLabel)}
                </Avatar>
              </Col>
              <Col flex="auto">
                <Space orientation="vertical" size={0} style={{ width: "100%" }}>
                  <Text strong style={{ fontSize: 14 }}>
                    {userLabel}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    This is a demo-friendly profile section (next: persist in profiles table).
                  </Text>
                </Space>
              </Col>
            </Row>

            <Divider style={{ margin: "12px 0" }} />

            <Form form={form} layout="vertical" onFinish={onSaveProfile}>
              <Form.Item label="Display name" name="full_name">
                <Input placeholder="e.g., Gil Meshou" />
              </Form.Item>

              <Form.Item label="Avatar URL" name="avatar_url">
                <Input placeholder="https://…" />
              </Form.Item>

              <Space>
                <Button onClick={() => form.resetFields()}>Reset</Button>
                <Button type="primary" htmlType="submit">
                  Save
                </Button>
              </Space>
            </Form>
          </Card>
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
                  <Button onClick={() => message.info("Next: switch workspace UI")}>
                    Switch workspace
                  </Button>
                  <Button onClick={() => message.info("Next: invite members / permissions matrix")}>
                    Manage access
                  </Button>
                </Space>

                <Text type="secondary" style={{ fontSize: 12 }}>
                  Next step (Portfolio): workspace switcher + permissions matrix (admin/agent/viewer).
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
                Your app is designed around Row Level Security: data is always scoped to org membership.
                Next we can add a “Policies status” panel (checks + diagnostics).
              </Text>

              <Button onClick={() => message.info("Next: RLS diagnostics panel")}>
                Open diagnostics
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Roadmap style card */}
      <Card style={{ borderRadius: 16 }}>
        <Space orientation="vertical" size={6}>
          <Text strong>Next settings upgrades</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            • Persist profile in <Text code>profiles</Text> (self update RLS){" "}
            • Workspace switcher • Notification preferences • SLA settings per queue
          </Text>
        </Space>
      </Card>
    </Space>
  );
}

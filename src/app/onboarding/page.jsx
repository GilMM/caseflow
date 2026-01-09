"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";

import {
  Alert,
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
  Typography,
  message,
  theme,
} from "antd";
import {
  ApartmentOutlined,
  KeyOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  InboxOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

function Pill({ icon, label }) {
  return (
    <Tag
      icon={icon}
      style={{
        borderRadius: 999,
        padding: "4px 10px",
        margin: 0,
        userSelect: "none",
      }}
    >
      {label}
    </Tag>
  );
}

function Feature({ icon, title, desc, token }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${token.colorBorderSecondary || token.colorBorder}`,
        background: token.colorBgContainer,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          border: `1px solid ${
            token.colorBorderSecondary || token.colorBorder
          }`,
          background:
            "radial-gradient(400px 180px at 20% 20%, rgba(22,119,255,0.18), transparent 55%), radial-gradient(360px 160px at 80% 30%, rgba(82,196,26,0.14), transparent 55%)",
          flex: "0 0 auto",
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{ fontWeight: 700, color: token.colorText, lineHeight: 1.2 }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: token.colorTextSecondary,
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { token } = theme.useToken();

  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [invitePreview, setInvitePreview] = useState(null);
  const [inviteChecking, setInviteChecking] = useState(false);

  const tokenFromUrl = search.get("invite") || "";

  const [formOrg] = Form.useForm();
  const [formInvite] = Form.useForm();

  const previewTimer = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        setBooting(true);
        setError("");

        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          const next = tokenFromUrl
            ? `/onboarding?invite=${encodeURIComponent(tokenFromUrl)}`
            : "/onboarding";
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        const ws = await getActiveWorkspace();
        if (ws?.orgId) {
          router.replace("/");
          return;
        }

        if (tokenFromUrl) {
          formInvite.setFieldsValue({ token: tokenFromUrl });
          await previewInvite(tokenFromUrl);
        }

        if (mounted) setBooting(false);
      } catch (e) {
        if (mounted) {
          setBooting(false);
          setError(e?.message || "Failed to load onboarding");
        }
      }
    }

    boot();

    return () => {
      mounted = false;
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, tokenFromUrl]);

  function normalizeInviteToken(input) {
    const raw = (input || "").trim();
    if (!raw) return "";

    // If user pasted a full URL, extract ?invite=
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      try {
        const u = new URL(raw);
        return (u.searchParams.get("invite") || "").trim();
      } catch {
        // ignore
      }
    }

    // If user pasted something like "...invite=TOKEN"
    const m = raw.match(/invite=([a-zA-Z0-9\-_]+)/);
    if (m?.[1]) return m[1].trim();

    return raw;
  }

  async function previewInvite(raw) {
    const tokenVal = normalizeInviteToken(raw);
    if (!tokenVal) {
      setInvitePreview(null);
      return;
    }

    try {
      setInviteChecking(true);
      setInvitePreview(null);

      const { data, error } = await supabase.rpc("get_invite_by_token", {
        p_token: tokenVal,
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;

      if (!row?.org_id) {
        setInvitePreview(null);
        return;
      }

      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
        setInvitePreview({ ...row, _expired: true });
        return;
      }

      setInvitePreview(row);
    } catch (e) {
      setInvitePreview(null);
      message.error(e?.message || "Invalid invite");
    } finally {
      setInviteChecking(false);
    }
  }

  async function createOrg(values) {
    setBusy(true);
    setError("");

    try {
      const name = values.name?.trim();
      if (!name) throw new Error("Enter organization name");

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({ name, created_by: userId }) // NOTE: ודא שיש created_by בטבלה
        .select("id, name")
        .single();
      if (orgErr) throw orgErr;

      const { error: memErr } = await supabase.from("org_memberships").insert({
        org_id: org.id,
        user_id: userId,
        role: "admin",
        is_active: true,
      });
      if (memErr) throw memErr;

      message.success("Organization created");
      router.replace("/");
      router.refresh?.();
    } catch (e) {
      setError(e?.message || "Failed to create organization");
    } finally {
      setBusy(false);
    }
  }

  async function acceptInvite(values) {
    setBusy(true);
    setError("");

    try {
      const tokenVal = normalizeInviteToken(values.token);
      if (!tokenVal) throw new Error("Paste invite token");

      if (invitePreview?._expired) throw new Error("Invite expired");

      const { error } = await supabase.rpc("accept_org_invite", {
        p_token: tokenVal,
      });
      if (error) throw error;

      message.success("Joined organization");
      router.replace("/");
      router.refresh?.();
    } catch (e) {
      setError(e?.message || "Failed to accept invite");
    } finally {
      setBusy(false);
    }
  }

  if (booting) {
    return (
      <div style={{ height: "60vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px - 36px)", // header + padding באזור ה-Content שלך
        display: "grid",
        placeItems: "center",
        padding: "18px 0",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          padding: "0 2px",
        }}
      >
        <Card
          style={{
            borderRadius: 20,
            border: `1px solid ${token.colorBorder}`,
            overflow: "hidden",
            background:
              "radial-gradient(1200px 600px at 20% 10%, rgba(22,119,255,0.14), transparent 60%), radial-gradient(1000px 500px at 80% 20%, rgba(82,196,26,0.12), transparent 55%)",
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Row gutter={0} style={{ minHeight: 520 }}>
            {/* Left Hero */}
            <Col xs={24} lg={11} style={{ padding: 22 }}>
              <Space direction="vertical" size={14} style={{ width: "100%" }}>
                <Space wrap size={8}>
                  <Pill
                    icon={<SafetyCertificateOutlined />}
                    label="RLS-secured"
                  />
                  <Pill icon={<ThunderboltOutlined />} label="Fast setup" />
                  <Pill icon={<TeamOutlined />} label="Multi-tenant" />
                </Space>

                <div>
                  <Title level={2} style={{ margin: 0, lineHeight: 1.15 }}>
                    Welcome to{" "}
                    <span style={{ color: token.colorPrimary }}>CaseFlow</span>
                  </Title>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    Create your workspace or join an existing organization with
                    an invite. In less than a minute you’ll be inside the
                    dashboard.
                  </Text>
                </div>

                {error ? (
                  <Alert
                    type="error"
                    showIcon
                    message="Onboarding error"
                    description={error}
                  />
                ) : null}

                <Divider style={{ margin: "2px 0" }} />

                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Feature
                    token={token}
                    icon={
                      <InboxOutlined style={{ color: token.colorPrimary }} />
                    }
                    title="Case management"
                    desc="Open, track, and resolve requests with queues and priorities."
                  />
                  <Feature
                    token={token}
                    icon={
                      <TeamOutlined style={{ color: token.colorSuccess }} />
                    }
                    title="Teams & roles"
                    desc="Admins manage members. Agents handle cases. Viewers stay read-only."
                  />
                  <Feature
                    token={token}
                    icon={
                      <SafetyCertificateOutlined
                        style={{ color: token.colorPrimary }}
                      />
                    }
                    title="Database-first security"
                    desc="Permissions are enforced in Supabase RLS—not only in the UI."
                  />
                </Space>

                <div style={{ marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Tip: If you were invited, paste the token on the right and
                    you’ll see a preview before joining.
                  </Text>
                </div>
              </Space>
            </Col>

            {/* Right Actions */}
            <Col
              xs={24}
              lg={13}
              style={{
                padding: 22,
                background: token.colorBgContainer,
                borderLeft: `1px solid ${token.colorBorder}`,
              }}
            >
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    Get started
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Takes ~30 seconds
                  </Text>
                </div>

                <Row gutter={[12, 12]}>
                  <Col xs={24} md={12}>
                    <Card
                      title={
                        <Space>
                          <ApartmentOutlined />
                          Create
                        </Space>
                      }
                      style={{ borderRadius: 16, height: "100%" }}
                      bodyStyle={{ paddingTop: 10 }}
                    >
                      <Text
                        type="secondary"
                        style={{ display: "block", marginBottom: 10 }}
                      >
                        Start a new workspace and become admin.
                      </Text>

                      <Form
                        form={formOrg}
                        layout="vertical"
                        onFinish={createOrg}
                        requiredMark={false}
                      >
                        <Form.Item
                          name="name"
                          label="Organization name"
                          rules={[
                            {
                              required: true,
                              message: "Enter an organization name",
                            },
                            { min: 2, message: "Too short" },
                          ]}
                        >
                          <Input
                            placeholder="e.g., Acme Support"
                            disabled={busy}
                          />
                        </Form.Item>

                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          htmlType="submit"
                          loading={busy}
                          block
                        >
                          Create workspace
                        </Button>

                        <div style={{ marginTop: 10 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            You’ll be able to invite users later from Settings.
                          </Text>
                        </div>
                      </Form>
                    </Card>
                  </Col>

                  <Col xs={24} md={12}>
                    <Card
                      title={
                        <Space>
                          <KeyOutlined />
                          Join
                        </Space>
                      }
                      style={{ borderRadius: 16, height: "100%" }}
                      bodyStyle={{ paddingTop: 10 }}
                    >
                      <Text
                        type="secondary"
                        style={{ display: "block", marginBottom: 10 }}
                      >
                        Paste an invite token to join a team.
                      </Text>

                      <Form
                        form={formInvite}
                        layout="vertical"
                        onFinish={acceptInvite}
                        requiredMark={false}
                        onValuesChange={(changed) => {
                          if (changed.token !== undefined) {
                            if (previewTimer.current)
                              clearTimeout(previewTimer.current);
                            previewTimer.current = setTimeout(() => {
                              const normalized = normalizeInviteToken(
                                changed.token
                              );
                              formInvite.setFieldsValue({ token: normalized });
                              previewInvite(normalized);
                            }, 250);
                          }
                        }}
                      >
                        <Form.Item
                          name="token"
                          label="Invite token"
                          rules={[
                            { required: true, message: "Paste invite token" },
                          ]}
                        >
                          <Input
                            placeholder="Paste token here…"
                            disabled={busy}
                          />
                        </Form.Item>

                        <div style={{ minHeight: 44, marginBottom: 8 }}>
                          {inviteChecking ? <Tag>Checking invite…</Tag> : null}

                          {invitePreview?.org_id ? (
                            invitePreview._expired ? (
                              <Alert
                                type="warning"
                                showIcon
                                message="Invite expired"
                                description="Ask an admin to send a new invite."
                              />
                            ) : (
                              <Alert
                                type="success"
                                showIcon
                                message={`Invite to: ${
                                  invitePreview.org_name || invitePreview.org_id
                                }`}
                                description={
                                  <Space direction="vertical" size={2}>
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: 12 }}
                                    >
                                      Role: <b>{invitePreview.role}</b>
                                    </Text>
                                    {invitePreview.expires_at ? (
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 12 }}
                                      >
                                        Expires:{" "}
                                        {new Date(
                                          invitePreview.expires_at
                                        ).toLocaleString()}
                                      </Text>
                                    ) : null}
                                  </Space>
                                }
                              />
                            )
                          ) : null}
                        </div>

                        <Button
                          type="primary"
                          icon={<ArrowRightOutlined />}
                          htmlType="submit"
                          loading={busy}
                          block
                          disabled={
                            !formInvite.getFieldValue("token") ||
                            invitePreview?._expired
                          }
                        >
                          Accept invite
                        </Button>

                        <div style={{ marginTop: 10 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            You’ll only see organizations you were invited to.
                          </Text>
                        </div>
                      </Form>
                    </Card>
                  </Col>
                </Row>

                <Divider style={{ margin: "2px 0" }} />

                <Text type="secondary" style={{ fontSize: 12 }}>
                  Having trouble? Make sure you’re logged in, then paste the
                  invite token again.
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";
import { invalidateWorkspaceCache } from "@/lib/workspaceCache";
import { App } from "antd";

import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
  theme,
} from "antd";
import {
  ApartmentOutlined,
  KeyOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  RocketOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function OnboardingPage() {
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams();
  const { token } = theme.useToken();
  const { message } = App.useApp();

  const rawLocale = params?.locale;
  const locale = (rawLocale === "en" || rawLocale === "he") ? rawLocale : "en";
  const linkPrefix = `/${locale}`;

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
            ? `${linkPrefix}/onboarding?invite=${encodeURIComponent(tokenFromUrl)}`
            : `${linkPrefix}/onboarding`;
          router.replace(`${linkPrefix}/login?next=${encodeURIComponent(next)}`);
          return;
        }

        const ws = await getActiveWorkspace();
        if (ws?.orgId) {
          router.replace(`${linkPrefix}/`);
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
    let raw = (input || "").trim();
    if (!raw) return "";

    raw = raw.replace(/[\s\-–—.,;:)\]]+$/g, "");

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      try {
        const u = new URL(raw);
        const q = (u.searchParams.get("invite") || u.searchParams.get("token") || "").trim();
        if (q) return q;
        const m = u.pathname.match(/\/i\/([^/]+)/);
        if (m?.[1]) return m[1].trim();
        return "";
      } catch {}
    }

    const m = raw.match(/(?:invite|token)=([a-zA-Z0-9\-_]+)/);
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
      const orgName = values.name?.trim();
      if (!orgName) throw new Error("Enter organization name");

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          name: orgName,
          created_by: userId,
          owner_user_id: userId,
        })
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
      invalidateWorkspaceCache();
      router.replace(`${linkPrefix}/?refresh=1`);
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
      invalidateWorkspaceCache();
      router.replace(`${linkPrefix}/?refresh=1`);
      router.refresh?.();
    } catch (e) {
      setError(e?.message || "Failed to accept invite");
    } finally {
      setBusy(false);
    }
  }

  if (booting) {
    return (
      <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: token.colorBgLayout,
        padding: "40px 16px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
              display: "inline-grid",
              placeItems: "center",
              marginBottom: 16,
            }}
          >
            <RocketOutlined style={{ fontSize: 28, color: "#fff" }} />
          </div>
          <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
            Set up your workspace
          </Title>
          <Text type="secondary" style={{ fontSize: 15 }}>
            Create a new organization or join an existing one with an invite token
          </Text>
        </div>

        {/* Progress indicator */}
        <div style={{ maxWidth: 400, margin: "0 auto 32px" }}>
          <Steps
            size="small"
            current={1}
            items={[
              { title: "Account", icon: <CheckCircleOutlined /> },
              { title: "Workspace" },
              { title: "Dashboard" },
            ]}
          />
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            title={error}
            style={{ marginBottom: 24, maxWidth: 600, margin: "0 auto 24px" }}
          />
        )}

        {/* Cards */}
        <Row gutter={[20, 20]} justify="center">
          <Col xs={24} md={12} lg={11}>
            <Card
              style={{
                borderRadius: 16,
                height: "100%",
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
              styles={{ body: { padding: 24 } }}
            >
              <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: token.colorPrimaryBg,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <ApartmentOutlined
                      style={{ fontSize: 22, color: token.colorPrimary }}
                    />
                  </div>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      Create Organization
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Start fresh with your own workspace
                    </Text>
                  </div>
                </div>

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
                      { required: true, message: "Enter an organization name" },
                      { min: 2, message: "Too short" },
                    ]}
                  >
                    <Input
                      prefix={<ApartmentOutlined />}
                      placeholder="e.g., Acme Support"
                      disabled={busy}
                      autoComplete="organization"
                      size="large"
                      maxLength={15}
                    />
                  </Form.Item>

                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    htmlType="submit"
                    loading={busy}
                    block
                    size="large"
                    style={{ borderRadius: 10 }}
                  >
                    Create workspace
                  </Button>
                </Form>

                <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                  You'll be the admin. Invite team members later from Settings.
                </Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={12} lg={11}>
            <Card
              style={{
                borderRadius: 16,
                height: "100%",
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
              styles={{ body: { padding: 24 } }}
            >
              <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: token.colorSuccessBg,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <KeyOutlined
                      style={{ fontSize: 22, color: token.colorSuccess }}
                    />
                  </div>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      Join with Invite
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Got an invite? Paste it here
                    </Text>
                  </div>
                </div>

                <Form
                  form={formInvite}
                  layout="vertical"
                  onFinish={acceptInvite}
                  requiredMark={false}
                  onValuesChange={(changed) => {
                    if (changed.token !== undefined) {
                      if (previewTimer.current) clearTimeout(previewTimer.current);
                      previewTimer.current = setTimeout(() => {
                        previewInvite(changed.token);
                      }, 250);
                    }
                  }}
                >
                  <Form.Item
                    name="token"
                    label="Invite token or link"
                    rules={[{ required: true, message: "Paste invite token" }]}
                  >
                    <Input
                      prefix={<KeyOutlined />}
                      placeholder="Paste token or invite link…"
                      disabled={busy}
                      size="large"
                      onPaste={(e) => {
                        const text = e.clipboardData.getData("text");
                        const normalized = normalizeInviteToken(text);
                        if (normalized && normalized !== text.trim()) {
                          e.preventDefault();
                          formInvite.setFieldsValue({ token: normalized });
                          previewInvite(normalized);
                        }
                      }}
                      onBlur={() => {
                        const current = formInvite.getFieldValue("token");
                        const normalized = normalizeInviteToken(current);
                        if (normalized && normalized !== current) {
                          formInvite.setFieldsValue({ token: normalized });
                        }
                      }}
                    />
                  </Form.Item>

                  <div style={{ minHeight: 52, marginBottom: 8 }}>
                    {inviteChecking && (
                      <Tag color="processing">Checking invite…</Tag>
                    )}

                    {invitePreview?.org_id && (
                      invitePreview._expired ? (
                        <Alert
                          type="warning"
                          showIcon
                          title="Invite expired"
                          description="Ask an admin to send a new invite."
                          style={{ borderRadius: 8 }}
                        />
                      ) : (
                        <Alert
                          type="success"
                          showIcon
                          title={`Join: ${invitePreview.org_name || "Organization"}`}
                          description={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Role: <b>{invitePreview.role}</b>
                              {invitePreview.expires_at && (
                                <> · Expires: {new Date(invitePreview.expires_at).toLocaleDateString()}</>
                              )}
                            </Text>
                          }
                          style={{ borderRadius: 8 }}
                        />
                      )
                    )}
                  </div>

                  <Button
                    type="primary"
                    icon={<ArrowRightOutlined />}
                    htmlType="submit"
                    loading={busy}
                    block
                    size="large"
                    style={{ borderRadius: 10 }}
                    disabled={!formInvite.getFieldValue("token") || invitePreview?._expired}
                  >
                    Join organization
                  </Button>
                </Form>

                <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                  Paste the full URL or just the token - we'll figure it out.
                </Text>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Footer hint */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Having trouble? Contact your organization admin for a new invite link.
          </Text>
        </div>
      </div>
    </div>
  );
}

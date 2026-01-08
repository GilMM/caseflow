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
  Form,
  Input,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ApartmentOutlined,
  KeyOutlined,
  PlusOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function OnboardingPage() {
  const router = useRouter();
  const search = useSearchParams();

  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [invitePreview, setInvitePreview] = useState(null);
  const [inviteChecking, setInviteChecking] = useState(false);

  const tokenFromUrl = search.get("invite") || "";

  const [formOrg] = Form.useForm();
  const [formInvite] = Form.useForm();

  // simple debounce so we don’t spam RPC on every keypress
  const previewTimer = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        setBooting(true);
        setError("");

        // must be logged in, but keep invite in "next"
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          const next = tokenFromUrl
            ? `/onboarding?invite=${encodeURIComponent(tokenFromUrl)}`
            : "/onboarding";
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        // if already onboarded, go home
        const ws = await getActiveWorkspace();
        if (ws?.orgId) {
          router.replace("/");
          return;
        }

        // preload token from url if exists
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
    };
    // IMPORTANT: include tokenFromUrl so it works after login redirect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, tokenFromUrl]);

  async function previewInvite(raw) {
    const token = (raw || "").trim();
    if (!token) {
      setInvitePreview(null);
      return;
    }

    try {
      setInviteChecking(true);
      setInvitePreview(null);

      const { data, error } = await supabase.rpc("get_invite_by_token", {
        p_token: token,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;

      // Not found / not accessible
      if (!row?.org_id) {
        setInvitePreview(null);
        return;
      }

      // expired?
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

      // create org
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({ name, created_by: userId })
        .select("id, name")
        .single();

      if (orgErr) throw orgErr;

      // create admin membership
      const { error: memErr } = await supabase
        .from("org_memberships")
        .insert({ org_id: org.id, user_id: userId, role: "admin", is_active: true });

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
      const token = values.token?.trim();
      if (!token) throw new Error("Paste invite token");

      // optional: block expired client-side (still must be validated server-side)
      if (invitePreview?._expired) throw new Error("Invite expired");

      const { error } = await supabase.rpc("accept_org_invite", {
        p_token: token,
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
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <Card
        style={{
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
        }}
      >
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Title level={3} style={{ margin: 0 }}>
            Welcome to CaseFlow
          </Title>
          <Text type="secondary">
            Create a new organization, or join an existing one using an invite.
          </Text>
        </Space>
      </Card>

      {error ? (
        <Alert type="error" showIcon message="Onboarding error" description={error} />
      ) : null}

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ApartmentOutlined />
                Create new organization
              </Space>
            }
            style={{ borderRadius: 16 }}
          >
            <Form form={formOrg} layout="vertical" onFinish={createOrg}>
              <Form.Item
                name="name"
                label="Organization name"
                rules={[
                  { required: true, message: "Enter an organization name" },
                  { min: 2, message: "Too short" },
                ]}
              >
                <Input placeholder="e.g., Acme Support" disabled={busy} />
              </Form.Item>

              <Button type="primary" icon={<PlusOutlined />} htmlType="submit" loading={busy} block>
                Create and continue
              </Button>

              <div style={{ marginTop: 10 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  You will become the <b>admin</b> of this organization.
                </Text>
              </div>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <KeyOutlined />
                Join with invite
              </Space>
            }
            style={{ borderRadius: 16 }}
          >
            <Form
              form={formInvite}
              layout="vertical"
              onFinish={acceptInvite}
              onValuesChange={(changed) => {
                if (changed.token !== undefined) {
                  if (previewTimer.current) clearTimeout(previewTimer.current);
                  previewTimer.current = setTimeout(() => previewInvite(changed.token), 250);
                }
              }}
            >
              <Form.Item
                name="token"
                label="Invite token"
                rules={[{ required: true, message: "Paste invite token" }]}
              >
                <Input placeholder="Paste token here…" disabled={busy} />
              </Form.Item>

              {inviteChecking ? <Tag>Checking invite…</Tag> : null}

              {invitePreview?.org_id ? (
                invitePreview._expired ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Invite expired"
                    description="Ask an admin to send a new invite."
                    style={{ marginBottom: 12 }}
                  />
                ) : (
                  <Alert
                    type="success"
                    showIcon
                    message={`Invite to: ${invitePreview.org_name || invitePreview.org_id}`}
                    description={
                      <Space direction="vertical" size={2}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Role: <b>{invitePreview.role}</b>
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Expires: {new Date(invitePreview.expires_at).toLocaleString()}
                        </Text>
                      </Space>
                    }
                    style={{ marginBottom: 12 }}
                  />
                )
              ) : null}

              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                htmlType="submit"
                loading={busy}
                block
                disabled={!formInvite.getFieldValue("token") || invitePreview?._expired}
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
    </Space>
  );
}

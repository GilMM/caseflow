"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { invalidateWorkspaceCache } from "@/lib/workspaceCache";
import { useWorkspace } from "@/contexts/WorkspaceContext";

import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
  theme,
} from "antd";
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  PlusOutlined,
  SwapOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function NewOrganizationPage() {
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams();
  const locale = params?.locale || "he";

  const { token } = theme.useToken();
  const { message } = App.useApp();
  const t = useTranslations("newOrg");
  const tCommon = useTranslations("common");

  const { refreshWorkspace } = useWorkspace();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(search.get("mode") === "join" ? "join" : "create");

  const [invitePreview, setInvitePreview] = useState(null);
  const [inviteChecking, setInviteChecking] = useState(false);

  const [formCreate] = Form.useForm();
  const [formJoin] = Form.useForm();
  const previewTimer = useRef(null);

  function normalizeInviteToken(input) {
    let raw = (input || "").trim();
    if (!raw) return "";

    raw = raw.replace(/[\s\-\u2013\u2014.,;:)\]]+$/g, "");

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
      message.error(e?.message || t("invalidInvite"));
    } finally {
      setInviteChecking(false);
    }
  }

  async function handleCreate(values) {
    setBusy(true);
    setError("");

    try {
      const orgName = values.name?.trim();
      if (!orgName) throw new Error(t("enterOrgName"));

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error(t("notAuthenticated"));

      // Create org
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

      // Create membership
      const { error: memErr } = await supabase.from("org_memberships").insert({
        org_id: org.id,
        user_id: userId,
        role: "admin",
        is_active: true,
      });
      if (memErr) throw memErr;

      // Set as active org
      const { error: wsErr } = await supabase
        .from("user_workspaces")
        .upsert(
          { user_id: userId, active_org_id: org.id },
          { onConflict: "user_id" }
        );
      if (wsErr) throw wsErr;

      // Create default queue
      await supabase.from("queues").insert({
        org_id: org.id,
        name: "General",
        is_default: true,
      });

      message.success(t("orgCreated"));
      invalidateWorkspaceCache();
      await refreshWorkspace();
      router.push(`/${locale}/?refresh=1`);
    } catch (e) {
      setError(e?.message || t("createFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(values) {
    setBusy(true);
    setError("");

    try {
      const tokenVal = normalizeInviteToken(values.token);
      if (!tokenVal) throw new Error(t("pasteToken"));
      if (invitePreview?._expired) throw new Error(t("inviteExpired"));

      const { error } = await supabase.rpc("accept_org_invite", {
        p_token: tokenVal,
      });
      if (error) throw error;

      // Set joined org as active
      const joinedOrgId = invitePreview?.org_id;
      if (joinedOrgId) {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (userId) {
          await supabase
            .from("user_workspaces")
            .upsert(
              { user_id: userId, active_org_id: joinedOrgId },
              { onConflict: "user_id" }
            );
        }
      }

      message.success(t("joinedOrg"));
      invalidateWorkspaceCache();
      await refreshWorkspace();
      router.push(`/${locale}/?refresh=1`);
    } catch (e) {
      setError(e?.message || t("joinFailed"));
    } finally {
      setBusy(false);
    }
  }

  const tabItems = [
    {
      key: "create",
      label: (
        <Space>
          <PlusOutlined />
          {t("createTab")}
        </Space>
      ),
      children: (
        <div style={{ padding: "16px 0" }}>
          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
            {t("createDesc")}
          </Text>

          <Form
            form={formCreate}
            layout="vertical"
            onFinish={handleCreate}
            requiredMark={false}
          >
            <Form.Item
              name="name"
              label={t("orgName")}
              rules={[
                { required: true, message: t("orgNameRequired") },
                { min: 2, message: t("orgNameTooShort") },
              ]}
            >
              <Input
                placeholder={t("orgNamePlaceholder")}
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
            >
              {t("createButton")}
            </Button>
          </Form>

          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("createHint")}
            </Text>
          </div>
        </div>
      ),
    },
    {
      key: "join",
      label: (
        <Space>
          <SwapOutlined />
          {t("joinTab")}
        </Space>
      ),
      children: (
        <div style={{ padding: "16px 0" }}>
          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
            {t("joinDesc")}
          </Text>

          <Form
            form={formJoin}
            layout="vertical"
            onFinish={handleJoin}
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
              label={t("inviteToken")}
              rules={[{ required: true, message: t("tokenRequired") }]}
            >
              <Input
                placeholder={t("tokenPlaceholder")}
                disabled={busy}
                size="large"
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  const normalized = normalizeInviteToken(text);
                  if (normalized && normalized !== text.trim()) {
                    e.preventDefault();
                    formJoin.setFieldsValue({ token: normalized });
                    previewInvite(normalized);
                  }
                }}
              />
            </Form.Item>

            <div style={{ minHeight: 60, marginBottom: 12 }}>
              {inviteChecking && <Tag>{t("checking")}</Tag>}

              {invitePreview?.org_id && (
                invitePreview._expired ? (
                  <Alert
                    type="warning"
                    showIcon
                    message={t("inviteExpired")}
                    description={t("inviteExpiredDesc")}
                  />
                ) : (
                  <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined />}
                    message={`${t("inviteTo")} ${invitePreview.org_name || invitePreview.org_id}`}
                    description={
                      <Space orientation="vertical" size={2}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t("role")}: <b>{invitePreview.role}</b>
                        </Text>
                        {invitePreview.expires_at && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {t("expires")}: {new Date(invitePreview.expires_at).toLocaleString()}
                          </Text>
                        )}
                      </Space>
                    }
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
              disabled={!formJoin.getFieldValue("token") || invitePreview?._expired}
            >
              {t("joinButton")}
            </Button>
          </Form>

          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("joinHint")}
            </Text>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 0" }}>
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
        >
          {tCommon("back")}
        </Button>

        <Card
          style={{
            borderRadius: 16,
            border: `1px solid ${token.colorBorder}`,
          }}
        >
          <Space orientation="vertical" size={8} style={{ width: "100%", marginBottom: 16 }}>
            <Title level={3} style={{ margin: 0 }}>
              <ApartmentOutlined style={{ marginInlineEnd: 8 }} />
              {t("title")}
            </Title>
            <Text type="secondary">{t("subtitle")}</Text>
          </Space>

          {error && (
            <Alert
              type="error"
              showIcon
              message={error}
              style={{ marginBottom: 16 }}
              closable
              onClose={() => setError("")}
            />
          )}

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
          />
        </Card>
      </Space>
    </div>
  );
}

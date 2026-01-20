// src/app/(app)/settings/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { supabase } from "@/lib/supabase/client";
import {
  getActiveWorkspace,
  diagnosticsOrgAccess,
  upsertMyProfile,
  updateOrgSettings,
} from "@/lib/db";

import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Grid,
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
  LogoutOutlined,
} from "@ant-design/icons";

import ProfileCard from "./_components/ProfileCard";
import OrgSettingsCard from "./_components/OrgSettingsCard";
import WorkspaceCard from "./_components/WorkspaceCard";
import SecurityCard from "./_components/SecurityCard";
import { getExt } from "./_components/helpers";
import AnnouncementsManager from "./_components/AnnouncementsManager";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function SettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { message } = App.useApp();

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);

  const [profile, setProfile] = useState(null);
  const [orgLogoUrl, setOrgLogoUrl] = useState(null);

  const [savingOrg, setSavingOrg] = useState(false);

  const [diag, setDiag] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // used to bust org logo cache
  const [logoBust, setLogoBust] = useState(0);
  const params = useParams();
  const locale = params?.locale || "he"; // או "en" לפי ברירת מחדל אצלך
  
  const isOwner =
    !!workspace?.ownerUserId && !!sessionUser?.id
      ? workspace.ownerUserId === sessionUser.id
      : false;

  const isAdmin = workspace?.role === "admin" || isOwner;

  async function loadAll({ silent = false } = {}) {
    try {
      setError("");
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user || null;

      if (!user) {
        router.replace(`/${locale}/login`);
        return;
      }

      setSessionUser(user);

      const ws = await getActiveWorkspace();
      setWorkspace(ws);

      // profile
      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, updated_at, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (pErr) throw pErr;
      setProfile(p || { id: user.id, full_name: "", avatar_url: null });

      // org logo + name (source of truth)
      if (ws?.orgId) {
        const { data: org, error: orgErr } = await supabase
          .from("organizations")
          .select("logo_url, name")
          .eq("id", ws.orgId)
          .maybeSingle();

        if (orgErr) throw orgErr;

        setOrgLogoUrl(org?.logo_url || null);
      } else {
        setOrgLogoUrl(null);
      }
    } catch (e) {
      const msg = e?.message || t("settings.messages.couldntLoad");
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
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      router.replace(`/${locale}/login`);
      router.refresh(); // מבטיח ניקוי state בצד לקוח
    }
  }
  

  async function onSaveProfile(values) {
    try {
      await upsertMyProfile({
        fullName: values.full_name?.trim() || null,
        avatarUrl: profile?.avatar_url ?? null,
      });
      message.success(t("settings.messages.profileUpdated"));
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || t("settings.messages.profileFailed"));
    }
  }

  async function onUploadAvatar(file) {
    const userId = sessionUser?.id;
    if (!userId) throw new Error("Not authenticated");

    try {
      const ext = getExt(file?.name);
      const path = `${userId}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file?.type || undefined,
        });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub?.publicUrl || null;

      await upsertMyProfile({
        fullName: profile?.full_name || null,
        avatarUrl: url,
      });

      message.success(t("settings.messages.avatarUpdated"));
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || t("settings.messages.avatarFailed"));
      throw e;
    }
  }

  async function onUploadOrgLogo(file) {
    if (!workspace?.orgId) throw new Error("No org");
    if (!isAdmin) throw new Error(t("settings.users.adminsOnly"));

    setSavingOrg(true);
    try {
      const ext = getExt(file?.name);
      const path = `${workspace.orgId}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("org-logos")
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file?.type || undefined,
        });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from("org-logos")
        .getPublicUrl(path);
      const url = pub?.publicUrl || null;

      const name = (workspace?.orgName || "").trim();
      await updateOrgSettings({
        orgId: workspace.orgId,
        name: name || workspace?.orgName || "Workspace",
        logoUrl: url,
      });

      // ✅ bust AFTER success
      setLogoBust(Date.now());

      message.success(t("settings.messages.logoUpdated"));
      await loadAll({ silent: true });
      await runDiagnostics(workspace.orgId);
    } catch (e) {
      message.error(e?.message || t("settings.messages.logoFailed"));
      throw e;
    } finally {
      setSavingOrg(false);
    }
  }

  async function onSaveOrg(values) {
    if (!workspace?.orgId) return;
    if (!isAdmin) return;

    const name = (values?.name || "").trim();
    if (!name) {
      message.error(t("settings.workspace.orgNameRequired"));
      return;
    }

    setSavingOrg(true);
    try {
      await updateOrgSettings({
        orgId: workspace.orgId,
        name,
        logoUrl: orgLogoUrl || null,
      });

      message.success(t("settings.messages.orgUpdated"));
      await loadAll({ silent: true });
      await runDiagnostics(workspace.orgId);
    } catch (e) {
      message.error(e?.message || t("settings.messages.orgFailed"));
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
            background:
              "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
          }}
        >
          <Row justify="space-between" align="middle" gutter={[12, 12]}>
            <Col xs={24} md="auto">
              <Space orientation="vertical" size={2} style={{ width: "100%" }}>
                <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                  {t("settings.header.title")}
                </Title>

                <Space wrap size={8}>
                  {workspace?.orgName ? (
                    <Tag color="blue">{t("common.workspace")}: {workspace.orgName}</Tag>
                  ) : (
                    <Tag>{t("common.workspace")}: {t("common.workspaceNone")}</Tag>
                  )}

                  <Tag icon={<SettingOutlined />}>{t("settings.header.configuration")}</Tag>
                  {isOwner ? <Tag color="gold">{t("settings.header.owner")}</Tag> : null}
                  {workspace?.role ? (
                    <Tag color="geekblue">{t("settings.header.role", { role: workspace.role })}</Tag>
                  ) : null}

                  <Tag color="green" icon={<WifiOutlined />}>
                    {t("settings.header.realtimeEnabled")}
                  </Tag>

                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("settings.header.subtitle")}
                  </Text>
                </Space>
              </Space>
            </Col>

            <Col xs={24} md="auto">
              <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
                <Tooltip title={t("settings.header.refreshTooltip")}>
                  <Button
                    icon={<ReloadOutlined />}
                    loading={refreshing}
                    onClick={() => loadAll({ silent: true })}
                    block={isMobile}
                  >
                    {t("common.refresh")}
                  </Button>
                </Tooltip>

                <Button
                  danger
                  icon={<LogoutOutlined />}
                  onClick={logout}
                  block={isMobile}
                >
                  {t("auth.logout")}
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {error ? (
          <Card style={{ borderRadius: 16, borderColor: "#ffccc7" }}>
            <Alert
              type="error"
              showIcon
              message={t("settings.messages.couldntLoad")}
              description={error}
            />
          </Card>
        ) : null}

        <Row gutter={[12, 12]}>
          {/* LEFT */}
          <Col xs={24} lg={12}>
            <ProfileCard
              sessionUser={sessionUser}
              profile={profile}
              onSaveProfile={onSaveProfile}
              onUploadAvatar={onUploadAvatar}
              isMobile={isMobile}
            />

            {isAdmin && workspace?.orgId ? (
              <AnnouncementsManager
                orgId={workspace.orgId}
                isAdmin={isAdmin}
                isMobile={isMobile}
              />
            ) : null}
          </Col>

          {/* RIGHT */}
          <Col xs={24} lg={12}>
            <WorkspaceCard
              workspace={workspace}
              isAdmin={isAdmin}
              isOwner={isOwner}
              isMobile={isMobile}
              onManageUsers={() => router.push(`/${locale}/settings/users`)}
              onRequestAccess={() =>
                message.info(
                  t("settings.messages.adminsOnlyManage")
                )
              }
            />

            {isAdmin && workspace?.orgId ? (
              <OrgSettingsCard
                workspace={workspace}
                orgLogoUrl={orgLogoUrl}
                savingOrg={savingOrg}
                onUploadLogo={onUploadOrgLogo}
                isMobile={isMobile}
                onSaveOrg={onSaveOrg}
                isOwner={isOwner}
                logoBust={logoBust}
              />
            ) : null}

            <SecurityCard
              isAdmin={isAdmin}
              orgId={workspace?.orgId || null}
              diag={diag}
              diagLoading={diagLoading}
              onRunDiagnostics={() => runDiagnostics(workspace.orgId)}
              isMobile={isMobile}
            />
          </Col>
        </Row>

        {/* Roadmap */}
        <Card style={{ borderRadius: 16 }}>
          <Space orientation="vertical" size={6}>
            <Text strong>{t("settings.nextUpgrades.title")}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("settings.nextUpgrades.items")}
            </Text>
          </Space>
        </Card>
      </Space>
    </Spin>
  );
}

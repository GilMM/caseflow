// src/app/[locale]/(app)/settings/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { supabase } from "@/lib/supabase/client";
import { diagnosticsOrgAccess, upsertMyProfile, updateOrgSettings } from "@/lib/db";
import { useUser, useWorkspace } from "@/contexts";

import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Grid,
  Menu,
  Row,
  Segmented,
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
  UserOutlined,
  AppstoreOutlined,
  ApiOutlined,
  SafetyOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import ProfileCard from "./_components/ProfileCard";
import OrgSettingsCard from "./_components/OrgSettingsCard";
import WorkspaceCard from "./_components/WorkspaceCard";
import SecurityCard from "./_components/SecurityCard";
import { getExt } from "./_components/helpers";
import AnnouncementsManager from "./_components/AnnouncementsManager";
import GoogleSheetsIntegrationCard from "./_components/GoogleSheetsIntegrationCard";
import DeleteOrganizationCard from "./_components/DeleteOrganizationCard";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const SECTION = {
  PROFILE: "profile",
  ORG: "org",
  INTEGRATIONS: "integrations",
  SECURITY: "security",
  DANGER: "danger",
};

export default function SettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { message } = App.useApp();

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const params = useParams();
  const locale = params?.locale || "he";

  const {
    user: sessionUser,
    profile,
    refreshProfile,
    loading: userLoading,
  } = useUser();

  const {
    workspace,
    isAdmin,
    isOwner,
    refreshWorkspace,
    loading: wsLoading,
  } = useWorkspace();

  // ✅ resolve orgId once, use everywhere
  const resolvedOrgId =
    workspace?.orgId ||
    workspace?.org_id ||
    workspace?.org?.id ||
    workspace?.id ||
    null;

  const loading = userLoading || wsLoading;

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState(null);
  const [savingOrg, setSavingOrg] = useState(false);
  const [diag, setDiag] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // used to bust org logo cache
  const [logoBust, setLogoBust] = useState(0);

  const [queues, setQueues] = useState([]);

  // ✅ Section state (synced with URL ?section=)
  const initialSection = useMemo(() => {
    const s = searchParams?.get("section");
    if (Object.values(SECTION).includes(s)) return s;
    return SECTION.PROFILE;
  }, [searchParams]);

  const [active, setActive] = useState(initialSection);

  // keep URL in sync (nice for refresh/share)
  useEffect(() => {
    const s = searchParams?.get("section");
    if (s === active) return;
    const next = new URLSearchParams(searchParams?.toString() || "");
    next.set("section", active);
    router.replace(`${pathname}?${next.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Fetch queues for integrations (default queue select)
  useEffect(() => {
    async function fetchQueues() {
      if (!resolvedOrgId) return;
      try {
        const { data, error } = await supabase
          .from("queues")
          .select("id, name")
          .eq("org_id", resolvedOrgId)
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setQueues(data || []);
      } catch (e) {
        console.error("Failed to fetch queues:", e);
      }
    }

    fetchQueues();
  }, [resolvedOrgId]);

  // Fetch org logo for OrgSettingsCard
  useEffect(() => {
    async function fetchOrgLogo() {
      if (!resolvedOrgId) {
        setOrgLogoUrl(null);
        return;
      }
      try {
        const { data: org, error: orgErr } = await supabase
          .from("organizations")
          .select("logo_url")
          .eq("id", resolvedOrgId)
          .maybeSingle();

        if (orgErr) throw orgErr;
        setOrgLogoUrl(org?.logo_url || null);
      } catch (e) {
        console.error("Failed to fetch org logo:", e);
      }
    }

    fetchOrgLogo();
  }, [resolvedOrgId]);

  async function handleRefresh() {
    try {
      setError("");
      setRefreshing(true);

      await Promise.all([refreshProfile(), refreshWorkspace()]);

      // Refetch org logo
      if (resolvedOrgId) {
        const { data: org } = await supabase
          .from("organizations")
          .select("logo_url")
          .eq("id", resolvedOrgId)
          .maybeSingle();
        setOrgLogoUrl(org?.logo_url || null);
      }
    } catch (e) {
      const msg = e?.message || t("settings.messages.couldntLoad");
      setError(msg);
      message.error(msg);
    } finally {
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
    if (!isAdmin || !resolvedOrgId) return;
    runDiagnostics(resolvedOrgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, resolvedOrgId]);

  async function logout() {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      router.replace(`/${locale}/login`);
      router.refresh();
    }
  }

  async function onSaveProfile(values) {
    try {
      await upsertMyProfile({
        fullName: values.full_name?.trim() || null,
        avatarUrl: profile?.avatar_url ?? null,
      });
      message.success(t("settings.messages.profileUpdated"));
      await refreshProfile();
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
      await refreshProfile();
    } catch (e) {
      message.error(e?.message || t("settings.messages.avatarFailed"));
      throw e;
    }
  }

  async function onUploadOrgLogo(file) {
    if (!resolvedOrgId) throw new Error("No org");
    if (!isAdmin) throw new Error(t("settings.users.adminsOnly"));

    setSavingOrg(true);
    try {
      const ext = getExt(file?.name);
      const path = `${resolvedOrgId}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("org-logos")
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file?.type || undefined,
        });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
      const url = pub?.publicUrl || null;

      const name = (workspace?.orgName || "").trim();
      await updateOrgSettings({
        orgId: resolvedOrgId,
        name: name || workspace?.orgName || "Workspace",
        logoUrl: url,
      });

      // bust AFTER success
      setLogoBust(Date.now());

      message.success(t("settings.messages.logoUpdated"));
      await refreshWorkspace();
      await runDiagnostics(resolvedOrgId);
    } catch (e) {
      message.error(e?.message || t("settings.messages.logoFailed"));
      throw e;
    } finally {
      setSavingOrg(false);
    }
  }

  async function onSaveOrg(values) {
    if (!resolvedOrgId) return;
    if (!isAdmin) return;

    const name = (values?.name || "").trim();
    if (!name) {
      message.error(t("settings.workspace.orgNameRequired"));
      return;
    }

    setSavingOrg(true);
    try {
      await updateOrgSettings({
        orgId: resolvedOrgId,
        name,
        logoUrl: orgLogoUrl || null,
      });

      message.success(t("settings.messages.orgUpdated"));
      await refreshWorkspace();
      await runDiagnostics(resolvedOrgId);
    } catch (e) {
      message.error(e?.message || t("settings.messages.orgFailed"));
    } finally {
      setSavingOrg(false);
    }
  }

  const menuItems = useMemo(() => {
    const items = [
      {
        key: SECTION.PROFILE,
        icon: <UserOutlined />,
        label: t("settings.header.profile") ?? "Profile",
      },
      {
        key: SECTION.ORG,
        icon: <AppstoreOutlined />,
        label: t("settings.header.organization") ?? "Organization",
      },
      {
        key: SECTION.INTEGRATIONS,
        icon: <ApiOutlined />,
        label: t("settings.header.integrations") ?? "Integrations",
      },
      {
        key: SECTION.SECURITY,
        icon: <SafetyOutlined />,
        label: t("settings.header.security") ?? "Security",
      },
    ];

    if (isOwner) {
      items.push({
        key: SECTION.DANGER,
        icon: <DeleteOutlined />,
        label: t("settings.header.dangerZone") ?? "Danger Zone",
        danger: true,
      });
    }

    return items;
  }, [t, isOwner]);

  // Mobile control: friendly segmented tabs instead of hamburger
  const mobileSegments = useMemo(() => {
    const base = [
      { label: t("settings.header.profile") ?? "Profile", value: SECTION.PROFILE, icon: <UserOutlined /> },
      { label: t("settings.header.organization") ?? "Org", value: SECTION.ORG, icon: <AppstoreOutlined /> },
      { label: t("settings.header.integrations") ?? "Integrations", value: SECTION.INTEGRATIONS, icon: <ApiOutlined /> },
      { label: t("settings.header.security") ?? "Security", value: SECTION.SECURITY, icon: <SafetyOutlined /> },
    ];

    if (isOwner) {
      base.push({ label: t("settings.header.dangerZone") ?? "Danger", value: SECTION.DANGER, icon: <DeleteOutlined /> });
    }

    return base;
  }, [t, isOwner]);

  function renderSection() {
    const hasOrg = !!resolvedOrgId;

    switch (active) {
      case SECTION.PROFILE:
        return (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Title level={5} style={{ margin: 0 }}>
              {t("settings.header.profile") ?? "Profile"}
            </Title>
            <ProfileCard
              sessionUser={sessionUser}
              profile={profile}
              onSaveProfile={onSaveProfile}
              onUploadAvatar={onUploadAvatar}
              isMobile={isMobile}
            />
          </Space>
        );

      case SECTION.ORG:
        return (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Title level={5} style={{ margin: 0 }}>
              {t("settings.header.organization") ?? "Organization"}
            </Title>

            <WorkspaceCard
              workspace={workspace}
              isAdmin={isAdmin}
              isOwner={isOwner}
              isMobile={isMobile}
              onManageUsers={() => router.push(`/${locale}/settings/users`)}
              onRequestAccess={() =>
                message.info(t("settings.messages.adminsOnlyManage"))
              }
            />

            {/* ✅ Announcements belong here (org communication), not integrations */}
            {isAdmin && hasOrg ? (
              <AnnouncementsManager
                orgId={resolvedOrgId}
                isAdmin={isAdmin}
                isMobile={isMobile}
              />
            ) : null}

            {isAdmin && hasOrg ? (
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
          </Space>
        );

      case SECTION.INTEGRATIONS:
        return (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Title level={5} style={{ margin: 0 }}>
              {t("settings.header.integrations") ?? "Integrations"}
            </Title>

            {isAdmin && hasOrg ? (
              <GoogleSheetsIntegrationCard
                orgId={resolvedOrgId}
                queues={queues}
                returnTo={`/${locale}/settings`}
                isMobile={isMobile}
              />
            ) : (
              <Alert
                type="info"
                showIcon
                message={t("settings.users.adminsOnly") ?? "Admins only"}
                description={
                  t("settings.messages.adminsOnlyManage") ??
                  "Only admins can manage integrations."
                }
              />
            )}
          </Space>
        );

      case SECTION.SECURITY:
        return (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Title level={5} style={{ margin: 0 }}>
              {t("settings.header.security") ?? "Security"}
            </Title>

            <SecurityCard
              isAdmin={isAdmin}
              orgId={resolvedOrgId}
              diag={diag}
              diagLoading={diagLoading}
              onRunDiagnostics={() => runDiagnostics(resolvedOrgId)}
              isMobile={isMobile}
            />
          </Space>
        );

      case SECTION.DANGER:
        return (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Title level={5} style={{ margin: 0 }}>
              {t("settings.header.dangerZone") ?? "Danger Zone"}
            </Title>

            {isOwner && hasOrg ? (
              <DeleteOrganizationCard
                orgId={resolvedOrgId}
                orgName={workspace?.orgName || ""}
                isMobile={isMobile}
              />
            ) : (
              <Alert type="warning" showIcon message="Owners only" />
            )}
          </Space>
        );

      default:
        return null;
    }
  }

  const sidebar = (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <Space direction="vertical" size={2} style={{ width: "100%" }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t("settings.header.title")}
        </Text>
        <Text strong style={{ fontSize: 16 }}>
          {workspace?.orgName || t("common.workspaceNone")}
        </Text>

        <Space wrap size={6}>
          {workspace?.role ? (
            <Tag color="geekblue">
              {t("settings.header.role", { role: workspace.role })}
            </Tag>
          ) : null}
          {isOwner ? <Tag color="gold">{t("settings.header.owner")}</Tag> : null}
        </Space>
      </Space>

      <Menu
        mode="inline"
        selectedKeys={[active]}
        items={menuItems}
        onClick={({ key }) => setActive(key)}
        style={{ border: "none" }}
      />
    </Space>
  );

  return (
    <Spin spinning={loading} size="large">
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
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
              <Space direction="vertical" size={2} style={{ width: "100%" }}>
                <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                  {t("settings.header.title")}
                </Title>

                <Space wrap size={8}>
                  {workspace?.orgName ? (
                    <Tag color="blue">
                      {t("common.workspace")}: {workspace.orgName}
                    </Tag>
                  ) : (
                    <Tag>
                      {t("common.workspace")}: {t("common.workspaceNone")}
                    </Tag>
                  )}

                  <Tag icon={<SettingOutlined />}>
                    {t("settings.header.configuration")}
                  </Tag>

                  {isOwner ? (
                    <Tag color="gold">{t("settings.header.owner")}</Tag>
                  ) : null}

                  {workspace?.role ? (
                    <Tag color="geekblue">
                      {t("settings.header.role", { role: workspace.role })}
                    </Tag>
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
                    onClick={handleRefresh}
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
              title={t("settings.messages.couldntLoad")}
              description={error}
            />
          </Card>
        ) : null}

        {/* Mobile: segmented control for sections (friendly) */}
        {isMobile ? (
          <Card style={{ borderRadius: 16 }}>
            <Segmented
              block
              value={active}
              onChange={(val) => setActive(val)}
              options={mobileSegments}
            />
          </Card>
        ) : null}

        <Row gutter={[12, 12]}>
          {/* Sidebar (desktop) */}
          {!isMobile ? (
            <Col xs={24} md={7} lg={6}>
              <Card style={{ borderRadius: 16 }}>{sidebar}</Card>
            </Col>
          ) : null}

          {/* Main content */}
          <Col xs={24} md={17} lg={18}>
            <Card style={{ borderRadius: 16 }}>{renderSection()}</Card>
          </Col>
        </Row>

        {/* Roadmap */}
        <Card style={{ borderRadius: 16 }}>
          <Space direction="vertical" size={6}>
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

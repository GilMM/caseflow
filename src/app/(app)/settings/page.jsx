// src/app/(app)/settings/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Grid,
  Input,
  Row,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
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
  UploadOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

/* ---------------- helpers ---------------- */

function initials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b =
    parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || "";
  return (a + b).toUpperCase() || "?";
}

function safeSrc(url, bust) {
  const u = (url || "").trim();
  if (!u) return null;
  const v = bust ? String(bust) : String(Date.now());
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}v=${encodeURIComponent(v)}`;
}


function getExt(filename) {
  const parts = String(filename || "").split(".");
  const ext = parts.length > 1 ? parts.pop() : "png";
  return String(ext || "png").toLowerCase();
}



/* ---------------- child cards ---------------- */

function ProfileCard({
  sessionUser,
  profile,
  onSaveProfile,
  onUploadAvatar,
  isMobile,
  form,
}) {
  const profileForm = form;

  useEffect(() => {
    profileForm?.setFieldsValue({
      full_name: profile?.full_name || "",
    });
  }, [profileForm, profile?.full_name]);

  const userLabel = useMemo(() => {
    const name = profileForm?.getFieldValue("full_name");
    const email = sessionUser?.email;
    return name || email || "Account";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser, profile?.full_name]);

const avatarUrl = safeSrc(profile?.avatar_url, profile?.updated_at);

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
        <Text type="secondary" style={{ fontSize: 12, wordBreak: "break-word" }}>
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
        <Col flex="auto" style={{ minWidth: 0 }}>
          <Space orientation="vertical" size={0} style={{ width: "100%" }}>
            <Text strong style={{ fontSize: 14, wordBreak: "break-word" }}>
              {userLabel}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Update your display name and avatar.
            </Text>
          </Space>
        </Col>
      </Row>

      <Divider style={{ margin: "12px 0" }} />

      <Form
        form={profileForm}
        layout="vertical"
        onFinish={onSaveProfile}
        requiredMark={false}
      >
        <Form.Item
          label="Display name"
          name="full_name"
          rules={[{ min: 2, message: "Too short" }]}
        >
          <Input placeholder="e.g., Gil Meshulami" />
        </Form.Item>

        <Form.Item label="Avatar">
          <Upload
            accept="image/*"
            showUploadList={false}
            customRequest={async ({ file, onSuccess, onError }) => {
              try {
                await onUploadAvatar(file);
                onSuccess?.("ok");
              } catch (e) {
                onError?.(e);
              }
            }}
          >
            <Button icon={<UploadOutlined />} block={isMobile}>
              Upload avatar
            </Button>
          </Upload>

          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Stored in Supabase Storage bucket <Text code>avatars</Text>.
            </Text>
          </div>
        </Form.Item>

        <Space wrap style={{ width: "100%" }}>
          <Button onClick={() => profileForm.resetFields()} block={isMobile}>
            Reset
          </Button>
          <Button type="primary" htmlType="submit" block={isMobile}>
            Save
          </Button>
        </Space>
      </Form>
    </Card>
  );
}

function OrgSettingsCard({
  workspace,
  orgLogoUrl,
  savingOrg,
  onUploadLogo,
  isMobile,
  form,
  onSaveOrg,
  isOwner,
  logoBust
}) {
  const orgForm = form;

  useEffect(() => {
    if (!workspace?.orgId) return;
    orgForm.setFieldsValue({ name: workspace?.orgName || "" });
  }, [orgForm, workspace?.orgId, workspace?.orgName]);

  const logoSrc = safeSrc(orgLogoUrl, logoBust);

  return (
    <Card
      style={{ borderRadius: 16, marginTop: 12 }}
      title={
        <Space size={8}>
          <EditOutlined />
          <span>Organization</span>
        </Space>
      }
      extra={<Tag color={isOwner ? "gold" : "blue"}>{isOwner ? "Owner" : "Admin"}</Tag>}
    >
      <Row gutter={[12, 12]} align="middle">
        <Col>
          <Avatar shape="square" size={56} src={logoSrc}>
            {initials(workspace?.orgName || "Org")}
          </Avatar>
        </Col>
        <Col flex="auto" style={{ minWidth: 0 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Upload an organization logo and update the name.
          </Text>
        </Col>
      </Row>

      <Divider style={{ margin: "12px 0" }} />

      <Form form={orgForm} layout="vertical" onFinish={onSaveOrg} requiredMark={false}>
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

        <Form.Item label="Logo">
          <Upload
            accept="image/*"
            showUploadList={false}
            customRequest={async ({ file, onSuccess, onError }) => {
              try {
                await onUploadLogo(file);
                onSuccess?.("ok");
              } catch (e) {
                onError?.(e);
              }
            }}
          >
            <Button icon={<UploadOutlined />} loading={savingOrg} block={isMobile}>
              Upload logo
            </Button>
          </Upload>

          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Stored in Supabase Storage bucket <Text code>org-logos</Text>.
            </Text>
          </div>
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={savingOrg} block={isMobile}>
          Save organization
        </Button>
      </Form>
    </Card>
  );
}

/* ---------------- page ---------------- */

export default function SettingsPage() {
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

  const [profileForm] = Form.useForm();
  const [orgForm] = Form.useForm();
const [logoBust, setLogoBust] = useState(0);

  const isOwner =
    !!workspace?.ownerUserId && !!sessionUser?.id
      ? workspace.ownerUserId === sessionUser.id
      : false;

  // ✅ אין "owner" ב-enum. Owner נקבע ע"י owner_user_id
  const isAdmin = workspace?.role === "admin" || isOwner;

  async function loadAll({ silent = false } = {}) {
    try {
      setError("");
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user || null;

      if (!user) {
        router.replace("/login");
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
        orgForm.setFieldsValue({ name: org?.name || ws?.orgName || "" });
      } else {
        setOrgLogoUrl(null);
      }
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

  async function onSaveProfile(values) {
    try {
      await upsertMyProfile({
        fullName: values.full_name?.trim() || null,
        avatarUrl: profile?.avatar_url ?? null,
      });
      message.success("Profile updated");
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || "Failed to save profile");
    }
  }

async function onUploadAvatar(file) {
  const userId = sessionUser?.id;
  if (!userId) throw new Error("Not authenticated");

  try {
    const ext = getExt(file?.name);
    const path = `${userId}.${ext}`;

    // upload
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file?.type });

    if (upErr) {
      console.error("[avatars.upload] ", upErr);
      throw upErr;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub?.publicUrl || null;

    console.log("[avatars.publicUrl]", url);

    // update profile
    await upsertMyProfile({
      fullName: profileForm.getFieldValue("full_name") || profile?.full_name || null,
      avatarUrl: url,
    });

    message.success("Avatar updated");
    await loadAll({ silent: true });
  } catch (e) {
    console.error("[onUploadAvatar] ", e);
    message.error(e?.message || "Avatar upload failed");
    throw e;
  }
}


async function onUploadOrgLogo(file) {
  if (!workspace?.orgId) throw new Error("No org");
  if (!isAdmin) throw new Error("Admins only");

  setSavingOrg(true);
  try {
    const ext = getExt(file?.name);
    const path = `${workspace.orgId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("org-logos")
      .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file?.type });

    if (upErr) {
      console.error("[org-logos.upload] ", upErr);
      throw upErr;
    }

    const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
    const url = pub?.publicUrl || null;

    console.log("[org-logos.publicUrl]", url);

    const name = (orgForm.getFieldValue("name") || workspace?.orgName || "").trim();
    await updateOrgSettings({
      orgId: workspace.orgId,
      name: name || workspace?.orgName || "Workspace",
      logoUrl: url,
    });

    message.success("Organization logo updated");
    await loadAll({ silent: true });
    await runDiagnostics(workspace.orgId);
  } catch (e) {
    console.error("[onUploadOrgLogo] ", e);
    message.error(e?.message || "Logo upload failed");
    throw e;
  } finally {
    setSavingOrg(false);
  }
  setLogoBust(Date.now());
const { data: checkOrg, error: checkErr } = await supabase
  .from("organizations")
  .select("logo_url")
  .eq("id", workspace.orgId)
  .single();

console.log("[org.logo_url after update]", checkOrg?.logo_url, checkErr);

}


  async function onSaveOrg(values) {
    if (!workspace?.orgId) return;
    if (!isAdmin) return;

    const name = (values?.name || "").trim();
    if (!name) {
      message.error("Organization name is required");
      return;
    }

    setSavingOrg(true);
    try {
      // שומר שם + משאיר לוגו כמו שהוא (אם קיים)
      await updateOrgSettings({
        orgId: workspace.orgId,
        name,
        logoUrl: orgLogoUrl || null,
      });

      message.success("Organization updated");
      await loadAll({ silent: true });
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
            <Col xs={24} md="auto">
              <Space orientation="vertical" size={2} style={{ width: "100%" }}>
                <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
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

                  {isOwner ? <Tag color="gold">Owner</Tag> : null}

                  <Tag color="green" icon={<WifiOutlined />}>
                    Realtime enabled
                  </Tag>

                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Account & workspace preferences
                  </Text>
                </Space>
              </Space>
            </Col>

            <Col xs={24} md="auto">
              <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
                <Tooltip title="Refresh settings">
                  <Button
                    icon={<ReloadOutlined />}
                    loading={refreshing}
                    onClick={() => loadAll({ silent: true })}
                    block={isMobile}
                  >
                    Refresh
                  </Button>
                </Tooltip>

                <Button danger icon={<LogoutOutlined />} onClick={logout} block={isMobile}>
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
          {/* LEFT */}
          <Col xs={24} lg={12}>
            <ProfileCard
              sessionUser={sessionUser}
              profile={profile}
              onSaveProfile={onSaveProfile}
              onUploadAvatar={onUploadAvatar}
              isMobile={isMobile}
              form={profileForm}
            />
          </Col>

          {/* RIGHT */}
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
                    <Text strong style={{ wordBreak: "break-word" }}>
                      {workspace.orgName || workspace.orgId}
                    </Text>
                  </Space>

                  <Space wrap size={8}>
                    <Tag color="geekblue">Role</Tag>
                    <Text>{workspace.role || "—"}</Text>
                    {isOwner ? <Tag color="gold">Owner</Tag> : null}
                  </Space>

                  <Space wrap size={8}>
                    <Tag color="green" icon={<WifiOutlined />}>
                      Realtime
                    </Tag>
                    <Text type="secondary">Subscribed to activity streams (postgres_changes)</Text>
                  </Space>

                  <Divider style={{ margin: "10px 0" }} />

                  <Space
                    wrap={!isMobile}
                    orientation={isMobile ? "vertical" : "horizontal"}
                    style={{ width: "100%" }}
                  >
                    <Tooltip title={isAdmin ? "Manage members & invites" : "Admins only"}>
                      <Button
                        type="primary"
                        icon={<TeamOutlined />}
                        disabled={!isAdmin}
                        onClick={() => {
                          if (!isAdmin) return;
                          router.push("/settings/users");
                        }}
                        block={isMobile}
                      >
                        Manage users
                      </Button>
                    </Tooltip>

                    {!isAdmin ? (
                      <Button
                        onClick={() =>
                          message.info("Only workspace admins can manage members and invitations.")
                        }
                        block={isMobile}
                      >
                        Request access
                      </Button>
                    ) : null}
                  </Space>

                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {isAdmin
                      ? "Manage members and invites for this workspace."
                      : "This area is available to admins only."}
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

            {/* Admin: Organization */}
            {isAdmin && workspace?.orgId ? (
              <OrgSettingsCard
                workspace={workspace}
                orgLogoUrl={orgLogoUrl}
                savingOrg={savingOrg}
                onUploadLogo={onUploadOrgLogo}
                isMobile={isMobile}
                form={orgForm}
                onSaveOrg={onSaveOrg}
                isOwner={isOwner}
                  logoBust={logoBust}

              />
            ) : null}

            {/* Security diagnostics */}
            <Card style={{ borderRadius: 16, marginTop: 12 }}>
              <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                <Space size={8}>
                  <SafetyOutlined />
                  <Text strong>Security (RLS)</Text>
                </Space>

                <Text type="secondary" style={{ fontSize: 12 }}>
                  Data is scoped by org membership using Row Level Security (RLS).
                </Text>

                {isAdmin && workspace?.orgId ? (
                  <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                    <Button
                      icon={<ReloadOutlined />}
                      loading={diagLoading}
                      onClick={() => runDiagnostics(workspace.orgId)}
                      block={isMobile}
                    >
                      Run diagnostics
                    </Button>

                    <Space wrap size={8}>
                      {diag ? (
                        <>
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
                        </>
                      ) : (
                        <Tag>Not loaded</Tag>
                      )}
                    </Space>
                  </Space>
                ) : (
                  <Alert
                    type="info"
                    showIcon
                    message="Diagnostics available for admins"
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
              • Persist profile in <Text code>profiles</Text> • Workspace switcher • Notifications • SLA
              per queue
            </Text>
          </Space>
        </Card>
      </Space>
    </Spin>
  );
}

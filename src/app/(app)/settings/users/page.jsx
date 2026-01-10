"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";

import {
  listOrgMembers,
  setMemberRole,
  setMemberActive,
  createOrgInvite,
  getOrgInvites,
  revokeOrgInvite,
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
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Switch,
  Popconfirm,
} from "antd";

import {
  TeamOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  CopyOutlined,
  StopOutlined,
  MailOutlined,
  CrownOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

/* ---------------- helpers ---------------- */

function initials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || "";
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

function inviteLinkFromToken(token) {
  return `${window.location.origin}/onboarding?invite=${token}`;
}

function inviteStatusTag(inv) {
  const now = Date.now();
  const exp = inv.expires_at ? new Date(inv.expires_at).getTime() : null;
  if (inv.accepted_at) return <Tag color="green">Accepted</Tag>;
  if (exp && exp < now) return <Tag>Expired</Tag>;
  return <Tag color="blue">Pending</Tag>;
}

/* ---------------- Mobile Cards ---------------- */

function MemberCard({
  r,
  ownerUserId,
  sessionUserId,
  membersUpdating,
  orgId,
  onChangeMemberRole,
  onToggleMemberActive,
}) {
  const label = ((r?.full_name || r?.email || "User")?.trim?.() || r?.email || "User");
  const sub = r?.email || "—";
  const isOwnerRow = !!ownerUserId && r?.user_id === ownerUserId;
  const disableEdit = membersUpdating || r.user_id === sessionUserId || isOwnerRow;
  const isActive = !!r?.is_active;

  return (
    <Card size="small" style={{ borderRadius: 14 }}>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Space align="start" size={12} style={{ width: "100%" }}>
          <Avatar src={r?.avatar_url || undefined}>{initials(label)}</Avatar>

          <div style={{ flex: 1, minWidth: 0 }}>
            <Space direction="vertical" size={2} style={{ width: "100%" }}>
              <Space wrap size={8}>
                <Text strong style={{ fontSize: 14, wordBreak: "break-word" }}>
                  {label}
                </Text>
                {isOwnerRow ? (
                  <Tag icon={<CrownOutlined />} color="gold">
                    Owner
                  </Tag>
                ) : null}
              </Space>

              <Text type="secondary" style={{ fontSize: 12, wordBreak: "break-word" }}>
                {sub}
              </Text>

              <Text type="secondary" style={{ fontSize: 12 }}>
                Joined {timeAgo(r?.created_at)}
              </Text>
            </Space>
          </div>
        </Space>

        <Divider style={{ margin: "6px 0" }} />

        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Role
            </Text>
            <Select
              value={r?.role}
              style={{ width: "100%" }}
              disabled={disableEdit}
              options={[
                { value: "admin", label: "Admin" },
                { value: "agent", label: "Agent" },
                { value: "viewer", label: "Viewer" },
              ]}
              onChange={(role) => onChangeMemberRole(orgId, r.user_id, role)}
            />
            {disableEdit ? (
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 6 }}>
                {isOwnerRow
                  ? "Owner is protected"
                  : r.user_id === sessionUserId
                  ? "You can’t change yourself"
                  : "Updating…"}
              </Text>
            ) : null}
          </div>

          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space size={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Active
              </Text>
              <Tag color={isActive ? "green" : "default"}>{isActive ? "Active" : "Inactive"}</Tag>
            </Space>

            <Switch
              checked={isActive}
              disabled={disableEdit}
              onChange={(checked) => onToggleMemberActive(orgId, r.user_id, checked)}
            />
          </Space>
        </Space>
      </Space>
    </Card>
  );
}

function InviteCard({ r, onRevokeInvite, message }) {
  const disabled = !!r.accepted_at;
  const link = inviteLinkFromToken(r.token);

  return (
    <Card size="small" style={{ borderRadius: 14 }}>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Space direction="vertical" size={2} style={{ width: "100%" }}>
          <Text strong style={{ fontSize: 14, wordBreak: "break-word" }}>
            {r.email}
          </Text>
          <Space wrap size={8}>
            <Tag>{r.role}</Tag>
            {inviteStatusTag(r)}
            <Text type="secondary" style={{ fontSize: 12 }}>
              Created {timeAgo(r.created_at)}
            </Text>
          </Space>
        </Space>

        <Divider style={{ margin: "6px 0" }} />

        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Button
            icon={<CopyOutlined />}
            disabled={disabled}
            block
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                message.success("Link copied");
              } catch {
                message.info("Couldn’t copy automatically. Copy from desktop browser.");
              }
            }}
          >
            Copy invite link
          </Button>

          <Popconfirm
            title="Revoke invite?"
            okText="Revoke"
            cancelText="Cancel"
            onConfirm={() => onRevokeInvite(r.id)}
            disabled={disabled}
          >
            <Button danger icon={<StopOutlined />} disabled={disabled} block>
              Revoke
            </Button>
          </Popconfirm>

          {!disabled ? (
            <Text type="secondary" style={{ fontSize: 12, wordBreak: "break-word" }}>
              {link}
            </Text>
          ) : null}
        </Space>
      </Space>
    </Card>
  );
}

/* ---------------- Invites Panel ---------------- */

function InvitesPanel({
  invites,
  invitesLoading,
  invitesColumns,
  onCreateInvite,
  creatingInvite,
  isMobile,
  onRevokeInvite,
  message,
}) {
  const [inviteForm] = Form.useForm();

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        style={{
          borderRadius: 12,
          background: "rgba(0,0,0,0.02)",
        }}
      >
        <Form
          form={inviteForm}
          layout={isMobile ? "vertical" : "inline"}
          onFinish={(values) => onCreateInvite(values, inviteForm)}
          initialValues={{ role: "agent" }}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email" },
            ]}
            style={isMobile ? { marginBottom: 10 } : undefined}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="user@company.com"
              style={isMobile ? { width: "100%" } : { width: 280 }}
            />
          </Form.Item>

          <Form.Item name="role" style={isMobile ? { marginBottom: 10 } : undefined}>
            <Select
              style={isMobile ? { width: "100%" } : { width: 160 }}
              options={[
                { value: "agent", label: "Agent" },
                { value: "viewer", label: "Viewer" },
                { value: "admin", label: "Admin" },
              ]}
            />
          </Form.Item>

          <Button type="primary" icon={<PlusOutlined />} htmlType="submit" loading={creatingInvite} block={isMobile}>
            Create invite
          </Button>
        </Form>

        <Divider style={{ margin: "12px 0" }} />

        <Text type="secondary" style={{ fontSize: 12 }}>
          Tip: the link is copied automatically. The invited user must be logged-in with the same email.
        </Text>
      </Card>

      {/* Desktop table */}
      {!isMobile ? (
        <Table
          rowKey="id"
          loading={invitesLoading}
          dataSource={invites}
          columns={invitesColumns}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 950 }}
        />
      ) : (
        <Space direction="vertical" size={10} style={{ width: "100%", opacity: invitesLoading ? 0.7 : 1 }}>
          {(invites || []).length ? (
            invites.map((r) => (
              <InviteCard key={r.id} r={r} onRevokeInvite={onRevokeInvite} message={message} />
            ))
          ) : (
            <Card size="small" style={{ borderRadius: 14 }}>
              <Text type="secondary">No invites yet</Text>
            </Card>
          )}
        </Space>
      )}
    </Space>
  );
}

/* ---------------- page ---------------- */

export default function UsersManagementPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [activeTab, setActiveTab] = useState("members");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);

  const isAdmin = workspace?.role === "admin";
  const ownerUserId = workspace?.ownerUserId || null;

  // Members
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersUpdating, setMembersUpdating] = useState(false);

  // Invites
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  async function boot({ silent = false } = {}) {
    try {
      setError("");
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user || null;
      if (!user) {
        router.replace("/login");
        return;
      }
      setSessionUser(user);

      const ws = await getActiveWorkspace();
      if (!ws?.orgId) {
        router.replace("/onboarding");
        return;
      }
      setWorkspace(ws);

      if (ws?.role !== "admin") {
        message.error("Admins only");
        router.replace("/settings");
        return;
      }

      await Promise.all([loadMembers(ws.orgId), loadInvites(ws.orgId)]);
    } catch (e) {
      setError(e?.message || "Failed to load users management");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadMembers(orgId) {
    if (!orgId) return;
    try {
      setMembersLoading(true);
      const rows = await listOrgMembers(orgId);
      setMembers(rows || []);
    } catch (e) {
      setMembers([]);
      message.error(e?.message || "Failed to load members");
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadInvites(orgId) {
    if (!orgId) return;
    try {
      setInvitesLoading(true);
      const rows = await getOrgInvites(orgId);
      setInvites(rows || []);
    } catch (e) {
      setInvites([]);
      message.error(e?.message || "Failed to load invites");
    } finally {
      setInvitesLoading(false);
    }
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreateInvite(values, formInstance) {
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
        await navigator.clipboard.writeText(link);
        message.success("Invite created & link copied");
      } catch {
        message.success("Invite created");
        message.info("Copy from the list");
      }

      formInstance?.resetFields?.();
      await loadInvites(workspace.orgId);
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
      await loadInvites(workspace.orgId);
    } catch (e) {
      message.error(e?.message || "Failed to revoke");
    }
  }

  async function onChangeMemberRole(orgId, userId, role) {
    try {
      setMembersUpdating(true);
      await setMemberRole({ orgId, userId, role });
      message.success("Role updated");
      await loadMembers(orgId);
    } catch (e) {
      message.error(e?.message || "Failed to update role");
    } finally {
      setMembersUpdating(false);
    }
  }

  async function onToggleMemberActive(orgId, userId, isActive) {
    try {
      setMembersUpdating(true);
      await setMemberActive({ orgId, userId, isActive });
      message.success(isActive ? "Member activated" : "Member deactivated");
      await loadMembers(orgId);
    } catch (e) {
      message.error(e?.message || "Failed to update member");
    } finally {
      setMembersUpdating(false);
    }
  }

  const membersColumns = useMemo(
    () => [
      {
        title: "User",
        dataIndex: "email",
        render: (_, r) => {
          const label = ((r?.full_name || r?.email || "User")?.trim?.() || r?.email || "User");
          const sub = r?.email || "—";
          const isOwnerRow = !!ownerUserId && r?.user_id === ownerUserId;

          return (
            <Space>
              <Avatar src={r?.avatar_url || undefined}>{initials(label)}</Avatar>

              <Space orientation="vertical" size={0}>
                <Space size={8} wrap>
                  <Text strong>{label}</Text>
                  {isOwnerRow ? (
                    <Tag icon={<CrownOutlined />} color="gold">
                      Owner
                    </Tag>
                  ) : null}
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {sub}
                </Text>
              </Space>
            </Space>
          );
        },
      },
      {
        title: "Role",
        dataIndex: "role",
        width: 180,
        render: (v, r) => {
          const isOwnerRow = !!ownerUserId && r?.user_id === ownerUserId;
          const disableEdit = membersUpdating || r.user_id === sessionUser?.id || isOwnerRow;

          return (
            <Select
              value={v}
              style={{ width: 160 }}
              disabled={disableEdit}
              options={[
                { value: "admin", label: "Admin" },
                { value: "agent", label: "Agent" },
                { value: "viewer", label: "Viewer" },
              ]}
              onChange={(role) => onChangeMemberRole(workspace.orgId, r.user_id, role)}
            />
          );
        },
      },
      {
        title: "Active",
        dataIndex: "is_active",
        width: 140,
        render: (v, r) => {
          const isOwnerRow = !!ownerUserId && r?.user_id === ownerUserId;
          const disableEdit = membersUpdating || r.user_id === sessionUser?.id || isOwnerRow;

          return (
            <Switch
              checked={!!v}
              disabled={disableEdit}
              onChange={(checked) => onToggleMemberActive(workspace.orgId, r.user_id, checked)}
            />
          );
        },
      },
      {
        title: "Joined",
        dataIndex: "created_at",
        width: 140,
        render: (v) => <Text type="secondary">{timeAgo(v)}</Text>,
      },
    ],
    [membersUpdating, workspace?.orgId, sessionUser?.id, ownerUserId]
  );

  const invitesColumns = useMemo(
    () => [
      {
        title: "Email",
        dataIndex: "email",
        width: 260,
        render: (v) => <Text>{v}</Text>,
      },
      {
        title: "Role",
        dataIndex: "role",
        width: 120,
        render: (v) => <Tag>{v}</Tag>,
      },
      {
        title: "Status",
        width: 140,
        render: (_, r) => inviteStatusTag(r),
      },
      {
        title: "Created",
        dataIndex: "created_at",
        width: 140,
        render: (v) => <Text type="secondary">{timeAgo(v)}</Text>,
      },
      {
        title: "",
        width: 140,
        align: "right",
        render: (_, r) => {
          const disabled = !!r.accepted_at;
          return (
            <Space>
              <Tooltip title="Copy invite link">
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  disabled={disabled}
                  onClick={async () => {
                    const link = inviteLinkFromToken(r.token);
                    await navigator.clipboard.writeText(link);
                    message.success("Link copied");
                  }}
                />
              </Tooltip>

              <Popconfirm
                title="Revoke invite?"
                okText="Revoke"
                cancelText="Cancel"
                onConfirm={() => onRevokeInvite(r.id)}
                disabled={disabled}
              >
                <Tooltip title="Revoke invite">
                  <Button size="small" danger icon={<StopOutlined />} disabled={disabled} />
                </Tooltip>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [message]
  );

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
          <Col xs={24} md="auto">
            <Space orientation="vertical" size={2}>
              <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                User Management
              </Title>
              <Space wrap size={8}>
                <Tag icon={<TeamOutlined />}>Admin</Tag>
                {workspace?.orgName ? <Tag color="blue">{workspace.orgName}</Tag> : null}
                {!!workspace?.ownerUserId ? (
                  <Tag icon={<CrownOutlined />} color="gold">
                    Primary admin protected
                  </Tag>
                ) : null}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Manage members and invites for this organization
                </Text>
              </Space>
            </Space>
          </Col>

          <Col xs={24} md="auto">
            <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/settings")} block={isMobile}>
                Back to Settings
              </Button>

              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={() => boot({ silent: true })}
                block={isMobile}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {error ? <Alert type="error" showIcon message="Cannot open user management" description={error} /> : null}

      {!isAdmin ? (
        <Alert type="warning" showIcon message="Admin only" description="You do not have permission to manage users." />
      ) : (
        <Card style={{ borderRadius: 16 }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "members",
                label: `Members (${members.length})`,
                children: !isMobile ? (
                  <Table
                    rowKey="user_id"
                    loading={membersLoading || membersUpdating}
                    dataSource={members}
                    columns={membersColumns}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 900 }}
                  />
                ) : (
                  <Space direction="vertical" size={10} style={{ width: "100%", opacity: membersLoading ? 0.7 : 1 }}>
                    {(members || []).length ? (
                      members.map((r) => (
                        <MemberCard
                          key={r.user_id}
                          r={r}
                          ownerUserId={ownerUserId}
                          sessionUserId={sessionUser?.id}
                          membersUpdating={membersUpdating}
                          orgId={workspace?.orgId}
                          onChangeMemberRole={onChangeMemberRole}
                          onToggleMemberActive={onToggleMemberActive}
                        />
                      ))
                    ) : (
                      <Card size="small" style={{ borderRadius: 14 }}>
                        <Text type="secondary">No members found</Text>
                      </Card>
                    )}
                  </Space>
                ),
              },
              {
                key: "invites",
                label: `Invites (${invites.length})`,
                children: (
                  <div style={{ opacity: creatingInvite ? 0.85 : 1 }}>
                    <InvitesPanel
                      invites={invites}
                      invitesLoading={invitesLoading}
                      invitesColumns={invitesColumns}
                      onCreateInvite={onCreateInvite}
                      creatingInvite={creatingInvite}
                      isMobile={isMobile}
                      onRevokeInvite={onRevokeInvite}
                      message={message}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}
    </Space>
  );
}

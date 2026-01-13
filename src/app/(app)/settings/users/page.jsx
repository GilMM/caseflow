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

import { Alert, App, Card, Grid, Space, Spin, Table, Tabs, Typography } from "antd";

import UsersHeader from "./UsersHeader";
import MemberCard from "./MemberCard";
import InvitesPanel from "./InvitesPanel";

import { buildMembersColumns } from "./members.columns";
import { buildInvitesColumns } from "./invites.columns";
import { inviteLinkFromToken } from "./users.utils";

const { Text } = Typography;
const { useBreakpoint } = Grid;

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

  const membersColumns = useMemo(() => {
    return buildMembersColumns({
      ownerUserId,
      membersUpdating,
      sessionUserId: sessionUser?.id,
      orgId: workspace?.orgId,
      onChangeMemberRole: (orgId, userId, role) => onChangeMemberRole(orgId, userId, role),
      onToggleMemberActive: (orgId, userId, isActive) => onToggleMemberActive(orgId, userId, isActive),
    });
  }, [ownerUserId, membersUpdating, sessionUser?.id, workspace?.orgId]);

  const invitesColumns = useMemo(() => {
    return buildInvitesColumns({
      message,
      onRevokeInvite,
    });
  }, [message]);

  if (loading) {
    return (
      <div style={{ height: "60vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      <UsersHeader
        isMobile={isMobile}
        workspace={workspace}
        refreshing={refreshing}
        onBack={() => router.push("/settings")}
        onRefresh={() => boot({ silent: true })}
      />

      {error ? <Alert type="error" showIcon title="Cannot open user management" description={error} /> : null}

      {!isAdmin ? (
        <Alert type="warning" showIcon title="Admin only" description="You do not have permission to manage users." />
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
                  <Space orientation="vertical" size={10} style={{ width: "100%", opacity: membersLoading ? 0.7 : 1 }}>
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

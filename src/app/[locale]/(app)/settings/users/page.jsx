"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
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
        message.error(t("settings.users.adminsOnly"));
        router.replace("/settings");
        return;
      }

      await Promise.all([loadMembers(ws.orgId), loadInvites(ws.orgId)]);
    } catch (e) {
      setError(e?.message || t("settings.users.failedLoad"));
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
      message.error(e?.message || t("settings.users.failedLoad"));
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
      message.error(e?.message || t("settings.users.failedLoad"));
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
        message.success(t("settings.invites.created"));
      } catch {
        message.success(t("settings.invites.createdNoLink"));
        message.info(t("settings.invites.copyHint"));
      }

      formInstance?.resetFields?.();
      await loadInvites(workspace.orgId);
    } catch (e) {
      message.error(e?.message || t("settings.invites.failedCreate"));
    } finally {
      setCreatingInvite(false);
    }
  }

  async function onRevokeInvite(inviteId) {
    try {
      await revokeOrgInvite(inviteId);
      message.success(t("settings.invites.revoked"));
      await loadInvites(workspace.orgId);
    } catch (e) {
      message.error(e?.message || t("settings.invites.failedRevoke"));
    }
  }

  async function onChangeMemberRole(orgId, userId, role) {
    try {
      setMembersUpdating(true);
      await setMemberRole({ orgId, userId, role });
      message.success(t("settings.invites.roleUpdated"));
      await loadMembers(orgId);
    } catch (e) {
      message.error(e?.message || t("settings.invites.failedRole"));
    } finally {
      setMembersUpdating(false);
    }
  }

  async function onToggleMemberActive(orgId, userId, isActive) {
    try {
      setMembersUpdating(true);
      await setMemberActive({ orgId, userId, isActive });
      message.success(isActive ? t("settings.invites.memberActivated") : t("settings.invites.memberDeactivated"));
      await loadMembers(orgId);
    } catch (e) {
      message.error(e?.message || t("settings.invites.failedMember"));
    } finally {
      setMembersUpdating(false);
    }
  }

  const membersColumns = useMemo(() => {
    return buildMembersColumns({
      t,
      ownerUserId,
      membersUpdating,
      sessionUserId: sessionUser?.id,
      orgId: workspace?.orgId,
      onChangeMemberRole: (orgId, userId, role) => onChangeMemberRole(orgId, userId, role),
      onToggleMemberActive: (orgId, userId, isActive) => onToggleMemberActive(orgId, userId, isActive),
    });
  }, [t, ownerUserId, membersUpdating, sessionUser?.id, workspace?.orgId]);

  const invitesColumns = useMemo(() => {
    return buildInvitesColumns({
      t,
      message,
      onRevokeInvite,
    });
  }, [t, message]);

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

      {error ? <Alert type="error" showIcon title={t("settings.users.cannotOpen")} description={error} /> : null}

      {!isAdmin ? (
        <Alert type="warning" showIcon title={t("settings.users.adminOnly")} description={t("settings.users.noPermission")} />
      ) : (
        <Card style={{ borderRadius: 16 }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "members",
                label: t("settings.users.membersTab", { count: members.length }),
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
                        <Text type="secondary">{t("settings.users.noMembers")}</Text>
                      </Card>
                    )}
                  </Space>
                ),
              },
              {
                key: "invites",
                label: t("settings.users.invitesTab", { count: invites.length }),
                children: (
                  <div style={{ opacity: creatingInvite ? 0.85 : 1 }}>
                    <InvitesPanel
                      t={t}
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

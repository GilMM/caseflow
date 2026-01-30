"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Dropdown, Button, Space, Typography, Avatar, Spin, App, Grid, theme } from "antd";
import { SwapOutlined, CheckOutlined, PlusOutlined } from "@ant-design/icons";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function OrgSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const t = useTranslations("orgSwitcher");
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { workspace, workspaces, switchWorkspace, loading } = useWorkspace();
  const [switching, setSwitching] = useState(false);

  // ✅ Defensive: filter deleted orgs if the context provides a deleted flag
  const visibleWorkspaces = useMemo(() => {
    const list = Array.isArray(workspaces) ? workspaces : [];
    return list.filter((ws) => {
      // support multiple possible names, without breaking if none exist
      const deletedAt = ws?.orgDeletedAt || ws?.deletedAt || ws?.organizations?.deleted_at || null;
      return !deletedAt;
    });
  }, [workspaces]);

  const handleSwitch = async (orgId) => {
    if (!orgId || orgId === workspace?.orgId) return;

    setSwitching(true);
    try {
      await switchWorkspace(orgId);
      message.success(t("switched"));
      // safest refresh for multi-tenant context changes
      window.location.reload();
    } catch (e) {
      message.error(e?.message || t("switchFailed"));
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateNew = () => router.push(`/${locale}/organizations/new?mode=create`);
  const handleJoinOrg = () => router.push(`/${locale}/organizations/new?mode=join`);

  const menuItems = useMemo(() => {
    const items = [
      {
        key: "header",
        type: "group",
        label: (
          <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
            {t("yourOrganizations")}
          </Text>
        ),
      },
      ...visibleWorkspaces.map((ws) => ({
        key: ws.orgId,
        label: (
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space size={10} style={{ minWidth: 0 }}>
              {ws.orgLogoUrl ? (
                <Avatar src={ws.orgLogoUrl} size={22} />
              ) : (
                <Avatar
                  size={22}
                  style={{
                    background: token.colorPrimaryBg,
                    color: token.colorPrimary,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {ws.orgName?.[0]?.toUpperCase() || "O"}
                </Avatar>
              )}

              <Text
                style={{
                  maxWidth: 180,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ws.orgName}
              </Text>
            </Space>

            {ws.orgId === workspace?.orgId ? (
              <CheckOutlined style={{ color: token.colorSuccess }} />
            ) : null}
          </Space>
        ),
      })),
      { type: "divider" },
      {
        key: "create",
        icon: <PlusOutlined />,
        label: t("createNew"),
      },
      {
        key: "join",
        icon: <SwapOutlined />,
        label: t("joinExisting"),
      },
    ];

    return items;
  }, [t, token, visibleWorkspaces, workspace?.orgId]);

  const handleMenuClick = ({ key }) => {
    if (key === "create") return handleCreateNew();
    if (key === "join") return handleJoinOrg();
    if (key === "header") return;

    // ignore divider clicks etc.
    const isOrg = visibleWorkspaces.some((ws) => ws.orgId === key);
    if (isOrg) handleSwitch(key);
  };

  if (loading) return null;
  if (!workspace) return null;

  return (
    <Dropdown
      menu={{ items: menuItems, onClick: handleMenuClick }}
      trigger={["click"]}
      placement="bottomRight"
      disabled={switching}
    >
      <Button
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 10px",
          height: 32,
          borderRadius: 10,
          border: `1px solid ${token.colorBorder}`,
        }}
      >
        {switching ? (
          <Spin size="small" />
        ) : (
          <Space size={8} style={{ minWidth: 0 }}>
            {workspace.orgLogoUrl ? (
              <Avatar src={workspace.orgLogoUrl} size={20} />
            ) : (
              <Avatar
                size={20}
                style={{
                  background: token.colorPrimaryBg,
                  color: token.colorPrimary,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {workspace.orgName?.[0]?.toUpperCase() || "O"}
              </Avatar>
            )}

            {!isMobile && (
              <Text
                style={{
                  maxWidth: 110,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {workspace.orgName}
              </Text>
            )}

            <SwapOutlined style={{ fontSize: 10, opacity: 0.6, marginInlineStart: isMobile ? 0 : 2 }} />
          </Space>
        )}
      </Button>
    </Dropdown>
  );
}

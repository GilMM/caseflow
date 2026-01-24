"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Dropdown,
  Button,
  Space,
  Typography,
  Avatar,
  Divider,
  Spin,
  App,
  theme,
} from "antd";
import {
  SwapOutlined,
  CheckOutlined,
  PlusOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const { Text } = Typography;

export default function OrgSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const t = useTranslations("orgSwitcher");

  const {
    workspace,
    workspaces,
    switchWorkspace,
    loading,
  } = useWorkspace();

  const [switching, setSwitching] = useState(false);

  const handleSwitch = async (orgId) => {
    if (orgId === workspace?.orgId) return;

    setSwitching(true);
    try {
      await switchWorkspace(orgId);
      message.success(t("switched"));
      // Full page reload to refresh all data
      window.location.reload();
    } catch (e) {
      message.error(e?.message || t("switchFailed"));
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateNew = () => {
    router.push(`/${locale}/organizations/new?mode=create`);
  };

  const handleJoinOrg = () => {
    router.push(`/${locale}/organizations/new?mode=join`);
  };

  // Build menu items
  const menuItems = [
    {
      key: "header",
      type: "group",
      label: (
        <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
          {t("yourOrganizations")}
        </Text>
      ),
    },
    ...(workspaces || []).map((ws) => ({
      key: ws.orgId,
      label: (
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Space>
            {ws.orgLogoUrl ? (
              <Avatar src={ws.orgLogoUrl} size={20} />
            ) : (
              <Avatar
                size={20}
                style={{
                  background: token.colorPrimaryBg,
                  color: token.colorPrimary,
                }}
              >
                {ws.orgName?.[0]?.toUpperCase() || "O"}
              </Avatar>
            )}
            <Text
              style={{
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {ws.orgName}
            </Text>
          </Space>
          {ws.orgId === workspace?.orgId && (
            <CheckOutlined style={{ color: token.colorSuccess }} />
          )}
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

  const handleMenuClick = ({ key }) => {
    if (key === "create") {
      handleCreateNew();
    } else if (key === "join") {
      handleJoinOrg();
    } else if (key !== "header") {
      handleSwitch(key);
    }
  };

  if (loading) {
    return null;
  }

  // Don't show if user has no workspaces
  if (!workspace) {
    return null;
  }

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
          padding: "4px 12px",
          height: 32,
          borderRadius: 8,
          border: `1px solid ${token.colorBorder}`,
        }}
      >
        {switching ? (
          <Spin size="small" />
        ) : (
          <Space size={8}>
            {workspace.orgLogoUrl ? (
              <Avatar src={workspace.orgLogoUrl} size={20} />
            ) : (
              <Avatar
                size={20}
                style={{
                  background: token.colorPrimaryBg,
                  color: token.colorPrimary,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {workspace.orgName?.[0]?.toUpperCase() || "O"}
              </Avatar>
            )}
            <Text
              style={{
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {workspace.orgName}
            </Text>
            <SwapOutlined style={{ fontSize: 10, opacity: 0.6, marginInlineStart: 2 }} />
          </Space>
        )}
      </Button>
    </Dropdown>
  );
}

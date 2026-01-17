// src/app/(app)/settings/_components/WorkspaceCard.jsx
"use client";

import { Alert, Button, Card, Divider, Space, Tag, Tooltip, Typography } from "antd";
import { AppstoreOutlined, TeamOutlined, WifiOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Text } = Typography;

export default function WorkspaceCard({ workspace, isAdmin, isOwner, isMobile, onManageUsers, onRequestAccess }) {
  const t = useTranslations();

  return (
    <Card
      title={
        <Space size={8}>
          <AppstoreOutlined />
          <span>{t("settings.workspace.title")}</span>
        </Space>
      }
      style={{ borderRadius: 16 }}
    >
      {workspace?.orgId ? (
        <Space orientation ="vertical" size={10} style={{ width: "100%" }}>
          <Space wrap size={8}>
            <Tag color="blue">{t("settings.workspace.org")}</Tag>
            <Text strong style={{ wordBreak: "break-word" }}>
              {workspace.orgName || workspace.orgId}
            </Text>
          </Space>

          <Space wrap size={8}>
            <Tag color="geekblue">{t("settings.workspace.role")}</Tag>
            <Text>{workspace.role || "—"}</Text>
            {isOwner ? <Tag color="gold">{t("settings.header.owner")}</Tag> : null}
          </Space>

          <Space wrap size={8}>
            <Tag color="green" icon={<WifiOutlined />}>
              {t("settings.workspace.realtime")}
            </Tag>
            <Text type="secondary">{t("settings.workspace.realtimeDesc")}</Text>
          </Space>

          <Divider style={{ margin: "10px 0" }} />

          <Space
            wrap={!isMobile}
            orientation ={isMobile ? "vertical" : "horizontal"}
            style={{ width: "100%" }}
          >
            <Tooltip title={isAdmin ? t("settings.workspace.manageUsersTooltip") : t("settings.users.adminsOnly")}>
              <Button
                type="primary"
                icon={<TeamOutlined />}
                disabled={!isAdmin}
                onClick={() => {
                  if (!isAdmin) return;
                  onManageUsers?.();
                }}
                block={isMobile}
              >
                {t("settings.workspace.manageUsers")}
              </Button>
            </Tooltip>

            {!isAdmin ? (
              <Button onClick={onRequestAccess} block={isMobile}>
                {t("settings.workspace.requestAccess")}
              </Button>
            ) : null}
          </Space>

          <Text type="secondary" style={{ fontSize: 12 }}>
            {isAdmin
              ? t("settings.workspace.manageHint")
              : t("settings.workspace.adminsOnlyHint")}
          </Text>
        </Space>
      ) : (
        <Alert
          type="warning"
          showIcon
          title={t("settings.workspace.noActiveWorkspace")}
          description={t("settings.workspace.noWorkspaceDesc")}
        />
      )}
    </Card>
  );
}

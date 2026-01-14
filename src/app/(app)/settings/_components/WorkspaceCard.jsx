// src/app/(app)/settings/_components/WorkspaceCard.jsx
"use client";

import { Alert, Button, Card, Divider, Space, Tag, Tooltip, Typography } from "antd";
import { AppstoreOutlined, TeamOutlined, WifiOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function WorkspaceCard({ workspace, isAdmin, isOwner, isMobile, onManageUsers, onRequestAccess }) {
  return (
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
        <Space orientation ="vertical" size={10} style={{ width: "100%" }}>
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
            orientation ={isMobile ? "vertical" : "horizontal"}
            style={{ width: "100%" }}
          >
            <Tooltip title={isAdmin ? "Manage members & invites" : "Admins only"}>
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
                Manage users
              </Button>
            </Tooltip>

            {!isAdmin ? (
              <Button onClick={onRequestAccess} block={isMobile}>
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
          title ="No active workspace"
          description="Create an organization + membership first. Then settings will show org context."
        />
      )}
    </Card>
  );
}

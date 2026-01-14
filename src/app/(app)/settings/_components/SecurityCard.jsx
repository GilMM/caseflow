// src/app/(app)/settings/_components/SecurityCard.jsx
"use client";

import { Alert, Button, Card, Space, Tag, Typography } from "antd";
import { ReloadOutlined, SafetyOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function SecurityCard({
  isAdmin,
  orgId,
  diag,
  diagLoading,
  onRunDiagnostics,
  isMobile,
}) {
  return (
    <Card style={{ borderRadius: 16, marginTop: 12 }}>
      <Space orientation ="vertical" size={10} style={{ width: "100%" }}>
        <Space size={8}>
          <SafetyOutlined />
          <Text strong>Security (RLS)</Text>
        </Space>

        <Text type="secondary" style={{ fontSize: 12 }}>
          Data is scoped by org membership using Row Level Security (RLS).
        </Text>

        {isAdmin && orgId ? (
          <Space orientation ="vertical" size={10} style={{ width: "100%" }}>
            <Button
              icon={<ReloadOutlined />}
              loading={diagLoading}
              onClick={onRunDiagnostics}
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
            title ="Diagnostics available for admins"
            description="Create an organization and make sure you are an admin."
          />
        )}
      </Space>
    </Card>
  );
}

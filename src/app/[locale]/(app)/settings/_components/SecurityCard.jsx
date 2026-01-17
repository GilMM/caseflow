// src/app/(app)/settings/_components/SecurityCard.jsx
"use client";

import { Alert, Button, Card, Space, Tag, Typography } from "antd";
import { ReloadOutlined, SafetyOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Text } = Typography;

export default function SecurityCard({
  isAdmin,
  orgId,
  diag,
  diagLoading,
  onRunDiagnostics,
  isMobile,
}) {
  const t = useTranslations();

  return (
    <Card style={{ borderRadius: 16, marginTop: 12 }}>
      <Space orientation ="vertical" size={10} style={{ width: "100%" }}>
        <Space size={8}>
          <SafetyOutlined />
          <Text strong>{t("settings.security.title")}</Text>
        </Space>

        <Text type="secondary" style={{ fontSize: 12 }}>
          {t("settings.security.dataScoped")}
        </Text>

        {isAdmin && orgId ? (
          <Space orientation ="vertical" size={10} style={{ width: "100%" }}>
            <Button
              icon={<ReloadOutlined />}
              loading={diagLoading}
              onClick={onRunDiagnostics}
              block={isMobile}
            >
              {t("settings.security.runDiagnostics")}
            </Button>

            <Space wrap size={8}>
              {diag ? (
                <>
                  <Tag
                    icon={diag.is_member ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    color={diag.is_member ? "green" : "red"}
                  >
                    {t("settings.security.member")}
                  </Tag>

                  <Tag
                    icon={diag.is_admin ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    color={diag.is_admin ? "green" : "red"}
                  >
                    {t("settings.users.admin")}
                  </Tag>

                  {diag.member_role ? <Tag color="blue">{t("settings.security.role", { role: diag.member_role })}</Tag> : null}

                  {typeof diag.active_members_count === "number" ? (
                    <Tag>{t("settings.security.activeMembers", { count: diag.active_members_count })}</Tag>
                  ) : null}
                </>
              ) : (
                <Tag>{t("settings.security.notLoaded")}</Tag>
              )}
            </Space>
          </Space>
        ) : (
          <Alert
            type="info"
            showIcon
            title={t("settings.security.diagAvailable")}
            description={t("settings.security.diagDescription")}
          />
        )}
      </Space>
    </Card>
  );
}

"use client";

import { Card, Space, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { priorityColor } from "@/lib/ui/priority";

const { Text } = Typography;

export default function NewCaseSidebar({ orgId, orgName, queueId, priority }) {
  const t = useTranslations();

  const priorityKey = priority || "normal";

  return (
    <>
      <Card title={t("cases.new.sidebar.quickTipsTitle")} style={{ borderRadius: 16 }}>
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          <Text>• {t("cases.new.sidebar.tipTitleShort")}</Text>
          <Text>• {t("cases.new.sidebar.tipStepsInDescription")}</Text>
          <Text>
            • {t("cases.new.sidebar.tipUrgentPrefix")}{" "}
            <Tag color="red">{t("cases.priority.urgent")}</Tag>{" "}
            {t("cases.new.sidebar.tipUrgentSuffix")}
          </Text>

          <div
            style={{
              height: 1,
              background: "var(--ant-color-border, #f0f0f0)",
              margin: "6px 0",
            }}
          />

          <Space orientation="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("cases.new.sidebar.defaults")}
            </Text>

            <Space wrap>
              {orgId ? (
                <Tag color="blue">{orgName || t("common.workspace")}</Tag>
              ) : (
                <Tag>
                  {t("common.workspace")}: {t("common.workspaceNone")}
                </Tag>
              )}

              {queueId ? (
                <Tag color="geekblue">{t("cases.new.sidebar.queueSelected")}</Tag>
              ) : (
                <Tag>
                  {t("cases.new.sidebar.queueLabel")}: {t("common.workspaceNone")}
                </Tag>
              )}

              <Tag color={priorityColor(priorityKey)}>
                {t("cases.new.priority")}: {t(`cases.priority.${priorityKey}`)}
              </Tag>
            </Space>
          </Space>
        </Space>
      </Card>

      <Card style={{ borderRadius: 16, marginTop: 12 }}>
        <Space orientation="vertical" size={6}>
          <Text strong>{t("cases.new.sidebar.nextPolishTitle")}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("cases.new.sidebar.nextPolishDesc")}
          </Text>
        </Space>
      </Card>
    </>
  );
}

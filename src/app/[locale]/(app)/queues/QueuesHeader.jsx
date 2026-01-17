"use client";

import { Card, Col, Row, Space, Tag, Typography, Button, Tooltip } from "antd";
import { AppstoreOutlined, ReloadOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Title, Text } = Typography;

export default function QueuesHeader({
  isMobile,
  workspace,
  shownCount,
  total,
  refreshing,
  onRefresh,
  onCreate,
}) {
  const t = useTranslations();

  return (
    <Card
      style={{
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
      }}
    >
      <Row justify="space-between" align="middle" gutter={[12, 12]}>
        <Col xs={24} md="auto">
          <Space orientation="vertical" size={2} style={{ width: "100%" }}>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              {t("queues.header.title")}
            </Title>

            <Space wrap size={8}>

              {workspace?.orgName ? (
                <Tag color="blue">{t("common.workspace")}: {workspace.orgName}</Tag>
              ) : (
                <Tag>{t("common.workspace")}: {t("common.workspaceNone")}</Tag>
              )}

              <Tag icon={<AppstoreOutlined />}>{t("queues.header.routing")}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("queues.header.shownTotal", { shown: shownCount, total })}
              </Text>
            </Space>
          </Space>
        </Col>

        <Col xs={24} md="auto">
          <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
            <Tooltip title={t("queues.header.refreshTooltip")}>
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={onRefresh}
                block={isMobile}
              >
                {t("common.refresh")}
              </Button>
            </Tooltip>

            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate} block={isMobile}>
              {t("queues.header.newQueue")}
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

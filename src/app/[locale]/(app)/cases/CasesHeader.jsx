"use client";

import { Button, Card, Col, Row, Space, Tag, Typography, Tooltip } from "antd";
import { InboxOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Title, Text } = Typography;

export default function CasesHeader({
  workspace,
  queueId,
  filteredCount,
  totalCount,
  refreshing,
  onRefresh,
  onNewCase,
}) {
  const t = useTranslations();

  return (
    <Card
      style={{
        borderRadius: 16,
        background:
          "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
      }}
    >
      <Row justify="space-between" align="middle" gutter={[12, 12]}>
        <Col>
          <Space orientation="vertical" size={2}>
            <Title level={3} style={{ margin: 0 }}>
              {t("cases.header.title")}
            </Title>

            <Space wrap size={8}>
              {workspace?.orgName ? (
                <Tag color="blue">{t("common.workspace")}: {workspace.orgName}</Tag>
              ) : (
                <Tag>{t("common.workspace")}: {t("common.workspaceNone")}</Tag>
              )}

              <Tag icon={<InboxOutlined />}>{t("cases.header.list")}</Tag>

              {queueId && queueId !== "all" ? (
                <Tag color="gold">{t("cases.header.queueFiltered")}</Tag>
              ) : null}

              <Text type="secondary" style={{ fontSize: 12 }}>
                {filteredCount} {t("common.shown")} • {totalCount} {t("common.total")}
              </Text>
            </Space>
          </Space>
        </Col>

        <Col>
          <Space wrap>
            <Tooltip title={t("cases.header.refreshTooltip")}>
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={onRefresh}
              >
                {t("common.refresh")}
              </Button>
            </Tooltip>

            <Button type="primary" icon={<PlusOutlined />} onClick={onNewCase}>
              {t("cases.header.newCase")}
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

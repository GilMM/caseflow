"use client";

import { Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import { ArrowLeftOutlined, InboxOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Title, Text } = Typography;

export default function NewCaseHeader({
  router,
  form,
  busy,
  orgId,
  workspace,
  queuesLoading,
  queueId,
  requesterFromUrl,
  hasQueues,
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
        <Col>
          <Space orientation="vertical" size={2}>
            <Title level={3} style={{ margin: 0 }}>
              {t("cases.new.title")}
            </Title>

            <Space wrap size={8}>
              <Tag icon={<InboxOutlined />}>{t("common.create")}</Tag>

              {orgId ? (
                <Tag color="blue">
                  {t("common.workspace")}: {workspace?.orgName || t("common.workspace")}
                </Tag>
              ) : (
                <Tag>
                  {t("common.workspace")}: {t("common.workspaceNone")}
                </Tag>
              )}

              {queuesLoading ? (
                <Tag>{t("common.loading")}</Tag>
              ) : queueId ? (
                <Tag color="geekblue">{t("cases.new.header.queueSelected")}</Tag>
              ) : (
                <Tag>
                  {t("cases.new.header.queueLabel")}: {t("common.workspaceNone")}
                </Tag>
              )}

              {requesterFromUrl ? (
                <Tag color="purple">{t("cases.new.header.requesterPrefilled")}</Tag>
              ) : null}

              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("cases.new.header.hint")}
              </Text>
            </Space>
          </Space>
        </Col>

        <Col>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/cases")}>
              {t("cases.new.header.backToCases")}
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={busy}
              onClick={() => form.submit()}
              disabled={!orgId || !hasQueues}
            >
              {t("cases.new.createCase")}
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

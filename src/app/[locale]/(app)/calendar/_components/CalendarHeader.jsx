"use client";

import { Button, Card, Col, Row, Space, Tag, Typography, Tooltip } from "antd";
import {
  CalendarOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Title, Text } = Typography;

export default function CalendarHeader({
  workspace,
  view,
  eventCount,
  refreshing,
  onRefresh,
  onNewEvent,
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
        {/* LEFT */}
        <Col>
          <Space direction="vertical" size={2}>
            <Title level={3} style={{ margin: 0 }}>
              {t("calendar.header.title")}
            </Title>

            <Space wrap size={8}>
              {workspace?.orgName ? (
                <Tag color="blue">{t("common.workspace")}: {workspace.orgName}</Tag>
              ) : (
                <Tag>{t("common.workspace")}: {t("common.workspaceNone")}</Tag>
              )}

              <Tag icon={<CalendarOutlined />}>{t("calendar.header.title")}</Tag>

              <Tag color="geekblue">
                {t("calendar.header.view")}: {view === "week" ? t("calendar.header.week") : t("calendar.header.month")}
              </Tag>

              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("calendar.header.eventCount", { count: eventCount })}
              </Text>
            </Space>
          </Space>
        </Col>

        {/* RIGHT */}
        <Col>
          <Space wrap>
            <Tooltip title={t("calendar.header.refreshTooltip")}>
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={onRefresh}
              >
                {t("common.refresh")}
              </Button>
            </Tooltip>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onNewEvent}
            >
              {t("calendar.header.newEvent")}
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

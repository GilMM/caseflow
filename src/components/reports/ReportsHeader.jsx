"use client";

import { Button, Card, Col, Row, Space, Tag, Typography, Tooltip } from "antd";
import { BarChartOutlined, ReloadOutlined, FileExcelOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Title, Text } = Typography;

export default function ReportsHeader({
  workspace,
  activeKey,
  filters,
  total,
  loading,
  onRefresh,
  onExport,
  canExport,
}) {
  const t = useTranslations();

  const orgName =
    workspace?.orgName ||
    workspace?.org_name ||
    workspace?.org?.name ||
    workspace?.organization?.name ||
    workspace?.name ||
    null;

  const hasOrg = !!(workspace?.orgId || workspace?.org_id || workspace?.active_org_id || workspace?.org?.id || workspace?.id);

  const chip = (label, value) => (
    <Tag color="geekblue" style={{ marginInlineEnd: 0 }}>
      {label}: {value}
    </Tag>
  );

  const dateFrom = filters?.date_from ? new Date(filters.date_from) : null;
  const dateTo = filters?.date_to ? new Date(filters.date_to) : null;

  const dateText =
    dateFrom || dateTo
      ? `${dateFrom ? dateFrom.toLocaleDateString() : "—"} → ${dateTo ? dateTo.toLocaleDateString() : "—"}`
      : null;

  const hasSearch = (filters?.search || "").trim().length > 0;

  return (
    <Card
      style={{
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
      }}
    >
      <Row justify="space-between" align="middle" gutter={[12, 12]}>
        {/* LEFT */}
        <Col>
          <Space orientation="vertical" size={2}>
            <Title level={3} style={{ margin: 0 }}>
              {t("reports.header.title")}
            </Title>

            <Space wrap size={8} align="center">
              {orgName ? (
                <Tag color="blue">
                  {t("common.workspace")}: {orgName}
                </Tag>
              ) : (
                <Tag>
                  {t("common.workspace")}: {t("common.workspaceNone")}
                </Tag>
              )}

              <Tag icon={<BarChartOutlined />}>{t(`reports.tabs.${activeKey}`)}</Tag>

              {typeof total === "number" ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t("reports.header.total", { count: total })}
                </Text>
              ) : null}

              {/* Filter chips */}
              {dateText ? chip(t("reports.filters.dateRange"), dateText) : null}
              {filters?.status ? chip(t("reports.filters.status"), String(filters.status)) : null}
              {filters?.priority ? chip(t("reports.filters.priority"), String(filters.priority)) : null}
              {hasSearch ? chip(t("reports.filters.search"), (filters.search || "").trim()) : null}
            </Space>
          </Space>
        </Col>

        {/* RIGHT */}
        <Col>
          <Space wrap>
            <Tooltip title={t("reports.header.refreshTooltip")}>
              <Button icon={<ReloadOutlined />} loading={loading} onClick={onRefresh}>
                {t("common.refresh")}
              </Button>
            </Tooltip>

            <Tooltip title={!hasOrg ? t("reports.header.noOrgTooltip") : t("reports.header.exportTooltip")}>
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={onExport}
                disabled={!canExport}
              >
                {t("reports.header.export")}
              </Button>
            </Tooltip>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

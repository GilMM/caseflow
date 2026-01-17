"use client";

import { Button, Card, Col, Input, Row, Select, Space, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { CASE_STATUSES } from "@/lib/ui/status";

const { Text } = Typography;

export default function CasesFilters({
  q,
  onChangeQ,
  queueId,
  queues,
  onChangeQueue,
  status,
  onChangeStatus,
  priority,
  onChangePriority,
  onClear,
}) {
  const t = useTranslations();

  return (
    <Card style={{ borderRadius: 16,height: "100%" }}>
      <Row gutter={[10, 10]} align="middle">
        <Col xs={24} md={8}>
          <Input
            value={q}
            onChange={(e) => onChangeQ(e.target.value)}
            placeholder={t("cases.filters.searchPlaceholder")}
            prefix={<SearchOutlined />}
            allowClear
          />
        </Col>

        <Col xs={12} md={5}>
          <Select
            value={queueId}
            onChange={onChangeQueue}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: t("cases.filters.allQueues") },
              ...(queues || []).map((qq) => ({
                value: qq.id,
                label: qq.is_default ? t("cases.filters.defaultQueue", { name: qq.name }) : qq.name,
              })),
            ]}
          />
        </Col>

        <Col xs={12} md={5}>
          <Select
            value={status}
            onChange={onChangeStatus}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: t("cases.filters.allStatuses") },
              ...CASE_STATUSES,
            ]}
          />
        </Col>

        <Col xs={12} md={6}>
          <Select
            value={priority}
            onChange={onChangePriority}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: t("cases.filters.allPriorities") },
              { value: "urgent", label: t("cases.priority.urgent") },
              { value: "high", label: t("cases.priority.high") },
              { value: "normal", label: t("cases.priority.normal") },
              { value: "low", label: t("cases.priority.low") },
            ]}
          />
        </Col>

        <Col xs={24}>
          <Space wrap size={8}>
            <Button onClick={onClear}>{t("common.clearFilters")}</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("cases.filters.tip")}
            </Text>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

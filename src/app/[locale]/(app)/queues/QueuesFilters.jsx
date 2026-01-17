"use client";

import { Card, Col, Input, Row, Select, Space, Button, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Text } = Typography;

export default function QueuesFilters({
  isMobile,
  q,
  setQ,
  active,
  setActive,
  defaultOnly,
  setDefaultOnly,
  onClear,
}) {
  const t = useTranslations();

  return (
    <Card style={{ borderRadius: 16 }}>
      <Row gutter={[10, 10]} align="middle">
        <Col xs={24} md={10}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("queues.filters.searchPlaceholder")}
            prefix={<SearchOutlined />}
            allowClear
          />
        </Col>

        <Col xs={24} sm={12} md={7}>
          <Select
            value={active}
            onChange={setActive}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: t("queues.filters.allStates") },
              { value: "active", label: t("queues.filters.active") },
              { value: "inactive", label: t("queues.filters.inactive") },
            ]}
          />
        </Col>

        <Col xs={24} sm={12} md={7}>
          <Select
            value={defaultOnly ? "default" : "all"}
            onChange={(v) => setDefaultOnly(v === "default")}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: t("queues.filters.allQueues") },
              { value: "default", label: t("queues.filters.defaultOnly") },
            ]}
          />
        </Col>

        <Col xs={24}>
          <Space wrap size={8} style={{ width: "100%", justifyContent: "space-between" }}>
            <Button onClick={onClear}>{t("common.clearFilters")}</Button>

            {!isMobile ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("queues.filters.hint")}
              </Text>
            ) : null}
          </Space>

          {isMobile ? (
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              {t("queues.filters.hint")}
            </Text>
          ) : null}
        </Col>
      </Row>
    </Card>
  );
}

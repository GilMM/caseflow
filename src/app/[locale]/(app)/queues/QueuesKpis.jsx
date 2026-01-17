"use client";

import { Card, Col, Row, Space, Typography } from "antd";
import { useTranslations } from "next-intl";

const { Text } = Typography;

function KpiCard({ label, value }) {
  return (
    <Card style={{ borderRadius: 16 }}>
      <Space orientation="vertical" size={4}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: 800 }}>{value}</Text>
      </Space>
    </Card>
  );
}

export default function QueuesKpis({ total, activeCount, defaultCount }) {
  const t = useTranslations();

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} sm={8}>
        <KpiCard label={t("common.total")} value={total} />
      </Col>
      <Col xs={24} sm={8}>
        <KpiCard label={t("common.active")} value={activeCount} />
      </Col>
      <Col xs={24} sm={8}>
        <KpiCard label={t("queues.kpis.default")} value={defaultCount} />
      </Col>
    </Row>
  );
}

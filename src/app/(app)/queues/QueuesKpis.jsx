"use client";

import { Card, Col, Row, Space, Typography } from "antd";

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
  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} sm={8}>
        <KpiCard label="Total" value={total} />
      </Col>
      <Col xs={24} sm={8}>
        <KpiCard label="Active" value={activeCount} />
      </Col>
      <Col xs={24} sm={8}>
        <KpiCard label="Default" value={defaultCount} />
      </Col>
    </Row>
  );
}

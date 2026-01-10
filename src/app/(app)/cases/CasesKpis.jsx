"use client";

import { Card, Col, Row, Space, Typography } from "antd";

const { Text } = Typography;

function KpiMini({ label, value }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        padding: 12,
        height: "100%",
      }}
    >
      <Space orientation="vertical" size={2}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: 800 }}>{value}</Text>
      </Space>
    </div>
  );
}

export default function CasesKpis({ total, openCount, urgentOpen }) {
  return (
    <Card style={{ borderRadius: 16, height: "100%" }}>
      <Row gutter={[12, 12]} style={{ height: "100%" }}>
        {/* מובייל: שלישייה בשורה אחת */}
        <Col xs={8} md={8}>
          <KpiMini label="Total" value={total} />
        </Col>

        <Col xs={8} md={8}>
          <KpiMini label="Open" value={openCount} />
        </Col>

        <Col xs={8} md={8}>
          <KpiMini label="Urgent" value={urgentOpen} />
        </Col>
      </Row>
    </Card>
  );
}

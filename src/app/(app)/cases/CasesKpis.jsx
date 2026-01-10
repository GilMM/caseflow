"use client";

import { Card, Col, Row, Space, Typography } from "antd";

const { Text } = Typography;

export default function CasesKpis({ total, openCount, urgentOpen }) {
  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} sm={8}>
        <Card style={{ borderRadius: 16 }}>
          <Space orientation="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total
            </Text>
            <Text style={{ fontSize: 22, fontWeight: 800 }}>{total}</Text>
          </Space>
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card style={{ borderRadius: 16 }}>
          <Space orientation="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Open
            </Text>
            <Text style={{ fontSize: 22, fontWeight: 800 }}>{openCount}</Text>
          </Space>
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card style={{ borderRadius: 16 }}>
          <Space orientation="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Urgent open
            </Text>
            <Text style={{ fontSize: 22, fontWeight: 800 }}>{urgentOpen}</Text>
          </Space>
        </Card>
      </Col>
    </Row>
  );
}

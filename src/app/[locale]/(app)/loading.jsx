// src/app/[locale]/(app)/loading.jsx
"use client";

import { Skeleton, Space, Card, Row, Col } from "antd";

export default function AppLoading() {
  return (
    <Space direction="vertical" size={16} style={{ width: "100%", padding: 16 }}>
      {/* Header skeleton */}
      <Skeleton.Input active style={{ width: 200, height: 32 }} />

      {/* KPI cards skeleton */}
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col key={i} xs={12} sm={6}>
            <Card style={{ borderRadius: 12 }}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Content skeleton */}
      <Card style={{ borderRadius: 12 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </Space>
  );
}

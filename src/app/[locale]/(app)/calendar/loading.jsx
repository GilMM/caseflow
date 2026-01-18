// src/app/[locale]/(app)/calendar/loading.jsx
"use client";

import { Skeleton, Space, Card, Row, Col } from "antd";

export default function CalendarLoading() {
  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      {/* Header skeleton */}
      <Row justify="space-between" align="middle">
        <Skeleton.Input active style={{ width: 150, height: 32 }} />
        <Space>
          <Skeleton.Button active style={{ width: 100 }} />
          <Skeleton.Button active style={{ width: 100 }} />
        </Space>
      </Row>

      {/* Calendar skeleton */}
      <Card style={{ borderRadius: 16, minHeight: 500 }}>
        {/* Calendar header */}
        <Row justify="space-between" style={{ marginBottom: 16 }}>
          <Skeleton.Button active style={{ width: 32 }} />
          <Skeleton.Input active style={{ width: 200 }} />
          <Skeleton.Button active style={{ width: 32 }} />
        </Row>

        {/* Calendar grid */}
        <Row gutter={[8, 8]}>
          {Array.from({ length: 35 }).map((_, i) => (
            <Col key={i} span={3}>
              <Skeleton.Button
                active
                block
                style={{ height: 80, borderRadius: 8 }}
              />
            </Col>
          ))}
        </Row>
      </Card>
    </Space>
  );
}

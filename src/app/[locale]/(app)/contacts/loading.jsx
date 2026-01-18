// src/app/[locale]/(app)/contacts/loading.jsx
"use client";

import { Skeleton, Space, Card, Row, Col } from "antd";

export default function ContactsLoading() {
  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      {/* Header skeleton */}
      <Row justify="space-between" align="middle">
        <Skeleton.Input active style={{ width: 180, height: 32 }} />
        <Skeleton.Button active style={{ width: 140 }} />
      </Row>

      {/* Filters skeleton */}
      <Card style={{ borderRadius: 16 }}>
        <Row gutter={12}>
          <Col flex="auto">
            <Skeleton.Input active style={{ width: "100%", height: 32 }} />
          </Col>
          <Col>
            <Skeleton.Button active style={{ width: 100 }} />
          </Col>
          <Col>
            <Skeleton.Button active style={{ width: 100 }} />
          </Col>
        </Row>
      </Card>

      {/* Table skeleton */}
      <Card style={{ borderRadius: 16 }}>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton.Input key={i} active block style={{ height: 44 }} />
          ))}
        </Space>
      </Card>
    </Space>
  );
}

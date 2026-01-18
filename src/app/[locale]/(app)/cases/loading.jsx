// src/app/[locale]/(app)/cases/loading.jsx
"use client";

import { Skeleton, Space, Card, Row, Col } from "antd";

export default function CasesLoading() {
  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      {/* Header skeleton */}
      <Row justify="space-between" align="middle">
        <Skeleton.Input active style={{ width: 180, height: 32 }} />
        <Skeleton.Button active style={{ width: 120 }} />
      </Row>

      {/* KPI + Filters row */}
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={10}>
          <Card style={{ borderRadius: 16 }}>
            <Row gutter={16}>
              {[1, 2, 3].map((i) => (
                <Col key={i} span={8}>
                  <Skeleton active paragraph={{ rows: 1 }} />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card style={{ borderRadius: 16 }}>
            <Skeleton.Input active style={{ width: "100%", height: 32 }} />
          </Card>
        </Col>
      </Row>

      {/* Table skeleton */}
      <Card style={{ borderRadius: 16 }}>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton.Input key={i} active block style={{ height: 48 }} />
          ))}
        </Space>
      </Card>
    </Space>
  );
}

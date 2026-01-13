"use client";

import { Card, Col, Input, Row, Select, Space, Button, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";

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
  return (
    <Card style={{ borderRadius: 16 }}>
      <Row gutter={[10, 10]} align="middle">
        <Col xs={24} md={10}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search queue by name or ID…"
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
              { value: "all", label: "All states" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </Col>

        <Col xs={24} sm={12} md={7}>
          <Select
            value={defaultOnly ? "default" : "all"}
            onChange={(v) => setDefaultOnly(v === "default")}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: "All queues" },
              { value: "default", label: "Default only" },
            ]}
          />
        </Col>

        <Col xs={24}>
          <Space wrap size={8} style={{ width: "100%", justifyContent: "space-between" }}>
            <Button onClick={onClear}>Clear filters</Button>

            {!isMobile ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Default queue is used for “New Case” routing (MVP).
              </Text>
            ) : null}
          </Space>

          {isMobile ? (
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              Default queue is used for “New Case” routing (MVP).
            </Text>
          ) : null}
        </Col>
      </Row>
    </Card>
  );
}

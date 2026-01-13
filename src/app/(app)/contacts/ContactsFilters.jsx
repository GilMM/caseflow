"use client";

import { Card, Col, Input, Row, Select, Space, Button, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function ContactsFilters({
  isMobile,
  q,
  setQ,
  active,
  setActive,
  dept,
  setDept,
  deptOptions,
  onClear,
}) {
  return (
    <Card style={{ borderRadius: 16 }}>
      <Row gutter={[10, 10]} align="middle">
        <Col xs={24} md={10}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone, department…"
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
            value={dept}
            onChange={setDept}
            style={{ width: "100%" }}
            options={deptOptions.map((d) => ({
              value: d,
              label: d === "all" ? "All departments" : d,
            }))}
          />
        </Col>

        <Col xs={24}>
          <Space wrap size={8} style={{ width: "100%", justifyContent: "space-between" }}>
            <Button onClick={onClear}>Clear filters</Button>

            {!isMobile ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Contacts are internal employees. We’ll link them to cases as “Requester”.
              </Text>
            ) : null}
          </Space>

          {isMobile ? (
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              Contacts are internal employees. We’ll link them to cases as “Requester”.
            </Text>
          ) : null}
        </Col>
      </Row>
    </Card>
  );
}

"use client";

import { Button, Card, Col, Input, Row, Select, Space, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { CASE_STATUSES } from "@/lib/ui/status";

const { Text } = Typography;

export default function CasesFilters({
  q,
  onChangeQ,
  queueId,
  queues,
  onChangeQueue,
  status,
  onChangeStatus,
  priority,
  onChangePriority,
  onClear,
}) {
  return (
    <Card style={{ borderRadius: 16 }}>
      <Row gutter={[10, 10]} align="middle">
        <Col xs={24} md={8}>
          <Input
            value={q}
            onChange={(e) => onChangeQ(e.target.value)}
            placeholder="Search by title or ID…"
            prefix={<SearchOutlined />}
            allowClear
          />
        </Col>

        <Col xs={12} md={5}>
          <Select
            value={queueId}
            onChange={onChangeQueue}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: "All queues" },
              ...(queues || []).map((qq) => ({
                value: qq.id,
                label: qq.is_default ? `${qq.name} (Default)` : qq.name,
              })),
            ]}
          />
        </Col>

        <Col xs={12} md={5}>
          <Select
            value={status}
            onChange={onChangeStatus}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: "All statuses" },
              ...CASE_STATUSES,
            ]}
          />
        </Col>

        <Col xs={12} md={6}>
          <Select
            value={priority}
            onChange={onChangePriority}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: "All priorities" },
              { value: "urgent", label: "urgent" },
              { value: "high", label: "high" },
              { value: "normal", label: "normal" },
              { value: "low", label: "low" },
            ]}
          />
        </Col>

        <Col xs={24}>
          <Space wrap size={8}>
            <Button onClick={onClear}>Clear filters</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tip: click a case card to open details
            </Text>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

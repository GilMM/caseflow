"use client";

import { Button, Card, Col, Row, Space, Tag, Typography, Tooltip } from "antd";
import {
  CalendarOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function CalendarHeader({
  workspace,
  view,
  eventCount,
  refreshing,
  onRefresh,
  onNewEvent,
}) {
  return (
    <Card
      style={{
        borderRadius: 16,
        background:
          "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
      }}
    >
      <Row justify="space-between" align="middle" gutter={[12, 12]}>
        {/* LEFT */}
        <Col>
          <Space direction="vertical" size={2}>
            <Title level={3} style={{ margin: 0 }}>
              Calendar
            </Title>

            <Space wrap size={8}>
              {workspace?.orgName ? (
                <Tag color="blue">Workspace: {workspace.orgName}</Tag>
              ) : (
                <Tag>Workspace: none</Tag>
              )}

              <Tag icon={<CalendarOutlined />}>Calendar</Tag>

              <Tag color="geekblue">
                View: {view === "week" ? "Week" : "Month"}
              </Tag>

              <Text type="secondary" style={{ fontSize: 12 }}>
                {eventCount} events
              </Text>
            </Space>
          </Space>
        </Col>

        {/* RIGHT */}
        <Col>
          <Space wrap>
            <Tooltip title="Refresh calendar">
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={onRefresh}
              >
                Refresh
              </Button>
            </Tooltip>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onNewEvent}
            >
              New event
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

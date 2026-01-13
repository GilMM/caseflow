"use client";

import { Card, Col, Row, Space, Tag, Typography, Button, Tooltip } from "antd";
import { AppstoreOutlined, ReloadOutlined, PlusOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function QueuesHeader({
  isMobile,
  workspace,
  shownCount,
  total,
  refreshing,
  onRefresh,
  onCreate,
}) {
  return (
    <Card
      style={{
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
      }}
    >
      <Row justify="space-between" align="middle" gutter={[12, 12]}>
        <Col xs={24} md="auto">
          <Space orientation="vertical" size={2} style={{ width: "100%" }}>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              Queues
            </Title>

            <Space wrap size={8}>
              <Tag icon={<AppstoreOutlined />}>Routing</Tag>

              {workspace?.orgName ? (
                <Tag color="blue">Workspace: {workspace.orgName}</Tag>
              ) : (
                <Tag>Workspace: none</Tag>
              )}

              <Text type="secondary" style={{ fontSize: 12 }}>
                {shownCount} shown • {total} total
              </Text>
            </Space>
          </Space>
        </Col>

        <Col xs={24} md="auto">
          <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
            <Tooltip title="Refresh queues list">
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={onRefresh}
                block={isMobile}
              >
                Refresh
              </Button>
            </Tooltip>

            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate} block={isMobile}>
              New queue
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

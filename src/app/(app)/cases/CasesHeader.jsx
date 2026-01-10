"use client";

import { Button, Card, Col, Row, Space, Tag, Typography, Tooltip } from "antd";
import { InboxOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function CasesHeader({
  workspace,
  queueId,
  filteredCount,
  totalCount,
  refreshing,
  onRefresh,
  onNewCase,
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
        <Col>
          <Space orientation="vertical" size={2}>
            <Title level={3} style={{ margin: 0 }}>
              Cases
            </Title>

            <Space wrap size={8}>
              {workspace?.orgName ? (
                <Tag color="blue">Workspace: {workspace.orgName}</Tag>
              ) : (
                <Tag>Workspace: none</Tag>
              )}

              <Tag icon={<InboxOutlined />}>List</Tag>

              {queueId && queueId !== "all" ? (
                <Tag color="gold">Queue filtered</Tag>
              ) : null}

              <Text type="secondary" style={{ fontSize: 12 }}>
                {filteredCount} shown • {totalCount} total
              </Text>
            </Space>
          </Space>
        </Col>

        <Col>
          <Space wrap>
            <Tooltip title="Refresh cases list">
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={onRefresh}
              >
                Refresh
              </Button>
            </Tooltip>

            <Button type="primary" icon={<PlusOutlined />} onClick={onNewCase}>
              New case
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

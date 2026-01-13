"use client";

import { Card, Col, Row, Space, Tag, Typography, Button, Tooltip } from "antd";
import { TeamOutlined, ReloadOutlined, PlusOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function ContactsHeader({
  isMobile,
  workspace,
  shownCount,
  total,
  activeCount,
  refreshing,
  onRefresh,
  onCreate,
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
        <Col xs={24} md="auto">
          <Space orientation="vertical" size={2} style={{ width: "100%" }}>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              Contacts
            </Title>

            <Space wrap size={8}>
              {workspace?.orgName ? (
                <Tag color="blue">Workspace: {workspace.orgName}</Tag>
              ) : (
                <Tag>Workspace: none</Tag>
              )}
              <Tag icon={<TeamOutlined />}>Directory</Tag>

              <Text type="secondary" style={{ fontSize: 12 }}>
                {shownCount} shown • {total} total • {activeCount} active
              </Text>
            </Space>
          </Space>
        </Col>

        <Col xs={24} md="auto">
          <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
            <Tooltip title="Refresh contacts">
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={onRefresh}
                block={isMobile}
              >
                Refresh
              </Button>
            </Tooltip>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onCreate}
              block={isMobile}
            >
              New contact
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

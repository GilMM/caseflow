"use client";

import { Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import {
  TeamOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  CrownOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function UsersHeader({
  isMobile,
  workspace,
  refreshing,
  onBack,
  onRefresh,
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
          <Space orientation="vertical" size={2}>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              User Management
            </Title>
            <Space wrap size={8}>
              <Tag icon={<TeamOutlined />}>Admin</Tag>
              {workspace?.orgName ? <Tag color="blue">{workspace.orgName}</Tag> : null}
              {!!workspace?.ownerUserId ? (
                <Tag icon={<CrownOutlined />} color="gold">
                  Primary admin protected
                </Tag>
              ) : null}
              <Text type="secondary" style={{ fontSize: 12 }}>
                Manage members and invites for this organization
              </Text>
            </Space>
          </Space>
        </Col>

        <Col xs={24} md="auto">
          <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
            <Button icon={<ArrowLeftOutlined />} onClick={onBack} block={isMobile}>
              Back to Settings
            </Button>

            <Button
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={onRefresh}
              block={isMobile}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

// src/app/(app)/_components/dashboard/DashboardHero.jsx
"use client";

import Image from "next/image";
import { Button, Card, Col, Row, Space, Tag, Tooltip, Typography } from "antd";
import { ReloadOutlined, InboxOutlined, WifiOutlined } from "@ant-design/icons";
import { greeting, tagBaseStyle } from "./helpers";
import { TagIcon } from "./DashboardTags";

const { Title, Text } = Typography;

export default function DashboardHero({
  loading,
  refreshing,
  onRefresh,
  onGoCases,
  workspace,
  displayName,
  lastUpdated,
  isMobile,
}) {
  return (
    <Card
      loading={loading}
      style={{
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
      }}
    >
      <Row justify="space-between" align="middle" gutter={[12, 12]}>
        <Col>
          <Space direction="vertical" size={2}>
            <Title level={3} style={{ margin: 0 }}>
              {greeting()},{" "}
              <span style={{ opacity: 0.9 }}>{displayName || "User"}</span>
            </Title>

            <Space wrap size={8} align="center">
              {workspace?.orgName ? (
                <Tag color="blue" style={tagBaseStyle}>
                  <TagIcon>
                    <Image
                      src="/caseflow-icon-512.png"
                      alt="CaseFlow"
                      width={14}
                      height={14}
                      style={{ borderRadius: 4 }}
                    />
                  </TagIcon>
                  Workspace: {workspace.orgName}
                </Tag>
              ) : (
                <Tag style={tagBaseStyle}>Workspace: none</Tag>
              )}

              {workspace?.role ? (
                <Tag color="geekblue" style={tagBaseStyle}>
                  Role: {workspace.role}
                </Tag>
              ) : null}

              <Tag color="green" style={tagBaseStyle}>
                <TagIcon>
                  <WifiOutlined style={{ fontSize: 12 }} />
                </TagIcon>
                Realtime
              </Tag>

              <Text type="secondary" style={{ fontSize: 12 }}>
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "—"}
              </Text>
            </Space>
          </Space>
        </Col>

        <Col>
          <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
            <Tooltip title="Refresh dashboard data">
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={onRefresh}
                block={isMobile}
              >
                Refresh
              </Button>
            </Tooltip>

            <Button type="primary" icon={<InboxOutlined />} onClick={onGoCases} block={isMobile}>
              Go to Cases
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

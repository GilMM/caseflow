// src/app/(app)/_components/dashboard/DashboardHero.jsx
"use client";

import Image from "next/image";
import { Button, Card, Col, Row, Space, Tag, Tooltip, Typography } from "antd";
import { ReloadOutlined, InboxOutlined, WifiOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { tagBaseStyle } from "./helpers";
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
  const t = useTranslations();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greeting.morning");
    if (hour < 18) return t("dashboard.greeting.afternoon");
    return t("dashboard.greeting.evening");
  };

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
          <Space orientation="vertical" size={2}>
            <Title level={3} style={{ margin: 0 }}>
              {greeting()},{" "}
              <span style={{ opacity: 0.9 }}>{displayName || t("dashboard.hero.user")}</span>
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
                  {t("dashboard.hero.workspace")}: {workspace.orgName}
                </Tag>
              ) : (
                <Tag style={tagBaseStyle}>{t("dashboard.hero.workspace")}: {t("dashboard.hero.none")}</Tag>
              )}

              {workspace?.role ? (
                <Tag color="geekblue" style={tagBaseStyle}>
                  {t("dashboard.hero.role")}: {workspace.role}
                </Tag>
              ) : null}

              <Tag color="green" style={tagBaseStyle}>
                <TagIcon>
                  <WifiOutlined style={{ fontSize: 12 }} />
                </TagIcon>
                {t("dashboard.hero.realtime")}
              </Tag>

              <Text type="secondary" style={{ fontSize: 12 }}>
                {lastUpdated ? `${t("dashboard.hero.updated")} ${lastUpdated.toLocaleTimeString()}` : "—"}
              </Text>
            </Space>
          </Space>
        </Col>

        <Col>
          <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
            <Tooltip title={t("dashboard.hero.refreshTooltip")}>
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={onRefresh}
                block={isMobile}
              >
                {t("common.refresh")}
              </Button>
            </Tooltip>

            <Button type="primary" icon={<InboxOutlined />} onClick={onGoCases} block={isMobile}>
              {t("dashboard.hero.goToCases")}
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

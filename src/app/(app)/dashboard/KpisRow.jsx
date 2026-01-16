// src/app/(app)/_components/dashboard/KpisRow.jsx
"use client";

import { Col, Row, Tag, Tooltip } from "antd";
import {
  ClockCircleOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
  ArrowRightOutlined,
  FireOutlined,
} from "@ant-design/icons";

import KpiCard from "./KpiCard";
import { tagBaseStyle } from "./helpers";
import { TagIcon } from "./DashboardTags";

export default function KpisRow({
  loading,
  isMobile,
  total,
  openCount,
  urgentOpenCount,
  newTodayCount,
  resolvedThisWeekCount,
}) {
  const urgentShare = openCount ? Math.round((urgentOpenCount / openCount) * 100) : 0;
  const openShare = total ? Math.round((openCount / total) * 100) : 0;

  return (
    <Row gutter={[12, 12]} align="stretch">
      <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
        <KpiCard
          loading={loading}
          compact={isMobile}
          title="Open"
          icon={<ClockCircleOutlined />}
          value={openCount}
          extra={
            <Tooltip title="Share of open cases out of all cases in the workspace">
              <Tag style={{ ...tagBaseStyle, height: 24, lineHeight: "24px", paddingInline: 8 }}>
                {openShare}%
              </Tag>
            </Tooltip>
          }
          progress={openShare}
          footer={isMobile ? "Not closed" : "Not closed • quick workload indicator"}
        />
      </Col>

      <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
        <KpiCard
          loading={loading}
          compact={isMobile}
          title="New today"
          icon={<ThunderboltOutlined />}
          value={newTodayCount}
          extra={
            <Tag
              color="blue"
              style={{ ...tagBaseStyle, height: 24, lineHeight: "24px", paddingInline: 8 }}
            >
              <TagIcon>
                <ArrowUpOutlined style={{ fontSize: 12 }} />
              </TagIcon>
              live
            </Tag>
          }
          footer={isMobile ? "Since 00:00" : "Created since 00:00 • triage queue candidate"}
        />
      </Col>

      <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
        <KpiCard
          loading={loading}
          compact={isMobile}
          title="Resolved"
          icon={<ArrowRightOutlined />}
          value={resolvedThisWeekCount}
          footer={isMobile ? "This week" : "Simple weekly throughput • good for demos"}
        />
      </Col>

      <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
        <KpiCard
          loading={loading}
          compact={isMobile}
          title="Urgent open"
          icon={<FireOutlined />}
          value={urgentOpenCount}
          extra={
            <Tooltip title="Urgent cases as a % of open cases">
              <Tag
                color={urgentShare >= 20 ? "red" : "gold"}
                style={{ ...tagBaseStyle, height: 24, lineHeight: "24px", paddingInline: 8 }}
              >
                {urgentShare}%
              </Tag>
            </Tooltip>
          }
          progress={urgentShare}
          footer={isMobile ? "Priority: urgent" : "Priority = urgent • escalation signal"}
        />
      </Col>
    </Row>
  );
}

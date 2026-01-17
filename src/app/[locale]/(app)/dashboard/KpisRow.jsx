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
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
  const urgentShare = openCount ? Math.round((urgentOpenCount / openCount) * 100) : 0;
  const openShare = total ? Math.round((openCount / total) * 100) : 0;

  return (
    <Row gutter={[12, 12]} align="stretch">
      <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
        <KpiCard
          loading={loading}
          compact={isMobile}
          title={t("dashboard.kpis.open")}
          icon={<ClockCircleOutlined />}
          value={openCount}
          extra={
            <Tooltip title={t("dashboard.kpis.openTooltip")}>
              <Tag style={{ ...tagBaseStyle, height: 24, lineHeight: "24px", paddingInline: 8 }}>
                {openShare}%
              </Tag>
            </Tooltip>
          }
          progress={openShare}
          footer={isMobile ? t("dashboard.kpis.notClosed") : t("dashboard.kpis.openFooter")}
        />
      </Col>

      <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
        <KpiCard
          loading={loading}
          compact={isMobile}
          title={t("dashboard.kpis.newToday")}
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
              {t("dashboard.kpis.live")}
            </Tag>
          }
          footer={isMobile ? t("dashboard.kpis.since00") : t("dashboard.kpis.newTodayFooter")}
        />
      </Col>

      <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
        <KpiCard
          loading={loading}
          compact={isMobile}
          title={t("dashboard.kpis.resolved")}
          icon={<ArrowRightOutlined />}
          value={resolvedThisWeekCount}
          footer={isMobile ? t("dashboard.kpis.thisWeek") : t("dashboard.kpis.resolvedFooter")}
        />
      </Col>

      <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
        <KpiCard
          loading={loading}
          compact={isMobile}
          title={t("dashboard.kpis.urgentOpen")}
          icon={<FireOutlined />}
          value={urgentOpenCount}
          extra={
            <Tooltip title={t("dashboard.kpis.urgentTooltip")}>
              <Tag
                color={urgentShare >= 20 ? "red" : "gold"}
                style={{ ...tagBaseStyle, height: 24, lineHeight: "24px", paddingInline: 8 }}
              >
                {urgentShare}%
              </Tag>
            </Tooltip>
          }
          progress={urgentShare}
          footer={isMobile ? t("dashboard.kpis.priorityUrgent") : t("dashboard.kpis.urgentFooter")}
        />
      </Col>
    </Row>
  );
}

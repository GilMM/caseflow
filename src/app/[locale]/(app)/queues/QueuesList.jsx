"use client";

import {
  Button,
  Card,
  Divider,
  Empty,
  Row,
  Col,
  Space,
  Typography,
  Badge,
  Tag,
  Tooltip,
  Switch,
} from "antd";
import { StarFilled } from "@ant-design/icons";
import { useTranslations } from "next-intl";

import QueueInlineActions from "./QueueInlineActions";
import { shortId, timeAgo } from "./queues.utils";

const { Text } = Typography;

export default function QueuesList({
  isMobile,
  workspace,
  tableAvailable,
  rows,
  onEdit,
  onSetDefault,
  onToggleActive,
  onViewCases,
  onOpenFuture,
}) {
  const t = useTranslations();

  return (
    <Card
      title={t("queues.header.title")}
      style={{ borderRadius: 16 }}
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t("queues.list.showing", { count: rows?.length || 0 })}
        </Text>
      }
    >
      {!workspace?.orgId ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation="vertical" size={2}>
              <Text>{t("queues.list.noWorkspace")}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("queues.list.noWorkspaceDesc")}
              </Text>
            </Space>
          }
        />
      ) : !tableAvailable ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation="vertical" size={2}>
              <Text>{t("queues.list.tableNotAvailable")}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("queues.list.tableNotAvailableDesc")}
              </Text>
            </Space>
          }
        />
      ) : rows?.length ? (
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          {rows.map((row) => {
            const isActive = (row.is_active ?? true) !== false;
            const isDefault = !!row.is_default;

            return (
              <Card
                key={row.id}
                size="small"
                hoverable
                style={{ borderRadius: 14 }}
                styles={{ padding: isMobile ? 12 : 16 }}
              >
                <Row justify="space-between" align="middle" gutter={[12, 12]}>
                  <Col xs={24} md flex="auto">
                    <Space
                      orientation="vertical"
                      size={4}
                      style={{ width: "100%" }}
                    >
                      <Space
                        wrap
                        size={8}
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <Space wrap size={8}>
                          <Text strong style={{ fontSize: 14 }}>
                            {row.name || t("queues.list.untitled")}
                          </Text>

                          {isDefault ? (
                            <Tag color="gold" icon={<StarFilled />}>
                              {t("queues.list.default")}
                            </Tag>
                          ) : null}

                          <Badge
                            status={isActive ? "success" : "default"}
                            text={
                              isActive
                                ? t("common.active")
                                : t("common.inactive")
                            }
                          />
                        </Space>

                        <Tooltip title={t("queues.list.toggleTooltip")}>
                          <Switch
                            checked={isActive}
                            onChange={(v) => onToggleActive(row.id, v)}
                          />
                        </Tooltip>
                      </Space>

                      <Space wrap size={10}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t("queues.list.code", {
                            code: row.code || shortId(row.id),
                          })}
                        </Text>

                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t("queues.list.created", {
                            time: timeAgo(row.created_at),
                          })}
                        </Text>
                      </Space>
                    </Space>
                  </Col>

                  <Col xs={24} md="auto">
                    <QueueInlineActions
                      isMobile={isMobile}
                      isActive={isActive}
                      isDefault={isDefault}
                      onToggleActive={(v) => onToggleActive(row.id, v)}
                      onEdit={() => onEdit(row)}
                      onSetDefault={() => onSetDefault(row.id)}
                      onViewCases={() => onViewCases(row.id)}
                    />
                  </Col>
                </Row>

                <Divider style={{ margin: "10px 0" }} />

                <Space
                  style={{ justifyContent: "space-between", width: "100%" }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("queues.list.nextHint")}
                  </Text>
                  <Button
                    type="link"
                    style={{ padding: 0 }}
                    onClick={() => onOpenFuture(row.id)}
                  >
                    {t("queues.list.open")}
                  </Button>
                </Space>
              </Card>
            );
          })}
        </Space>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation="vertical" size={2}>
              <Text>{t("queues.list.noMatch")}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("queues.list.tryClearing")}
              </Text>
            </Space>
          }
        />
      )}
    </Card>
  );
}

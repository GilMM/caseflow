"use client";

import { useEffect, useRef } from "react";
import { Button, Card, Divider, Empty, Row, Col, Space, Spin, Typography, Avatar, Badge, Tag } from "antd";
import { MailOutlined, PhoneOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

import ContactInlineActions from "./ContactInlineActions";
import { initials, shortId, timeAgo } from "./contacts.utils";

const { Text } = Typography;

export default function ContactsList({
  isMobile,
  workspace,
  tableAvailable,
  rows,
  onEdit,
  onToggleActive,
  onNewCase,
  onOpenFuture,
  onCreate,
  hasMore,
  loadingMore,
  onLoadMore,
}) {
  const t = useTranslations();
  const loaderRef = useRef(null);

  // Infinite scroll observer
  useEffect(() => {
    if (!onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <Card title={t("contacts.list.title")} style={{ borderRadius: 16 }}>
      {!workspace?.orgId ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation="vertical" size={2}>
              <Text>{t("contacts.list.noWorkspace")}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("contacts.list.noWorkspaceDesc")}
              </Text>
            </Space>
          }
        />
      ) : !tableAvailable ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation="vertical" size={2}>
              <Text>{t("contacts.list.tableNotAvailable")}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("contacts.list.tableNotAvailableDesc")}
              </Text>
            </Space>
          }
        />
      ) : rows?.length ? (
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          {rows.map((c) => {
            const isActive = (c.is_active ?? true) !== false;

            return (
              <Card
                key={c.id}
                size="small"
                hoverable
                style={{ borderRadius: 14 }}
                bodyStyle={{ padding: isMobile ? 12 : 16 }}
              >
                <Row justify="space-between" align="top" gutter={[12, 12]}>
                  <Col xs={24} md flex="auto">
                    <Space align="start" size={12} style={{ width: "100%" }}>
                      <Avatar>{initials(c.full_name)}</Avatar>

                      <Space orientation="vertical" size={6} style={{ width: "100%", minWidth: 0 }}>
                        <Space wrap size={8}>
                          <Text strong style={{ fontSize: 14 }}>
                            {c.full_name}
                          </Text>

                          <Badge status={isActive ? "success" : "default"} text={isActive ? t("common.active") : t("common.inactive")} />

                          {c.department ? <Tag color="geekblue">{c.department}</Tag> : null}
                          {c.job_title ? <Tag>{c.job_title}</Tag> : null}
                        </Space>

                        <Space wrap size={12} style={{ width: "100%" }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {t("contacts.list.id", { id: shortId(c.id) })}
                          </Text>

                          {c.email ? (
                            <Space size={6} style={{ minWidth: 0 }}>
                              <MailOutlined />
                              <Text type="secondary" style={{ fontSize: 12, minWidth: 0, wordBreak: "break-word" }}>
                                {c.email}
                              </Text>
                            </Space>
                          ) : null}

                          {c.phone ? (
                            <Space size={6}>
                              <PhoneOutlined />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {c.phone}
                              </Text>
                            </Space>
                          ) : null}

                          {c.location ? (
                            <Space size={6} style={{ minWidth: 0 }}>
                              <EnvironmentOutlined />
                              <Text type="secondary" style={{ fontSize: 12, minWidth: 0, wordBreak: "break-word" }}>
                                {c.location}
                              </Text>
                            </Space>
                          ) : null}
                        </Space>

                        {c.notes ? (
                          <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: c.notes }}>
                            {c.notes}
                          </Text>
                        ) : null}

                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t("contacts.list.updated", { updated: timeAgo(c.updated_at), created: timeAgo(c.created_at) })}
                        </Text>
                      </Space>
                    </Space>
                  </Col>

                  <Col xs={24} md="auto">
                    <ContactInlineActions
                      isMobile={isMobile}
                      isActive={isActive}
                      onEdit={() => onEdit(c)}
                      onToggleActive={(next) => onToggleActive(c.id, next)}
                      onNewCase={() => onNewCase(c.id)}
                    />
                  </Col>
                </Row>

                <Divider style={{ margin: "10px 0" }} />

                <Space style={{ justifyContent: "space-between", width: "100%" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("contacts.list.nextHint")}
                  </Text>
                  <Button type="link" style={{ padding: 0 }} onClick={onOpenFuture}>
                    {t("contacts.list.open")}
                  </Button>
                </Space>
              </Card>
            );
          })}

          {/* Infinite scroll loader */}
          {onLoadMore && (
            <div
              ref={loaderRef}
              style={{
                padding: 20,
                textAlign: "center",
                minHeight: 60,
              }}
            >
              {loadingMore && <Spin />}
              {!hasMore && rows.length > 0 && (
                <Text type="secondary">{t("common.noMoreItems")}</Text>
              )}
            </div>
          )}
        </Space>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation="vertical" size={2}>
              <Text>{t("contacts.list.noMatch")}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("contacts.list.tryClearing")}
              </Text>
              <Button type="primary" onClick={onCreate} style={{ marginTop: 8 }}>
                {t("contacts.header.newContact")}
              </Button>
            </Space>
          }
        />
      )}
    </Card>
  );
}

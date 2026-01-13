"use client";

import { Button, Card, Divider, Empty, Row, Col, Space, Typography, Avatar, Badge, Tag } from "antd";
import { MailOutlined, PhoneOutlined, EnvironmentOutlined } from "@ant-design/icons";

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
}) {
  return (
    <Card title="People" style={{ borderRadius: 16 }}>
      {!workspace?.orgId ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation="vertical" size={2}>
              <Text>No workspace</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Create org + membership to start managing contacts.
              </Text>
            </Space>
          }
        />
      ) : !tableAvailable ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space orientation="vertical" size={2}>
              <Text>Contacts table not available</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Create the <Text code>contacts</Text> table (and RLS), then this page will light up.
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

                          <Badge status={isActive ? "success" : "default"} text={isActive ? "Active" : "Inactive"} />

                          {c.department ? <Tag color="geekblue">{c.department}</Tag> : null}
                          {c.job_title ? <Tag>{c.job_title}</Tag> : null}
                        </Space>

                        <Space wrap size={12} style={{ width: "100%" }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ID: {shortId(c.id)}
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
                          Updated {timeAgo(c.updated_at)} • Created {timeAgo(c.created_at)}
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
                    Next: contact details page (all cases for this person).
                  </Text>
                  <Button type="link" style={{ padding: 0 }} onClick={onOpenFuture}>
                    Open →
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
              <Text>No contacts match your filters</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Try clearing filters or create a new contact.
              </Text>
              <Button type="primary" onClick={onCreate} style={{ marginTop: 8 }}>
                New contact
              </Button>
            </Space>
          }
        />
      )}
    </Card>
  );
}

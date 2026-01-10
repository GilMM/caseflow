"use client";

import { Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import { ArrowLeftOutlined, InboxOutlined, PlusOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function NewCaseHeader({
  router,
  form,
  busy,
  orgId,
  workspace,
  queuesLoading,
  queueId,
  requesterFromUrl,
  hasQueues,
}) {
  return (
    <Card
      style={{
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
      }}
    >
      <Row justify="space-between" align="middle" gutter={[12, 12]}>
        <Col>
          <Space orientation="vertical" size={2}>
            <Title level={3} style={{ margin: 0 }}>
              New case
            </Title>

            <Space wrap size={8}>
              <Tag icon={<InboxOutlined />}>Create</Tag>

              {orgId ? (
                <Tag color="blue">Workspace: {workspace?.orgName || "Workspace"}</Tag>
              ) : (
                <Tag>Workspace: none</Tag>
              )}

              {queuesLoading ? (
                <Tag>Loading queues…</Tag>
              ) : queueId ? (
                <Tag color="geekblue">Queue selected</Tag>
              ) : (
                <Tag>Queue: none</Tag>
              )}

              {requesterFromUrl ? <Tag color="purple">Requester prefilled</Tag> : null}

              <Text type="secondary" style={{ fontSize: 12 }}>
                Fill the form and create a case in one click
              </Text>
            </Space>
          </Space>
        </Col>

        <Col>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/cases")}>
              Back to cases
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={busy}
              onClick={() => form.submit()}
              disabled={!orgId || !hasQueues}
            >
              Create case
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

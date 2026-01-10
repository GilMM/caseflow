"use client";

import { Badge, Button, Card, Divider, Row, Col, Space, Tag, Typography } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";

import { getStatusMeta, shortId, timeAgo, caseKey} from "@/lib/ui/status";
import { getPriorityMeta } from "@/lib/ui/priority";

const { Text } = Typography;

export default function CasesList({ filtered, onOpenCase }) {
  const list = filtered || [];

  return (
    <Card
      title="Latest cases"
      extra={<Text type="secondary">Showing {list.length}</Text>}
      style={{ borderRadius: 16 }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {list.map((c) => {
          const sm = getStatusMeta(c.status);
          const pm = getPriorityMeta(c.priority);

          const isOpen = ["new", "in_progress", "waiting_customer"].includes(c.status);

          return (
            <Card
              key={c.id}
              hoverable
              style={{ borderRadius: 14 }}
              bodyStyle={{ padding: 16 }}
              onClick={() => onOpenCase?.(c.id)}
            >
              <Row justify="space-between" align="middle" gutter={[12, 12]}>
                {/* LEFT */}
                <Col flex="auto">
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Text strong style={{ fontSize: 16 }}>
                      {c.title || "Untitled"}
                    </Text>

                    <Space wrap size={8}>
                      <Tag color={sm.color} icon={sm.Icon ? <sm.Icon /> : null} style={{ margin: 0 }}>
                        {sm.label}
                      </Tag>
                      <Tag color={pm.color} icon={pm.Icon ? <pm.Icon /> : null} style={{ margin: 0 }}>
                        {pm.label}
                      </Tag>
                    </Space>

                    <Space wrap size={10}>
                    <Text
  type="secondary"
  style={{
    fontSize: 12,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  }}
>
  {caseKey(c.id)}
</Text>


                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Created {timeAgo(c.created_at)}
                      </Text>
                    </Space>
                  </Space>
                </Col>

                {/* RIGHT */}
                <Col>
                  <Space size={10} align="center">
                    <Badge status={isOpen ? "processing" : "default"} />
                    <Text type="secondary">{isOpen ? "Open" : "Closed"}</Text>
                  </Space>
                </Col>
              </Row>

              <Divider style={{ margin: "12px 0" }} />

              <Row justify="space-between" align="middle">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Open case
                </Text>

                <Button
                  type="link"
                  style={{ padding: 0 }}
                  icon={<ArrowRightOutlined />}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenCase?.(c.id);
                  }}
                >
                  Open
                </Button>
              </Row>
            </Card>
          );
        })}
      </Space>
    </Card>
  );
}

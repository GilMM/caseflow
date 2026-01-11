"use client";

import {
  Alert,
  Avatar,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, ThunderboltOutlined, UserOutlined } from "@ant-design/icons";
import { initials } from "@/lib/ui/initials";
import { priorityColor, PRIORITY_OPTIONS } from "@/lib/ui/priority";

const { Text } = Typography;
const { TextArea } = Input;

export default function NewCaseForm({
  router,
  form,
  onSubmit,
  busy,
  error,
  orgId,
  queuesLoading,
  hasQueues,
  queueOptions,
  queueId,
  setQueueId,
  contactsLoading,
  requesterOptions,
  filterOption,
}) {
  const priority = Form.useWatch("priority", form);

  const priorityTag = (
    <Tag color={priorityColor(priority || "normal")}>{priority || "normal"}</Tag>
  );

  return (
    <Card title="Case details" style={{ borderRadius: 16 }}>
      {error ? (
        <Alert
          type="error"
          showIcon
          message="Couldn’t create case"
          description={error}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      {!orgId ? (
        <Alert
          type="warning"
          showIcon
          message="No workspace found"
          description="Create an organization + membership first, then come back to create cases."
        />
      ) : queuesLoading ? (
        <div style={{ padding: 16, display: "grid", placeItems: "center" }}>
          <span>Loading…</span>
        </div>
      ) : !hasQueues ? (
        <Alert
          type="warning"
          showIcon
          message="No queues found"
          description="Create at least one queue, then you can create cases."
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          // ✅ Don't preselect queue automatically (force manual choice)
          initialValues={{ priority: "normal" }}
        >
          <Form.Item
            label={
              <Space size={8}>
                <span>Queue</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  (required)
                </Text>
              </Space>
            }
            name="queue_id"
            rules={[{ required: true, message: "Please select a queue" }]}
          >
            <Select
              loading={queuesLoading}
              options={queueOptions}
              placeholder="Select a queue"
              disabled={busy}
              onChange={(v) => {
                setQueueId?.(v); // keep your external state in sync (optional)
                // Form will already store the value because this field is bound to name="queue_id"
              }}
              onClear={() => setQueueId?.(null)}
              allowClear
            />
          </Form.Item>

          <Form.Item label="Requester" name="requester_contact_id">
            <Select
              allowClear
              showSearch
              loading={contactsLoading}
              placeholder="Select an employee (optional)"
              options={requesterOptions}
              filterOption={filterOption}
              disabled={busy}
              optionRender={(opt) => {
                const c = opt.data.raw || {};
                const isActive = (c.is_active ?? true) !== false;

                return (
                  <Space align="start" size={10} style={{ width: "100%" }}>
                    <Avatar size="small" icon={<UserOutlined />}>
                      {initials(c.full_name)}
                    </Avatar>

                    <Space orientation="vertical" size={0} style={{ width: "100%" }}>
                      <Space wrap size={8}>
                        <Text strong>{c.full_name || "Unnamed"}</Text>
                        {c.department ? <Tag color="geekblue">{c.department}</Tag> : null}
                        {!isActive ? <Tag>Inactive</Tag> : null}
                      </Space>

                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {[c.email, c.phone].filter(Boolean).join(" • ") || "No email/phone"}
                      </Text>
                    </Space>
                  </Space>
                );
              }}
              labelRender={(opt) => {
                const c = opt?.raw;
                if (!c) return opt?.label;

                const secondary = [c.email, c.phone].filter(Boolean).join(" • ");
                return (
                  <Space size={8}>
                    <Avatar size="small">{initials(c.full_name)}</Avatar>
                    <span>{c.full_name || "Unnamed"}</span>
                    {secondary ? <Text type="secondary">({secondary})</Text> : null}
                  </Space>
                );
              }}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space size={8}>
                <span>Title</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  (required)
                </Text>
              </Space>
            }
            name="title"
            rules={[
              { required: true, message: "Please enter a title" },
              { min: 3, message: "Title should be at least 3 characters" },
            ]}
          >
            <Input
              placeholder="e.g., VPN not working"
              maxLength={120}
              showCount
              disabled={busy}
            />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea
              placeholder="Add context, steps to reproduce..."
              rows={6}
              disabled={busy}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space size={8}>
                <span>Priority</span>
                {priorityTag}
              </Space>
            }
            name="priority"
            rules={[{ required: true, message: "Select a priority" }]}
          >
            <Select
              options={PRIORITY_OPTIONS}
              disabled={busy}
              optionRender={(opt) => (
                <Space>
                  {opt.data.value === "urgent" ? <ThunderboltOutlined /> : null}
                  <span>{opt.data.label}</span>
                  <Tag color={priorityColor(opt.data.value)} style={{ marginInlineStart: 8 }}>
                    {opt.data.value}
                  </Tag>
                </Space>
              )}
            />
          </Form.Item>

          <Space style={{ marginTop: 6 }}>
            <Button onClick={() => router.push("/cases")} disabled={busy}>
              Cancel
            </Button>

            <Button
              type="primary"
              htmlType="submit"
              loading={busy}
              icon={<PlusOutlined />}
              disabled={!orgId || !hasQueues}
            >
              Create case
            </Button>
          </Space>
        </Form>
      )}
    </Card>
  );
}

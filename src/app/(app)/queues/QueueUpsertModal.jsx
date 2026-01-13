"use client";

import { useEffect } from "react";
import { Alert, Form, Input, Modal, Row, Col, Switch } from "antd";

export default function QueueUpsertModal({
  open,
  mode, // "create" | "edit"
  isMobile,
  saving,
  initialValues,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm();
if (process.env.NODE_ENV === "development") {
  console.log("useForm created here ↓");
  console.log(new Error().stack);
}
  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      initialValues || {
        name: "",
        is_active: true,
        is_default: false,
      }
    );
  }, [open, initialValues, form]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={mode === "create" ? "New queue" : "Edit queue"}
      okText={mode === "create" ? "Create" : "Save"}
      onOk={() => form.submit()}
      confirmLoading={saving}
      destroyOnHidden
      width={isMobile ? "100%" : 520}
      style={isMobile ? { top: 12 } : undefined}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          label="Queue name"
          name="name"
          rules={[
            { required: true, message: "Please enter a queue name" },
            { min: 2, message: "Name should be at least 2 characters" },
          ]}
        >
          <Input
            placeholder="e.g., Support, Billing, Onboarding…"
            maxLength={60}
            showCount
          />
        </Form.Item>

        <Row gutter={[12, 12]}>
          <Col xs={12}>
            <Form.Item label="Active" name="is_active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item label="Default" name="is_default" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Alert
          type="info"
          showIcon
          mtitle="Note"
          description="Setting a queue as Default will unset Default from other queues in this workspace."
        />
      </Form>
    </Modal>
  );
}

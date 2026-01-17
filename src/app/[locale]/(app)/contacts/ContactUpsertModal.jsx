"use client";

import { useEffect } from "react";
import { Alert, Form, Input, Modal, Row, Col, Switch } from "antd";

export default function ContactUpsertModal({
  open,
  mode, // "create" | "edit"
  isMobile,
  saving,
  initialValues,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      initialValues || {
        full_name: "",
        email: "",
        phone: "",
        department: "",
        job_title: "",
        location: "",
        is_active: true,
        notes: "",
      }
    );
  }, [open, initialValues, form]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={mode === "create" ? "New contact" : "Edit contact"}
      okText={mode === "create" ? "Create" : "Save"}
      onOk={() => form.submit()}
      confirmLoading={saving}
      destroyOnHidden
      width={isMobile ? "100%" : 720}
      style={isMobile ? { top: 12 } : undefined}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Row gutter={[12, 12]}>
          <Col span={24}>
            <Form.Item
              label="Full name"
              name="full_name"
              rules={[{ required: true, message: "Full name is required" }]}
            >
              <Input placeholder="e.g., David Cohen" maxLength={80} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ type: "email", message: "Invalid email" }]}
            >
              <Input placeholder="name@company.com" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Phone" name="phone">
              <Input placeholder="+972..." />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Department" name="department">
              <Input placeholder="e.g., IT, HR, Marketing" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Job title" name="job_title">
              <Input placeholder="e.g., Helpdesk Specialist" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Location" name="location">
              <Input placeholder="e.g., HQ / Remote" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Active" name="is_active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item label="Notes" name="notes">
              <Input.TextArea
                rows={isMobile ? 4 : 3}
                placeholder="Internal notes…"
              />
            </Form.Item>
          </Col>
        </Row>

        <Alert
          type="info"
          showIcon
          title="Tip"
          description="Next we’ll link this contact to cases as “Requester” and show all cases per person."
        />
      </Form>
    </Modal>
  );
}

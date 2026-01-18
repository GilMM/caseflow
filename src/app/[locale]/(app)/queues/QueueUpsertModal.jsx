"use client";

import { useEffect } from "react";
import { Alert, Form, Input, Modal, Row, Col, Switch } from "antd";
import { useTranslations } from "next-intl";

export default function QueueUpsertModal({
  open,
  mode, // "create" | "edit"
  isMobile,
  saving,
  initialValues,
  onCancel,
  onSubmit,
}) {
  const t = useTranslations();
  const [form] = Form.useForm(); // ✅ תמיד נוצר, בלי תנאים

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
      title={mode === "create" ? t("queues.modal.newTitle") : t("queues.modal.editTitle")}
      okText={mode === "create" ? t("common.create") : t("common.save")}
      onOk={() => form.submit()}
      confirmLoading={saving}
      forceRender // ✅ שומר את ה-Form מחובר גם כשהמודאל סגור
      width={isMobile ? "100%" : 520}
      style={isMobile ? { top: 12 } : undefined}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          label={t("queues.modal.name")}
          name="name"
          rules={[
            { required: true, message: t("queues.modal.nameRequired") },
            { min: 2, message: t("queues.modal.nameMin") },
          ]}
        >
          <Input
            placeholder={t("queues.modal.namePlaceholder")}
            maxLength={60}
            showCount
          />
        </Form.Item>

        <Row gutter={[12, 12]}>
          <Col xs={12}>
            <Form.Item label={t("queues.modal.active")} name="is_active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item label={t("queues.modal.default")} name="is_default" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Alert
          type="info"
          showIcon
          title={t("common.note")}
          description={t("queues.modal.defaultHint")}
        />
      </Form>
    </Modal>
  );
}

"use client";

import { useEffect } from "react";
import { Alert, Form, Input, Modal, Row, Col, Switch } from "antd";
import { useTranslations } from "next-intl";

export default function ContactUpsertModal({
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
      title={mode === "create" ? t("contacts.modal.newTitle") : t("contacts.modal.editTitle")}
      okText={mode === "create" ? t("common.create") : t("common.save")}
      onOk={() => form.submit()}
      confirmLoading={saving}
      forceRender // ✅ שומר את ה-Form מחובר גם כשהמודאל סגור
      width={isMobile ? "100%" : 720}
      style={isMobile ? { top: 12 } : undefined}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Row gutter={[12, 12]}>
          <Col span={24}>
            <Form.Item
              label={t("contacts.modal.fullName")}
              name="full_name"
              rules={[{ required: true, message: t("contacts.modal.fullNameRequired") }]}
            >
              <Input placeholder={t("contacts.modal.fullNamePlaceholder")} maxLength={80} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={t("contacts.modal.email")}
              name="email"
              rules={[{ type: "email", message: t("contacts.modal.emailInvalid") }]}
            >
              <Input placeholder={t("contacts.modal.emailPlaceholder")} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label={t("contacts.modal.phone")} name="phone">
              <Input placeholder={t("contacts.modal.phonePlaceholder")} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label={t("contacts.modal.department")} name="department">
              <Input placeholder={t("contacts.modal.departmentPlaceholder")} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label={t("contacts.modal.jobTitle")} name="job_title">
              <Input placeholder={t("contacts.modal.jobTitlePlaceholder")} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label={t("contacts.modal.location")} name="location">
              <Input placeholder={t("contacts.modal.locationPlaceholder")} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label={t("contacts.modal.active")} name="is_active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item label={t("contacts.modal.notes")} name="notes">
              <Input.TextArea
                rows={isMobile ? 4 : 3}
                placeholder={t("contacts.modal.notesPlaceholder")}
              />
            </Form.Item>
          </Col>
        </Row>

        <Alert
          type="info"
          showIcon
          title={t("common.tip")}
          description={t("contacts.modal.tip")}
        />
      </Form>
    </Modal>
  );
}

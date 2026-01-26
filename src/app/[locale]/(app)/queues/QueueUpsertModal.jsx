"use client";

import { useEffect, useState } from "react";
import { Alert, Avatar, Form, Input, Modal, Row, Col, Switch, Transfer, Typography, Space, Tag } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { initials } from "@/lib/ui/initials";

const { Text } = Typography;

export default function QueueUpsertModal({
  open,
  mode, // "create" | "edit"
  isMobile,
  saving,
  initialValues,
  onCancel,
  onSubmit,
  orgMembers = [],
  queueMembers = [],
  membersLoading = false,
}) {
  const t = useTranslations();
  const [form] = Form.useForm();
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue(
      initialValues || {
        name: "",
        is_active: true,
        is_default: false,
      }
    );

    // Set selected members from queueMembers
    const memberIds = (queueMembers || []).map((m) => m.user_id);
    setSelectedMembers(memberIds);
  }, [open, initialValues, form, queueMembers]);

  // Transform org members to transfer data source
  const transferDataSource = (orgMembers || []).map((m) => ({
    key: m.user_id,
    title: m.full_name || t("common.unnamed"),
    description: m.role,
    avatar_url: m.avatar_url,
    role: m.role,
  }));

  function handleTransferChange(targetKeys) {
    setSelectedMembers(targetKeys);
  }

  function handleSubmit(values) {
    onSubmit({
      ...values,
      memberIds: selectedMembers,
    });
  }

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={mode === "create" ? t("queues.modal.newTitle") : t("queues.modal.editTitle")}
      okText={mode === "create" ? t("common.create") : t("common.save")}
      onOk={() => form.submit()}
      confirmLoading={saving}
      forceRender
      width={isMobile ? "100%" : 680}
      style={isMobile ? { top: 12 } : undefined}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
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

        <Form.Item
          label={
            <Space size={8}>
              <span>{t("queues.modal.members")}</span>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({selectedMembers.length})
              </Text>
            </Space>
          }
        >
          <Transfer
            dataSource={transferDataSource}
            targetKeys={selectedMembers}
            onChange={handleTransferChange}
            showSearch
            filterOption={(inputValue, item) =>
              item.title.toLowerCase().includes(inputValue.toLowerCase()) ||
              item.description?.toLowerCase().includes(inputValue.toLowerCase())
            }
            style={{
              width: isMobile ? "100%" : 280,
              height: 280,
            }}
            titles={[t("queues.modal.availableMembers"), t("queues.modal.selectedMembers")]}
            locale={{
              itemsUnit: "",
              itemUnit: "",
              searchPlaceholder: t("common.search"),
              notFoundContent: t("common.noResults"),
            }}
            render={(item) => (
              <Space size={8}>
                <Avatar size="small" src={item.avatar_url} icon={<UserOutlined />}>
                  {initials(item.title)}
                </Avatar>
                <span>{item.title}</span>
                <Tag color="blue" style={{ fontSize: 10 }}>{item.role}</Tag>
              </Space>
            )}
            disabled={membersLoading}
          />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
            {t("queues.modal.membersHint")}
          </Text>
        </Form.Item>

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

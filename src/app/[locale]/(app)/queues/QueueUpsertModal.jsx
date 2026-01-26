"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Form,
  Input,
  Modal,
  Row,
  Col,
  Switch,
  Transfer,
  Typography,
  Space,
  Tag,
} from "antd";
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

    const memberIds = (queueMembers || []).map((m) => m.user_id);
    setSelectedMembers(memberIds);
  }, [open, initialValues, form, queueMembers]);

  const transferDataSource = useMemo(() => {
    return (orgMembers || []).map((m) => ({
      key: m.user_id,
      title: m.full_name || t("common.unnamed"),
      description: m.role,
      avatar_url: m.avatar_url,
      role: m.role,
    }));
  }, [orgMembers, t]);

  function handleTransferChange(targetKeys) {
    setSelectedMembers(targetKeys);
  }

  function handleSubmit(values) {
    onSubmit({
      ...values,
      memberIds: selectedMembers,
    });
  }

  // ✅ גודל "פרימיום" לרשימות
  const listW = isMobile ? "100%" : 340;
  const listH = isMobile ? 260 : 340;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={mode === "create" ? t("queues.modal.newTitle") : t("queues.modal.editTitle")}
      okText={mode === "create" ? t("common.create") : t("common.save")}
      onOk={() => form.submit()}
      confirmLoading={saving}
      forceRender
      width={isMobile ? "100%" : 820} // ✅ רחב יותר
      style={isMobile ? { top: 12 } : undefined}
      // ✅ זה הדבר הנכון להוסיף padding לגוף המודל
      bodyStyle={{ paddingTop: 12 }}
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
          <Input placeholder={t("queues.modal.namePlaceholder")} maxLength={60} showCount />
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
            <Space size={8} wrap>
              <span>{t("queues.modal.members")}</span>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({selectedMembers.length})
              </Text>
            </Space>
          }
        >
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Transfer
              dataSource={transferDataSource}
              targetKeys={selectedMembers}
              onChange={handleTransferChange}
              showSearch
              oneWay
              disabled={membersLoading}
              filterOption={(inputValue, item) => {
                const input = String(inputValue || "").toLowerCase();
                return (
                  String(item.title || "").toLowerCase().includes(input) ||
                  String(item.description || "").toLowerCase().includes(input)
                );
              }}
              // ✅ זה הפרופ הנכון ששולט על גודל שני הפאנלים
              listStyle={{
                width: listW,
                height: listH,
              }}
              // ✅ ברירת מחדל נוחה
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
                  <Tag color="blue" style={{ fontSize: 10 }}>
                    {item.role}
                  </Tag>
                </Space>
              )}
            />

            <Text type="secondary" style={{ fontSize: 12, marginTop: 10, display: "block" }}>
              {t("queues.modal.membersHint")}
            </Text>
          </div>
        </Form.Item>

        <Alert type="info" showIcon title={t("common.note")} description={t("queues.modal.defaultHint")} />
      </Form>
    </Modal>
  );
}

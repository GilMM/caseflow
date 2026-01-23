// src/app/(app)/settings/_components/AnnouncementsManager.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Space,
  Switch,
  Table,
  Typography,
  message,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  NotificationOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";

import {
  createAnnouncement,
  deleteAnnouncement,
  listOrgAnnouncements,
  updateAnnouncement,
} from "@/lib/db";

const { Text } = Typography;

export default function AnnouncementsManager({ orgId, isAdmin, isMobile }) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [form] = Form.useForm();

  async function load() {
    if (!orgId || !isAdmin) return;
    setLoading(true);
    try {
      const data = await listOrgAnnouncements(orgId);
      setRows(data || []);
    } catch (e) {
      message.error(e?.message || t("settings.announcements.failedLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, isAdmin]);

  async function onCreate(values) {
    try {
      await createAnnouncement({
        orgId,
        title: values.title || null,
        body: values.body,
        isActive: true,
        sortOrder: 0,
      });
      message.success(t("settings.announcements.announcementAdded"));
      form.resetFields();
      await load();
    } catch (e) {
      message.error(e?.message || t("settings.announcements.failedAdd"));
    }
  }

  async function onToggleActive(id, isActive) {
    try {
      await updateAnnouncement(id, { is_active: isActive });
      await load();
    } catch (e) {
      message.error(e?.message || t("settings.announcements.failedUpdate"));
    }
  }

  async function onDelete(id) {
    try {
      await deleteAnnouncement(id);
      message.success(t("settings.announcements.deleted"));
      await load();
    } catch (e) {
      message.error(e?.message || t("settings.announcements.deleteFailed"));
    }
  }
  const columns = useMemo(
    () => [
      {
        title: "",
        dataIndex: "id",
        width: 44,
        align: "center",
        render: (_, r) => (
          <Popconfirm
            title={t("settings.announcements.deleteConfirm")}
            onConfirm={() => onDelete(r.id)}
          >
            <Button danger type="text" size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
      },
      {
        title: t("settings.announcements.titleLabel"),
        dataIndex: "title",
        width: 180,
        ellipsis: true,
        render: (v) => (
          <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v || "—" }}>
            {v || "—"}
          </Text>
        ),
      },
      {
        title: t("settings.announcements.message"),
        dataIndex: "body",
        ellipsis: true,
        render: (v) => (
          <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v }}>
            {v}
          </Text>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!isAdmin) return null;

  return (
    <Card
      style={{ borderRadius: 16, marginTop: 12 }}
      title={
        <Space size={8}>
          <NotificationOutlined />
          <span>{t("settings.announcements.title")}</span>
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={load}
          loading={loading}
          block={isMobile}
        >
          {t("settings.announcements.refresh")}
        </Button>
      }
    >
      <Text type="secondary" style={{ fontSize: 12 }}>
        {t("settings.announcements.headerHint")}
      </Text>

      <Divider style={{ margin: "12px 0" }} />

      <Form
        form={form}
        layout="vertical"
        onFinish={onCreate}
        requiredMark={false}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Form.Item
              name="title"
              label={t("settings.announcements.titleLabel")}
            >
              <Input
                placeholder={t("settings.announcements.titlePlaceholder")}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={16}>
            <Form.Item
              name="body"
              label={t("settings.announcements.messageLabel")}
              rules={[
                {
                  required: true,
                  message: t("settings.announcements.messageRequired"),
                },
                { max: 200, message: t("settings.announcements.messageMax") },
              ]}
            >
              <Input
                placeholder={t("settings.announcements.messagePlaceholder")}
                maxLength={200}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>

        <Button
          type="primary"
          htmlType="submit"
          icon={<PlusOutlined />}
          block={isMobile}
        >
          {t("settings.announcements.addAnnouncement")}
        </Button>
      </Form>

      <Divider style={{ margin: "12px 0" }} />

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 6, hideOnSinglePage: true }}
        scroll={{ x: 720 }}
        size="small"
        bordered={false}
        rowClassName={() => "cf-compact-row"}
      />
    </Card>
  );
}

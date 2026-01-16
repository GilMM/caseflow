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
import { PlusOutlined, DeleteOutlined, NotificationOutlined, ReloadOutlined } from "@ant-design/icons";

import { createAnnouncement, deleteAnnouncement, listOrgAnnouncements, updateAnnouncement } from "@/lib/db";

const { Text } = Typography;

export default function AnnouncementsManager({ orgId, isAdmin, isMobile }) {
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
      message.error(e?.message || "Failed to load announcements");
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
      message.success("Announcement added");
      form.resetFields();
      await load();
    } catch (e) {
      message.error(e?.message || "Failed to add announcement");
    }
  }

  async function onToggleActive(id, isActive) {
    try {
      await updateAnnouncement(id, { is_active: isActive });
      await load();
    } catch (e) {
      message.error(e?.message || "Failed to update");
    }
  }

  async function onDelete(id) {
    try {
      await deleteAnnouncement(id);
      message.success("Deleted");
      await load();
    } catch (e) {
      message.error(e?.message || "Delete failed");
    }
  }

  const columns = useMemo(
    () => [
      {
        title: "Active",
        dataIndex: "is_active",
        width: 90,
        render: (v, r) => (
          <Switch checked={!!v} onChange={(checked) => onToggleActive(r.id, checked)} />
        ),
      },
      {
        title: "Title",
        dataIndex: "title",
        width: 140,
        render: (v) => <Text>{v || "—"}</Text>,
      },
      {
        title: "Message",
        dataIndex: "body",
        render: (v) => (
          <Text style={{ display: "inline-block", maxWidth: 320 }} ellipsis={{ tooltip: v }}>
            {v}
          </Text>
        ),
      },
      {
        title: "",
        dataIndex: "id",
        width: 60,
        render: (_, r) => (
          <Popconfirm title="Delete this announcement?" onConfirm={() => onDelete(r.id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows]
  );

  if (!isAdmin) return null;

  return (
    <Card
      style={{ borderRadius: 16, marginTop: 12 }}
      title={
        <Space size={8}>
          <NotificationOutlined />
          <span>Announcements</span>
        </Space>
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} block={isMobile}>
          Refresh
        </Button>
      }
    >
      <Text type="secondary" style={{ fontSize: 12 }}>
        These messages appear in the top header ticker for everyone.
      </Text>

      <Divider style={{ margin: "12px 0" }} />

      <Form form={form} layout="vertical" onFinish={onCreate} requiredMark={false}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Form.Item name="title" label="Title">
              <Input placeholder="Optional (e.g., Maintenance)" />
            </Form.Item>
          </Col>

          <Col xs={24} md={16}>
            <Form.Item
              name="body"
              label="Message"
              rules={[{ required: true, message: "Message is required" }, { max: 200, message: "Max 200 characters" }]}
            >
              <Input placeholder="Short message recommended (ticker)" maxLength={200} showCount />
            </Form.Item>
          </Col>
        </Row>

        <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block={isMobile}>
          Add announcement
        </Button>
      </Form>

      <Divider style={{ margin: "12px 0" }} />

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 6, hideOnSinglePage: true }}
        scroll={{ x: true }}
      />
    </Card>
  );
}

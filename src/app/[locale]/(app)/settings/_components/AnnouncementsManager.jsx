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
  Modal,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  NotificationOutlined,
  ReloadOutlined,
  EditOutlined,
  SaveOutlined,
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

  // Modal state
  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ title: "", body: "" });
  const [savingEdit, setSavingEdit] = useState(false);

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
      // אם מחקנו את מה שהיה בעריכה - ננקה מצב עריכה
      if (editingId === id) {
        setEditingId(null);
        setEditDraft({ title: "", body: "" });
      }
      await load();
    } catch (e) {
      message.error(e?.message || t("settings.announcements.deleteFailed"));
    }
  }

  function openEdit(row) {
    setEditingId(row.id);
    setEditDraft({
      title: row.title || "",
      body: row.body || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({ title: "", body: "" });
  }

  async function saveEdit() {
    if (!editingId) return;

    const body = (editDraft.body || "").trim();
    const title = (editDraft.title || "").trim();

    if (!body) {
      message.error(t("settings.announcements.messageRequired"));
      return;
    }
    if (body.length > 200) {
      message.error(t("settings.announcements.messageMax"));
      return;
    }

    setSavingEdit(true);
    try {
      await updateAnnouncement(editingId, {
        title: title || null,
        body,
      });
      message.success(t("settings.announcements.updated") || "Updated");
      cancelEdit();
      await load();
    } catch (e) {
      message.error(e?.message || t("settings.announcements.failedUpdate"));
    } finally {
      setSavingEdit(false);
    }
  }

  const manageColumns = useMemo(
    () => [
      {
        title: t("settings.announcements.titleLabel"),
        dataIndex: "title",
        width: 220,
        ellipsis: true,
        render: (v, r) => (
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
      {
        title: t("settings.announcements.active") || "Active",
        dataIndex: "is_active",
        width: 110,
        align: "center",
        render: (v, r) => (
          <Switch
            checked={!!r.is_active}
            onChange={(checked) => onToggleActive(r.id, checked)}
          />
        ),
      },
      {
        title: "",
        dataIndex: "_actions",
        width: 120,
        align: "right",
        render: (_, r) => (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(r)}
            />
            <Popconfirm
              title={t("settings.announcements.deleteConfirm")}
              onConfirm={() => onDelete(r.id)}
            >
              <Button
                danger
                type="text"
                size="small"
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, editingId, editDraft, loading],
  );

  if (!isAdmin) return null;

  const hasRows = rows?.length > 0;

  return (
    <>
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

          <Row gutter={[10, 10]}>
            <Col xs={24} md={12}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                block
              >
                {t("settings.announcements.addAnnouncement")}
              </Button>
            </Col>

            <Col xs={24} md={12}>
              <Button
                icon={<EditOutlined />}
                block
                onClick={() => setManageOpen(true)}
                disabled={!hasRows}
              >
                {t("settings.announcements.manage") || "Manage / Edit"}
              </Button>
            </Col>
          </Row>

          {!hasRows ? (
            <div style={{ marginTop: 10 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("settings.announcements.noItemsHint") ||
                  "No announcements yet. Add one, then you can manage/edit them."}
              </Text>
            </div>
          ) : null}
        </Form>
      </Card>

      <Modal
        open={manageOpen}
        onCancel={() => {
          setManageOpen(false);
          cancelEdit();
        }}
        title={
          t("settings.announcements.manageTitle") || "Manage announcements"
        }
        footer={null}
        width={900}
        destroyOnHidden ={true}
      >
        <Space orientation ="vertical" size={12} style={{ width: "100%" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("settings.announcements.manageHint") ||
              "Edit, delete, or toggle active status. Changes apply immediately."}
          </Text>

          <Divider style={{ margin: "8px 0" }} />

          {/* Inline editor */}
          {editingId ? (
            <Card size="small" style={{ borderRadius: 12 }}>
              <Space orientation ="vertical" size={10} style={{ width: "100%" }}>
                <Text strong>
                  {t("settings.announcements.editing") || "Editing"}{" "}
                  <Text type="secondary">#{editingId.slice(0, 8)}</Text>
                </Text>

                <Input
                  value={editDraft.title}
                  onChange={(e) =>
                    setEditDraft((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder={t("settings.announcements.titlePlaceholder")}
                />

                <Input
                  value={editDraft.body}
                  onChange={(e) =>
                    setEditDraft((p) => ({ ...p, body: e.target.value }))
                  }
                  placeholder={t("settings.announcements.messagePlaceholder")}
                  maxLength={200}
                  showCount
                />

                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={savingEdit}
                    onClick={saveEdit}
                  >
                    {t("common.save") || "Save"}
                  </Button>
                  <Button onClick={cancelEdit}>
                    {t("common.cancel") || "Cancel"}
                  </Button>
                </Space>
              </Space>
            </Card>
          ) : null}

          {/* ===== Desktop: Table ===== */}
          {!isMobile && (
            <Table
              rowKey="id"
              loading={loading}
              dataSource={rows}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              showHeader={false}
              size="middle"
              rowClassName={() => "cf-announce-row"}
              columns={[
                {
                  render: (_, r) => (
                    <Space
                      orientation ="vertical"
                      size={4}
                      style={{ width: "100%" }}
                    >
                      <Text strong style={{ fontSize: 14 }}>
                        {r.title || t("settings.announcements.untitled")}
                      </Text>

                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {r.body}
                      </Text>
                    </Space>
                  ),
                },
                {
                  width: 160,
                  align: "right",
                  render: (_, r) => (
                    <Space>
                      <Switch
                        checked={!!r.is_active}
                        onChange={(v) => onToggleActive(r.id, v)}
                      />

                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(r)}
                      />

                      <Popconfirm
                        title={t("settings.announcements.deleteConfirm")}
                        onConfirm={() => onDelete(r.id)}
                      >
                        <Button danger type="text" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          )}

          {/* ===== Mobile: Cards ===== */}
          {isMobile && (
            <Space orientation ="vertical" size={12} style={{ width: "100%" }}>
              {rows.map((r) => (
                <Card key={r.id} size="small" style={{ borderRadius: 12 }}>
                  <Space
                    orientation ="vertical"
                    size={6}
                    style={{ width: "100%" }}
                  >
                    <Text strong>
                      {r.title || t("settings.announcements.untitled")}
                    </Text>

                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {r.body}
                    </Text>

                    <Divider style={{ margin: "6px 0" }} />

                    <Space
                      align="center"
                      style={{ justifyContent: "space-between", width: "100%" }}
                    >
                      <Switch
                        checked={!!r.is_active}
                        onChange={(v) => onToggleActive(r.id, v)}
                      />

                      <Space>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEdit(r)}
                        >
                          {t("common.edit")}
                        </Button>

                        <Popconfirm
                          title={t("settings.announcements.deleteConfirm")}
                          onConfirm={() => onDelete(r.id)}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>
                            {t("common.delete")}
                          </Button>
                        </Popconfirm>
                      </Space>
                    </Space>
                  </Space>
                </Card>
              ))}
            </Space>
          )}
        </Space>
      </Modal>
    </>
  );
}

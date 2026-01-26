"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { getQueueById, getQueueMembers, getCasesByQueue, setQueueMembers } from "@/lib/db";
import { getStatusMeta } from "@/lib/ui/status";
import { getPriorityMeta } from "@/lib/ui/priority";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import QueueUpsertModal from "../QueueUpsertModal";

const { Title, Text } = Typography;

export default function QueueDetailsPage() {
  const router = useRouter();
  const { id, locale } = useParams();
  const t = useTranslations();
  const tQueue = useTranslations("queueDetails");
  const { members: orgMembers } = useWorkspace();

  const [queue, setQueue] = useState(null);
  const [members, setMembers] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    try {
      const [q, m, c] = await Promise.all([
        getQueueById(id),
        getQueueMembers(id),
        getCasesByQueue(id),
      ]);
      setQueue(q);
      setMembers(m || []);
      setCases(c || []);
    } catch (e) {
      message.error(e?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSaveQueue(values) {
    if (!queue) return;
    setSaving(true);
    try {
      const { supabase } = await import("@/lib/supabase/client");

      const { error } = await supabase
        .from("queues")
        .update({
          name: values.name,
          is_active: values.is_active,
          is_default: values.is_default,
        })
        .eq("id", queue.id);

      if (error) throw error;

      // Update members
      if (values.memberIds) {
        await setQueueMembers({ queueId: queue.id, userIds: values.memberIds });
      }

      message.success(t("common.saved"));
      setModalOpen(false);
      await loadAll();
    } catch (e) {
      message.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <div style={{ height: "40vh", display: "grid", placeItems: "center" }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!queue) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Space orientation="vertical" size={12}>
          <Title level={4} style={{ margin: 0 }}>
            {tQueue("notFound")}
          </Title>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/${locale}/queues`)}
          >
            {tQueue("backToQueues")}
          </Button>
        </Space>
      </Card>
    );
  }

  const caseColumns = [
    {
      title: tQueue("table.title"),
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <a onClick={() => router.push(`/${locale}/cases/${record.id}`)}>
          {text || t("common.untitled")}
        </a>
      ),
    },
    {
      title: tQueue("table.status"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => {
        const s = getStatusMeta(status);
        return <Tag color={s.color}>{t(`cases.status.${status}`)}</Tag>;
      },
    },
    {
      title: tQueue("table.priority"),
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (priority) => {
        const p = getPriorityMeta(priority);
        return <Tag color={p.color}>{t(`cases.priority.${priority}`)}</Tag>;
      },
    },
    {
      title: tQueue("table.created"),
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      {/* Back button */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push(`/${locale}/queues`)}
        style={{ width: "fit-content" }}
      >
        {tQueue("backToQueues")}
      </Button>

      {/* Queue Header */}
      <Card style={{ borderRadius: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <Space size={8} align="center">
              <Title level={3} style={{ margin: 0 }}>
                {queue.name}
              </Title>
              {queue.is_default && <Tag color="gold">{t("queues.form.default")}</Tag>}
              <Tag color={queue.is_active ? "green" : "default"}>
                {queue.is_active ? t("queues.form.active") : t("common.inactive")}
              </Tag>
            </Space>
            <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
              {t("common.created")}: {new Date(queue.created_at).toLocaleDateString()}
            </Text>
          </div>

          <Button
            icon={<EditOutlined />}
            onClick={() => setModalOpen(true)}
          >
            {tQueue("edit")}
          </Button>
        </div>
      </Card>

      {/* Members */}
      <Card
        title={tQueue("members")}
        style={{ borderRadius: 16 }}
        extra={
          <Button size="small" onClick={() => setModalOpen(true)}>
            {tQueue("manage")}
          </Button>
        }
      >
        {members.length === 0 ? (
          <Empty description={tQueue("noMembers")} />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {members.map((m) => {
              const profile = m.profiles || {};
              return (
                <Tag
                  key={m.user_id}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Avatar
                    size={24}
                    src={profile.avatar_url}
                    icon={<UserOutlined />}
                  >
                    {profile.full_name?.[0]?.toUpperCase()}
                  </Avatar>
                  <span>{profile.full_name || t("common.unnamed")}</span>
                </Tag>
              );
            })}
          </div>
        )}
      </Card>

      {/* Cases */}
      <Card title={tQueue("cases")} style={{ borderRadius: 16 }}>
        {cases.length === 0 ? (
          <Empty description={tQueue("noCases")} />
        ) : (
          <Table
            dataSource={cases}
            columns={caseColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        )}
      </Card>

      {/* Edit Modal */}
      <QueueUpsertModal
        open={modalOpen}
        mode="edit"
        isMobile={false}
        saving={saving}
        initialValues={{
          name: queue.name,
          is_active: queue.is_active,
          is_default: queue.is_default,
        }}
        onCancel={() => setModalOpen(false)}
        onSubmit={onSaveQueue}
        orgMembers={orgMembers}
        queueMembers={members}
        membersLoading={false}
      />
    </Space>
  );
}

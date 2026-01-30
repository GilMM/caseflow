"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Row,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Grid,
  App,
} from "antd";
import {
  ArrowLeftOutlined,
  CopyOutlined,
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";
import { caseKey } from "@/lib/ui/status";
import { getStatusMeta } from "@/lib/ui/status";
import { getPriorityMeta } from "@/lib/ui/priority";
import { initials, timeAgo } from "../contacts.utils";
import ContactUpsertModal from "../ContactUpsertModal";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
        {icon && <span style={{ marginInlineEnd: 6 }}>{icon}</span>}
        {label}
      </Text>
      <Text style={{ display: "block", marginTop: 2 }}>{value || "—"}</Text>
    </div>
  );
}

export default function ContactDetailsPage() {
  const router = useRouter();
  const { id, locale } = useParams();
  const { message } = App.useApp();
  const t = useTranslations();
  const tDetail = useTranslations("contactDetails");

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [contact, setContact] = useState(null);
  const [relatedCases, setRelatedCases] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadAll({ silent = false } = {}) {
    if (!id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const ws = await getActiveWorkspace();
      setWorkspace(ws);

      const [contactRes, casesRes] = await Promise.all([
        supabase
          .from("contacts")
          .select(
            "id,org_id,full_name,email,phone,department,job_title,location,notes,is_active,created_at,updated_at"
          )
          .eq("id", id)
          .single(),
        supabase
          .from("cases")
          .select("id, title, status, priority, created_at")
          .eq("requester_contact_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (contactRes.error) throw contactRes.error;
      setContact(contactRes.data);
      setRelatedCases(casesRes.data || []);
    } catch (e) {
      message.error(e?.message || tDetail("loadFailed"));
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleActive(nextActive) {
    if (!workspace?.orgId || !contact) return;
    try {
      const { error } = await supabase
        .from("contacts")
        .update({ is_active: nextActive })
        .eq("org_id", workspace.orgId)
        .eq("id", contact.id);

      if (error) throw error;
      message.success(nextActive ? tDetail("activated") : tDetail("deactivated"));
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || tDetail("updateFailed"));
    }
  }

  async function onSave(values) {
    if (!workspace?.orgId || !contact) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("contacts")
        .update({
          full_name: String(values.full_name || "").trim(),
          email: values.email ? String(values.email).trim() : null,
          phone: values.phone ? String(values.phone).trim() : null,
          department: values.department ? String(values.department).trim() : null,
          job_title: values.job_title ? String(values.job_title).trim() : null,
          location: values.location ? String(values.location).trim() : null,
          notes: values.notes ? String(values.notes).trim() : null,
          is_active: !!values.is_active,
        })
        .eq("org_id", workspace.orgId)
        .eq("id", contact.id);

      if (error) throw error;
      message.success(tDetail("updated"));
      setModalOpen(false);
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || tDetail("updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  function copyContactKey() {
    const key = caseKey(contact?.id, "CT");
    navigator.clipboard.writeText(key).then(
      () => message.success(t("common.copied")),
      () => message.error(t("common.copyFailed"))
    );
  }

  const contactKey = caseKey(contact?.id, "CT");
  const isActive = contact ? (contact.is_active ?? true) !== false : true;

  const modalInitialValues = useMemo(() => {
    if (!contact) return {};
    return {
      full_name: contact.full_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      department: contact.department || "",
      job_title: contact.job_title || "",
      location: contact.location || "",
      is_active: isActive,
      notes: contact.notes || "",
    };
  }, [contact, isActive]);

  const caseColumns = [
    {
      title: tDetail("table.title"),
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <a onClick={() => router.push(`/${locale}/cases/${record.id}`)}>
          {text || t("common.untitled")}
        </a>
      ),
    },
    {
      title: tDetail("table.status"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => {
        const s = getStatusMeta(status);
        return <Tag color={s.color}>{t(`cases.status.${status}`)}</Tag>;
      },
    },
    {
      title: tDetail("table.priority"),
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (priority) => {
        const p = getPriorityMeta(priority);
        return <Tag color={p.color}>{t(`cases.priority.${priority}`)}</Tag>;
      },
    },
    {
      title: tDetail("table.created"),
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  // Loading state
  if (loading) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <div style={{ height: "40vh", display: "grid", placeItems: "center" }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  // Not found
  if (!contact) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Space direction="vertical" size={12}>
          <Title level={4} style={{ margin: 0 }}>
            {tDetail("notFound")}
          </Title>
          <Text type="secondary">{tDetail("notFoundSubtitle")}</Text>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/${locale}/contacts`)}
          >
            {tDetail("backToContacts")}
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push(`/${locale}/contacts`)}
          style={{ width: isMobile ? "100%" : "fit-content" }}
        >
          {tDetail("backToContacts")}
        </Button>

        <Space wrap>
          <Tag style={{ borderRadius: 999 }}>{contactKey}</Tag>
          <Tooltip title={t("common.copy")}>
            <Button icon={<CopyOutlined />} size="small" onClick={copyContactKey} />
          </Tooltip>
          <Tooltip title={t("common.refresh")}>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              loading={refreshing}
              onClick={() => loadAll({ silent: true })}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Card 1: Header */}
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
          <Space align="start" size={14}>
            <Avatar size={56}>{initials(contact.full_name)}</Avatar>
            <div>
              <Space wrap size={8} align="center">
                <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                  {contact.full_name}
                </Title>
                <Badge
                  status={isActive ? "success" : "default"}
                  text={isActive ? t("common.active") : t("common.inactive")}
                />
              </Space>
              <Space wrap size={8} style={{ marginTop: 4 }}>
                {contact.department && (
                  <Tag color="geekblue">{contact.department}</Tag>
                )}
                {contact.job_title && <Tag>{contact.job_title}</Tag>}
              </Space>
              <Text
                type="secondary"
                style={{ display: "block", marginTop: 4, fontSize: 12 }}
              >
                {t("common.created")}: {timeAgo(contact.created_at)}
                {contact.updated_at && (
                  <> &middot; {t("contacts.list.updated", { updated: timeAgo(contact.updated_at), created: timeAgo(contact.created_at) })}</>
                )}
              </Text>
            </div>
          </Space>

          <Space wrap>
            <Tooltip title={tDetail("toggleTooltip")}>
              <Switch checked={isActive} onChange={toggleActive} />
            </Tooltip>
            <Button icon={<EditOutlined />} onClick={() => setModalOpen(true)}>
              {t("common.edit")}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                router.push(`/${locale}/cases/new?requester=${contact.id}`)
              }
            >
              {t("cases.header.newCase")}
            </Button>
          </Space>
        </div>
      </Card>

      {/* Card 2: Contact Information */}
      <Card title={tDetail("info")} style={{ borderRadius: 16 }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <InfoRow
              icon={<MailOutlined />}
              label={tDetail("email")}
              value={contact.email}
            />
            <InfoRow
              icon={<PhoneOutlined />}
              label={tDetail("phone")}
              value={contact.phone}
            />
            <InfoRow label={tDetail("department")} value={contact.department} />
          </Col>
          <Col xs={24} md={12}>
            <InfoRow label={tDetail("jobTitle")} value={contact.job_title} />
            <InfoRow
              icon={<EnvironmentOutlined />}
              label={tDetail("location")}
              value={contact.location}
            />
          </Col>
          {contact.notes && (
            <Col span={24}>
              <Divider style={{ margin: "8px 0" }} />
              <Text strong style={{ display: "block", marginBottom: 6 }}>
                {tDetail("notes")}
              </Text>
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  minHeight: 48,
                }}
              >
                {contact.notes}
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {/* Card 3: Related Cases */}
      <Card
        title={tDetail("relatedCases")}
        style={{ borderRadius: 16 }}
        extra={<Tag style={{ borderRadius: 999 }}>{relatedCases.length}</Tag>}
      >
        {relatedCases.length === 0 ? (
          <Empty description={tDetail("noCases")}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                router.push(`/${locale}/cases/new?requester=${contact.id}`)
              }
            >
              {t("cases.header.newCase")}
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={relatedCases}
            columns={caseColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        )}
      </Card>

      {/* Edit Modal */}
      <ContactUpsertModal
        open={modalOpen}
        mode="edit"
        isMobile={isMobile}
        saving={saving}
        initialValues={modalInitialValues}
        onCancel={() => setModalOpen(false)}
        onSubmit={onSave}
      />
    </Space>
  );
}

// src/app/[locale]/(app)/cases/[id]/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  Avatar,
  Button,
  Card,
  Divider,
  Input,
  Space,
  Tag,
  Typography,
  message,
  Grid,
  Spin,
} from "antd";
import { ArrowLeftOutlined, CheckOutlined, UserOutlined } from "@ant-design/icons";

import CaseAssignment from "@/components/cases/CaseAssignment";
import CaseTimeline from "@/components/cases/CaseTimeline";
import CaseAttachments from "@/components/cases/CaseAttachments";

import { CASE_STATUSES, getStatusMeta } from "@/lib/ui/status";
import { getPriorityMeta } from "@/lib/ui/priority";

import {
  addCaseNote,
  getCaseActivities,
  getCaseById,
  updateCaseStatus,
  getOrgMembers,
  getCaseAttachments,
  uploadCaseAttachment,
  deleteCaseAttachment,
} from "@/lib/db";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

function presetColorVar(color, level = 6) {
  if (!color || color === "default")
    return "var(--ant-color-text, rgba(255,255,255,0.85))";
  return `var(--ant-color-${color}-${level}, var(--ant-color-primary, #1677ff))`;
}

// map DB status -> your i18n keys (cases.status.*)
function statusI18nKey(statusValue) {
  switch (statusValue) {
    case "new":
      return "new";
    case "in_progress":
      return "inProgress";
    case "waiting_customer":
      return "waitingCustomer";
    case "resolved":
      return "resolved";
    case "closed":
      return "closed";
    default:
      return "new";
  }
}

export default function CaseDetailsPage() {
  const router = useRouter();
  const { id, locale } = useParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const t = useTranslations();
  const tCase = useTranslations("caseDetails");

  const [row, setRow] = useState(null);
  const [items, setItems] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [note, setNote] = useState("");
  const [busyNote, setBusyNote] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const createdLabel = useMemo(() => tCase("meta.created"), [tCase]);

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    try {
      const c = await getCaseById(id);
      const acts = await getCaseActivities(id);
      const atts = await getCaseAttachments(id);

      setRow(c);
      setItems(acts);
      setAttachments(atts || []);

      if (c?.org_id) {
        const members = await getOrgMembers(c.org_id);
        const map = {};
        for (const m of members) map[m.user_id] = m.full_name || m.email || null;
        setUserMap(map);
      } else {
        setUserMap({});
      }
    } catch (e) {
      message.error(e?.message || tCase("messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function onUploadAttachment(file) {
    if (!row) return;
    setUploadingAttachment(true);
    try {
      const attachment = await uploadCaseAttachment({
        caseId: row.id,
        orgId: row.org_id,
        file,
      });
      setAttachments((prev) => [...prev, attachment]);
      return attachment;
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function onDeleteAttachment(attachmentId) {
    await deleteCaseAttachment(attachmentId);
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onAddNote() {
    if (!row) return;
    const text = note.trim();
    if (!text) return;

    setBusyNote(true);
    try {
      await addCaseNote({ caseId: row.id, orgId: row.org_id, body: text });
      setNote("");
      await loadAll();
      message.success(tCase("messages.noteAdded"));
    } catch (e) {
      message.error(e?.message || tCase("messages.noteAddFailed"));
    } finally {
      setBusyNote(false);
    }
  }

  async function onChangeStatus(nextStatus) {
    if (!row) return;
    if (row.status === nextStatus) return;

    setBusyStatus(true);
    try {
      await updateCaseStatus({
        caseId: row.id,
        orgId: row.org_id,
        status: nextStatus,
      });
      await loadAll();

      // friendly label (from your existing translations)
      const label = t(`cases.status.${statusI18nKey(nextStatus)}`);
      message.success(tCase("messages.statusUpdated", { status: label }));
    } catch (e) {
      message.error(e?.message || tCase("messages.statusUpdateFailed"));
    } finally {
      setBusyStatus(false);
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

  const backToCases = () => router.push(`/${locale}/cases`);

  if (!row) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Space orientation="vertical" size={6}>
          <Title level={4} style={{ margin: 0 }}>
            {tCase("notFound.title")}
          </Title>
          <Text type="secondary">{tCase("notFound.subtitle")}</Text>

          <Button
            icon={<ArrowLeftOutlined />}
            onClick={backToCases}
            style={{ width: "fit-content" }}
          >
            {t("common.back")} {t("navigation.cases")}
          </Button>
        </Space>
      </Card>
    );
  }

  const s = getStatusMeta(row.status);
  const p = getPriorityMeta(row.priority);

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={backToCases}
        style={{ width: "fit-content" }}
        block={isMobile}
      >
        {t("common.back")} {t("navigation.cases")}
      </Button>

      <Card style={{ borderRadius: 16 }}>
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 320px" }}>
              <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                {row.title || t("common.untitled")}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {createdLabel} {new Date(row.created_at).toLocaleString()}
              </Text>
            </div>

            <Space wrap style={{ justifyContent: isMobile ? "flex-start" : "flex-end" }}>
              <Tag color={s.color} icon={s.Icon ? <s.Icon /> : null}>
                {/* status label from translations */}
                {t(`cases.status.${statusI18nKey(row.status)}`)}
              </Tag>

              <Tag color={p.color} icon={p.Icon ? <p.Icon /> : null}>
                {/* priority label from your existing translations */}
                {t(`cases.priority.${row.priority || "normal"}`)}
              </Tag>
            </Space>
          </div>

          <Divider style={{ margin: "12px 0" }} />

          {/* Description */}
          <div style={{ display: "grid", gap: 10 }}>
            <Text strong>{tCase("sections.description")}</Text>
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {row.description || "—"}
            </div>
          </div>

          {/* Requester */}
          {row.requester && (
            <>
              <Divider style={{ margin: "12px 0" }} />
              <div style={{ display: "grid", gap: 10 }}>
                <Text strong>{t("cases.new.requester")}</Text>
                <Space size={12}>
                  <Avatar size={40} icon={<UserOutlined />}>
                    {row.requester.full_name?.[0]?.toUpperCase()}
                  </Avatar>
                  <div>
                    <Text strong style={{ display: "block" }}>
                      {row.requester.full_name || t("common.unnamed")}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {[row.requester.email, row.requester.phone, row.requester.department]
                        .filter(Boolean)
                        .join(" • ") || "—"}
                    </Text>
                  </div>
                </Space>
              </div>
            </>
          )}

          {/* Assignee */}
          {row.assignee && (
            <>
              <Divider style={{ margin: "12px 0" }} />
              <div style={{ display: "grid", gap: 10 }}>
                <Text strong>{t("cases.new.assignee")}</Text>
                <Space size={12}>
                  <Avatar size={40} src={row.assignee.avatar_url} icon={<UserOutlined />}>
                    {row.assignee.full_name?.[0]?.toUpperCase()}
                  </Avatar>
                  <div>
                    <Text strong style={{ display: "block" }}>
                      {row.assignee.full_name || t("common.unnamed")}
                    </Text>
                    <Tag color="geekblue">{tCase("assigned")}</Tag>
                  </div>
                </Space>
              </div>
            </>
          )}

          {/* Attachments */}
          {(attachments.length > 0 || true) && (
            <>
              <Divider style={{ margin: "12px 0" }} />
              <div style={{ display: "grid", gap: 10 }}>
                <Text strong>{t("attachments.title")}</Text>
                <CaseAttachments
                  attachments={attachments}
                  onUpload={onUploadAttachment}
                  onDelete={onDeleteAttachment}
                  uploading={uploadingAttachment}
                />
              </div>
            </>
          )}

          <Divider style={{ margin: "12px 0" }} />

          {/* Assignment */}
          <Card style={{ borderRadius: 14 }}>
            <CaseAssignment
              caseId={row.id}
              orgId={row.org_id}
              assignedTo={row.assigned_to}
              onChanged={loadAll}
            />
          </Card>

          {/* Quick status */}
          <div>
            <Text strong>{tCase("sections.quickStatus")}</Text>

            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr 1fr"
                  : "repeat(5, max-content)",
                gap: 8,
                alignItems: "center",
              }}
            >
              {CASE_STATUSES.map((st) => {
                const sm = getStatusMeta(st.value);
                const Accent = presetColorVar(sm.color, 6);
                const active = row.status === st.value;

                return (
                  <Button
                    key={st.value}
                    disabled={busyStatus}
                    onClick={() => onChangeStatus(st.value)}
                    icon={
                      active ? <CheckOutlined /> : sm.Icon ? <sm.Icon /> : null
                    }
                    type={active ? "primary" : "default"}
                    style={{
                      width: isMobile ? "100%" : undefined,
                      borderRadius: 10,
                      borderColor: Accent,
                      color: active ? "#fff" : Accent,
                      background: active ? Accent : "transparent",
                    }}
                  >
                    {t(`cases.status.${statusI18nKey(st.value)}`)}
                  </Button>
                );
              })}
            </div>

            {isMobile ? (
              <Text
                type="secondary"
                style={{ fontSize: 12, display: "block", marginTop: 8 }}
              >
                {tCase("tips.mobileQuickStatus")}
              </Text>
            ) : null}
          </div>
        </Space>
      </Card>

      {/* Add note */}
      <Card title={tCase("sections.addNote")} style={{ borderRadius: 16 }}>
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={isMobile ? 4 : 3}
            placeholder={tCase("note.placeholder")}
          />
          <Button
            type="primary"
            onClick={onAddNote}
            loading={busyNote}
            block={isMobile}
            style={!isMobile ? { width: "fit-content" } : undefined}
            disabled={!note.trim()}
          >
            {tCase("note.add")}
          </Button>
        </Space>
      </Card>

      {/* Timeline */}
      <Card title={tCase("sections.timeline")} style={{ borderRadius: 16 }}>
        <CaseTimeline items={items} userMap={userMap} />
      </Card>
    </Space>
  );
}

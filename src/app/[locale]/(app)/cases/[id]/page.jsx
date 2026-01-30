"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  Tooltip,
  Skeleton,
  Empty,
  Row,
  Col,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  UserOutlined,
  CopyOutlined,
  MailOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import CaseAssignment from "@/components/cases/CaseAssignment";
import CaseTimeline from "@/components/cases/CaseTimeline";
import CaseAttachments from "@/components/cases/CaseAttachments";
import { CASE_STATUSES, getStatusMeta, caseKey } from "@/lib/ui/status";
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
  getQueueMembers,
} from "@/lib/db";
import { initials } from "@/lib/ui/initials";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

/** ---------- Premium IDs (not UUID slices) ---------- **/
function hashToDigits(input, digits = 4) {
  const s = String(input || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const mod = 10 ** digits;
  const n = h % mod;
  return String(n).padStart(digits, "0");
}

function formatCaseKey({ caseId, queueName, queueKey }) {
  const rawPrefix = (queueKey || queueName || "CASE").trim();
  const prefix = rawPrefix
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.slice(0, 2).toUpperCase())
    .join("");

  const safePrefix = prefix || "CS";
  const num = hashToDigits(caseId, 4);
  return `${safePrefix}-${num}`;
}

/** ---------- UI helpers ---------- **/
function presetColorVar(color, level = 6) {
  if (!color || color === "default")
    return "var(--ant-color-text, rgba(255,255,255,0.85))";
  return `var(--ant-color-${color}-${level}, var(--ant-color-primary, #1677ff))`;
}

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

function formatDateTime(ts, locale) {
  try {
    return new Date(ts).toLocaleString(locale || undefined);
  } catch {
    return String(ts || "");
  }
}

function safeName(profile, fallback) {
  return profile?.full_name || profile?.email || fallback;
}

export default function CaseDetailsPage() {
  const router = useRouter();
  const { id, locale } = useParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const t = useTranslations();
  const tCase = useTranslations("caseDetails");

  // ✅ safe translators (so missing keys won't crash or spam)
  const safeT = (key, fallback, values) => {
    try {
      return t(key, values);
    } catch {
      return fallback;
    }
  };
  const safeTCase = (key, fallback, values) => {
    try {
      return tCase(key, values);
    } catch {
      return fallback;
    }
  };

  const [row, setRow] = useState(null);
  const [items, setItems] = useState([]);
  const [profilesById, setProfilesById] = useState({});
  const [attachments, setAttachments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [queueMembers, setQueueMembers] = useState([]);
  const [queueMembersLoading, setQueueMembersLoading] = useState(false);

  const [note, setNote] = useState("");
  const [busyNote, setBusyNote] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const createdLabel = useMemo(
    () => safeTCase("meta.created", "Created:"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tCase],
  );

  /** ---------- Height management (key for internal scroll) ---------- **/
  const topRef = useRef(null);
  const headerRef = useRef(null);
  const [mainHeight, setMainHeight] = useState(null);

  useLayoutEffect(() => {
    if (isMobile) {
      setMainHeight(null);
      return;
    }

    const measure = () => {
      const topH = topRef.current?.getBoundingClientRect?.().height || 0;
      const headerH = headerRef.current?.getBoundingClientRect?.().height || 0;

      // padding + gutters (tune once, works reliably)
      const chrome = 12 /* page gap */ + 12 /* row gutter-ish */ + 12;
      const available = Math.max(
        360,
        window.innerHeight - topH - headerH - chrome,
      );
      setMainHeight(available);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isMobile]);

  async function loadAll({ silent = false } = {}) {
    if (!id) return;

    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const c = await getCaseById(id);
      const acts = await getCaseActivities(id);
      const atts = await getCaseAttachments(id);

      setRow(c);
      setItems(acts || []);
      setAttachments(atts || []);

      // profiles map for timeline + side UI
      if (c?.org_id) {
        const members = await getOrgMembers(c.org_id);
        const map = {};
        for (const m of members || []) {
          map[m.user_id] = {
            full_name: m.full_name || null,
            email: m.email || null,
            avatar_url: m.avatar_url || null,
          };
        }
        setProfilesById(map);
      } else {
        setProfilesById({});
      }

      // queue roster
      if (c?.queue_id) {
        setQueueMembersLoading(true);
        try {
          const qm = await getQueueMembers(c.queue_id);
          setQueueMembers(qm || []);
        } catch (e) {
          setQueueMembers([]);
          console.warn("Failed to load queue members:", e?.message);
        } finally {
          setQueueMembersLoading(false);
        }
      } else {
        setQueueMembers([]);
      }
    } catch (e) {
      message.error(
        e?.message || safeTCase("messages.loadFailed", "Failed to load case"),
      );
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  async function onAddNote() {
    if (!row) return;
    const text = note.trim();
    if (!text) return;

    setBusyNote(true);
    try {
      await addCaseNote({ caseId: row.id, orgId: row.org_id, body: text });
      setNote("");
      await loadAll({ silent: true });
      message.success(safeTCase("messages.noteAdded", "Note added"));
    } catch (e) {
      message.error(
        e?.message || safeTCase("messages.noteAddFailed", "Failed to add note"),
      );
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
      await loadAll({ silent: true });

      const label = safeT(
        `cases.status.${statusI18nKey(nextStatus)}`,
        nextStatus,
      );
      message.success(
        safeTCase("messages.statusUpdated", "Status updated to {status}", {
          status: label,
        }),
      );
    } catch (e) {
      message.error(
        e?.message ||
          safeTCase("messages.statusUpdateFailed", "Failed to update status"),
      );
    } finally {
      setBusyStatus(false);
    }
  }

  const backToCases = () => router.push(`/${locale}/cases`);

  const eligibleIdsFromCase =
    Array.isArray(row?.eligible_user_ids) && row.eligible_user_ids.length > 0
      ? row.eligible_user_ids
      : null;

  const visiblePeople = eligibleIdsFromCase
    ? queueMembers.filter((m) => eligibleIdsFromCase.includes(m.user_id))
    : queueMembers;

  const queueRosterCount = queueMembers?.length || 0;
  const participantsCount =
    eligibleIdsFromCase?.length || visiblePeople?.length || 0;

  const s = row ? getStatusMeta(row.status) : null;
  const p = row ? getPriorityMeta(row.priority) : null;

  const prettyCaseKey = useMemo(() => {
    // אם תרצה בעתיד prefix לפי Queue (QA/IT וכו׳) – אפשר,
    // אבל כרגע כדי שיתאים ב-100% לרשימה נשאר עם ברירת מחדל CF.
    return caseKey(row?.id);
  }, [row?.id]);

  async function copyCaseKey() {
    try {
      await navigator.clipboard.writeText(String(prettyCaseKey || id || ""));
      message.success(safeT("common.copied", "Copied"));
    } catch {
      message.error(safeT("common.copyFailed", "Copy failed"));
    }
  }

  if (loading) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Skeleton active title paragraph={{ rows: 6 }} />
          <Skeleton active title paragraph={{ rows: 4 }} />
        </Space>
      </Card>
    );
  }

  if (!row) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Space direction="vertical" size={10}>
          <Title level={4} style={{ margin: 0 }}>
            {safeTCase("notFound.title", "Not found")}
          </Title>
          <Text type="secondary">
            {safeTCase("notFound.subtitle", "The case does not exist.")}
          </Text>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={backToCases}
            style={{ width: "fit-content" }}
          >
            {safeT("common.back", "Back")} {safeT("navigation.cases", "Cases")}
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {/* Top bar */}
      <div
        ref={topRef}
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
          onClick={backToCases}
          block={isMobile}
        >
          {safeT("common.back", "Back")} {safeT("navigation.cases", "Cases")}
        </Button>

        <Space wrap>
          <Tooltip title={safeT("common.copy", "Copy")}>
            <Button icon={<CopyOutlined />} onClick={copyCaseKey} />
          </Tooltip>
          <Tooltip title={safeT("common.refresh", "Refresh")}>
            <Button
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={() => loadAll({ silent: true })}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Header */}
      <Card
        ref={headerRef}
        style={{ borderRadius: 18 }}
        bodyStyle={{ padding: isMobile ? 14 : 18 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 420px" }}>
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Space wrap size={10} align="center">
                <Title
                  level={isMobile ? 4 : 3}
                  style={{ margin: 0, lineHeight: 1.15 }}
                >
                  {row.title || safeT("common.untitled", "Untitled")}
                </Title>

                <Tag style={{ borderRadius: 999, opacity: 0.95, margin: 0 }}>
                  {prettyCaseKey}
                </Tag>

                {row?.queue?.name || row?.queue_name ? (
                  <Tag style={{ borderRadius: 999, opacity: 0.9, margin: 0 }}>
                    {(row?.queue?.name || row?.queue_name || "").toString()}
                  </Tag>
                ) : null}
              </Space>

              <Text type="secondary" style={{ fontSize: 12 }}>
                {createdLabel} {formatDateTime(row.created_at, locale)}
                {row.updated_at ? (
                  <>
                    {" "}
                    • {safeTCase("meta.updated", "Updated")}{" "}
                    {formatDateTime(row.updated_at, locale)}
                  </>
                ) : null}
              </Text>
            </Space>
          </div>

          <Space
            wrap
            style={{ justifyContent: isMobile ? "flex-start" : "flex-end" }}
          >
            <Tag
              color={s?.color}
              icon={s?.Icon ? <s.Icon /> : null}
              style={{ borderRadius: 999, paddingInline: 12, margin: 0 }}
            >
              {safeT(`cases.status.${statusI18nKey(row.status)}`, row.status)}
            </Tag>

            <Tag
              color={p?.color}
              icon={p?.Icon ? <p.Icon /> : null}
              style={{ borderRadius: 999, paddingInline: 12, margin: 0 }}
            >
              {safeT(
                `cases.priority.${row.priority || "normal"}`,
                row.priority || "normal",
              )}
            </Tag>

            {row.source === "gmail" && (
              <Tag
                color="purple"
                icon={<MailOutlined />}
                style={{ borderRadius: 999, paddingInline: 12, margin: 0 }}
              >
                {safeT("cases.source.gmail", "Email")}
              </Tag>
            )}

            <Tag style={{ borderRadius: 999, paddingInline: 12, margin: 0 }}>
              {safeTCase("meta.participants", "Participants")}:{" "}
              {participantsCount}
            </Tag>
          </Space>
        </div>
      </Card>

      {/* Main layout */}
      <div style={{ height: mainHeight ?? "auto", minHeight: 0 }}>
        <Row
          gutter={[12, 12]}
          align="stretch"
          style={{ height: "100%", minHeight: 0 }}
        >
          {/* LEFT */}
          <Col xs={24} md={16} style={{ display: "flex", minHeight: 0 }}>
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                height: "100%",
                minHeight: 0,
              }}
            >
              {/* Description */}
              <Card
                style={{ borderRadius: 16 }}
                bodyStyle={{ padding: isMobile ? 14 : 16 }}
              >
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Text strong>
                    {safeTCase("sections.description", "Description")}
                  </Text>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      padding: 12,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      minHeight: 56,
                    }}
                  >
                    {row.description || "—"}
                  </div>
                </Space>
              </Card>

              {/* Activity (this MUST grow and own the scroll) */}
              <Card
                style={{ borderRadius: 16, flex: 1, minHeight: 0 }}
                bodyStyle={{
                  padding: isMobile ? 14 : 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  height: "100%",
                  minHeight: 0,
                }}
              >
                {/* Title row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "baseline",
                  }}
                >
                  <Text strong>
                    {safeTCase("sections.activity", "Activity")}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {safeTCase(
                      "tips.activity",
                      "Everything is logged automatically: status, priority, owner and notes.",
                    )}
                  </Text>
                </div>

                {/* Composer (fixed) */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <Space
                    direction="vertical"
                    size={10}
                    style={{ width: "100%" }}
                  >
                    <Input.TextArea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={isMobile ? 4 : 3}
                      placeholder={safeTCase(
                        "note.placeholder",
                        "Write an internal note…",
                      )}
                    />
                    <Space wrap>
                      <Button
                        type="primary"
                        onClick={onAddNote}
                        loading={busyNote}
                        disabled={!note.trim()}
                        block={isMobile}
                        style={{ borderRadius: 12 }}
                      >
                        {safeTCase("note.add", "Add note")}
                      </Button>

                      <Button
                        onClick={() => setNote("")}
                        disabled={busyNote || !note}
                        block={isMobile}
                        style={{ borderRadius: 12 }}
                      >
                        {safeT("common.clear", "Clear")}
                      </Button>
                    </Space>
                  </Space>
                </div>

                <Divider style={{ margin: "4px 0" }} />

                {/* ✅ Scroll area */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    paddingRight: 6,
                    scrollbarGutter: "stable",
                  }}
                >
                  {/* IMPORTANT: your CaseTimeline expects userMap, not profilesById */}
                  <CaseTimeline items={items} userMap={profilesById} />
                </div>
              </Card>
            </div>
          </Col>

          {/* RIGHT */}
          <Col xs={24} md={8} style={{ display: "flex", minHeight: 0 }}>
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                height: "100%",
                minHeight: 0,
              }}
            >
              {/* Owner */}
              <Card
                style={{ borderRadius: 16 }}
                bodyStyle={{ padding: isMobile ? 14 : 16 }}
                title={safeTCase("sections.owner", "Owner")}
              >
                <CaseAssignment
                  caseId={row.id}
                  orgId={row.org_id}
                  assignedTo={row.assigned_to}
                  assignee={row.assignee}
                  profilesById={profilesById}
                  onChanged={() => loadAll({ silent: true })}
                />
              </Card>

              {/* Quick status */}
              <Card
                style={{ borderRadius: 16 }}
                bodyStyle={{ padding: isMobile ? 14 : 16 }}
              >
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Space direction="vertical" size={2}>
                    <Text strong>
                      {safeTCase("sections.quickStatus", "Quick status")}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {safeTCase(
                        "tips.quickStatus",
                        "Update status instantly (logged in the activity feed).",
                      )}
                    </Text>
                  </Space>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
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
                            active ? (
                              <CheckOutlined />
                            ) : sm.Icon ? (
                              <sm.Icon />
                            ) : null
                          }
                          type={active ? "primary" : "default"}
                          style={{
                            borderRadius: 12,
                            borderColor: Accent,
                            color: active ? "#fff" : Accent,
                            background: active ? Accent : "transparent",
                          }}
                        >
                          {safeT(
                            `cases.status.${statusI18nKey(st.value)}`,
                            st.value,
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </Space>
              </Card>

              {/* Requester */}
              <Card
                style={{ borderRadius: 16 }}
                bodyStyle={{ padding: isMobile ? 14 : 16 }}
              >
                <Text strong>{safeT("cases.new.requester", "Requester")}</Text>
                <Divider style={{ margin: "10px 0" }} />

                {row.requester ? (
                  <Space size={12} align="start">
                    <Avatar size={42} icon={<UserOutlined />}>
                      {row.requester.full_name?.[0]?.toUpperCase()}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                      <Text strong style={{ display: "block" }}>
                        {row.requester.full_name ||
                          safeT("common.unnamed", "Unnamed")}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {[
                          row.requester.email,
                          row.requester.phone,
                          row.requester.department,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "—"}
                      </Text>
                    </div>
                  </Space>
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </Card>

              {/* Team */}
              <Card
                style={{ borderRadius: 16 }}
                bodyStyle={{ padding: isMobile ? 14 : 16 }}
              >
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Space wrap size={10} align="center">
                    <Text strong>{safeTCase("sections.team", "Team")}</Text>

                    {eligibleIdsFromCase ? (
                      <Tag
                        color="blue"
                        style={{ borderRadius: 999, margin: 0 }}
                      >
                        {(() => {
                          try {
                            return t("cases.new.selectedCount", {
                              count: eligibleIdsFromCase.length,
                            });
                          } catch {
                            return `Selected: ${eligibleIdsFromCase.length}`;
                          }
                        })()}
                      </Tag>
                    ) : (
                      <Tag
                        style={{ borderRadius: 999, opacity: 0.9, margin: 0 }}
                      >
                        {queueRosterCount
                          ? `${safeTCase("meta.queueRoster", "Queue roster")}: ${queueRosterCount}`
                          : safeT(
                              "cases.new.noQueueMembers",
                              "No queue members",
                            )}
                      </Tag>
                    )}
                  </Space>

                  {queueMembersLoading ? (
                    <Text type="secondary">
                      {safeT("common.loading", "Loading…")}
                    </Text>
                  ) : visiblePeople.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={safeT(
                        "cases.new.noQueueMembers",
                        "No queue members",
                      )}
                    />
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {visiblePeople.map((m) => {
                        const prof = m.profiles || {};
                        const isOwner = row.assigned_to === m.user_id;

                        return (
                          <Tag
                            key={m.user_id}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              background: "rgba(255,255,255,0.04)",
                              borderColor: "rgba(255,255,255,0.12)",
                              margin: 0,
                            }}
                          >
                            <Avatar
                              size={22}
                              src={prof.avatar_url}
                              icon={<UserOutlined />}
                            >
                              {initials(prof.full_name)}
                            </Avatar>
                            <span style={{ fontSize: 13 }}>
                              {safeName(
                                prof,
                                safeT("common.unnamed", "Unnamed"),
                              )}
                            </span>

                            {isOwner ? (
                              <Tag
                                color="geekblue"
                                style={{
                                  marginInlineStart: 6,
                                  borderRadius: 999,
                                  margin: 0,
                                }}
                              >
                                {safeTCase("labels.owner", "Owner")}
                              </Tag>
                            ) : null}
                          </Tag>
                        );
                      })}
                    </div>
                  )}

                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {safeTCase(
                      "tips.teamVsOwner",
                      "Team = who can work on this case. Owner = who is responsible right now.",
                    )}
                  </Text>
                </Space>
              </Card>

              {/* Attachments */}
              <Card
                style={{ borderRadius: 16 }}
                bodyStyle={{ padding: isMobile ? 14 : 16 }}
              >
                <Text strong>{safeT("attachments.title", "Attachments")}</Text>
                <Divider style={{ margin: "10px 0" }} />

                <CaseAttachments
                  attachments={attachments}
                  onUpload={onUploadAttachment}
                  onDelete={onDeleteAttachment}
                  uploading={uploadingAttachment}
                />
              </Card>
            </div>
          </Col>
        </Row>
      </div>
    </Space>
  );
}

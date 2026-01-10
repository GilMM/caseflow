"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
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
import { ArrowLeftOutlined, CheckOutlined } from "@ant-design/icons";

import CaseAssignment from "@/components/cases/CaseAssignment";
import CaseTimeline from "@/components/cases/CaseTimeline";

import { CASE_STATUSES, getStatusMeta } from "@/lib/ui/status";
import { getPriorityMeta } from "@/lib/ui/priority";

import {
  addCaseNote,
  getCaseActivities,
  getCaseById,
  updateCaseStatus,
  getOrgMembers,
} from "@/lib/db";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

function presetColorVar(color, level = 6) {
  if (!color || color === "default") return "var(--ant-color-text, rgba(255,255,255,0.85))";
  return `var(--ant-color-${color}-${level}, var(--ant-color-primary, #1677ff))`;
}


export default function CaseDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [row, setRow] = useState(null);
  const [items, setItems] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [note, setNote] = useState("");
  const [busyNote, setBusyNote] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    try {
      const c = await getCaseById(id);
      const acts = await getCaseActivities(id);

      setRow(c);
      setItems(acts);

      if (c?.org_id) {
        const members = await getOrgMembers(c.org_id);
        const map = {};
        for (const m of members) {
          map[m.user_id] = m.full_name || m.email || null;
        }
        setUserMap(map);
      } else {
        setUserMap({});
      }
    } catch (e) {
      message.error(e?.message || "Failed to load case");
    } finally {
      setLoading(false);
    }
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
      message.success("Note added");
    } catch (e) {
      message.error(e?.message || "Failed to add note");
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
      message.success(`Status updated to ${nextStatus}`);
    } catch (e) {
      message.error(e?.message || "Failed to update status");
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

  if (!row) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Space orientation="vertical" size={6}>
          <Title level={4} style={{ margin: 0 }}>
            Not found
          </Title>
          <Text type="secondary">
            This case does not exist or you don&apos;t have access.
          </Text>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/cases")}
            style={{ width: "fit-content" }}
          >
            Back to Cases
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
        onClick={() => router.push("/cases")}
        style={{ width: "fit-content" }}
        block={isMobile}
      >
        Back to Cases
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
                {row.title || "(untitled)"}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Created: {new Date(row.created_at).toLocaleString()}
              </Text>
            </div>

            <Space wrap style={{ justifyContent: isMobile ? "flex-start" : "flex-end" }}>
              <Tag color={s.color} icon={s.Icon ? <s.Icon /> : null}>
                {s.label}
              </Tag>
              <Tag color={p.color} icon={p.Icon ? <p.Icon /> : null}>
                {p.label}
              </Tag>
            </Space>
          </div>

          <Divider style={{ margin: "12px 0" }} />

          {/* Description */}
          <div style={{ display: "grid", gap: 10 }}>
            <Text strong>Description</Text>
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {row.description || "—"}
            </div>
          </div>

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
            <Text strong>Quick status</Text>

            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, max-content)",
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
      icon={active ? <CheckOutlined /> : sm.Icon ? <sm.Icon /> : null}
      type={active ? "primary" : "default"}
      style={{
        width: isMobile ? "100%" : undefined,
        borderRadius: 10,
        borderColor: Accent,
        color: active ? "#fff" : Accent,
        background: active ? Accent : "transparent",
      }}
    >
      {st.label}
    </Button>
  );
})}

            </div>

            {isMobile ? (
              <Text
                type="secondary"
                style={{ fontSize: 12, display: "block", marginTop: 8 }}
              >
                Tip: tap a status to update quickly
              </Text>
            ) : null}
          </div>
        </Space>
      </Card>

      {/* Add note */}
      <Card title="Add note" style={{ borderRadius: 16 }}>
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={isMobile ? 4 : 3}
            placeholder="Write an internal note…"
          />
          <Button
            type="primary"
            onClick={onAddNote}
            loading={busyNote}
            block={isMobile}
            style={!isMobile ? { width: "fit-content" } : undefined}
            disabled={!note.trim()}
          >
            Add Note
          </Button>
        </Space>
      </Card>

      {/* Timeline */}
      <Card title="Timeline" style={{ borderRadius: 16 }}>
        <CaseTimeline items={items} userMap={userMap} />
      </Card>
    </Space>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Divider, Input, Space, Tag, Typography, message } from "antd";
import { ArrowLeftOutlined, CheckOutlined } from "@ant-design/icons";

import CaseAssignment from "@/components/cases/CaseAssignment";
import CaseTimeline from "@/components/cases/CaseTimeline";

import {
  addCaseNote,
  getCaseActivities,
  getCaseById,
  updateCaseStatus,
  getOrgMembers, // ✅ צריך כדי לבנות userMap
} from "@/lib/db";

const { Title, Text } = Typography;

function statusColor(status) {
  switch (status) {
    case "new":
      return "blue";
    case "in_progress":
      return "gold";
    case "waiting_customer":
      return "purple";
    case "resolved":
      return "green";
    case "closed":
      return "default";
    default:
      return "default";
  }
}

function priorityColor(p) {
  switch (p) {
    case "urgent":
      return "red";
    case "high":
      return "volcano";
    case "normal":
      return "default";
    case "low":
      return "cyan";
    default:
      return "default";
  }
}

export default function CaseDetailsPage() {
  const router = useRouter();
  const { id } = useParams();

  const [row, setRow] = useState(null);
  const [items, setItems] = useState([]); // activities
  const [userMap, setUserMap] = useState({}); // ✅ map userId -> full_name/email
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

      // ✅ Build userMap for Timeline (names instead of UUID)
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
      message.error(e.message || "Failed to load case");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const quickStatuses = useMemo(
    () => [
      { key: "new", label: "New" },
      { key: "in_progress", label: "In Progress" },
      { key: "waiting_customer", label: "Waiting Customer" },
      { key: "resolved", label: "Resolved" },
      { key: "closed", label: "Closed" },
    ],
    []
  );

  async function onAddNote() {
    if (!row) return;
    const text = note.trim();
    if (!text) return;

    setBusyNote(true);
    try {
      // שים לב: אצלך הפונקציות הן בצורה של אובייקט
      await addCaseNote({ caseId: row.id, orgId: row.org_id, body: text });
      setNote("");
      await loadAll();
      message.success("Note added");
    } catch (e) {
      message.error(e.message || "Failed to add note");
    } finally {
      setBusyNote(false);
    }
  }

  async function onChangeStatus(nextStatus) {
    if (!row) return;
    if (row.status === nextStatus) return;

    setBusyStatus(true);
    try {
      await updateCaseStatus({ caseId: row.id, orgId: row.org_id, status: nextStatus });
      await loadAll();
      message.success(`Status updated to ${nextStatus}`);
    } catch (e) {
      message.error(e.message || "Failed to update status");
    } finally {
      setBusyStatus(false);
    }
  }

  if (loading) return <Card>Loading…</Card>;
  if (!row) return <Card>Not found</Card>;

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push("/cases")}
        style={{ width: "fit-content" }}
      >
        Back to Cases
      </Button>

      <Card>
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {row.title}
              </Title>
              <Text type="secondary">Created: {new Date(row.created_at).toLocaleString()}</Text>
            </div>

            <Space wrap>
              <Tag color={statusColor(row.status)}>{row.status}</Tag>
              <Tag color={priorityColor(row.priority)}>{row.priority}</Tag>
            </Space>
          </div>

          <Divider style={{ margin: "12px 0" }} />

          <div style={{ display: "grid", gap: 10 }}>
            <Text strong>Description</Text>
            <div style={{ whiteSpace: "pre-wrap" }}>{row.description || "—"}</div>
          </div>

          <Divider style={{ margin: "12px 0" }} />

          <Card>
            <CaseAssignment
              caseId={row.id}
              orgId={row.org_id}
              assignedTo={row.assigned_to}
              onChanged={loadAll}
            />
          </Card>

          <div>
            <Text strong>Quick status</Text>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                {quickStatuses.map((s) => (
                  <Button
                    key={s.key}
                    type={row.status === s.key ? "primary" : "default"}
                    disabled={busyStatus}
                    onClick={() => onChangeStatus(s.key)}
                    icon={row.status === s.key ? <CheckOutlined /> : null}
                  >
                    {s.label}
                  </Button>
                ))}
              </Space>
            </div>
          </div>
        </Space>
      </Card>

      <Card title="Add note">
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Write an internal note…"
          />
          <Button type="primary" onClick={onAddNote} loading={busyNote} style={{ width: "fit-content" }}>
            Add Note
          </Button>
        </Space>
      </Card>

      <Card title="Timeline" style={{ borderRadius: 16 }}>
        <CaseTimeline items={items} userMap={userMap} />
      </Card>
    </Space>
  );
}

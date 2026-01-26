"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getQueueMembers, setQueueMembers } from "@/lib/db"; // ✅ חזרנו להביא
import { useWorkspace } from "@/contexts/WorkspaceContext";

import { Alert, Card, Grid, Space, Spin, Row, Col, message } from "antd";

import QueuesHeader from "./QueuesHeader";
import QueuesKpis from "./QueuesKpis";
import QueuesFilters from "./QueuesFilters";
import QueuesList from "./QueuesList";
import QueueUpsertModal from "./QueueUpsertModal";

const { useBreakpoint } = Grid;

export default function QueuesPage() {
  const router = useRouter();
  const { locale } = useParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // ✅ חשוב: קוראים ל-useWorkspace פעם אחת בלבד (מונע Hook warning)
  const { workspace, members: orgMembers, loading: wsLoading } = useWorkspace();

  const [rows, setRows] = useState([]);
  const [tableAvailable, setTableAvailable] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [active, setActive] = useState("all"); // all / active / inactive
  const [defaultOnly, setDefaultOnly] = useState(false);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editing, setEditing] = useState(null); // queue row
  const [saving, setSaving] = useState(false);

  // queue members for modal
  const [queueMembers, setQueueMembersState] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const lastToastRef = useRef(0);

  const orgId = workspace?.orgId || null;

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!orgId) {
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        setError("");
        if (!silent) setLoading(true);
        else setRefreshing(true);

        const res = await supabase
          .from("queues")
          .select(
            "id,org_id,code,name,is_default,is_active,created_at,updated_at"
          )
          .eq("org_id", orgId)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(200);

        if (res.error) {
          const msg = String(res.error.message || "").toLowerCase();
          const looksLikeMissing =
            msg.includes("does not exist") ||
            msg.includes("relation") ||
            msg.includes("schema cache");

          if (looksLikeMissing) {
            setTableAvailable(false);
            setRows([]);
            return;
          }

          throw res.error;
        }

        setTableAvailable(true);
        setRows(res.data || []);

        const now = Date.now();
        if (silent && now - lastToastRef.current > 7000) {
          lastToastRef.current = now;
          message.success({ content: "Queues refreshed", duration: 1.1 });
        }
      } catch (e) {
        setError(e?.message || "Failed to load queues");
        message.error(e?.message || "Failed to load queues");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    // נחכה גם לטעינת Workspace כדי למנוע ריצות כפולות מיותרות
    if (wsLoading) return;
    if (!orgId) {
      setLoading(false);
      setRows([]);
      return;
    }
    loadAll();
  }, [wsLoading, orgId, loadAll]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (rows || []).filter((r) => {
      const isActive = (r.is_active ?? true) !== false;

      if (active === "active" && !isActive) return false;
      if (active === "inactive" && isActive) return false;

      if (defaultOnly && !r.is_default) return false;

      if (!qq) return true;

      return (
        (r.name || "").toLowerCase().includes(qq) ||
        (r.code || "").toLowerCase().includes(qq) ||
        String(r.id || "")
          .toLowerCase()
          .includes(qq)
      );
    });
  }, [rows, q, active, defaultOnly]);

  const total = rows.length;
  const activeCount = rows.filter(
    (r) => (r.is_active ?? true) !== false
  ).length;
  const defaultCount = rows.filter((r) => !!r.is_default).length;

  function openCreate() {
    setMode("create");
    setEditing(null);
    setQueueMembersState([]);
    setModalOpen(true);
  }

  async function openEdit(queue) {
    setMode("edit");
    setEditing(queue);
    setModalOpen(true);

    // ✅ DEBUG קטן שיעזור לראות התאמה ל-org
    console.log("[openEdit] workspace.orgId =", orgId);
    console.log(
      "[openEdit] queue.id =",
      queue?.id,
      "queue.org_id =",
      queue?.org_id
    );

    try {
      setMembersLoading(true);
      const members = await getQueueMembers(queue.id);
      setQueueMembersState(members || []);
    } catch (e) {
      message.error(e?.message || "Failed to load queue members");
      setQueueMembersState([]);
    } finally {
      setMembersLoading(false);
    }
  }

  // ✅ Helper שמזהה "RLS חסם אז אין שורות"
  function assertUpdatedRows(data, contextLabel) {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error(
        `No rows updated (${contextLabel}). Likely RLS blocked or wrong orgId.`
      );
    }
  }

  async function setDefaultQueue(queueId) {
    if (!orgId) return;

    try {
      console.log("---- SET DEFAULT DEBUG ----");
      console.log("orgId =", orgId);
      console.log("queueId =", queueId);

      message.loading({ content: "Setting default…", key: "setdefault" });

      // 1) unset all defaults in this org
      const r1 = await supabase
        .from("queues")
        .update({ is_default: false })
        .eq("org_id", orgId)
        .select("id"); // ✅ כדי לדעת כמה שורות באמת עודכנו

      if (r1.error) throw r1.error;
      assertUpdatedRows(r1.data, "unset defaults");

      // 2) set the chosen one
      const r2 = await supabase
        .from("queues")
        .update({ is_default: true })
        .eq("org_id", orgId)
        .eq("id", queueId)
        .select("id");

      if (r2.error) throw r2.error;
      assertUpdatedRows(r2.data, "set default");

      message.success({
        content: "Default queue updated",
        key: "setdefault",
        duration: 1.2,
      });
      await loadAll({ silent: true });
    } catch (e) {
      console.error(e);
      message.error({
        content: e?.message || "Failed to set default",
        key: "setdefault",
      });
    }
  }

  async function toggleActive(queueId, nextActive) {
    if (!orgId) return;

    try {
      const r = await supabase
        .from("queues")
        .update({ is_active: nextActive })
        .eq("org_id", orgId)
        .eq("id", queueId)
        .select("id");

      if (r.error) throw r.error;
      assertUpdatedRows(r.data, "toggle active");

      message.success(nextActive ? "Queue activated" : "Queue deactivated");
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || "Failed to update queue");
    }
  }

  async function onSave(values) {
    if (!orgId) {
      message.error("No workspace selected");
      return;
    }

    const name = String(values.name || "").trim();
    const is_active = !!values.is_active;
    const is_default = !!values.is_default;
    const memberIds = values.memberIds || [];

    if (!name) {
      message.error("Queue name is required");
      return;
    }

    try {
      setSaving(true);

      console.log("---- QUEUE SAVE DEBUG ----");
      console.log("orgId =", orgId);
      console.log("mode =", mode);
      console.log(
        "editing.id =",
        editing?.id,
        "editing.org_id =",
        editing?.org_id
      );
      console.log("values =", values);

      // ---------------- CREATE ----------------
      if (mode === "create") {
        // 1) get next sequence from DB
        const { data: seq, error: seqErr } = await supabase.rpc(
          "next_queue_seq",
          {
            p_org_id: orgId,
          }
        );
        if (seqErr) throw seqErr;

        const code = `QUE-${String(seq).padStart(3, "0")}`;

        // 2) insert new queue
        const r = await supabase
          .from("queues")
          .insert({
            org_id: orgId,
            code,
            name,
            is_active,
            is_default, // can be true
          })
          .select("id")
          .single();

        if (r.error) throw r.error;

        const newQueueId = r.data.id;

        // 3) if default -> unset all other defaults in org (OK even if none exist)
        if (is_default) {
          const rUnset = await supabase
            .from("queues")
            .update({ is_default: false })
            .eq("org_id", orgId)
            .neq("id", newQueueId);

          if (rUnset.error) throw rUnset.error;
        }

        // 4) members
        if (memberIds.length > 0) {
          await setQueueMembers({ queueId: newQueueId, userIds: memberIds });
        }

        message.success("Queue created");
        setModalOpen(false);
        await loadAll({ silent: true });
        return;
      }

      // ---------------- EDIT ----------------
      if (!editing?.id) throw new Error("Missing editing queue id");

      // 1) update queue fields
      const r2 = await supabase
        .from("queues")
        .update({ name, is_active, is_default })
        .eq("org_id", orgId)
        .eq("id", editing.id)
        .select("id");

      if (r2.error) throw r2.error;
      assertUpdatedRows(r2.data, "update queue");

      // 2) if default -> unset all other defaults in org
      if (is_default) {
        const rUnset2 = await supabase
          .from("queues")
          .update({ is_default: false })
          .eq("org_id", orgId)
          .neq("id", editing.id);

        if (rUnset2.error) throw rUnset2.error;
      }

      // 3) members
      await setQueueMembers({ queueId: editing.id, userIds: memberIds });

      message.success("Queue updated");
      setModalOpen(false);
      await loadAll({ silent: true });
    } catch (e) {
      console.error(e);
      message.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const modalInitialValues = useMemo(() => {
    if (mode === "create") {
      return {
        name: "",
        is_active: true,
        is_default: rows.length === 0,
      };
    }

    const row = editing || {};
    return {
      name: row.name || "",
      is_active: (row.is_active ?? true) !== false,
      is_default: !!row.is_default,
    };
  }, [mode, editing, rows.length]);

  // ✅ אם עדיין טוענים workspace או טוענים נתונים
  if (wsLoading || loading) {
    return (
      <div style={{ height: "60vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      <QueuesHeader
        isMobile={isMobile}
        workspace={workspace}
        shownCount={filtered.length}
        total={total}
        refreshing={refreshing}
        onRefresh={() => loadAll({ silent: true })}
        onCreate={openCreate}
      />

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={10}>
          <QueuesKpis
            total={total}
            activeCount={activeCount}
            defaultCount={defaultCount}
          />
        </Col>

        <Col xs={24} lg={14}>
          <QueuesFilters
            isMobile={isMobile}
            q={q}
            setQ={setQ}
            active={active}
            setActive={setActive}
            defaultOnly={defaultOnly}
            setDefaultOnly={setDefaultOnly}
            onClear={() => {
              setQ("");
              setActive("all");
              setDefaultOnly(false);
            }}
          />
        </Col>
      </Row>

      {error ? (
        <Card style={{ borderRadius: 16, borderColor: "#ffccc7" }}>
          <Alert
            type="error"
            showIcon
            title="Couldn’t load queues"
            description={error}
          />
        </Card>
      ) : null}

      <QueuesList
        isMobile={isMobile}
        workspace={workspace}
        tableAvailable={tableAvailable}
        rows={filtered}
        onEdit={openEdit}
        onSetDefault={setDefaultQueue}
        onToggleActive={toggleActive}
        onViewCases={(queueId) =>
          router.push(`/${locale}/cases?queue=${queueId}`)
        }
        onOpenFuture={(queueId) => router.push(`/${locale}/queues/${queueId}`)}
      />

      <QueueUpsertModal
        open={modalOpen}
        mode={mode}
        isMobile={isMobile}
        saving={saving}
        initialValues={modalInitialValues}
        onCancel={() => setModalOpen(false)}
        onSubmit={onSave}
        orgMembers={orgMembers}
        queueMembers={queueMembers}
        membersLoading={membersLoading}
      />
    </Space>
  );
}

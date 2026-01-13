"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";

import { Alert, Card, Grid, Space, Spin, Row, Col, message } from "antd";

import QueuesHeader from "./QueuesHeader";
import QueuesKpis from "./QueuesKpis";
import QueuesFilters from "./QueuesFilters";
import QueuesList from "./QueuesList";
import QueueUpsertModal from "./QueueUpsertModal";

const { useBreakpoint } = Grid;

export default function QueuesPage() {
  const router = useRouter();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [workspace, setWorkspace] = useState(null);

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

  const lastToastRef = useRef(0);

  async function loadAll({ silent = false } = {}) {
    try {
      setError("");
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const ws = await getActiveWorkspace();
      setWorkspace(ws);

      if (!ws?.orgId) {
        setRows([]);
        return;
      }

      const res = await supabase
        .from("queues")
        .select("id,org_id,name,is_default,is_active,created_at,updated_at")
        .eq("org_id", ws.orgId)
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
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (rows || []).filter((r) => {
      const isActive = (r.is_active ?? true) !== false;

      if (active === "active" && !isActive) return false;
      if (active === "inactive" && isActive) return false;

      if (defaultOnly && !r.is_default) return false;

      if (!qq) return true;

      return (r.name || "").toLowerCase().includes(qq) || String(r.id || "").toLowerCase().includes(qq);
    });
  }, [rows, q, active, defaultOnly]);

  const total = rows.length;
  const activeCount = rows.filter((r) => (r.is_active ?? true) !== false).length;
  const defaultCount = rows.filter((r) => !!r.is_default).length;

  function openCreate() {
    setMode("create");
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(queue) {
    setMode("edit");
    setEditing(queue);
    setModalOpen(true);
  }

  async function setDefaultQueue(queueId) {
    if (!workspace?.orgId) return;

    try {
      message.loading({ content: "Setting default…", key: "setdefault" });

      const { error: e1 } = await supabase
        .from("queues")
        .update({ is_default: false })
        .eq("org_id", workspace.orgId);

      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("queues")
        .update({ is_default: true })
        .eq("org_id", workspace.orgId)
        .eq("id", queueId);

      if (e2) throw e2;

      message.success({ content: "Default queue updated", key: "setdefault", duration: 1.2 });
      await loadAll({ silent: true });
    } catch (e) {
      message.error({ content: e?.message || "Failed to set default", key: "setdefault" });
    }
  }

  async function toggleActive(queueId, nextActive) {
    if (!workspace?.orgId) return;

    try {
      const { error } = await supabase
        .from("queues")
        .update({ is_active: nextActive })
        .eq("org_id", workspace.orgId)
        .eq("id", queueId);

      if (error) throw error;

      message.success(nextActive ? "Queue activated" : "Queue deactivated");
      await loadAll({ silent: true });
    } catch (e) {
      message.error(e?.message || "Failed to update queue");
    }
  }

  async function onSave(values) {
    if (!workspace?.orgId) {
      message.error("No workspace selected");
      return;
    }

    const name = String(values.name || "").trim();
    const is_active = !!values.is_active;
    const is_default = !!values.is_default;

    if (!name) {
      message.error("Queue name is required");
      return;
    }

    try {
      setSaving(true);

      // If setting default -> unset defaults first (within org)
      if (is_default) {
        const { error: e1 } = await supabase
          .from("queues")
          .update({ is_default: false })
          .eq("org_id", workspace.orgId);

        if (e1) throw e1;
      }

      if (mode === "create") {
        const { error } = await supabase.from("queues").insert({
          org_id: workspace.orgId,
          name,
          is_active,
          is_default,
        });

        if (error) throw error;

        message.success("Queue created");
        setModalOpen(false);
        await loadAll({ silent: true });
        return;
      }

      const { error } = await supabase
        .from("queues")
        .update({ name, is_active, is_default })
        .eq("org_id", workspace.orgId)
        .eq("id", editing.id);

      if (error) throw error;

      message.success("Queue updated");
      setModalOpen(false);
      await loadAll({ silent: true });
    } catch (e) {
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

  if (loading) {
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
          <QueuesKpis total={total} activeCount={activeCount} defaultCount={defaultCount} />
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
          <Alert type="error" showIcon title="Couldn’t load queues" description={error} />
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
        onViewCases={(queueId) => router.push(`/cases?queue=${queueId}`)}
        onOpenFuture={() => message.info("Next: queue details page")}
      />

      <QueueUpsertModal
        open={modalOpen}
        mode={mode}
        isMobile={isMobile}
        saving={saving}
        initialValues={modalInitialValues}
        onCancel={() => setModalOpen(false)}
        onSubmit={onSave}
      />
    </Space>
  );
}

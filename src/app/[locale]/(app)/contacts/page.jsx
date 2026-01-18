"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";

import { Alert, App, Card, Grid, Space, Spin } from "antd";

import ContactsHeader from "./ContactsHeader";
import ContactsFilters from "./ContactsFilters";
import ContactsList from "./ContactsList";
import ContactUpsertModal from "./ContactUpsertModal";

const { useBreakpoint } = Grid;

const PAGE_SIZE = 30;

export default function ContactsPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [workspace, setWorkspace] = useState(null);

  const [rows, setRows] = useState([]);
  const [tableAvailable, setTableAvailable] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [active, setActive] = useState("active"); // all / active / inactive
  const [dept, setDept] = useState("all");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const lastToastRef = useRef(0);
  const workspaceRef = useRef(null);

  const { locale } = useParams();


  async function loadInitial({ silent = false } = {}) {
    try {
      setError("");
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const ws = await getActiveWorkspace();
      setWorkspace(ws);
      workspaceRef.current = ws;

      if (!ws?.orgId) {
        setRows([]);
        setHasMore(false);
        return;
      }

      const res = await supabase
        .from("contacts")
        .select(
          "id,org_id,full_name,email,phone,department,job_title,location,notes,is_active,created_at,updated_at"
        )
        .eq("org_id", ws.orgId)
        .order("is_active", { ascending: false })
        .order("full_name", { ascending: true })
        .limit(PAGE_SIZE);

      if (res.error) {
        const msg = String(res.error.message || "").toLowerCase();
        const looksMissing =
          msg.includes("does not exist") ||
          msg.includes("relation") ||
          msg.includes("schema cache");

        if (looksMissing) {
          setTableAvailable(false);
          setRows([]);
          setHasMore(false);
          return;
        }
        throw res.error;
      }

      setTableAvailable(true);
      setRows(res.data || []);
      setHasMore((res.data || []).length === PAGE_SIZE);

      const now = Date.now();
      if (silent && now - lastToastRef.current > 7000) {
        lastToastRef.current = now;
        message.success({ content: "Contacts refreshed", duration: 1.1 });
      }
    } catch (e) {
      setError(e?.message || "Failed to load contacts");
      message.error(e?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || rows.length === 0) return;

    const ws = workspaceRef.current;
    if (!ws?.orgId) return;

    try {
      setLoadingMore(true);

      // For cursor pagination with composite sort, we need range query
      const res = await supabase
        .from("contacts")
        .select(
          "id,org_id,full_name,email,phone,department,job_title,location,notes,is_active,created_at,updated_at"
        )
        .eq("org_id", ws.orgId)
        .order("is_active", { ascending: false })
        .order("full_name", { ascending: true })
        .range(rows.length, rows.length + PAGE_SIZE - 1);

      if (res.error) throw res.error;

      if (res.data && res.data.length > 0) {
        setRows((prev) => [...prev, ...res.data]);
        setHasMore(res.data.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      message.error(e?.message || "Failed to load more contacts");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, rows.length, message]);

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deptOptions = useMemo(() => {
    const set = new Set();
    for (const r of rows) if (r.department) set.add(r.department);
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return (rows || []).filter((r) => {
      const isActive = (r.is_active ?? true) !== false;

      if (active === "active" && !isActive) return false;
      if (active === "inactive" && isActive) return false;

      if (dept !== "all" && (r.department || "") !== dept) return false;

      if (!qq) return true;

      return (
        (r.full_name || "").toLowerCase().includes(qq) ||
        (r.email || "").toLowerCase().includes(qq) ||
        (r.phone || "").toLowerCase().includes(qq) ||
        (r.department || "").toLowerCase().includes(qq) ||
        (r.job_title || "").toLowerCase().includes(qq) ||
        (r.location || "").toLowerCase().includes(qq) ||
        String(r.id || "").toLowerCase().includes(qq)
      );
    });
  }, [rows, q, active, dept]);

  const total = rows.length;
  const activeCount = rows.filter((r) => (r.is_active ?? true) !== false).length;

  function openCreate() {
    setMode("create");
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row) {
    setMode("edit");
    setEditing(row);
    setModalOpen(true);
  }

  async function toggleActive(contactId, nextActive) {
    if (!workspace?.orgId) return;

    try {
      const { error } = await supabase
        .from("contacts")
        .update({ is_active: nextActive })
        .eq("org_id", workspace.orgId)
        .eq("id", contactId);

      if (error) throw error;

      message.success(nextActive ? "Contact activated" : "Contact deactivated");
      await loadInitial({ silent: true });
    } catch (e) {
      message.error(e?.message || "Failed to update contact");
    }
  }

  async function onSave(values) {
    if (!workspace?.orgId) {
      message.error("No workspace selected");
      return;
    }

    const payload = {
      org_id: workspace.orgId,
      full_name: String(values.full_name || "").trim(),
      email: values.email ? String(values.email).trim() : null,
      phone: values.phone ? String(values.phone).trim() : null,
      department: values.department ? String(values.department).trim() : null,
      job_title: values.job_title ? String(values.job_title).trim() : null,
      location: values.location ? String(values.location).trim() : null,
      notes: values.notes ? String(values.notes).trim() : null,
      is_active: !!values.is_active,
    };

    if (!payload.full_name) {
      message.error("Full name is required");
      return;
    }

    try {
      setSaving(true);

      if (mode === "create") {
        const { error } = await supabase.from("contacts").insert(payload);
        if (error) throw error;

        message.success("Contact created");
        setModalOpen(false);
        await loadInitial({ silent: true });
        return;
      }

      const { error } = await supabase
        .from("contacts")
        .update({
          full_name: payload.full_name,
          email: payload.email,
          phone: payload.phone,
          department: payload.department,
          job_title: payload.job_title,
          location: payload.location,
          notes: payload.notes,
          is_active: payload.is_active,
        })
        .eq("org_id", workspace.orgId)
        .eq("id", editing.id);

      if (error) throw error;

      message.success("Contact updated");
      setModalOpen(false);
      await loadInitial({ silent: true });
    } catch (e) {
      message.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const modalInitialValues = useMemo(() => {
    if (mode === "create") {
      return {
        full_name: "",
        email: "",
        phone: "",
        department: "",
        job_title: "",
        location: "",
        is_active: true,
        notes: "",
      };
    }

    const row = editing || {};
    return {
      full_name: row.full_name || "",
      email: row.email || "",
      phone: row.phone || "",
      department: row.department || "",
      job_title: row.job_title || "",
      location: row.location || "",
      is_active: (row.is_active ?? true) !== false,
      notes: row.notes || "",
    };
  }, [mode, editing]);

  if (loading) {
    return (
      <div style={{ height: "60vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      <ContactsHeader
        isMobile={isMobile}
        workspace={workspace}
        shownCount={filtered.length}
        total={total}
        activeCount={activeCount}
        refreshing={refreshing}
        onRefresh={() => loadInitial({ silent: true })}
        onCreate={openCreate}
      />

      {error ? (
        <Card style={{ borderRadius: 16, borderColor: "#ffccc7" }}>
          <Alert type="error" showIcon title="Couldn't load contacts" description={error} />
        </Card>
      ) : null}

      <ContactsFilters
        isMobile={isMobile}
        q={q}
        setQ={setQ}
        active={active}
        setActive={setActive}
        dept={dept}
        setDept={setDept}
        deptOptions={deptOptions}
        onClear={() => {
          setQ("");
          setActive("active");
          setDept("all");
        }}
      />

      <ContactsList
        isMobile={isMobile}
        workspace={workspace}
        tableAvailable={tableAvailable}
        rows={filtered}
        onEdit={openEdit}
        onToggleActive={toggleActive}
        onNewCase={(contactId) =>
          router.push(`/${locale}/cases/new?requester=${contactId}`)
        }
                onOpenFuture={() => message.info("Next: /contacts/[id]")}
        onCreate={openCreate}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />

      <ContactUpsertModal
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

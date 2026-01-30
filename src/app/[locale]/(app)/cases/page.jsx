"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace, getCaseAttachmentCounts } from "@/lib/db";

import { Card, Col, Row, Space, Spin, Typography, message } from "antd";

import CasesHeader from "./CasesHeader";
import CasesKpis from "./CasesKpis";
import CasesFilters from "./CasesFilters";
import CasesList from "./CasesList";

const { Text } = Typography;

const PAGE_SIZE = 5;

export default function CasesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [workspace, setWorkspace] = useState(null);

  const [queues, setQueues] = useState([]);
  const [queueId, setQueueId] = useState(searchParams.get("queue") || "all");

  const [rows, setRows] = useState([]);
  const [attachmentCounts, setAttachmentCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("all");
  const [sortBy, setSortBy] = useState("priority");

  const lastToastRef = useRef(0);
  const workspaceRef = useRef(null);

  // keep in sync with URL
  useEffect(() => {
    setQueueId(searchParams.get("queue") || "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function loadInitial({ silent = false } = {}) {
    try {
      setError("");
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const ws = await getActiveWorkspace();
      setWorkspace(ws);
      workspaceRef.current = ws;

      if (!ws?.orgId) {
        setQueues([]);
        setRows([]);
        setHasMore(false);
        return;
      }

      // queues for dropdown
      const { data: qData, error: qErr } = await supabase
        .from("queues")
        .select("id,name,is_default")
        .eq("org_id", ws.orgId)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (qErr) throw qErr;
      setQueues(qData || []);

      // cases - initial load
      let query = supabase
        .from("cases")
        .select(
          "id,org_id,title,status,priority,source,created_at,queue_id,assigned_to, queues(name)",
        )
        .eq("org_id", ws.orgId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (queueId && queueId !== "all") {
        query = query.eq("queue_id", queueId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRows(data || []);
      setHasMore((data || []).length === PAGE_SIZE);

      // Load attachment counts for displayed cases
      if (data?.length) {
        const caseIds = data.map((c) => c.id);
        const counts = await getCaseAttachmentCounts(caseIds);
        setAttachmentCounts(counts);
      }

      const now = Date.now();
      if (silent && now - lastToastRef.current > 7000) {
        lastToastRef.current = now;
        message.success({ content: "Cases refreshed", duration: 1.1 });
      }
    } catch (e) {
      setError(e?.message || "Failed to load cases");
      message.error(e?.message || "Failed to load cases");
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

      const lastRow = rows[rows.length - 1];

      let query = supabase
        .from("cases")
        .select(
          "id,org_id,title,status,priority,source,created_at,queue_id,assigned_to, queues(name)",
        )
        .eq("org_id", ws.orgId)
        .order("created_at", { ascending: false })
        .lt("created_at", lastRow.created_at)
        .limit(PAGE_SIZE);

      if (queueId && queueId !== "all") {
        query = query.eq("queue_id", queueId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        setRows((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);

        // Load attachment counts for new cases
        const newCaseIds = data.map((c) => c.id);
        const newCounts = await getCaseAttachmentCounts(newCaseIds);
        setAttachmentCounts((prev) => ({ ...prev, ...newCounts }));
      } else {
        setHasMore(false);
      }
    } catch (e) {
      message.error(e?.message || "Failed to load more cases");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, rows, queueId]);

  // reload when queueId changes
  useEffect(() => {
    loadInitial({ silent: false });

    // Optional: keep your realtime refresh hook
    const channel = supabase
      .channel("cases-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "case_activities" },
        () => loadInitial({ silent: true }),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueId]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    // Priority order for sorting (lower = more urgent)
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

    const result = (rows || []).filter((c) => {
      // Handle "open" filter (exclude closed and resolved)
      if (status === "open") {
        if (c.status === "closed" || c.status === "resolved") return false;
      } else if (status !== "all" && c.status !== status) {
        return false;
      }
      if (priority !== "all" && c.priority !== priority) return false;
      if (!qq) return true;
      return (
        (c.title || "").toLowerCase().includes(qq) ||
        String(c.id || "")
          .toLowerCase()
          .includes(qq)
      );
    });

    // Sort the results
    return result.sort((a, b) => {
      if (sortBy === "priority") {
        const aPriority = priorityOrder[a.priority] ?? 99;
        const bPriority = priorityOrder[b.priority] ?? 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        // Secondary sort by created_at (newest first) when same priority
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === "oldest") {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      // Default: newest first
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [rows, q, status, priority, sortBy]);

  const total = rows.length;
  const openCount = rows.filter((r) => r.status !== "closed" && r.status !== "resolved").length;
  const urgentOpen = rows.filter(
    (r) => r.status !== "closed" && r.status !== "resolved" && r.priority === "urgent",
  ).length;

  function setQueueFilter(nextQueueId) {
    setQueueId(nextQueueId);

    const params = new URLSearchParams(searchParams.toString());
    if (!nextQueueId || nextQueueId === "all") params.delete("queue");
    else params.set("queue", nextQueueId);

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  if (loading) {
    return (
      <div style={{ height: "60vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space orientation ="vertical" size={14} style={{ width: "100%" }}>
      <CasesHeader
        workspace={workspace}
        queueId={queueId}
        filteredCount={filtered.length}
        totalCount={total}
        refreshing={refreshing}
        onRefresh={() => loadInitial({ silent: true })}
        onNewCase={() => router.push(`${pathname}/new`)}
      />

      <Row gutter={[12, 12]} align="stretch">
        <Col xs={24} lg={10} style={{ height: "100%" }}>
          <CasesKpis
            total={total}
            openCount={openCount}
            urgentOpen={urgentOpen}
          />
        </Col>

        <Col xs={24} lg={14} style={{ height: "100%" }}>
          <CasesFilters
            q={q}
            onChangeQ={setQ}
            status={status}
            onChangeStatus={setStatus}
            priority={priority}
            onChangePriority={setPriority}
            sortBy={sortBy}
            onChangeSortBy={setSortBy}
            queueId={queueId}
            queues={queues}
            onChangeQueue={setQueueFilter}
            onClear={() => {
              setQ("");
              setStatus("open");
              setPriority("all");
              setSortBy("priority");
              setQueueFilter("all");
            }}
          />
        </Col>
      </Row>

      {error ? (
        <Card style={{ borderRadius: 16, borderColor: "#ffccc7" }}>
          <Text style={{ color: "#cf1322" }}>{error}</Text>
        </Card>
      ) : null}

      <CasesList
        workspace={workspace}
        filtered={filtered}
        onOpenCase={(id) => router.push(`${pathname}/${id}`)}
        onRefresh={() => loadInitial({ silent: true })}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        attachmentCounts={attachmentCounts}
      />
    </Space>
  );
}

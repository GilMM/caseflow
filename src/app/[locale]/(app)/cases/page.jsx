"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";

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
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

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
          "id,org_id,title,status,priority,created_at,queue_id,assigned_to, queues(name)",
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
          "id,org_id,title,status,priority,created_at,queue_id,assigned_to, queues(name)",
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
    return (rows || []).filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (priority !== "all" && c.priority !== priority) return false;
      if (!qq) return true;
      return (
        (c.title || "").toLowerCase().includes(qq) ||
        String(c.id || "")
          .toLowerCase()
          .includes(qq)
      );
    });
  }, [rows, q, status, priority]);

  const total = rows.length;
  const openCount = rows.filter((r) => r.status !== "closed").length;
  const urgentOpen = rows.filter(
    (r) => r.status !== "closed" && r.priority === "urgent",
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
            queueId={queueId}
            queues={queues}
            onChangeQueue={setQueueFilter}
            onClear={() => {
              setQ("");
              setStatus("all");
              setPriority("all");
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
      />
    </Space>
  );
}

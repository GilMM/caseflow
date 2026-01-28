"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { App, Button, Card, Space, Tabs, Typography } from "antd";
import { ReloadOutlined, FileExcelOutlined } from "@ant-design/icons";
import ReportsHeader from "./ReportsHeader";

import ReportFilters from "@/components/reports/ReportsFilters";
import ReportsTable from "./ReportsTable";
import { getReports } from "./reports.config";
import { supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/db";

const { Title, Text } = Typography;

export default function ReportsPage() {
  const tReports = useTranslations("reports");
  const { message: msg } = App.useApp();

  const locale = useLocale();
  const REPORTS = useMemo(() => getReports(locale), [locale]);

  const [workspace, setWorkspace] = useState(null);
  const [activeKey, setActiveKey] = useState("cases");

  const report = useMemo(() => REPORTS[activeKey], [REPORTS, activeKey]);

  const [filters, setFilters] = useState({
    date_from: null,
    date_to: null,
    queue_id: null,
    status: null,
    priority: null,
    search: "",
  });

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sorter, setSorter] = useState({
    field: "created_at",
    order: "descend",
  });

  // ✅ Robust orgId resolver (supports your getActiveWorkspace shape: orgId camelCase)
  const orgId =
    workspace?.orgId ||
    workspace?.active_org_id ||
    workspace?.org_id ||
    workspace?.org?.id ||
    workspace?.id ||
    null;

  // Load active workspace
  useEffect(() => {
    (async () => {
      try {
        const ws = await getActiveWorkspace(supabase);
        setWorkspace(ws);
      } catch (e) {
        msg.error(e?.message || tReports("workspaceLoadError"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async (overrideFilters) => {
    if (!orgId) {
      msg.warning(tReports("noActiveOrg"));
      return;
    }

    const effectiveFilters = overrideFilters || filters;

    setLoading(true);
    try {
      const res = await fetch("/api/reports/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          report: activeKey,
          filters: effectiveFilters,
          sort: {
            field: sorter?.field || "created_at",
            dir: sorter?.order === "ascend" ? "asc" : "desc",
          },
          page,
          pageSize,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || tReports("loadError"));

      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (e) {
      msg.error(e?.message || tReports("loadError"));
    } finally {
      setLoading(false);
    }
  };

  // Auto reload when org / tab / page / sort changes
  useEffect(() => {
    if (!orgId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, activeKey, page, pageSize, sorter]);

  const onApplyFilters = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
    load(nextFilters); // avoid stale state
  };

  const onExport = async () => {
    if (!orgId) {
      msg.warning(tReports("noActiveOrg"));
      return;
    }

    try {
      msg.loading({ content: tReports("exportPreparing"), key: "export" });

      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-locale": locale },
        body: JSON.stringify({
          orgId,
          report: activeKey,
          filters,
          sort: {
            field: sorter?.field || "created_at",
            dir: sorter?.order === "ascend" ? "asc" : "desc",
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || tReports("exportError"));
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");

      const a = document.createElement("a");
      a.href = url;
      a.download = `caseflow_${activeKey}_report_${yyyy}-${mm}-${dd}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
      msg.success({ content: tReports("exportDone"), key: "export" });
    } catch (e) {
      msg.error({
        content: e?.message || tReports("exportError"),
        key: "export",
      });
    }
  };

  // Tabs from config (already localized by getReports(locale))
  const tabItems = Object.values(REPORTS).map((r) => ({
    key: r.key,
    label: r.label,
  }));

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <ReportsHeader
        workspace={workspace}
        activeKey={activeKey}
        filters={filters}
        total={total}
        loading={loading}
        onRefresh={() => load()}
        onExport={onExport}
        canExport={!!orgId}
      />

      <Card style={{ borderRadius: 16 }}>
        <Tabs
          items={tabItems}
          activeKey={activeKey}
          onChange={(k) => {
            setActiveKey(k);
            setPage(1);
            setSorter({ field: "created_at", order: "descend" });
          }}
        />
      </Card>

      <ReportFilters
        reportKey={activeKey}
        orgId={orgId}
        initialValue={filters}
        onApply={onApplyFilters}
      />

      <ReportsTable
        columns={report?.columns || []}
        rows={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onChange={({ page, pageSize, sorter }) => {
          setPage(page);
          setPageSize(pageSize);
          if (sorter?.field) setSorter(sorter);
        }}
      />
    </Space>
  );
}

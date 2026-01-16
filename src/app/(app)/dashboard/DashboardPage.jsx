// src/app/(app)/_components/dashboard/DashboardPage.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import {
  getActiveWorkspace,
  getDashboardStats,
  getMyOpenCases,
  getRecentActivity,
  getOrgMembers,
} from "@/lib/db";

import { shortId, caseKey, timeAgo, getStatusMeta } from "@/lib/ui/status";

import { Card, Empty, Row, Col, Space, Typography, message, Grid } from "antd";

import DashboardHero from "./DashboardHero";
import DashboardTicker from "./DashboardTicker";
import KpisRow from "./KpisRow";
import StatusDistributionCard from "./StatusDistributionCard";
import MyWorkCard from "./MyWorkCard";
import LiveActivityCard from "./LiveActivityCard";
import { getDisplayNameForCurrentUser } from "./helpers";

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function DashboardPage() {
  const router = useRouter();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [workspace, setWorkspace] = useState(null);
  const [stats, setStats] = useState(null);
  const [myCases, setMyCases] = useState([]);
  const [activity, setActivity] = useState([]);
  const [userMap, setUserMap] = useState({});

  const [displayName, setDisplayName] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const lastToastRef = useRef(0);

  const displayUser = (userId) => {
    if (!userId) return "unknown";
    return userMap?.[userId] || shortId(userId);
  };

  async function loadAll({ silent = false } = {}) {
    try {
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      // ✅ Greeting name (user, not org)
      const dn = await getDisplayNameForCurrentUser();
      setDisplayName(dn);

      const ws = await getActiveWorkspace();
      setWorkspace(ws);

      if (!ws?.orgId) {
        setStats(null);
        setMyCases([]);
        setActivity([]);
        setUserMap({});
        return;
      }

      const [s, a] = await Promise.all([
        getDashboardStats(ws.orgId),
        getRecentActivity(ws.orgId),
      ]);

      setStats(s);
      setActivity(a);

      // members map
      try {
        const members = await getOrgMembers(ws.orgId);
        const map = {};
        for (const m of members) map[m.user_id] = m.full_name || m.email || null;
        setUserMap(map);
      } catch {
        setUserMap({});
      }

      // my open cases
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user?.id) {
        const mine = await getMyOpenCases(ws.orgId, user.id);
        setMyCases(mine);
      } else {
        setMyCases([]);
      }

      setLastUpdated(new Date());
    } catch (e) {
      message.error(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "case_activities" }, () => {
        loadAll({ silent: true });

        const now = Date.now();
        if (now - lastToastRef.current > 8000) {
          lastToastRef.current = now;
          message.success({ content: "Live update received", duration: 1.2 });
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusChips = useMemo(() => {
    const map = stats?.byStatus || {};
    const entries = Object.entries(map);
    const order = ["new", "in_progress", "waiting_customer", "resolved", "closed"];
    entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    return entries;
  }, [stats]);

  const total = stats?.total || 0;
  const openCount = stats?.openCount || 0;
  const urgentOpenCount = stats?.urgentOpenCount || 0;
  const newTodayCount = stats?.newTodayCount || 0;
  const resolvedThisWeekCount = stats?.resolvedThisWeekCount || 0;

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <DashboardHero
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => loadAll({ silent: true })}
        onGoCases={() => router.push("/cases")}
        workspace={workspace}
        displayName={displayName}
        lastUpdated={lastUpdated}
        isMobile={isMobile}
      />

      <DashboardTicker />

      <KpisRow
        loading={loading}
        isMobile={isMobile}
        total={total}
        openCount={openCount}
        urgentOpenCount={urgentOpenCount}
        newTodayCount={newTodayCount}
        resolvedThisWeekCount={resolvedThisWeekCount}
      />

      <StatusDistributionCard loading={loading} total={total} statusChips={statusChips} />

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <MyWorkCard
            loading={loading}
            myCases={myCases}
            onOpenCase={(id) => router.push(`/cases/${id}`)}
            onViewAll={() => router.push("/cases")}
          />
        </Col>

        <Col xs={24} lg={12}>
          <LiveActivityCard
            loading={loading}
            activity={activity}
            displayUser={displayUser}
            onOpenCase={(id) => router.push(`/cases/${id}`)}
          />
        </Col>
      </Row>
    </Space>
  );
}

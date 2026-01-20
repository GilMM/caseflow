// src/app/(app)/_components/dashboard/DashboardPage.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useLocaleContext } from "@/app/[locale]/providers";

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
import { getUpcomingCalendarEvents } from "@/lib/db";
import UpcomingEventsCard from "./UpcomingEventsCard";

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function DashboardPage() {
  const router = useRouter();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const t = useTranslations();

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
  const [events, setEvents] = useState([]);
  const pathname = usePathname();
  const { locale } = useLocaleContext();

  const withLocale = (to) => {
    const segs = pathname.split("/").filter(Boolean);
    const rest = segs[0] === locale ? segs.slice(1).join("/") : segs.join("/");
    // to is like "/cases" or `/cases/${id}`
    return `/${locale}${to}`;
  };

  const displayUser = (userId) => {
    if (!userId) return t("common.unknown");
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

      const [s, a, ev] = await Promise.all([
        getDashboardStats(ws.orgId),
        getRecentActivity(ws.orgId),
        getUpcomingCalendarEvents(ws.orgId, { limit: 6 }),
      ]);

      setStats(s);
      setActivity(a);
      setEvents(ev);

      // members map
      try {
        const members = await getOrgMembers(ws.orgId);
        const map = {};
        for (const m of members)
          map[m.user_id] = m.full_name || m.email || null;
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
      message.error(e?.message || t("dashboard.errors.loadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();

    const maybeToast = (text = t("dashboard.liveUpdate")) => {
      const now = Date.now();
      if (now - lastToastRef.current > 8000) {
        lastToastRef.current = now;
        message.success({ content: text, duration: 1.2 });
      }
    };

    // 1) Live activity changes (cases)
    const activityChannel = supabase
      .channel("dashboard-live-activities")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "case_activities" },
        () => {
          loadAll({ silent: true });
          maybeToast(t("dashboard.activityUpdated"));
        },
      )
      .subscribe();

    // 2) Calendar changes (events)
    const calendarChannel = supabase
      .channel("dashboard-live-calendar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events" },
        () => {
          loadAll({ silent: true });
          maybeToast(t("dashboard.calendarUpdated"));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(calendarChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusChips = useMemo(() => {
    const map = stats?.byStatus || {};
    const entries = Object.entries(map);
    const order = [
      "new",
      "in_progress",
      "waiting_customer",
      "resolved",
      "closed",
    ];
    entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    return entries;
  }, [stats]);

  const total = stats?.total || 0;
  const openCount = stats?.openCount || 0;
  const urgentOpenCount = stats?.urgentOpenCount || 0;
  const newTodayCount = stats?.newTodayCount || 0;
  const resolvedThisWeekCount = stats?.resolvedThisWeekCount || 0;

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      <DashboardHero
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => loadAll({ silent: true })}
        onGoCases={() => router.push(`/${locale}/cases`)}
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

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <StatusDistributionCard
            loading={loading}
            total={total}
            statusChips={statusChips}
          />
        </Col>

        <Col xs={24} lg={12}>
          <UpcomingEventsCard
            loading={loading}
            events={events}
            isMobile={isMobile}
            onOpenCalendar={() => router.push(`/${locale}/calendar`)}
            onOpenCase={(caseId) => router.push(`/${locale}/cases/${caseId}`)}
          />
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <MyWorkCard
            loading={loading}
            myCases={myCases}
            onViewAll={() => router.push(`/${locale}/cases`)}
            onOpenCase={(id) => router.push(`/${locale}/cases/${id}`)}
          />
        </Col>

        <Col xs={24} lg={12}>
          <LiveActivityCard
            loading={loading}
            activity={activity}
            displayUser={displayUser}
            onViewAll={() => router.push(`/${locale}/cases`)}
            onOpenCase={(id) => router.push(`/${locale}/cases/${id}`)}
          />
        </Col>
      </Row>
    </Space>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Card, Grid, Segmented, Space, Spin, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { getActiveWorkspace, listCalendarEvents } from "@/lib/db";

import CalendarMonth from "./_components/CalendarMonth.jsx";
import CalendarWeek from "./_components/CalendarWeek.jsx";
import CalendarMobile from "./_components/CalendarMobile.jsx";
import EventModal from "./_components/EventModal.jsx";
import CalendarHeader from "./_components/CalendarHeader";

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function CalendarPage() {
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [workspace, setWorkspace] = useState(null);
  const orgId = workspace?.orgId || null;

  const [cursor, setCursor] = useState(() => dayjs().startOf("day"));

  // ✅ default view depends on device
  const [view, setView] = useState(isMobile ? "week" : "month"); // "month" | "week"

  const [events, setEvents] = useState([]);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalEventId, setModalEventId] = useState(null);
  const [modalPrefill, setModalPrefill] = useState(null);
  const t = useTranslations();

  // keep view consistent when switching responsive
  useEffect(() => {
    setView(isMobile ? "week" : "month");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  const range = useMemo(() => {
    if (view === "week") {
      const start = cursor.startOf("week");
      const end = cursor.endOf("week");
      return { start: start.toISOString(), end: end.toISOString() };
    }
    const start = cursor.startOf("month").startOf("week");
    const end = cursor.endOf("month").endOf("week");
    return { start: start.toISOString(), end: end.toISOString() };
  }, [cursor, view]);

  async function loadAll({ silent = false } = {}) {
    try {
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const ws = await getActiveWorkspace();
      setWorkspace(ws);

      if (!ws?.orgId) {
        setEvents([]);
        return;
      }

      const rows = await listCalendarEvents(ws.orgId, range);
      setEvents(rows || []);
    } catch (e) {
      message.error(e?.message || "Failed to load calendar");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!orgId) return;
    loadAll({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end, orgId]);

  function openCreate(prefill = null) {
    setModalMode("create");
    setModalEventId(null);
    setModalPrefill(prefill);
    setModalOpen(true);
  }

  function openEdit(eventId) {
    setModalMode("edit");
    setModalEventId(eventId);
    setModalPrefill(null);
    setModalOpen(true);
  }

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      <CalendarHeader
        workspace={workspace}
        view={view}
        eventCount={events.length}
        refreshing={refreshing}
        onRefresh={() => loadAll({ silent: true })}
        onNewEvent={() => openCreate(null)}
      />

      <Card style={{ borderRadius: 16 }} bodyStyle={{ padding: 12 }}>
        {/* Desktop controls */}
        {!isMobile ? (
          <Space
            align="center"
            wrap
            style={{
              justifyContent: "space-between",
              width: "100%",
              marginBottom: 10,
            }}
          >
<Segmented
  value={view}
  onChange={(v) => setView(v)}
  options={[
    { label: t("calendar.view.month"), value: "month" },
    { label: t("calendar.view.week"), value: "week" },
  ]}
/>


            <Text type="secondary" style={{ fontSize: 12 }}>
              {cursor.format(view === "week" ? "MMM D, YYYY" : "MMMM YYYY")}
            </Text>
          </Space>
        ) : null}

        <Spin spinning={loading} size="large">
          {isMobile ? (
            <CalendarMobile
              cursor={cursor}
              onCursorChange={setCursor}
              events={events}
              onSelectRange={(prefill) => openCreate(prefill)}
              onOpenEvent={(id) => openEdit(id)}
            />
          ) : view === "month" ? (
            <CalendarMonth
              cursor={cursor}
              onCursorChange={setCursor}
              events={events}
              onSelectRange={(prefill) => openCreate(prefill)}
              onOpenEvent={(id) => openEdit(id)}
            />
          ) : (
            <CalendarWeek
              cursor={cursor}
              onCursorChange={setCursor}
              events={events}
              onSelectRange={(prefill) => openCreate(prefill)}
              onOpenEvent={(id) => openEdit(id)}
            />
          )}
        </Spin>
      </Card>

      <EventModal
        open={modalOpen}
        mode={modalMode}
        orgId={orgId}
        eventId={modalEventId}
        prefill={modalPrefill}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          loadAll({ silent: true });
        }}
      />
    </Space>
  );
}

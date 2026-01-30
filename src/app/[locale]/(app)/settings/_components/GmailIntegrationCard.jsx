"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";

import {
  Alert,
  Button,
  Card,
  Divider,
  Space,
  Spin,
  Typography,
  Select,
  Tag,
  Grid,
  message,
} from "antd";

import {
  GoogleOutlined,
  MailOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PoweroffOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function GmailIntegrationCard({
  orgId,
  returnTo = "/settings",
  queues = [],
  isMobile: isMobileProp,
}) {
  const safeOrgId = (orgId || "").trim();
  const hasOrgId = !!safeOrgId;

  const locale = useLocale();
  const tNs = useTranslations("integrations.gmail");
  const screens = useBreakpoint();
  const isMobile =
    typeof isMobileProp === "boolean" ? isMobileProp : !screens.md;

  const tx = (key, fallback) => {
    try {
      const val = tNs(key);
      if (!val || val === key) return fallback ?? key;
      return val;
    } catch {
      return fallback ?? key;
    }
  };

  const [loading, setLoading] = useState(true);

  // OAuth connection
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState(null);

  // Gmail integration status
  const [gmailEnabled, setGmailEnabled] = useState(false);
  const [defaultQueueId, setDefaultQueueId] = useState(null);
  const [lastPolledAt, setLastPolledAt] = useState(null);
  const [emailsProcessed, setEmailsProcessed] = useState(0);
  const [lastError, setLastError] = useState(null);

  // UI state
  const [busyAction, setBusyAction] = useState(null);
  const [uiError, setUiError] = useState(null);

  const queueOptions = useMemo(
    () =>
      (queues || []).map((q) => ({
        label: q.name ?? q.title ?? q.display_name ?? q.id,
        value: q.id,
      })),
    [queues],
  );

  async function safeFetchJson(url, options = {}) {
    const { data: sessData } = await supabase.auth.getSession();
    const accessToken = sessData?.session?.access_token || null;

    const res = await fetch(url, {
      credentials: "include",
      headers: {
        ...(options.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...options,
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const errMsg =
        data?.error ||
        data?.message ||
        `Request failed (${res.status})${text ? `: ${text.slice(0, 180)}` : ""}`;
      const e = new Error(errMsg);
      e.status = res.status;
      e.data = data;
      throw e;
    }

    return data;
  }

  function buildAuthStartUrl() {
    const qs = new URLSearchParams();
    qs.set("orgId", safeOrgId);
    qs.set("returnTo", returnTo);
    qs.set("locale", locale);
    return `/api/integrations/google/auth/start?${qs.toString()}`;
  }

  async function loadStatus() {
    if (!hasOrgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setUiError(null);

    try {
      // Check Google connection
      const conn = await safeFetchJson(
        `/api/integrations/google/connection?orgId=${encodeURIComponent(safeOrgId)}`,
      );
      setConnected(!!conn?.connected);
      setGoogleEmail(conn?.email || null);

      // Check Gmail integration status
      try {
        const st = await safeFetchJson(
          `/api/integrations/gmail/status?orgId=${encodeURIComponent(safeOrgId)}`,
        );
        setGmailEnabled(st?.is_enabled ?? false);
        setDefaultQueueId(st?.default_queue_id || null);
        setLastPolledAt(st?.last_polled_at || null);
        setEmailsProcessed(st?.emails_processed_count ?? 0);
        setLastError(st?.last_error || null);
      } catch {
        // Table may not exist yet — treat as disabled
        setGmailEnabled(false);
      }
    } catch (e) {
      setUiError(
        e?.message || tx("errors.loadStatus", "Failed to load Gmail status"),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasOrgId) {
      setLoading(false);
      return;
    }
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeOrgId]);

  async function onEnable() {
    setUiError(null);

    if (!defaultQueueId) {
      message.warning(
        tx("messages.pickDefaultQueue", "Select a department before enabling."),
      );
      return;
    }

    setBusyAction("enable");
    try {
      await safeFetchJson(`/api/integrations/gmail/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: safeOrgId,
          enabled: true,
          defaultQueueId,
        }),
      });

      message.success(
        tx(
          "messages.enabled",
          "Gmail integration enabled. Emails will be checked every 2 minutes.",
        ),
      );
      await loadStatus();
    } catch (e) {
      setUiError(
        e?.message ||
          tx("errors.enableFailed", "Failed to enable Gmail integration"),
      );
      message.error(
        e?.message ||
          tx("errors.enableFailed", "Failed to enable Gmail integration"),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function onCheckNow() {
    setUiError(null);
    setBusyAction("check");

    try {
      const data = await safeFetchJson(`/api/integrations/gmail/check-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: safeOrgId }),
      });

      const parts = [];
      if (data?.created > 0) parts.push(`${data.created} cases created`);
      if (data?.skipped > 0) parts.push(`${data.skipped} skipped`);
      if (data?.errors > 0) parts.push(`${data.errors} errors`);
      if (parts.length === 0) parts.push("No new emails");

      message.success(parts.join(", "));
      await loadStatus();
    } catch (e) {
      setUiError(e?.message || "Check failed");
      message.error(e?.message || "Check failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function onDisable() {
    setUiError(null);
    setBusyAction("disable");

    try {
      await safeFetchJson(`/api/integrations/gmail/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: safeOrgId,
          enabled: false,
        }),
      });

      message.success(
        tx("messages.disabled", "Gmail integration disabled."),
      );
      await loadStatus();
    } catch (e) {
      setUiError(
        e?.message ||
          tx("errors.disableFailed", "Failed to disable Gmail integration"),
      );
      message.error(
        e?.message ||
          tx("errors.disableFailed", "Failed to disable Gmail integration"),
      );
    } finally {
      setBusyAction(null);
    }
  }

  /* ---- Render helpers ---- */

  const headerTitle = tx("card.title", "Gmail Integration");
  const headerSubtitle = tx(
    "card.subtitle",
    "Automatically create cases from incoming emails",
  );

  const statusTag = !connected ? (
    <Tag>{tx("tags.notConnected", "Not connected")}</Tag>
  ) : gmailEnabled ? (
    <Tag color="green">{tx("tags.enabled", "Enabled")}</Tag>
  ) : (
    <Tag color="blue">{tx("tags.connected", "Connected")}</Tag>
  );

  function formatPolledAt(iso) {
    if (!iso) return tx("labels.never", "Never");
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return tx("labels.justNow", "Just now");
    const min = Math.floor(diff / 60_000);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  }

  function renderConnect() {
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          icon={<GoogleOutlined />}
          message={tx("state.connect.title", "Google not connected")}
          description={tx(
            "state.connect.desc",
            "Connect a Google account with Gmail access to automatically create cases from incoming emails.",
          )}
        />
        <Button
          type="primary"
          icon={<GoogleOutlined />}
          href={buildAuthStartUrl()}
          block={isMobile}
        >
          {tx("actions.connect", "Connect Google")}
        </Button>
      </Space>
    );
  }

  function renderSetup() {
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message={tx("state.setup.title", "Gmail ready to enable")}
          description={tx(
            "state.setup.desc",
            "Select a default department for incoming email cases, then enable the integration.",
          )}
        />

        {googleEmail && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {googleEmail}
          </Text>
        )}

        <div>
          <Text
            strong
            style={{ display: "block", marginBottom: 4, fontSize: 13 }}
          >
            {tx("fields.defaultQueue.label", "Default Department")}
          </Text>
          <Select
            style={{ width: isMobile ? "100%" : 280 }}
            placeholder={tx(
              "fields.defaultQueue.placeholder",
              "Select default department",
            )}
            options={queueOptions}
            value={defaultQueueId}
            onChange={setDefaultQueueId}
          />
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tx(
                "fields.defaultQueue.help",
                "Incoming emails will create cases in this department.",
              )}
            </Text>
          </div>
        </div>

        <Button
          type="primary"
          icon={<MailOutlined />}
          loading={busyAction === "enable"}
          onClick={onEnable}
          block={isMobile}
        >
          {tx("actions.enable", "Enable Gmail Integration")}
        </Button>
      </Space>
    );
  }

  function renderActive() {
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message={tx("state.active.title", "Gmail integration active")}
          description={tx(
            "state.active.desc",
            "New emails are automatically converted to cases.",
          )}
        />

        {googleEmail && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {googleEmail}
          </Text>
        )}

        {/* Status info */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            padding: "8px 0",
          }}
        >
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              {tx("labels.lastPolled", "Last checked")}
            </Text>
            <Text style={{ fontSize: 13 }}>
              {formatPolledAt(lastPolledAt)}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              {tx("labels.emailsProcessed", "Emails processed")}
            </Text>
            <Text style={{ fontSize: 13 }}>{emailsProcessed}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              {tx("labels.status", "Status")}
            </Text>
            {lastError ? (
              <Text type="danger" style={{ fontSize: 13 }}>
                <WarningOutlined /> {lastError}
              </Text>
            ) : (
              <Text type="success" style={{ fontSize: 13 }}>
                <CheckCircleOutlined />{" "}
                {tx("tags.enabled", "Enabled")}
              </Text>
            )}
          </div>
        </div>

        {/* Queue selector */}
        <div>
          <Text
            strong
            style={{ display: "block", marginBottom: 4, fontSize: 13 }}
          >
            {tx("fields.defaultQueue.label", "Default Department")}
          </Text>
          <Select
            style={{ width: isMobile ? "100%" : 280 }}
            options={queueOptions}
            value={defaultQueueId}
            onChange={async (val) => {
              setDefaultQueueId(val);
              try {
                await safeFetchJson(`/api/integrations/gmail/enable`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orgId: safeOrgId,
                    enabled: true,
                    defaultQueueId: val,
                  }),
                });
                message.success(
                  tx("messages.refreshed", "Status refreshed."),
                );
              } catch {
                /* non-blocking */
              }
            }}
          />
        </div>

        <Space wrap>
          <Button
            type="primary"
            icon={<MailOutlined />}
            loading={busyAction === "check"}
            onClick={onCheckNow}
          >
            {tx("actions.checkNow", "Check Now")}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadStatus()}
            loading={loading}
          >
            {tx("actions.refresh", "Refresh")}
          </Button>
          <Button
            danger
            icon={<PoweroffOutlined />}
            loading={busyAction === "disable"}
            onClick={onDisable}
          >
            {tx("actions.disable", "Disable")}
          </Button>
        </Space>
      </Space>
    );
  }

  /* ---- Main render ---- */

  const cardContent = loading ? (
    <div style={{ padding: 40, textAlign: "center" }}>
      <Spin />
    </div>
  ) : !connected ? (
    renderConnect()
  ) : gmailEnabled ? (
    renderActive()
  ) : (
    renderSetup()
  );

  return (
    <Card
      style={{ borderRadius: 16 }}
      title={
        <Space size={8}>
          <MailOutlined />
          <span>{headerTitle}</span>
        </Space>
      }
      extra={statusTag}
    >
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
        {headerSubtitle}
      </Text>

      {uiError && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setUiError(null)}
          message={tx("errors.uiTitle", "Error")}
          description={uiError}
          style={{ marginBottom: 12 }}
        />
      )}

      {cardContent}
    </Card>
  );
}

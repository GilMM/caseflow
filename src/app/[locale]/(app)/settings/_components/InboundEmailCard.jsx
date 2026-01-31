"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";

import {
  Alert,
  Button,
  Card,
  Space,
  Spin,
  Typography,
  Select,
  Tag,
  Grid,
  message,
} from "antd";

import {
  MailOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PoweroffOutlined,
  CopyOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function InboundEmailCard({
  orgId,
  queues = [],
  isMobile: isMobileProp,
}) {
  const safeOrgId = (orgId || "").trim();
  const hasOrgId = !!safeOrgId;

  const tNs = useTranslations("integrations.inboundEmail");
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

  // Integration status
  const [exists, setExists] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [inboundAddress, setInboundAddress] = useState(null);
  const [defaultQueueId, setDefaultQueueId] = useState(null);
  const [emailsProcessed, setEmailsProcessed] = useState(0);
  const [lastReceivedAt, setLastReceivedAt] = useState(null);
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

  async function loadStatus() {
    if (!hasOrgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setUiError(null);

    try {
      const st = await safeFetchJson(
        `/api/integrations/inbound-email/status?orgId=${encodeURIComponent(safeOrgId)}`,
      );
      setExists(st?.exists ?? false);
      setIsEnabled(st?.is_enabled ?? false);
      setInboundAddress(st?.inbound_address ?? null);
      setDefaultQueueId(st?.default_queue_id ?? null);
      setEmailsProcessed(st?.emails_processed_count ?? 0);
      setLastReceivedAt(st?.last_received_at ?? null);
      setLastError(st?.last_error ?? null);
    } catch (e) {
      setUiError(
        e?.message ||
          tx("errors.loadStatus", "Failed to load inbound email status"),
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
      const data = await safeFetchJson(
        `/api/integrations/inbound-email/setup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: safeOrgId,
            defaultQueueId,
          }),
        },
      );

      message.success(
        tx(
          "messages.enabled",
          "Inbound email enabled. Forward emails to your new address.",
        ),
      );
      await loadStatus();
    } catch (e) {
      setUiError(
        e?.message ||
          tx("errors.enableFailed", "Failed to enable inbound email"),
      );
      message.error(
        e?.message ||
          tx("errors.enableFailed", "Failed to enable inbound email"),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function onDisable() {
    setUiError(null);
    setBusyAction("disable");

    try {
      await safeFetchJson(`/api/integrations/inbound-email/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: safeOrgId }),
      });

      message.success(tx("messages.disabled", "Inbound email disabled."));
      await loadStatus();
    } catch (e) {
      setUiError(
        e?.message ||
          tx("errors.disableFailed", "Failed to disable inbound email"),
      );
      message.error(
        e?.message ||
          tx("errors.disableFailed", "Failed to disable inbound email"),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function onCopyAddress() {
    if (!inboundAddress) return;
    try {
      await navigator.clipboard.writeText(inboundAddress);
      message.success(tx("actions.copied", "Copied!"));
    } catch {
      message.error("Copy failed");
    }
  }

  async function onQueueChange(val) {
    setDefaultQueueId(val);
    try {
      await safeFetchJson(`/api/integrations/inbound-email/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: safeOrgId,
          defaultQueueId: val,
        }),
      });
      message.success(tx("messages.refreshed", "Status refreshed."));
    } catch {
      /* non-blocking */
    }
  }

  /* ---- Render helpers ---- */

  const headerTitle = tx("card.title", "Inbound Email");
  const headerSubtitle = tx(
    "card.subtitle",
    "Automatically create cases from incoming emails via forwarding",
  );

  const statusTag =
    !exists ? (
      <Tag>{tx("tags.notConfigured", "Not configured")}</Tag>
    ) : isEnabled ? (
      <Tag color="green">{tx("tags.active", "Active")}</Tag>
    ) : (
      <Tag color="orange">{tx("tags.disabled", "Disabled")}</Tag>
    );

  function formatReceivedAt(iso) {
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

  function renderSetup() {
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          icon={<MailOutlined />}
          message={tx("state.setup.title", "Set up inbound email")}
          description={tx(
            "state.setup.desc",
            "Select a default department, then enable inbound email to get your unique forwarding address.",
          )}
        />

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
          {tx("actions.enable", "Enable Inbound Email")}
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
          message={tx("state.active.title", "Inbound email active")}
          description={tx(
            "state.active.desc",
            "Emails forwarded to your inbound address are automatically converted to cases.",
          )}
        />

        {/* Inbound address */}
        {inboundAddress && (
          <div>
            <Text
              strong
              style={{ display: "block", marginBottom: 4, fontSize: 13 }}
            >
              {tx("fields.inboundAddress.label", "Your Inbound Address")}
            </Text>
            <Space>
              <Text
                code
                copyable={false}
                style={{ fontSize: 14, padding: "4px 8px" }}
              >
                {inboundAddress}
              </Text>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={onCopyAddress}
              >
                {tx("actions.copy", "Copy Address")}
              </Button>
            </Space>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tx(
                  "fields.inboundAddress.help",
                  "Forward emails from Gmail, Outlook, or any email client to this address.",
                )}
              </Text>
            </div>
          </div>
        )}

        {/* Forwarding instructions */}
        <div
          style={{
            background: "var(--ant-color-fill-alter, #fafafa)",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <Text strong style={{ display: "block", marginBottom: 4, fontSize: 13 }}>
            {tx("forwarding.title", "Forwarding Instructions")}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
            {tx(
              "forwarding.gmail",
              "In Gmail: Settings > Forwarding > Add a forwarding address",
            )}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
            {tx(
              "forwarding.outlook",
              "In Outlook: Settings > Mail > Forwarding > Enable forwarding",
            )}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
            {tx(
              "forwarding.generic",
              "Set up auto-forwarding in your email client to the address above.",
            )}
          </Text>
        </div>

        {/* Stats */}
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
              {tx("labels.lastReceived", "Last received")}
            </Text>
            <Text style={{ fontSize: 13 }}>
              {formatReceivedAt(lastReceivedAt)}
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
                <CheckCircleOutlined /> {tx("tags.active", "Active")}
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
            onChange={onQueueChange}
          />
        </div>

        <Space wrap>
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

  function renderDisabled() {
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={tx("state.disabled.title", "Inbound email disabled")}
          description={tx(
            "state.disabled.desc",
            "Re-enable to resume receiving emails.",
          )}
        />

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
        </div>

        <Button
          type="primary"
          icon={<MailOutlined />}
          loading={busyAction === "enable"}
          onClick={onEnable}
          block={isMobile}
        >
          {tx("actions.enable", "Enable Inbound Email")}
        </Button>
      </Space>
    );
  }

  /* ---- Main render ---- */

  const cardContent = loading ? (
    <div style={{ padding: 40, textAlign: "center" }}>
      <Spin />
    </div>
  ) : exists && isEnabled ? (
    renderActive()
  ) : exists && !isEnabled ? (
    renderDisabled()
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
      <Text
        type="secondary"
        style={{ fontSize: 12, display: "block", marginBottom: 12 }}
      >
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

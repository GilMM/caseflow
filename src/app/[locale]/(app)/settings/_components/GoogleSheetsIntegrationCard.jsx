"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  Alert,
  Button,
  Card,
  Divider,
  Space,
  Spin,
  Steps,
  Typography,
  Select,
  Tag,
  Tooltip,
  message,
  Grid,
} from "antd";

import {
  GoogleOutlined,
  LinkOutlined,
  DisconnectOutlined,
  RocketOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CopyOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

/**
 * Props:
 * - orgId (string)                required
 * - returnTo (string)             optional (default: "/settings")
 * - queues (array)                optional: [{ id, name }]
 * - isMobile (boolean)            optional (for layout)
 */
export default function GoogleSheetsIntegrationCard({
  orgId,
  returnTo = "/settings",
  queues = [],
  isMobile: isMobileProp,
}) {
  const locale = useLocale();
  const tNs = useTranslations("integrations.googleSheets"); // namespace
  const screens = useBreakpoint();
  const isMobile = typeof isMobileProp === "boolean" ? isMobileProp : !screens.md;

  // ✅ safe translator: if key missing -> fallback (no raw keys on screen)
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

  // OAuth connection status
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState(null);

  // Integration status
  const [sheetUrl, setSheetUrl] = useState(null);
  const [sheetId, setSheetId] = useState(null);
  const [scriptUrl, setScriptUrl] = useState(null);

  // Config
  const [defaultQueueId, setDefaultQueueId] = useState(null);

  // UI state
  const [busyAction, setBusyAction] = useState(null); // "setup" | "install" | "disconnect"
  const [lastError, setLastError] = useState(null);

  const step = useMemo(() => {
    if (!connected) return 0;
    if (!sheetId && !sheetUrl) return 1;
    if (!scriptUrl) return 2;
    return 3;
  }, [connected, sheetId, sheetUrl, scriptUrl]);

  const queueOptions = useMemo(
    () =>
      (queues || []).map((q) => ({
        label: q.name ?? q.title ?? q.display_name ?? q.id,
        value: q.id,
      })),
    [queues],
  );

  async function safeFetchJson(url, options = {}) {
    const res = await fetch(url, {
      credentials: "include",
      headers: { ...(options.headers || {}) },
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

      console.error("API ERROR:", { url, status: res.status, text, data });

      const e = new Error(errMsg);
      e.status = res.status;
      e.data = data;
      throw e;
    }

    return data;
  }

  function buildAuthStartUrl() {
    const qs = new URLSearchParams();
    qs.set("orgId", orgId);
    qs.set("returnTo", returnTo);
    qs.set("locale", locale); // optional
    return `/api/integrations/google/auth/start?${qs.toString()}`;
  }

  async function loadStatus() {
    if (!orgId) return;

    setLoading(true);
    setLastError(null);

    try {
      const conn = await safeFetchJson(
        `/api/integrations/google/connection?orgId=${encodeURIComponent(orgId)}`,
      );

      setConnected(!!conn?.connected);
      setGoogleEmail(conn?.email || null);

      try {
        const st = await safeFetchJson(
          `/api/integrations/google-sheets/status?orgId=${encodeURIComponent(orgId)}`,
        );

        setSheetUrl(st?.sheet_url || st?.sheetUrl || null);
        setSheetId(st?.sheet_id || st?.sheetId || null);
        setScriptUrl(st?.script_url || st?.scriptUrl || null);
        setDefaultQueueId(st?.default_queue_id || st?.defaultQueueId || null);
      } catch (_) {
        // ok
      }
    } catch (e) {
      setLastError(e?.message || tx("errors.loadStatus", "Failed to load status"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function onSetup() {
    setLastError(null);

    if (!defaultQueueId) {
      message.warning(
        tx("messages.pickDefaultQueue", "בחר Default Queue לפני יצירה."),
      );
      return;
    }

    setBusyAction("setup");
    try {
      const data = await safeFetchJson(`/api/integrations/google-sheets/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, defaultQueueId }),
      });

      setSheetUrl(data?.sheetUrl || data?.sheet_url || null);
      setSheetId(data?.sheetId || data?.sheet_id || null);
      setScriptUrl(data?.scriptUrl || data?.script_url || null);

      message.success(tx("messages.setupOk", "✅ Setup בוצע בהצלחה"));
      await loadStatus();
    } catch (e) {
      setLastError(e?.message || tx("errors.setupFailed", "Setup failed"));
      message.error(e?.message || tx("errors.setupFailed", "Setup failed"));
    } finally {
      setBusyAction(null);
    }
  }

  async function onInstallScript() {
    setLastError(null);
    setBusyAction("install");

    try {
      const data = await safeFetchJson(`/api/integrations/google-sheets/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      const nextScriptUrl = data?.scriptUrl || data?.script_url || null;
      if (nextScriptUrl) setScriptUrl(nextScriptUrl);

      message.success(
        tx("messages.installOk", "✅ הסקריפט הותקן. פתח את השיט ואשר הרשאות פעם אחת."),
      );
      await loadStatus();
    } catch (e) {
      if (e?.status === 404) {
        message.info(
          tx("errors.installEndpointMissing", "Endpoint של install עדיין לא קיים."),
        );
      } else {
        setLastError(e?.message || tx("errors.installFailed", "Install failed"));
        message.error(e?.message || tx("errors.installFailed", "Install failed"));
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function onDisconnect() {
    setLastError(null);
    setBusyAction("disconnect");

    try {
      await safeFetchJson(`/api/integrations/google/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      message.success(tx("messages.disconnected", "החיבור ל־Google נותק"));
      setConnected(false);
      setGoogleEmail(null);
      setSheetUrl(null);
      setSheetId(null);
      setScriptUrl(null);
      setDefaultQueueId(null);

      await loadStatus();
    } catch (e) {
      message.error(e?.message || tx("errors.disconnectFailed", "Disconnect failed"));
    } finally {
      setBusyAction(null);
    }
  }

  /* ---------------- UI atoms ---------------- */

  const headerTitle = tx("card.title", "Google Sheets Integration");
  const headerSubtitle = tx(
    "card.subtitle",
    "Create a Sheet + install automation that creates cases when Status becomes “new”.",
  );

  const statusTag = !connected ? (
    <Tag>{tx("tags.notConnected", "Not connected")}</Tag>
  ) : (
    <Tag color="blue">{googleEmail || tx("tags.connected", "Connected")}</Tag>
  );

  const stepsItems = [
    { title: tx("steps.connect", "Connect") },
    { title: tx("steps.create", "Create") },
    { title: tx("steps.install", "Install") },
    { title: tx("steps.ready", "Ready") },
  ];

  function MetaRow({ label, value, href }) {
    if (!value) return null;

    const content = href ? (
      <a href={href} target="_blank" rel="noreferrer">
        {value}
      </a>
    ) : (
      <Text code style={{ fontSize: 12 }}>
        {value}
      </Text>
    );

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: "space-between",
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          {label}
        </Text>

        <Space size={8}>
          {content}
          {!href ? (
            <Tooltip title={tx("actions.copy", "Copy")}>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard?.writeText(String(value));
                  message.success(tx("messages.copied", "Copied"));
                }}
              />
            </Tooltip>
          ) : null}
        </Space>
      </div>
    );
  }

  function ActionsBar({ children }) {
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        {children}
      </div>
    );
  }

  function SoftPanel({ children }) {
    return (
      <div
        style={{
          borderRadius: 14,
          padding: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        }}
      >
        {children}
      </div>
    );
  }

  /* ---------------- Render states ---------------- */

  function renderStateConnect() {
    return (
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          title ={tx("state.connect.title", "Google is not connected")}
          description={tx(
            "state.connect.desc",
            "Connect a Google account to create a Sheet and install Apps Script automation.",
          )}
        />

        <ActionsBar>
          <Button
            type="primary"
            icon={<GoogleOutlined />}
            href={buildAuthStartUrl()}
            block={isMobile}
          >
            {tx("actions.connect", "Connect Google")}
          </Button>

          <Button icon={<ReloadOutlined />} onClick={loadStatus} block={isMobile}>
            {tx("actions.refresh", "Refresh")}
          </Button>
        </ActionsBar>

        <Text type="secondary" style={{ fontSize: 12 }}>
          <Text code>{tx("hints.redirectHint", "OAuth redirect via /api/integrations/google/auth/start")}</Text>
        </Text>
      </Space>
    );
  }

  function renderStateCreate() {
    return (
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          title ={tx("state.create.title", "Connected — create a Sheet")}
          description={tx(
            "state.create.desc",
            "Pick a default queue, then create the Sheet and install everything automatically.",
          )}
        />

        <SoftPanel>
          <Space orientation="vertical" size={8} style={{ width: "100%" }}>
            <Text strong>{tx("fields.defaultQueue.label", "Default Queue")}</Text>
            <Select
              placeholder={tx("fields.defaultQueue.placeholder", "Select default queue")}
              options={queueOptions}
              value={defaultQueueId}
              onChange={(v) => setDefaultQueueId(v)}
              style={{ width: isMobile ? "100%" : 440 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tx(
                "fields.defaultQueue.help",
                "This queue will be used when creating cases from the Sheet.",
              )}
            </Text>
          </Space>
        </SoftPanel>

        <ActionsBar>
          <Tooltip title={!defaultQueueId ? tx("tooltips.pickQueue", "Pick a queue first") : ""}>
            <Button
              type="primary"
              icon={<RocketOutlined />}
              onClick={onSetup}
              loading={busyAction === "setup"}
              disabled={!defaultQueueId}
              block={isMobile}
            >
              {tx("actions.createAndConnect", "Create & Connect")}
            </Button>
          </Tooltip>

          <Button icon={<ReloadOutlined />} onClick={loadStatus} block={isMobile}>
            {tx("actions.refresh", "Refresh")}
          </Button>
        </ActionsBar>

        <Text type="secondary" style={{ fontSize: 12 }}>
          {tx("hints.endpointCreate", "Endpoint")}:{" "}
          <Text code>POST /api/integrations/google-sheets/setup</Text>
        </Text>
      </Space>
    );
  }

  function renderStateInstall() {
    return (
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          title ={tx("state.install.title", "Sheet created — install Apps Script")}
          description={tx(
            "state.install.desc",
            "Install the bound Apps Script project so the Sheet can run automation on edit.",
          )}
        />

        <SoftPanel>
          <Space orientation="vertical" size={8} style={{ width: "100%" }}>
            <MetaRow label={tx("labels.sheetId", "Sheet ID")} value={sheetId} />
          </Space>
        </SoftPanel>

        <ActionsBar>
          <Button
            type="primary"
            icon={<ExperimentOutlined />}
            onClick={onInstallScript}
            loading={busyAction === "install"}
            block={isMobile}
          >
            {tx("actions.installScript", "Install Script")}
          </Button>

          {sheetUrl ? (
            <Button icon={<LinkOutlined />} href={sheetUrl} target="_blank" block={isMobile}>
              {tx("actions.openSheet", "Open Sheet")}
            </Button>
          ) : null}

          <Button icon={<ReloadOutlined />} onClick={loadStatus} block={isMobile}>
            {tx("actions.refresh", "Refresh")}
          </Button>

          <Button
            danger
            icon={<DisconnectOutlined />}
            loading={busyAction === "disconnect"}
            onClick={onDisconnect}
            block={isMobile}
          >
            {tx("actions.disconnect", "Disconnect")}
          </Button>
        </ActionsBar>

        <Alert
          type="warning"
          showIcon
          title ={tx("state.install.noteTitle", "One-time authorization")}
          description={tx(
            "state.install.noteDesc",
            "After installation, open the Sheet once and approve permissions (Google security requirement).",
          )}
        />
      </Space>
    );
  }

  function renderStateReady() {
    return (
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          title ={tx("state.ready.title", "Integration ready")}
          description={tx(
            "state.ready.desc",
            "The Sheet and Script are installed. You may need to authorize once.",
          )}
        />


        <ActionsBar>
          {sheetUrl ? (
            <Button
              type="primary"
              icon={<LinkOutlined />}
              href={sheetUrl}
              target="_blank"
              block={isMobile}
            >
              {tx("actions.openSheetAuthorize", "Open Sheet & Authorize")}
            </Button>
          ) : null}

          {scriptUrl ? (
            <Button icon={<LinkOutlined />} href={scriptUrl} target="_blank" block={isMobile}>
              {tx("actions.openScript", "Open Script")}
            </Button>
          ) : null}

          <Tooltip title={tx("tooltips.reinstall", "Re-upload code and ensure it's bound to this Sheet")}>
            <Button
              icon={<ExperimentOutlined />}
              onClick={onInstallScript}
              loading={busyAction === "install"}
              block={isMobile}
            >
              {tx("actions.reinstallRebind", "Reinstall / Rebind")}
            </Button>
          </Tooltip>

          <Tooltip title={tx("tooltips.setupAgain", "Create/repair everything again")}>
            <Button
              icon={<RocketOutlined />}
              onClick={onSetup}
              loading={busyAction === "setup"}
              disabled={!defaultQueueId}
              block={isMobile}
            >
              {tx("actions.runSetupAgain", "Run Setup Again")}
            </Button>
          </Tooltip>

          <Button icon={<ReloadOutlined />} onClick={loadStatus} block={isMobile}>
            {tx("actions.refresh", "Refresh")}
          </Button>

          <Button
            danger
            icon={<DisconnectOutlined />}
            loading={busyAction === "disconnect"}
            onClick={onDisconnect}
            block={isMobile}
          >
            {tx("actions.disconnect", "Disconnect")}
          </Button>
        </ActionsBar>

        <Alert
          type="info"
          showIcon
          title ={tx("state.ready.authTitle", "Authorization may be required")}
          description={tx(
            "state.ready.authDesc",
            "Open the Sheet → CaseFlow menu → Enable automation (once). After that it runs automatically.",
          )}
        />
      </Space>
    );
  }

  function renderBody() {
    if (!connected) return renderStateConnect();
    if (!sheetId && !sheetUrl) return renderStateCreate();
    if (!scriptUrl) return renderStateInstall();
    return renderStateReady();
  }

  return (
    <Card
      style={{
        borderRadius: 16,
        marginTop: 12,
      }}
      title={
        <Space size={12} align="center">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(135deg, rgba(22,119,255,0.35), rgba(22,119,255,0.08))",
              border: "1px solid rgba(22,119,255,0.25)",
            }}
          >
            <GoogleOutlined />
          </div>

          <div style={{ lineHeight: 1.1 }}>
            <Title level={5} style={{ margin: 0 }}>
              {headerTitle}
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {headerSubtitle}
            </Text>
          </div>
        </Space>
      }
      extra={statusTag}
    >
      {loading ? (
        <Spin />
      ) : (
        <Space orientation="vertical" size={14} style={{ width: "100%" }}>
          {lastError ? (
            <Alert
              type="error"
              showIcon
              title ={tx("errors.uiTitle", "Error")}
              description={<span style={{ whiteSpace: "pre-wrap" }}>{lastError}</span>}
            />
          ) : null}

          <div
            style={{
              padding: isMobile ? 10 : 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
            }}
          >
            <Steps
              current={step}
              orientation={isMobile ? "vertical" : "horizontal"}
              size="small"
              items={stepsItems}
            />
          </div>

          <Divider style={{ margin: "6px 0" }} />

          {renderBody()}
        </Space>
      )}
    </Card>
  );
}

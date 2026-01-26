"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Alert,
  App,
  Button,
  Card,
  Divider,
  Input,
  Modal,
  Space,
  Typography,
  theme,
} from "antd";
import { DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useWorkspace } from "@/contexts";

const { Text, Title } = Typography;

export default function DeleteOrganizationCard({
  orgId,
  orgName,
  disabled = false,
  isMobile = false,
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { token } = theme.useToken();
  const { message } = App.useApp();

  const { refreshWorkspace } = useWorkspace();

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const normalizedOrgName = useMemo(
    () => String(orgName || "").trim(),
    [orgName]
  );

  const canDelete =
    !!orgId &&
    !!normalizedOrgName &&
    confirmText.trim() === normalizedOrgName &&
    !busy &&
    !disabled;

  async function onDelete() {
    if (!orgId) return;

    setBusy(true);
    try {
      // ✅ מומלץ דרך API route (שרת) כדי לשמור על הרשאות
      const res = await fetch("/api/orgs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to delete organization");

      message.success(t("settings.dangerZone.deleteSuccess"));

      setOpen(false);
      setConfirmText("");

      // אחרי מחיקה — נרענן workspace ונזרוק את המשתמש למקום בטוח
      await refreshWorkspace();
      router.replace(`/${locale}/onboarding?refresh=1`);
      router.refresh?.();
    } catch (e) {
      message.error(e?.message || t("settings.dangerZone.deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      style={{
        borderRadius: 16,
        marginTop: 12,
        border: `1px solid ${token.colorErrorBorder || token.colorBorder}`,
        background:
          "linear-gradient(135deg, rgba(255,77,79,0.08), rgba(0,0,0,0))",
      }}
      title={
        <Space size={8}>
          <ExclamationCircleOutlined style={{ color: token.colorError }} />
          <span>{t("settings.dangerZone.title")}</span>
        </Space>
      }
    >
      <Space orientation="vertical" size={6} style={{ width: "100%" }}>
        <Title level={5} style={{ margin: 0 }}>
          {t("settings.dangerZone.deleteOrgTitle")}
        </Title>

        <Text type="secondary" style={{ fontSize: 12 }}>
          {t("settings.dangerZone.deleteOrgHint")}
        </Text>

        <Divider style={{ margin: "10px 0" }} />

        <Alert
          type="warning"
          showIcon
          title ={t("settings.dangerZone.warningTitle")}
          description={
            <Text style={{ fontSize: 12 }}>
              {t("settings.dangerZone.warningBody")}
            </Text>
          }
        />

        <div style={{ marginTop: 10 }}>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => setOpen(true)}
            block={isMobile}
            disabled={disabled || busy || !orgId}
          >
            {t("settings.dangerZone.deleteOrgButton")}
          </Button>
        </div>
      </Space>

      <Modal
        title={t("settings.dangerZone.modalTitle")}
        open={open}
        onCancel={() => {
          if (busy) return;
          setOpen(false);
          setConfirmText("");
        }}
        okText={t("settings.dangerZone.confirmDelete")}
        cancelText={t("common.cancel")}
        okButtonProps={{
          danger: true,
          disabled: !canDelete,
          loading: busy,
        }}
        onOk={onDelete}
        destroyOnHidden={true}
      >
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("settings.dangerZone.typeToConfirm", { orgName: normalizedOrgName })}
          </Text>

          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={normalizedOrgName}
            disabled={busy}
            autoFocus
          />

          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("settings.dangerZone.modalHint")}
          </Text>
        </Space>
      </Modal>
    </Card>
  );
}

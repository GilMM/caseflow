"use client";

import { useTranslations } from "next-intl";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { CrownOutlined, DeleteOutlined } from "@ant-design/icons";
import { initials, timeAgo, isOnline } from "./users.utils";

const { Text } = Typography;

export default function MemberCard({
  r,
  ownerUserId,
  sessionUserId,
  membersUpdating,
  orgId,
  onChangeMemberRole,
  onRemoveMember,
}) {
  const t = useTranslations();
  const label =
    (r?.full_name || r?.email || t("settings.users.user"))?.trim?.() ||
    r?.email ||
    t("settings.users.user");
  const sub = r?.email || "—";
  const isOwnerRow = !!ownerUserId && r?.user_id === ownerUserId;
  const disableEdit =
    membersUpdating || r.user_id === sessionUserId || isOwnerRow;
  const online = isOnline(r?.presence_last_seen_at || r?.last_sign_in_at);

  return (
    <Card size="small" style={{ borderRadius: 14 }}>
      <Space orientation="vertical" size={10} style={{ width: "100%" }}>
        <Space align="start" size={12} style={{ width: "100%" }}>
          <Avatar src={r?.avatar_url || undefined}>{initials(label)}</Avatar>

          <div style={{ flex: 1, minWidth: 0 }}>
            <Space orientation="vertical" size={2} style={{ width: "100%" }}>
              <Space wrap size={8}>
                <Text strong style={{ fontSize: 14, wordBreak: "break-word" }}>
                  {label}
                </Text>
                {isOwnerRow ? (
                  <Tag icon={<CrownOutlined />} color="gold">
                    {t("settings.users.owner")}
                  </Tag>
                ) : null}
              </Space>

              <Text
                type="secondary"
                style={{ fontSize: 12, wordBreak: "break-word" }}
              >
                {sub}
              </Text>

              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("settings.users.joined")} {timeAgo(r?.created_at, t)}
              </Text>
            </Space>
          </div>
        </Space>

        <Divider style={{ margin: "6px 0" }} />

        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("settings.users.role")}
            </Text>
            <Select
              value={r?.role}
              style={{ width: "100%" }}
              disabled={disableEdit}
              options={[
                { value: "admin", label: t("settings.users.admin_role") },
                { value: "agent", label: t("settings.users.agent_role") },
                { value: "viewer", label: t("settings.users.viewer_role") },
              ]}
              onChange={(role) => onChangeMemberRole(orgId, r.user_id, role)}
            />
            {disableEdit ? (
              <Text
                type="secondary"
                style={{ fontSize: 11, display: "block", marginTop: 6 }}
              >
                {isOwnerRow
                  ? t("settings.users.ownerProtected")
                  : r.user_id === sessionUserId
                    ? t("settings.users.cantChangeSelf")
                    : t("settings.users.updating")}
              </Text>
            ) : null}
          </div>

          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("settings.users.lastSeen")}
            </Text>
            {online ? (
              <Tag color="green">{t("settings.users.online")}</Tag>
            ) : r?.presence_last_seen_at || r?.last_sign_in_at ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {timeAgo(r.presence_last_seen_at || r.last_sign_in_at, t)}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("settings.users.neverLoggedIn")}
              </Text>
            )}
          </Space>

          {!isOwnerRow && (
            <Popconfirm
              title={t("settings.users.removeConfirm")}
              description={t("settings.users.removeConfirmDesc")}
              onConfirm={() => onRemoveMember(orgId, r.user_id)}
              okText={t("common.yes")}
              cancelText={t("common.no")}
              disabled={disableEdit}
            >
              <Button
                type="text"
                danger
                block
                icon={<DeleteOutlined />}
                disabled={disableEdit}
                style={{ marginTop: 8 }}
              >
                {t("settings.users.removeMember")}
              </Button>
            </Popconfirm>
          )}
        </Space>
      </Space>
    </Card>
  );
}

import React from "react";
import {
  Avatar,
  Button,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { CrownOutlined, DeleteOutlined } from "@ant-design/icons";
import { initials, timeAgo, isOnline } from "./users.utils";

const { Text } = Typography;

export function buildMembersColumns({
  t,
  ownerUserId,
  membersUpdating,
  sessionUserId,
  orgId,
  onChangeMemberRole,
  onRemoveMember,
}) {
  return [
    {
      title: t("settings.users.user"),
      dataIndex: "email",
      render: (_, r) => {
        const label =
          (r?.full_name || r?.email || t("settings.users.user"))?.trim?.() ||
          r?.email ||
          t("settings.users.user");
        const sub = r?.email || "—";
        const isOwnerRow = !!ownerUserId && r?.user_id === ownerUserId;

        return (
          <Space>
            <Avatar src={r?.avatar_url || undefined}>{initials(label)}</Avatar>

            <Space orientation="vertical" size={0}>
              <Space size={8} wrap>
                <Text strong>{label}</Text>
                {isOwnerRow ? (
                  <Tag icon={<CrownOutlined />} color="gold">
                    {t("settings.users.owner")}
                  </Tag>
                ) : null}
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {sub}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: t("settings.users.role"),
      dataIndex: "role",
      width: 180,
      render: (v, r) => {
        const isOwnerRow = !!ownerUserId && r?.user_id === ownerUserId;
        const disableEdit =
          membersUpdating || r.user_id === sessionUserId || isOwnerRow;

        return (
          <Select
            value={v}
            style={{ width: 160 }}
            disabled={disableEdit}
            options={[
              { value: "admin", label: t("settings.users.admin_role") },
              { value: "agent", label: t("settings.users.agent_role") },
              { value: "viewer", label: t("settings.users.viewer_role") },
            ]}
            onChange={(role) => onChangeMemberRole(orgId, r.user_id, role)}
          />
        );
      },
    },
    {
      title: t("settings.users.lastSeen"),
      dataIndex: "last_sign_in_at", // אפשר להשאיר ככה, כי אנחנו לא באמת משתמשים ב-v לבד
      width: 160,
      render: (v, r) => {
        const lastSeen = r?.presence_last_seen_at || v; // presence קודם, ואז last_sign_in_at
        const online = isOnline(lastSeen);

        if (online) {
          return <Tag color="green">{t("settings.users.online")}</Tag>;
        }
        if (!lastSeen) {
          return (
            <Text type="secondary">{t("settings.users.neverLoggedIn")}</Text>
          );
        }
        return <Text type="secondary">{timeAgo(lastSeen, t)}</Text>;
      },
    },

    {
      title: t("settings.users.joined"),
      dataIndex: "created_at",
      width: 140,
      render: (v) => <Text type="secondary">{timeAgo(v, t)}</Text>,
    },
    {
      title: t("settings.users.actions"),
      key: "actions",
      width: 100,
      render: (_, r) => {
        const isOwnerRow = !!ownerUserId && r?.user_id === ownerUserId;
        const isSelf = r.user_id === sessionUserId;
        const disableRemove = membersUpdating || isSelf || isOwnerRow;

        if (isOwnerRow) return null;

        return (
          <Popconfirm
            title={t("settings.users.removeConfirm")}
            description={t("settings.users.removeConfirmDesc")}
            onConfirm={() => onRemoveMember(orgId, r.user_id)}
            okText={t("common.yes")}
            cancelText={t("common.no")}
            disabled={disableRemove}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              disabled={disableRemove}
            />
          </Popconfirm>
        );
      },
    },
  ];
}

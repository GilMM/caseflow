import React from "react";
import { Avatar, Select, Space, Switch, Tag, Typography } from "antd";
import { CrownOutlined } from "@ant-design/icons";
import { initials, timeAgo } from "./users.utils";

const { Text } = Typography;

export function buildMembersColumns({
  t,
  ownerUserId,
  membersUpdating,
  sessionUserId,
  orgId,
  onChangeMemberRole,
  onToggleMemberActive,
}) {
  return [
    {
      title: t("settings.users.user"),
      dataIndex: "email",
      render: (_, r) => {
        const label = ((r?.full_name || r?.email || t("settings.users.user"))?.trim?.() || r?.email || t("settings.users.user"));
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
        const disableEdit = membersUpdating || r.user_id === sessionUserId || isOwnerRow;

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
      title: t("settings.users.active"),
      dataIndex: "is_active",
      width: 140,
      render: (v, r) => {
        const isOwnerRow = !!ownerUserId && r?.user_id === ownerUserId;
        const disableEdit = membersUpdating || r.user_id === sessionUserId || isOwnerRow;

        return (
          <Switch
            checked={!!v}
            disabled={disableEdit}
            onChange={(checked) => onToggleMemberActive(orgId, r.user_id, checked)}
          />
        );
      },
    },
    {
      title: t("settings.users.joined"),
      dataIndex: "created_at",
      width: 140,
      render: (v) => <Text type="secondary">{timeAgo(v, t)}</Text>,
    },
  ];
}

import React from "react";
import { Avatar, Select, Space, Switch, Tag, Typography } from "antd";
import { CrownOutlined } from "@ant-design/icons";
import { initials, timeAgo } from "./users.utils";

const { Text } = Typography;

export function buildMembersColumns({
  ownerUserId,
  membersUpdating,
  sessionUserId,
  orgId,
  onChangeMemberRole,
  onToggleMemberActive,
}) {
  return [
    {
      title: "User",
      dataIndex: "email",
      render: (_, r) => {
        const label = ((r?.full_name || r?.email || "User")?.trim?.() || r?.email || "User");
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
                    Owner
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
      title: "Role",
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
              { value: "admin", label: "Admin" },
              { value: "agent", label: "Agent" },
              { value: "viewer", label: "Viewer" },
            ]}
            onChange={(role) => onChangeMemberRole(orgId, r.user_id, role)}
          />
        );
      },
    },
    {
      title: "Active",
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
      title: "Joined",
      dataIndex: "created_at",
      width: 140,
      render: (v) => <Text type="secondary">{timeAgo(v)}</Text>,
    },
  ];
}

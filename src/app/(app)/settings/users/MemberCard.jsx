"use client";

import { Avatar, Card, Divider, Select, Space, Switch, Tag, Typography } from "antd";
import { CrownOutlined } from "@ant-design/icons";
import { initials, timeAgo } from "./users.utils";

const { Text } = Typography;

export default function MemberCard({
  r,
  ownerUserId,
  sessionUserId,
  membersUpdating,
  orgId,
  onChangeMemberRole,
  onToggleMemberActive,
}) {
  const label = ((r?.full_name || r?.email || "User")?.trim?.() || r?.email || "User");
  const sub = r?.email || "—";
  const isOwnerRow = !!ownerUserId && r?.user_id === ownerUserId;
  const disableEdit = membersUpdating || r.user_id === sessionUserId || isOwnerRow;
  const isActive = !!r?.is_active;

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
                    Owner
                  </Tag>
                ) : null}
              </Space>

              <Text type="secondary" style={{ fontSize: 12, wordBreak: "break-word" }}>
                {sub}
              </Text>

              <Text type="secondary" style={{ fontSize: 12 }}>
                Joined {timeAgo(r?.created_at)}
              </Text>
            </Space>
          </div>
        </Space>

        <Divider style={{ margin: "6px 0" }} />

        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Role
            </Text>
            <Select
              value={r?.role}
              style={{ width: "100%" }}
              disabled={disableEdit}
              options={[
                { value: "admin", label: "Admin" },
                { value: "agent", label: "Agent" },
                { value: "viewer", label: "Viewer" },
              ]}
              onChange={(role) => onChangeMemberRole(orgId, r.user_id, role)}
            />
            {disableEdit ? (
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 6 }}>
                {isOwnerRow
                  ? "Owner is protected"
                  : r.user_id === sessionUserId
                  ? "You can’t change yourself"
                  : "Updating…"}
              </Text>
            ) : null}
          </div>

          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space size={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Active
              </Text>
              <Tag color={isActive ? "green" : "default"}>{isActive ? "Active" : "Inactive"}</Tag>
            </Space>

            <Switch
              checked={isActive}
              disabled={disableEdit}
              onChange={(checked) => onToggleMemberActive(orgId, r.user_id, checked)}
            />
          </Space>
        </Space>
      </Space>
    </Card>
  );
}

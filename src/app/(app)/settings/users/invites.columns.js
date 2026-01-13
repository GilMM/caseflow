import React from "react";
import { Button, Popconfirm, Space, Tag, Tooltip, Typography } from "antd";
import { CopyOutlined, StopOutlined } from "@ant-design/icons";
import { inviteLinkFromToken, inviteStatusTag, timeAgo } from "./users.utils";

const { Text } = Typography;

export function buildInvitesColumns({ message, onRevokeInvite }) {
  return [
    {
      title: "Email",
      dataIndex: "email",
      width: 260,
      render: (v) => <Text>{v}</Text>,
    },
    {
      title: "Role",
      dataIndex: "role",
      width: 120,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Status",
      width: 140,
      render: (_, r) => inviteStatusTag(r),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      width: 140,
      render: (v) => <Text type="secondary">{timeAgo(v)}</Text>,
    },
    {
      title: "",
      width: 140,
      align: "right",
      render: (_, r) => {
        const disabled = !!r.accepted_at;

        return (
          <Space>
            <Tooltip title="Copy invite link">
              <Button
                size="small"
                icon={<CopyOutlined />}
                disabled={disabled}
                onClick={async () => {
                  const link = inviteLinkFromToken(r.token);
                  await navigator.clipboard.writeText(link);
                  message.success("Link copied");
                }}
              />
            </Tooltip>

            <Popconfirm
              title="Revoke invite?"
              okText="Revoke"
              cancelText="Cancel"
              onConfirm={() => onRevokeInvite(r.id)}
              disabled={disabled}
            >
              <Tooltip title="Revoke invite">
                <Button size="small" danger icon={<StopOutlined />} disabled={disabled} />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];
}

import React from "react";
import { Button, Popconfirm, Space, Tag, Tooltip, Typography } from "antd";
import { CopyOutlined, StopOutlined } from "@ant-design/icons";
import { inviteLinkFromToken, inviteStatusTag, timeAgo } from "./users.utils";

const { Text } = Typography;

export function buildInvitesColumns({ t, message, onRevokeInvite }) {
  return [
    {
      title: t("settings.users.email"),
      dataIndex: "email",
      width: 260,
      render: (v) => <Text>{v}</Text>,
    },
    {
      title: t("settings.users.role"),
      dataIndex: "role",
      width: 120,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: t("settings.users.status"),
      width: 140,
      render: (_, r) => inviteStatusTag(r, t),
    },
    {
      title: t("settings.users.created"),
      dataIndex: "created_at",
      width: 140,
      render: (v) => <Text type="secondary">{timeAgo(v, t)}</Text>,
    },
    {
      title: "",
      width: 140,
      align: "right",
      render: (_, r) => {
        const disabled = !!r.accepted_at;

        return (
          <Space>
            <Tooltip title={t("settings.users.copyInviteLink")}>
              <Button
                size="small"
                icon={<CopyOutlined />}
                disabled={disabled}
                onClick={async () => {
                  const link = inviteLinkFromToken(r.token);
                  await navigator.clipboard.writeText(link);
                  message.success(t("settings.users.linkCopied"));
                }}
              />
            </Tooltip>

            <Popconfirm
              title={t("settings.users.revokeConfirm")}
              okText={t("settings.users.revoke")}
              cancelText={t("common.cancel")}
              onConfirm={() => onRevokeInvite(r.id)}
              disabled={disabled}
            >
              <Tooltip title={t("settings.users.revokeInvite")}>
                <Button size="small" danger icon={<StopOutlined />} disabled={disabled} />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];
}

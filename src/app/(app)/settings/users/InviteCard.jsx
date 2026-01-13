"use client";

import { Button, Card, Divider, Popconfirm, Space, Tag, Typography } from "antd";
import { CopyOutlined, StopOutlined } from "@ant-design/icons";
import { inviteLinkFromToken, inviteStatusTag, timeAgo } from "./users.utils";

const { Text } = Typography;

export default function InviteCard({ r, onRevokeInvite, message }) {
  const disabled = !!r.accepted_at;
  const link = inviteLinkFromToken(r.token);

  return (
    <Card size="small" style={{ borderRadius: 14 }}>
      <Space orientation="vertical" size={10} style={{ width: "100%" }}>
        <Space orientation="vertical" size={2} style={{ width: "100%" }}>
          <Text strong style={{ fontSize: 14, wordBreak: "break-word" }}>
            {r.email}
          </Text>
          <Space wrap size={8}>
            <Tag>{r.role}</Tag>
            {inviteStatusTag(r)}
            <Text type="secondary" style={{ fontSize: 12 }}>
              Created {timeAgo(r.created_at)}
            </Text>
          </Space>
        </Space>

        <Divider style={{ margin: "6px 0" }} />

        <Space orientation="vertical" size={8} style={{ width: "100%" }}>
          <Button
            icon={<CopyOutlined />}
            disabled={disabled}
            block
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                message.success("Link copied");
              } catch {
                message.info("Couldn’t copy automatically. Copy from desktop browser.");
              }
            }}
          >
            Copy invite link
          </Button>

          <Popconfirm
            title="Revoke invite?"
            okText="Revoke"
            cancelText="Cancel"
            onConfirm={() => onRevokeInvite(r.id)}
            disabled={disabled}
          >
            <Button danger icon={<StopOutlined />} disabled={disabled} block>
              Revoke
            </Button>
          </Popconfirm>

          {!disabled ? (
            <Text type="secondary" style={{ fontSize: 12, wordBreak: "break-word" }}>
              {link}
            </Text>
          ) : null}
        </Space>
      </Space>
    </Card>
  );
}

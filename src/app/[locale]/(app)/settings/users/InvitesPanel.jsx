"use client";

import { Button, Card, Divider, Form, Input, Select, Space, Table, Typography } from "antd";
import { MailOutlined, PlusOutlined } from "@ant-design/icons";
import InviteCard from "./InviteCard";

const { Text } = Typography;

export default function InvitesPanel({
  t,
  invites,
  invitesLoading,
  invitesColumns,
  onCreateInvite,
  creatingInvite,
  isMobile,
  onRevokeInvite,
  message,
}) {
  const [inviteForm] = Form.useForm();
if (process.env.NODE_ENV === "development") {
  console.log("useForm created here ↓");
  console.log(new Error().stack);
}
  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        style={{
          borderRadius: 12,
          background: "rgba(0,0,0,0.02)",
        }}
      >
        <Form
          form={inviteForm}
          layout={isMobile ? "vertical" : "inline"}
          onFinish={(values) => onCreateInvite(values, inviteForm)}
          initialValues={{ role: "agent" }}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: t("settings.users.emailRequired") },
              { type: "email", message: t("settings.users.emailInvalid") },
            ]}
            style={isMobile ? { marginBottom: 10 } : undefined}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="user@company.com"
              style={isMobile ? { width: "100%" } : { width: 280 }}
            />
          </Form.Item>

          <Form.Item name="role" style={isMobile ? { marginBottom: 10 } : undefined}>
            <Select
              style={isMobile ? { width: "100%" } : { width: 160 }}
              options={[
                { value: "agent", label: t("settings.users.agent_role") },
                { value: "viewer", label: t("settings.users.viewer_role") },
                { value: "admin", label: t("settings.users.admin_role") },
              ]}
            />
          </Form.Item>

          <Button type="primary" icon={<PlusOutlined />} htmlType="submit" loading={creatingInvite} block={isMobile}>
            {t("settings.users.createInvite")}
          </Button>
        </Form>

        <Divider style={{ margin: "12px 0" }} />

        <Text type="secondary" style={{ fontSize: 12 }}>
          {t("settings.users.inviteTip")}
        </Text>
      </Card>

      {!isMobile ? (
        <Table
          rowKey="id"
          loading={invitesLoading}
          dataSource={invites}
          columns={invitesColumns}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 950 }}
        />
      ) : (
        <Space orientation="vertical" size={10} style={{ width: "100%", opacity: invitesLoading ? 0.7 : 1 }}>
          {(invites || []).length ? (
            invites.map((r) => (
              <InviteCard key={r.id} r={r} onRevokeInvite={onRevokeInvite} message={message} />
            ))
          ) : (
            <Card size="small" style={{ borderRadius: 14 }}>
              <Text type="secondary">{t("settings.users.noInvites")}</Text>
            </Card>
          )}
        </Space>
      )}
    </Space>
  );
}

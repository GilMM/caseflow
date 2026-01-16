// src/app/(app)/settings/_components/OrgSettingsCard.jsx
"use client";

import { useEffect } from "react";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Row,
  Col,
  Space,
  Tag,
  Typography,
  Upload,
} from "antd";
import { EditOutlined, UploadOutlined } from "@ant-design/icons";
import { initials, safeSrc } from "./helpers";

const { Text } = Typography;

export default function OrgSettingsCard({
  workspace,
  orgLogoUrl,
  savingOrg,
  onUploadLogo,
  isMobile,
  form,
  onSaveOrg,
  isOwner,
  logoBust,
}) {
  const orgForm = form;

  useEffect(() => {
    if (!workspace?.orgId) return;

    orgForm.setFieldsValue({
      name: workspace?.orgName || "",
    });
  }, [orgForm, workspace?.orgId, workspace?.orgName]);

  const logoSrc = safeSrc(orgLogoUrl, logoBust);

  return (
    <Card
      style={{ borderRadius: 16, marginTop: 12 }}
      title={
        <Space size={8}>
          <EditOutlined />
          <span>Organization</span>
        </Space>
      }
      extra={<Tag color={isOwner ? "gold" : "blue"}>{isOwner ? "Owner" : "Admin"}</Tag>}
    >
      <Row gutter={[12, 12]} align="middle">
        <Col>
          <Avatar shape="square" size={56} src={logoSrc}>
            {initials(workspace?.orgName || "Org")}
          </Avatar>
        </Col>
        <Col flex="auto" style={{ minWidth: 0 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Update organization name and logo.
          </Text>
        </Col>
      </Row>

      <Divider style={{ margin: "12px 0" }} />

      <Form form={orgForm} layout="vertical" onFinish={onSaveOrg} requiredMark={false}>
        <Form.Item
          name="name"
          label="Organization name"
          rules={[
            { required: true, message: "Name is required" },
            { min: 2, message: "Too short" },
          ]}
        >
          <Input placeholder="e.g., Acme Support" />
        </Form.Item>

        <Form.Item label="Logo">
          <Upload
            accept="image/*"
            showUploadList={false}
            customRequest={async ({ file, onSuccess, onError }) => {
              try {
                await onUploadLogo(file);
                onSuccess?.("ok");
              } catch (e) {
                onError?.(e);
              }
            }}
          >
            <Button icon={<UploadOutlined />} loading={savingOrg} block={isMobile}>
              Upload logo
            </Button>
          </Upload>

          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Stored in Supabase Storage bucket <Text code>org-logos</Text>.
            </Text>
          </div>
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={savingOrg} block={isMobile}>
          Save organization
        </Button>
      </Form>
    </Card>
  );
}

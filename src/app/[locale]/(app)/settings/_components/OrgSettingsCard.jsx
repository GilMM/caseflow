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
  theme,
} from "antd";
import { EditOutlined, UploadOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { initials, safeSrc } from "./helpers";

const { Text } = Typography;

export default function OrgSettingsCard({
  workspace,
  orgLogoUrl,
  savingOrg,
  onUploadLogo,
  isMobile,
  onSaveOrg,
  isOwner,
  logoBust,
}) {
  const t = useTranslations();
  const { token } = theme.useToken();
  const [orgForm] = Form.useForm();

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
          <span>{t("settings.org.title")}</span>
        </Space>
      }
      extra={<Tag color={isOwner ? "gold" : "blue"}>{isOwner ? t("settings.header.owner") : t("settings.users.admin")}</Tag>}
    >
      <Row gutter={[12, 12]} align="middle">
        <Col>
          {logoSrc ? (
            <Avatar shape="square" size={56} src={logoSrc} />
          ) : (
            <Avatar
              shape="square"
              size={56}
              style={{
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {workspace?.orgName?.[0]?.toUpperCase() || "O"}
            </Avatar>
          )}
        </Col>
        <Col flex="auto" style={{ minWidth: 0 }}>
          <Space orientation="vertical" size={0} style={{ width: "100%" }}>
            <Text strong style={{ fontSize: 14, wordBreak: "break-word" }}>
              {workspace?.orgName || "Organization"}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("settings.org.updateHint")}
            </Text>
          </Space>
        </Col>
      </Row>

      <Divider style={{ margin: "12px 0" }} />

      <Form form={orgForm} layout="vertical" onFinish={onSaveOrg} requiredMark={false}>
        <Form.Item
          name="name"
          label={t("settings.org.orgName")}
          rules={[
            { required: true, message: t("settings.org.nameRequired") },
            { min: 2, message: t("settings.org.tooShort") },
          ]}
        >
          <Input placeholder={t("settings.org.placeholder")} maxLength={15} />
        </Form.Item>

        <Form.Item label={t("settings.org.logo")}>
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
              {t("settings.org.uploadLogo")}
            </Button>
          </Upload>

          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("settings.org.storedIn")} <Text code>org-logos</Text>.
            </Text>
          </div>
        </Form.Item>

        <Space wrap style={{ width: "100%" }}>
          <Button onClick={() => orgForm.resetFields()} block={isMobile}>
            {t("common.reset")}
          </Button>
          <Button type="primary" htmlType="submit" loading={savingOrg} block={isMobile}>
            {t("settings.org.saveOrganization")}
          </Button>
        </Space>
      </Form>
    </Card>
  );
}

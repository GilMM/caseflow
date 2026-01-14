// src/app/(app)/settings/_components/ProfileCard.jsx
"use client";

import { useEffect, useMemo } from "react";
import { Avatar, Button, Card, Col, Divider, Form, Input, Row, Space, Typography, Upload } from "antd";
import { UserOutlined, UploadOutlined } from "@ant-design/icons";
import { initials, safeSrc } from "./helpers";

const { Text } = Typography;

export default function ProfileCard({ sessionUser, profile, onSaveProfile, onUploadAvatar, isMobile, form }) {
  const profileForm = form;

  useEffect(() => {
    profileForm?.setFieldsValue({ full_name: profile?.full_name || "" });
  }, [profileForm, profile?.full_name]);

  const userLabel = useMemo(() => {
    const name = profileForm?.getFieldValue("full_name");
    const email = sessionUser?.email;
    return name || email || "Account";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser, profile?.full_name]);

  const avatarUrl = safeSrc(profile?.avatar_url, profile?.updated_at);

  return (
    <Card
      title={
        <Space size={8}>
          <UserOutlined />
          <span>Profile</span>
        </Space>
      }
      style={{ borderRadius: 16 }}
      extra={
        <Text type="secondary" style={{ fontSize: 12, wordBreak: "break-word" }}>
          {sessionUser?.email || ""}
        </Text>
      }
    >
      <Row gutter={[12, 12]} align="middle">
        <Col>
          <Avatar size={56} src={avatarUrl}>
            {initials(userLabel)}
          </Avatar>
        </Col>
        <Col flex="auto" style={{ minWidth: 0 }}>
          <Space orientation ="vertical" size={0} style={{ width: "100%" }}>
            <Text strong style={{ fontSize: 14, wordBreak: "break-word" }}>
              {userLabel}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Update your display name and avatar.
            </Text>
          </Space>
        </Col>
      </Row>

      <Divider style={{ margin: "12px 0" }} />

      <Form form={profileForm} layout="vertical" onFinish={onSaveProfile} requiredMark={false}>
        <Form.Item label="Display name" name="full_name" rules={[{ min: 2, message: "Too short" }]}>
          <Input placeholder="e.g., Gil Meshulami" />
        </Form.Item>

        <Form.Item label="Avatar">
          <Upload
            accept="image/*"
            showUploadList={false}
            customRequest={async ({ file, onSuccess, onError }) => {
              try {
                await onUploadAvatar(file);
                onSuccess?.("ok");
              } catch (e) {
                onError?.(e);
              }
            }}
          >
            <Button icon={<UploadOutlined />} block={isMobile}>
              Upload avatar
            </Button>
          </Upload>

          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Stored in Supabase Storage bucket <Text code>avatars</Text>.
            </Text>
          </div>
        </Form.Item>

        <Space wrap style={{ width: "100%" }}>
          <Button onClick={() => profileForm.resetFields()} block={isMobile}>
            Reset
          </Button>
          <Button type="primary" htmlType="submit" block={isMobile}>
            Save
          </Button>
        </Space>
      </Form>
    </Card>
  );
}

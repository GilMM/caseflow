"use client";

import {
  Alert,
  Avatar,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, ThunderboltOutlined, UserOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { initials } from "@/lib/ui/initials";
import { priorityColor, PRIORITY_OPTIONS } from "@/lib/ui/priority";

const { Text } = Typography;
const { TextArea } = Input;

export default function NewCaseForm({
  router,
  form,
  onSubmit,
  busy,
  error,
  orgId,
  queuesLoading,
  hasQueues,
  queueOptions,
  queueId,
  setQueueId,
  contactsLoading,
  requesterOptions,
  filterOption,
}) {
  const t = useTranslations();
  const priority = Form.useWatch("priority", form);

  const priorityTag = (
    <Tag color={priorityColor(priority || "normal")}>{priority || "normal"}</Tag>
  );

  return (
    <Card title={t("cases.new.caseDetails")} style={{ borderRadius: 16 }}>
      {error ? (
        <Alert
          type="error"
          showIcon
          title={t("cases.new.couldntCreate")}
          description={error}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      {!orgId ? (
        <Alert
          type="warning"
          showIcon
          title={t("cases.new.noWorkspace")}
          description={t("cases.new.noWorkspaceDesc")}
        />
      ) : queuesLoading ? (
        <div style={{ padding: 16, display: "grid", placeItems: "center" }}>
          <span>{t("common.loading")}</span>
        </div>
      ) : !hasQueues ? (
        <Alert
          type="warning"
          showIcon
          title={t("cases.new.noQueues")}
          description={t("cases.new.noQueuesDesc")}
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          // ✅ Don't preselect queue automatically (force manual choice)
          initialValues={{ priority: "normal" }}
        >
          <Form.Item
            label={
              <Space size={8}>
                <span>{t("cases.new.queue")}</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t("common.required")}
                </Text>
              </Space>
            }
            name="queue_id"
            rules={[{ required: true, message: t("cases.new.queueRequired") }]}
          >
            <Select
              loading={queuesLoading}
              options={queueOptions}
              placeholder={t("cases.new.selectQueue")}
              disabled={busy}
              onChange={(v) => {
                setQueueId?.(v); // keep your external state in sync (optional)
                // Form will already store the value because this field is bound to name="queue_id"
              }}
              onClear={() => setQueueId?.(null)}
              allowClear
            />
          </Form.Item>

          <Form.Item label={t("cases.new.requester")} name="requester_contact_id">
            <Select
              allowClear
              showSearch
              loading={contactsLoading}
              placeholder={t("cases.new.selectRequester")}
              options={requesterOptions}
              filterOption={filterOption}
              disabled={busy}
              optionRender={(opt) => {
                const c = opt.data.raw || {};
                const isActive = (c.is_active ?? true) !== false;

                return (
                  <Space align="start" size={10} style={{ width: "100%" }}>
                    <Avatar size="small" icon={<UserOutlined />}>
                      {initials(c.full_name)}
                    </Avatar>

                    <Space orientation="vertical" size={0} style={{ width: "100%" }}>
                      <Space wrap size={8}>
                        <Text strong>{c.full_name || t("common.unnamed")}</Text>
                        {c.department ? <Tag color="geekblue">{c.department}</Tag> : null}
                        {!isActive ? <Tag>{t("common.inactive")}</Tag> : null}
                      </Space>

                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {[c.email, c.phone].filter(Boolean).join(" • ") || t("cases.new.noEmail")}
                      </Text>
                    </Space>
                  </Space>
                );
              }}
              labelRender={(opt) => {
                const c = opt?.raw;
                if (!c) return opt?.label;

                const secondary = [c.email, c.phone].filter(Boolean).join(" • ");
                return (
                  <Space size={8}>
                    <Avatar size="small">{initials(c.full_name)}</Avatar>
                    <span>{c.full_name || t("common.unnamed")}</span>
                    {secondary ? <Text type="secondary">({secondary})</Text> : null}
                  </Space>
                );
              }}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space size={8}>
                <span>{t("cases.new.caseTitle")}</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t("common.required")}
                </Text>
              </Space>
            }
            name="title"
            rules={[
              { required: true, message: t("cases.new.titleRequired") },
              { min: 3, message: t("cases.new.titleMinLength") },
            ]}
          >
            <Input
              placeholder={t("cases.new.titlePlaceholder")}
              maxLength={120}
              showCount
              disabled={busy}
            />
          </Form.Item>

          <Form.Item label={t("cases.new.description")} name="description">
            <TextArea
              placeholder={t("cases.new.descriptionPlaceholder")}
              rows={6}
              disabled={busy}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space size={8}>
                <span>{t("cases.new.priority")}</span>
                {priorityTag}
              </Space>
            }
            name="priority"
            rules={[{ required: true, message: t("cases.new.priorityRequired") }]}
          >
            <Select
              options={PRIORITY_OPTIONS}
              disabled={busy}
              optionRender={(opt) => (
                <Space>
                  {opt.data.value === "urgent" ? <ThunderboltOutlined /> : null}
                  <span>{opt.data.label}</span>
                  <Tag color={priorityColor(opt.data.value)} style={{ marginInlineStart: 8 }}>
                    {opt.data.value}
                  </Tag>
                </Space>
              )}
            />
          </Form.Item>

          <Space style={{ marginTop: 6 }}>
            <Button onClick={() => router.push("/cases")} disabled={busy}>
              {t("common.cancel")}
            </Button>

            <Button
              type="primary"
              htmlType="submit"
              loading={busy}
              icon={<PlusOutlined />}
              disabled={!orgId || !hasQueues}
            >
              {t("cases.new.createCase")}
            </Button>
          </Space>
        </Form>
      )}
    </Card>
  );
}

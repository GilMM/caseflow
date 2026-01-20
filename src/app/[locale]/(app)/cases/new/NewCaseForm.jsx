"use client";

import { useMemo, useState } from "react";
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
  Tooltip,
  message,
  App,
} from "antd";
import {
  PlusOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
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
  locale, // ✅ חדש: נעביר locale כדי שה-API ידע
}) {
  const t = useTranslations();
  const priority = Form.useWatch("priority", form) || "normal";

  const [aiFixing, setAiFixing] = useState(false);

  // ✅ translate priority options using messages: cases.priority.low/normal/high/urgent
  const priorityOptions = PRIORITY_OPTIONS.map((o) => ({
    ...o,
    label: t(`cases.priority.${o.value}`),
  }));

  const priorityTag = (
    <Tag color={priorityColor(priority)}>{t(`cases.priority.${priority}`)}</Tag>
  );
  const { message } = App.useApp();
  const [fixing, setFixing] = useState(false);

  async function onFixSpelling() {
    try {
      setFixing(true);

      const title = form.getFieldValue("title") || "";
      const description = form.getFieldValue("description") || "";

      const res = await fetch("/api/ai/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          locale: "he", // או locale מה־context שלך
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Spellcheck failed");

      if (!data.changedTitle && !data.changedDescription) {
        message.info("No changes");
        return;
      }

      form.setFieldsValue({
        title: data.correctedTitle,
        description: data.correctedDescription,
      });

      message.success("Fixed");
    } catch (e) {
      message.error(e?.message || "Failed");
    } finally {
      setFixing(false);
    }
  }

  async function fixSpelling() {
    try {
      const values = form.getFieldsValue(["title", "description"]);
      const title = (values?.title || "").trim();
      const description = (values?.description || "").trim();

      if (!title && !description) {
        message.info(t("common.nothingToFix") || "Nothing to fix");
        return;
      }

      setAiFixing(true);

      const res = await fetch("/api/ai/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          locale: locale || "he",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "AI spellcheck failed");
      }

      const nextTitle = data?.title ?? title;
      const nextDesc = data?.description ?? description;

      const changed = nextTitle !== title || nextDesc !== description;

      form.setFieldsValue({
        title: nextTitle,
        description: nextDesc,
      });

      message.success(
        changed
          ? t("common.fixed") || "Fixed"
          : t("common.noChanges") || "No changes",
      );
    } catch (e) {
      message.error(e?.message || "Failed");
    } finally {
      setAiFixing(false);
    }
  }

  // כפתור קטן ליד שדות טקסט — מקצועי ונקי
  const FixButton = (
    <Tooltip
      title={
        t("cases.new.aiFixTooltip") ||
        "Fix spelling & minor grammar (Hebrew/English). Does not rewrite."
      }
    >
      <Button onClick={onFixSpelling} loading={fixing}>
        Fix spelling
      </Button>
    </Tooltip>
  );

  return (
    <Card
      title={t("cases.new.caseDetails")}
      extra={FixButton}
      style={{ borderRadius: 16 }}
    >
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
              onChange={(v) => setQueueId?.(v)}
              onClear={() => setQueueId?.(null)}
              allowClear
            />
          </Form.Item>

          <Form.Item
            label={t("cases.new.requester")}
            name="requester_contact_id"
          >
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

                    <Space
                      orientation="vertical"
                      size={0}
                      style={{ width: "100%" }}
                    >
                      <Space wrap size={8}>
                        <Text strong>{c.full_name || t("common.unnamed")}</Text>
                        {c.department ? (
                          <Tag color="geekblue">{c.department}</Tag>
                        ) : null}
                        {!isActive ? <Tag>{t("common.inactive")}</Tag> : null}
                      </Space>

                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {[c.email, c.phone].filter(Boolean).join(" • ") ||
                          t("cases.new.noEmail")}
                      </Text>
                    </Space>
                  </Space>
                );
              }}
              labelRender={(opt) => {
                const c = opt?.raw;
                if (!c) return opt?.label;

                const secondary = [c.email, c.phone]
                  .filter(Boolean)
                  .join(" • ");
                return (
                  <Space size={8}>
                    <Avatar size="small">{initials(c.full_name)}</Avatar>
                    <span>{c.full_name || t("common.unnamed")}</span>
                    {secondary ? (
                      <Text type="secondary">({secondary})</Text>
                    ) : null}
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
            rules={[
              { required: true, message: t("cases.new.priorityRequired") },
            ]}
          >
            <Select
              options={priorityOptions}
              disabled={busy}
              optionRender={(opt) => (
                <Space>
                  {opt.data.value === "urgent" ? <ThunderboltOutlined /> : null}
                  <span>{t(`cases.priority.${opt.data.value}`)}</span>
                  <Tag
                    color={priorityColor(opt.data.value)}
                    style={{ marginInlineStart: 8 }}
                  >
                    {t(`cases.priority.${opt.data.value}`)}
                  </Tag>
                </Space>
              )}
            />
          </Form.Item>

          <Space style={{ marginTop: 6 }}>
            <Button
              onClick={() => router.push("/cases")}
              disabled={busy || aiFixing}
            >
              {t("common.cancel")}
            </Button>

            <Button
              type="primary"
              htmlType="submit"
              loading={busy}
              icon={<PlusOutlined />}
              disabled={!orgId || !hasQueues || aiFixing}
            >
              {t("cases.new.createCase")}
            </Button>
          </Space>
        </Form>
      )}
    </Card>
  );
}

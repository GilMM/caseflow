"use client";

import { useEffect, useRef, useState } from "react";
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
  Upload,
  App,
} from "antd";
import {
  DeleteOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { initials } from "@/lib/ui/initials";
import { priorityColor, PRIORITY_OPTIONS } from "@/lib/ui/priority";

const { Text } = Typography;
const { TextArea } = Input;

/**
 * Visual queue members selector with tags (MULTI SELECT)
 * - click: toggle select
 * - close: exclude (removes from selection too)
 * - hidden chips: click to include (adds back + selects)
 */
function QueueMembersTags({
  members,
  excludedMembers = [],
  selectedIds = [],
  onToggle,
  onExclude,
  onInclude,
  disabled,
  t,
}) {
  const visibleMembers = members.filter((m) => !excludedMembers.includes(m.user_id));
  const hiddenMembers = members.filter((m) => excludedMembers.includes(m.user_id));

  return (
    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
      {/* Visible members */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {visibleMembers.map((m) => {
          const profile = m.profiles || {};
          const isSelected = selectedIds.includes(m.user_id);

          return (
            <Tag
              key={m.user_id}
              closable
              onClose={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onExclude?.(m.user_id);
              }}
              onClick={() => !disabled && onToggle?.(m.user_id)}
              style={{
                cursor: disabled ? "not-allowed" : "pointer",
                padding: "4px 8px",
                borderRadius: 16,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: isSelected ? "#1677ff" : "rgba(255,255,255,0.08)",
                borderColor: isSelected ? "#1677ff" : "rgba(255,255,255,0.15)",
                color: isSelected ? "#fff" : "inherit",
                transition: "all 0.2s",
                userSelect: "none",
              }}
            >
              <Avatar
                size={20}
                src={profile.avatar_url}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : undefined,
                }}
              >
                {initials(profile.full_name)}
              </Avatar>
              <span style={{ fontSize: 13 }}>
                {profile.full_name || t("common.unnamed")}
              </span>
            </Tag>
          );
        })}
      </div>

      {/* Hidden (excluded) members - show small link to restore */}
      {hiddenMembers.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("cases.new.excludedMembers", { count: hiddenMembers.length })}:
          </Text>
          {hiddenMembers.map((m) => {
            const profile = m.profiles || {};
            return (
              <Tag
                key={m.user_id}
                onClick={() => !disabled && onInclude?.(m.user_id)}
                style={{
                  cursor: disabled ? "not-allowed" : "pointer",
                  padding: "2px 6px",
                  borderRadius: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  opacity: 0.6,
                  fontSize: 11,
                  userSelect: "none",
                }}
              >
                <PlusOutlined style={{ fontSize: 10 }} />
                <span>{profile.full_name || t("common.unnamed")}</span>
              </Tag>
            );
          })}
        </div>
      )}

      {visibleMembers.length === 0 && hiddenMembers.length > 0 && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t("cases.new.allMembersExcluded")}
        </Text>
      )}
    </Space>
  );
}

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
  locale,
  stagedFiles = [],
  onAddStagedFile,
  onRemoveStagedFile,
  queueMembers = [],
  queueMembersLoading = false,
  excludedMembers = [],
  onExcludeMember,
  onIncludeMember,
}) {
  const t = useTranslations();

  const priority = Form.useWatch("priority", form) || "normal";
  const eligibleUserIds = Form.useWatch("eligible_user_ids", form) || [];

  const [aiFixing, setAiFixing] = useState(false);

  // used to initialize "select all" once per queue
  const initializedQueueRef = useRef(null);

  const priorityOptions = PRIORITY_OPTIONS.map((o) => ({
    ...o,
    label: t(`cases.priority.${o.value}`),
  }));

  const priorityTag = (
    <Tag color={priorityColor(priority)}>{t(`cases.priority.${priority}`)}</Tag>
  );

  const { message } = App.useApp();

  // ✅ Default: when queue members load for a selected queue => select ALL (except excluded)
  useEffect(() => {
    if (!queueId) return;
    if (queueMembersLoading) return;
    if (!Array.isArray(queueMembers) || queueMembers.length === 0) return;

    // prevent re-initializing for same queue
    if (initializedQueueRef.current === queueId) return;

    const defaultIds = queueMembers
      .map((m) => m.user_id)
      .filter((id) => !excludedMembers.includes(id));

    form.setFieldsValue({ eligible_user_ids: defaultIds });
    initializedQueueRef.current = queueId;
  }, [queueId, queueMembersLoading, queueMembers, excludedMembers, form]);

  // ✅ Safety: if excludedMembers changes, make sure we never keep an excluded user selected
  useEffect(() => {
    const current = form.getFieldValue("eligible_user_ids") || [];
    const cleaned = current.filter((id) => !excludedMembers.includes(id));
    if (cleaned.length !== current.length) {
      form.setFieldsValue({ eligible_user_ids: cleaned });
    }
  }, [excludedMembers, form]);

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

      const nextTitle = data?.correctedTitle ?? title;
      const nextDesc = data?.correctedDescription ?? description;

      const changed = data?.changedTitle || data?.changedDescription;

      form.setFieldsValue({
        title: nextTitle,
        description: nextDesc,
      });

      message.success(
        changed ? t("common.fixed") || "Fixed" : t("common.noChanges") || "No changes",
      );
    } catch (e) {
      message.error(e?.message || "Failed");
    } finally {
      setAiFixing(false);
    }
  }

  const backToCases = () => {
    const loc = locale || "he";
    router.push(`/${loc}/cases`);
  };

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
          initialValues={{
            priority: "normal",
            eligible_user_ids: [],
          }}
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
                initializedQueueRef.current = null; // allow init for new queue
                setQueueId?.(v);
              }}
              onClear={() => {
                initializedQueueRef.current = null;
                setQueueId?.(null);
                form.setFieldsValue({ eligible_user_ids: [] });
              }}
              allowClear
            />
          </Form.Item>

          {/* ✅ Queue Members Multi Selector (default: all selected) */}
          {queueId && (
            <Form.Item
              label={
                <Space size={8}>
                  <span>{t("cases.new.queueMembers")}</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("cases.new.clickToAssign")}
                  </Text>
                </Space>
              }
              name="eligible_user_ids"
              rules={[
                {
                  validator: async (_, value) => {
                    if (!value || value.length === 0) {
                      // make it required for real-world ops
                      throw new Error(t("cases.new.mustSelectAtLeastOneAssignee") || "Select at least one");
                    }
                  },
                },
              ]}
            >
              {queueMembersLoading ? (
                <div style={{ padding: "8px 0" }}>
                  <Text type="secondary">{t("common.loading")}</Text>
                </div>
              ) : queueMembers.length === 0 ? (
                <div style={{ padding: "8px 0" }}>
                  <Text type="secondary">{t("cases.new.noQueueMembers")}</Text>
                </div>
              ) : (
                <QueueMembersTags
                  members={queueMembers}
                  excludedMembers={excludedMembers}
                  selectedIds={eligibleUserIds}
                  onToggle={(userId) => {
                    const current = form.getFieldValue("eligible_user_ids") || [];
                    const next = current.includes(userId)
                      ? current.filter((x) => x !== userId)
                      : [...current, userId];
                    form.setFieldsValue({ eligible_user_ids: next });
                  }}
                  onExclude={(userId) => {
                    onExcludeMember?.(userId);
                    const current = form.getFieldValue("eligible_user_ids") || [];
                    if (current.includes(userId)) {
                      form.setFieldsValue({
                        eligible_user_ids: current.filter((x) => x !== userId),
                      });
                    }
                  }}
                  onInclude={(userId) => {
                    onIncludeMember?.(userId);
                    const current = form.getFieldValue("eligible_user_ids") || [];
                    if (!current.includes(userId)) {
                      form.setFieldsValue({ eligible_user_ids: [...current, userId] });
                    }
                  }}
                  disabled={busy}
                  t={t}
                />
              )}
            </Form.Item>
          )}

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
              options={priorityOptions}
              disabled={busy}
              optionRender={(opt) => (
                <Space>
                  {opt.data.value === "urgent" ? <ThunderboltOutlined /> : null}
                  <span>{t(`cases.priority.${opt.data.value}`)}</span>
                  <Tag color={priorityColor(opt.data.value)} style={{ marginInlineStart: 8 }}>
                    {t(`cases.priority.${opt.data.value}`)}
                  </Tag>
                </Space>
              )}
            />
          </Form.Item>

          {/* Attachments */}
          <Form.Item label={t("attachments.title")}>
            <Space orientation="vertical" size={8} style={{ width: "100%" }}>
              {stagedFiles.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                    gap: 8,
                  }}
                >
                  {stagedFiles.map((file, index) => {
                    const isImage = file.type?.startsWith("image/");
                    const previewUrl = isImage ? URL.createObjectURL(file) : null;

                    return (
                      <div
                        key={index}
                        style={{
                          position: "relative",
                          borderRadius: 8,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        {isImage ? (
                          <div style={{ width: "100%", paddingTop: "100%", position: "relative" }}>
                            <img
                              src={previewUrl}
                              alt={file.name}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: 12,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <PaperClipOutlined style={{ fontSize: 24, opacity: 0.5 }} />
                            <Text
                              ellipsis={{ tooltip: file.name }}
                              style={{ fontSize: 11, maxWidth: "100%" }}
                            >
                              {file.name}
                            </Text>
                          </div>
                        )}
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => onRemoveStagedFile(index)}
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            background: "rgba(0,0,0,0.5)",
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <Upload
                accept="image/*,.pdf"
                showUploadList={false}
                beforeUpload={(file) => {
                  const isValidType =
                    file.type.startsWith("image/") || file.type === "application/pdf";
                  if (!isValidType) {
                    message.error(t("attachments.invalidType"));
                    return Upload.LIST_IGNORE;
                  }

                  const isLt10M = file.size / 1024 / 1024 < 10;
                  if (!isLt10M) {
                    message.error(t("attachments.tooLarge"));
                    return Upload.LIST_IGNORE;
                  }

                  if (stagedFiles.length >= 10) {
                    message.error(t("attachments.maxFilesReached", { max: 10 }));
                    return Upload.LIST_IGNORE;
                  }

                  onAddStagedFile(file);
                  return false; // prevent auto upload
                }}
                multiple
                disabled={busy}
              >
                <Button icon={<UploadOutlined />} disabled={busy || stagedFiles.length >= 10}>
                  {t("attachments.addFiles")}
                </Button>
              </Upload>

              {stagedFiles.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t("attachments.stagedCount", { count: stagedFiles.length })}
                </Text>
              )}
            </Space>
          </Form.Item>

          <Space style={{ marginTop: 6 }}>
            <Button onClick={backToCases} disabled={busy || aiFixing}>
              {t("common.cancel")}
            </Button>

            <Tooltip
              title={
                t("cases.new.aiFixTooltip") ||
                "Fix spelling & minor grammar (Hebrew/English). Does not rewrite."
              }
            >
              <Button
                onClick={fixSpelling}
                loading={aiFixing}
                disabled={busy}
                icon={<span style={{ marginInlineEnd: 4 }}>✨</span>}
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 500,
                }}
              >
                {t("cases.new.aiFix")}
              </Button>
            </Tooltip>

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

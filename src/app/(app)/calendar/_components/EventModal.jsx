// src/app/(app)/calendar/_components/EventModal.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Typography,
  Divider,
  Tag,
  Grid,
} from "antd";
import { DeleteOutlined, LinkOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventById,
  updateCalendarEvent,
} from "@/lib/db";

const { Text } = Typography;

function toDayjs(v) {
  if (!v) return null;
  return dayjs(v);
}

export default function EventModal({
  open,
  mode,
  orgId,
  eventId,
  prefill,
  onClose,
  onSaved,
}) {
  const router = useRouter();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form] = Form.useForm();

  const isEdit = mode === "edit";
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    if (!open) return;

    async function init() {
      form.resetFields();

      // Create: use prefill from selection
      if (!isEdit) {
        const start = prefill?.start_at ? toDayjs(prefill.start_at) : dayjs();
        const end = prefill?.end_at
          ? toDayjs(prefill.end_at)
          : start.add(1, "hour");

        form.setFieldsValue({
          title: "",
          description: "",
          location: "",
          case_id: "",
          all_day: !!prefill?.all_day,
          range: [start, end],
          color: "",
        });
        return;
      }

      // Edit: load event
      if (isEdit && eventId) {
        setLoading(true);
        try {
          const row = await getCalendarEventById(eventId);
          form.setFieldsValue({
            title: row.title,
            description: row.description || "",
            location: row.location || "",
            case_id: row.case_id || "",
            all_day: !!row.all_day,
            range: [toDayjs(row.start_at), toDayjs(row.end_at || row.start_at)],
            color: row.color || "",
          });
        } catch (e) {
          message.error(e?.message || "Failed to load event");
        } finally {
          setLoading(false);
        }
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, eventId]);

  const allDay = Form.useWatch("all_day", form);

  async function onSubmit(values) {
    if (!orgId) {
      message.error("No org");
      return;
    }

    const range = values.range || [];
    const startAt = range[0]?.toISOString?.();
    const endAt = range[1]?.toISOString?.();

    if (!values.title?.trim()) {
      message.error("Title is required");
      return;
    }
    if (!startAt) {
      message.error("Start time is required");
      return;
    }

    const payload = {
      title: values.title.trim(),
      description: values.description?.trim() || null,
      location: values.location?.trim() || null,
      caseId: values.case_id?.trim() ? values.case_id.trim() : null,
      startAt,
      endAt: values.all_day ? null : endAt || null,
      allDay: !!values.all_day,
      color: values.color?.trim() || null,
    };

    setSaving(true);
    try {
      if (!isEdit) {
        await createCalendarEvent({ orgId, ...payload });
        message.success("Event created");
      } else {
        await updateCalendarEvent(eventId, {
          title: payload.title,
          description: payload.description,
          location: payload.location,
          case_id: payload.caseId,
          start_at: payload.startAt,
          end_at: payload.endAt,
          all_day: payload.allDay,
          color: payload.color,
        });
        message.success("Event updated");
      }

      onSaved?.();
    } catch (e) {
      console.log("Event save error:", e);
      const msg = e?.message?.includes("row-level security")
        ? "Permission denied (RLS). Check calendar_events policies for case_id nullable support."
        : e?.message || "Failed to save event";
      message.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!eventId) return;
    setSaving(true);
    try {
      await deleteCalendarEvent(eventId);
      message.success("Event deleted");
      onSaved?.();
    } catch (e) {
      console.log("Event delete error:", e);
      const msg = e?.message?.includes("row-level security")
        ? "Permission denied (RLS). Check delete policy for calendar_events."
        : e?.message || "Delete failed";
      message.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const caseId = Form.useWatch("case_id", form);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? "Edit event" : "New event"}
      footer={null}
      confirmLoading={saving}
      destroyOnHidden
      width={isMobile ? "100%" : 520}
      style={isMobile ? { top: 0, padding: 0 } : undefined}
      styles={
        isMobile
          ? { body: { height: "calc(100vh - 56px)", overflow: "auto" } }
          : undefined
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        disabled={loading}
      >
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: "Title is required" }]}
        >
          <Input placeholder="e.g., Customer onboarding call" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Optional notes" />
        </Form.Item>

        <Form.Item name="location" label="Location">
          <Input placeholder="Optional (Zoom / Office / Address)" />
        </Form.Item>

        <Form.Item name="all_day" label="All day" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item
          name="range"
          label={allDay ? "Date range" : "Start / end"}
          rules={[{ required: true, message: "Time range is required" }]}
        >
          <DatePicker.RangePicker
            showTime={!allDay}
            style={{ width: "100%" }}
            format={allDay ? "YYYY-MM-DD" : "YYYY-MM-DD HH:mm"}
          />
        </Form.Item>

        <Form.Item
          name="case_id"
          label={
            <Space size={8}>
              <span>Linked Case ID</span>
              <Tag color="blue">optional</Tag>
            </Space>
          }
          rules={[
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const v = String(value).trim();
                // basic UUID v4-ish check (good enough)
                const ok =
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                    v
                  );
                return ok
                  ? Promise.resolve()
                  : Promise.reject(new Error("Please paste a valid Case UUID"));
              },
            },
          ]}
        >
          <Input placeholder="Paste a Case UUID to link (optional)" />
        </Form.Item>

        <Form.Item name="color" label="Color (optional)">
          <Input placeholder="e.g., #1677ff or 'red' (optional)" />
        </Form.Item>

        <Divider style={{ margin: "12px 0" }} />

        <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
          <Space>
            {isEdit ? (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={onDelete}
                loading={saving}
              >
                Delete
              </Button>
            ) : null}
          </Space>

          <Space>
            {caseId ? (
              <Button
                icon={<LinkOutlined />}
                onClick={() => router.push(`/cases/${caseId}`)}
              >
                Open case
              </Button>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Tip: link an existing case by ID
              </Text>
            )}

            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
            >
              Save
            </Button>
          </Space>
        </Space>
      </Form>
    </Modal>
  );
}

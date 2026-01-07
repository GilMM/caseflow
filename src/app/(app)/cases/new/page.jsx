"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { createCase, getMyWorkspaces } from "@/lib/db";

import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  InboxOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const priorityColor = (p) =>
  ({
    urgent: "red",
    high: "volcano",
    normal: "default",
    low: "cyan",
  }[p] || "default");

export default function NewCasePage() {
  const router = useRouter();
  const [form] = Form.useForm();

  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [orgId, setOrgId] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [queueId, setQueueId] = useState(null);

  const priority = Form.useWatch("priority", form);
  const priorityTag = useMemo(() => {
    const p = priority || "normal";
    return <Tag color={priorityColor(p)}>{p}</Tag>;
  }, [priority]);

  useEffect(() => {
    let mounted = true;

    async function loadDefaults() {
      try {
        setBooting(true);
        setError("");

        // workspace default
        const workspaces = await getMyWorkspaces();
        if (!workspaces?.length) {
          setOrgId(null);
          setOrgName("");
          setQueueId(null);
          return;
        }

        const ws0 = workspaces[0];
        const oId = ws0.org_id;
        const oName = ws0.org_name || ws0.name || "";

        // default queue (optional; may not exist yet)
        const { data: q, error: qErr } = await supabase
          .from("queues")
          .select("id")
          .eq("org_id", oId)
          .eq("is_default", true)
          .maybeSingle();

        // if queues table doesn't exist yet or RLS blocks it, keep queueId null and still allow createCase if it supports null
        if (mounted) {
          setOrgId(oId);
          setOrgName(oName);
          setQueueId(qErr ? null : q?.id || null);

          // set initial form defaults
          form.setFieldsValue({
            title: "",
            description: "",
            priority: "normal",
          });
        }
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to initialize");
      } finally {
        if (mounted) setBooting(false);
      }
    }

    loadDefaults();
    return () => {
      mounted = false;
    };
  }, [form]);

  async function onSubmit(values) {
    setBusy(true);
    setError("");

    try {
      if (!orgId) {
        throw new Error("No workspace selected. Create an org + membership first.");
      }

      const caseId = await createCase({
        orgId,
        queueId, // may be null depending on your schema/logic
        title: values.title.trim(),
        description: values.description?.trim() || "",
        priority: values.priority || "normal",
      });

      message.success("Case created");
      router.push(`/cases/${caseId}`);
    } catch (e) {
      setError(e?.message || "Failed to create case");
    } finally {
      setBusy(false);
    }
  }

  if (booting) {
    return (
      <div style={{ height: "60vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      {/* Header */}
      <Card
        style={{
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(22,119,255,0.08), rgba(0,0,0,0))",
        }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space orientation="vertical" size={2}>
              <Title level={3} style={{ margin: 0 }}>
                New case
              </Title>

              <Space wrap size={8}>
                <Tag icon={<InboxOutlined />}>Create</Tag>
                {orgId ? (
                  <Tag color="blue">Workspace: {orgName || orgId}</Tag>
                ) : (
                  <Tag>Workspace: none</Tag>
                )}
                {queueId ? <Tag color="geekblue">Default queue</Tag> : <Tag>Queue: none</Tag>}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Fill the form and create a case in one click
                </Text>
              </Space>
            </Space>
          </Col>

          <Col>
            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/cases")}>
                Back to cases
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={busy}
                onClick={() => form.submit()}
              >
                Create case
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[12, 12]}>
        {/* Form */}
        <Col xs={24} lg={16}>
          <Card title="Case details" style={{ borderRadius: 16 }}>
            {error ? (
              <Alert
                type="error"
                showIcon
                message="Couldn’t create case"
                description={error}
                style={{ marginBottom: 12 }}
              />
            ) : null}

            {!orgId ? (
              <Alert
                type="warning"
                showIcon
                message="No workspace found"
                description="Create an organization + membership first, then come back to create cases."
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
                      <span>Title</span>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        (required)
                      </Text>
                    </Space>
                  }
                  name="title"
                  rules={[
                    { required: true, message: "Please enter a title" },
                    { min: 3, message: "Title should be at least 3 characters" },
                  ]}
                >
                  <Input
                    placeholder="e.g., Customer can't login after password reset"
                    maxLength={120}
                    showCount
                    disabled={busy}
                  />
                </Form.Item>

                <Form.Item label="Description" name="description">
                  <TextArea
                    placeholder="Add context, steps to reproduce, expected vs actual, etc."
                    rows={6}
                    disabled={busy}
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <Space size={8}>
                      <span>Priority</span>
                      {priorityTag}
                    </Space>
                  }
                  name="priority"
                  rules={[{ required: true, message: "Select a priority" }]}
                >
                  <Select
                    options={priorityOptions}
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
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit" loading={busy} icon={<PlusOutlined />}>
                    Create case
                  </Button>
                </Space>
              </Form>
            )}
          </Card>
        </Col>

        {/* Right rail */}
        <Col xs={24} lg={8}>
          <Card title="Quick tips" style={{ borderRadius: 16 }}>
            <Space orientation="vertical" size={10} style={{ width: "100%" }}>
              <Text>
                • Keep the title short and searchable (like a ticket subject).
              </Text>
              <Text>
                • Put steps + error messages in the description for faster triage.
              </Text>
              <Text>
                • Use <Tag color="red">urgent</Tag> only for escalations.
              </Text>

              <div style={{ height: 1, background: "#f0f0f0", margin: "6px 0" }} />

              <Space direction="vertical" size={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Defaults
                </Text>
                <Space wrap>
                  {orgId ? <Tag color="blue">{orgName || "Workspace"}</Tag> : <Tag>Workspace: none</Tag>}
                  {queueId ? <Tag color="geekblue">Default queue</Tag> : <Tag>Queue: none</Tag>}
                  <Tag color={priorityColor(priority || "normal")}>
                    Priority: {priority || "normal"}
                  </Tag>
                </Space>
              </Space>
            </Space>
          </Card>

          <Card style={{ borderRadius: 16, marginTop: 12 }}>
            <Space orientation="vertical" size={6}>
              <Text strong>Next polish (optional)</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Add “Assign to me” checkbox + auto activity note on create.
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { createCase, getMyWorkspaces } from "@/lib/db";

import {
  Alert,
  App,
  Avatar,
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
} from "antd";
import {
  ArrowLeftOutlined,
  InboxOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UserOutlined,
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

function initials(name) {
  const s = (name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : (parts[0]?.[1] || "");
  return (a + b).toUpperCase() || "?";
}

export default function NewCasePage() {
  const router = useRouter();
  const search = useSearchParams();
  const requesterFromUrl = search.get("requester");

  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [orgId, setOrgId] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [queueId, setQueueId] = useState(null);

  // Contacts for requester dropdown
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const priority = Form.useWatch("priority", form);
  const priorityTag = useMemo(() => {
    const p = priority || "normal";
    return <Tag color={priorityColor(p)}>{p}</Tag>;
  }, [priority]);

  // Load org + default queue
  useEffect(() => {
    let mounted = true;

    async function loadDefaults() {
      try {
        setBooting(true);
        setError("");

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

        const { data: q, error: qErr } = await supabase
          .from("queues")
          .select("id")
          .eq("org_id", oId)
          .eq("is_default", true)
          .maybeSingle();

        if (mounted) {
          setOrgId(oId);
          setOrgName(oName);
          setQueueId(qErr ? null : q?.id || null);

          form.setFieldsValue({
            title: "",
            description: "",
            priority: "normal",
            requester_contact_id: requesterFromUrl || null,
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
  }, [form, requesterFromUrl]);

  // Load contacts list for requester dropdown (scoped to org)
  useEffect(() => {
    let mounted = true;

    async function loadContacts() {
      if (!orgId) {
        setContacts([]);
        return;
      }

      try {
        setContactsLoading(true);

        const { data, error } = await supabase
          .from("contacts")
          .select("id, full_name, email, phone, department, is_active")
          .eq("org_id", orgId)
          .order("is_active", { ascending: false })
          .order("full_name", { ascending: true })
          .limit(500);

        if (error) throw error;

        // Show active first; allow selecting inactive but mark it
        if (mounted) setContacts(data || []);
      } catch (e) {
        if (mounted) setContacts([]);
        message.error(e?.message || "Failed to load contacts");
      } finally {
        if (mounted) setContactsLoading(false);
      }
    }

    loadContacts();
    revealRequesterIfMissing();
    return () => {
      mounted = false;
    };

    // If requesterFromUrl exists but not in the first contacts batch (rare),
    // we still want it to render - we’ll fetch it once.
    async function revealRequesterIfMissing() {
      if (!requesterFromUrl || !orgId) return;
      // if already in list, skip
      if (contacts.some((c) => c.id === requesterFromUrl)) return;

      try {
        const { data, error } = await supabase
          .from("contacts")
          .select("id, full_name, email, phone, department, is_active")
          .eq("org_id", orgId)
          .eq("id", requesterFromUrl)
          .maybeSingle();

        if (error) return;
        if (data) {
          setContacts((prev) => {
            if (prev.some((x) => x.id === data.id)) return prev;
            return [data, ...prev];
          });
        }
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const requesterOptions = useMemo(() => {
    return (contacts || []).map((c) => {
      const isActive = (c.is_active ?? true) !== false;
      const secondary = [c.email, c.phone].filter(Boolean).join(" • ");
      const dept = c.department ? ` • ${c.department}` : "";
      const labelText = `${c.full_name || "Unnamed"}${secondary ? ` — ${secondary}` : ""}${dept}`;

      return {
        value: c.id,
        label: labelText,
        raw: c,
        isActive,
      };
    });
  }, [contacts]);

  const filterOption = (input, option) => {
    const c = option?.raw || {};
    const hay = `${c.full_name || ""} ${c.email || ""} ${c.phone || ""} ${c.department || ""}`.toLowerCase();
    return hay.includes(String(input || "").toLowerCase());
  };

  async function onSubmit(values) {
    setBusy(true);
    setError("");

    try {
      if (!orgId) throw new Error("No workspace selected. Create an org + membership first.");

      const caseId = await createCase({
        orgId,
        queueId,
        title: values.title.trim(),
        description: values.description?.trim() || "",
        priority: values.priority || "normal",
        requesterContactId: values.requester_contact_id || null, // ✅
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
                {orgId ? <Tag color="blue">Workspace: {orgName || orgId}</Tag> : <Tag>Workspace: none</Tag>}
                {queueId ? <Tag color="geekblue">Default queue</Tag> : <Tag>Queue: none</Tag>}
                {requesterFromUrl ? <Tag color="purple">Requester prefilled</Tag> : null}
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
              <Button type="primary" icon={<PlusOutlined />} loading={busy} onClick={() => form.submit()}>
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
              <Alert type="error" showIcon message="Couldn’t create case" description={error} style={{ marginBottom: 12 }} />
            ) : null}

            {!orgId ? (
              <Alert
                type="warning"
                showIcon
                message="No workspace found"
                description="Create an organization + membership first, then come back to create cases."
              />
            ) : (
              <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ priority: "normal" }}>
                {/* ✅ Requester */}
                <Form.Item label="Requester" name="requester_contact_id">
                  <Select
                    allowClear
                    showSearch
                    loading={contactsLoading}
                    placeholder="Select an employee (optional)"
                    options={requesterOptions}
                    filterOption={filterOption}
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
                              <Text strong>{c.full_name || "Unnamed"}</Text>
                              {c.department ? <Tag color="geekblue">{c.department}</Tag> : null}
                              {!isActive ? <Tag>Inactive</Tag> : null}
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {[c.email, c.phone].filter(Boolean).join(" • ") || "No email/phone"}
                            </Text>
                          </Space>
                        </Space>
                      );
                    }}
                    // show selected nicely too
                    labelRender={(opt) => {
                      const c = opt?.raw;
                      if (!c) return opt?.label;
                      const secondary = [c.email, c.phone].filter(Boolean).join(" • ");
                      return (
                        <Space size={8}>
                          <Avatar size="small">{initials(c.full_name)}</Avatar>
                          <span>{c.full_name || "Unnamed"}</span>
                          {secondary ? <Text type="secondary">({secondary})</Text> : null}
                        </Space>
                      );
                    }}
                  />
                </Form.Item>

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
                  <Input placeholder="e.g., VPN not working" maxLength={120} showCount disabled={busy} />
                </Form.Item>

                <Form.Item label="Description" name="description">
                  <TextArea placeholder="Add context, steps to reproduce..." rows={6} disabled={busy} />
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
              <Text>• Keep the title short and searchable.</Text>
              <Text>• Put steps + error messages in the description.</Text>
              <Text>
                • Use <Tag color="red">urgent</Tag> only for escalations.
              </Text>

              <div style={{ height: 1, background: "var(--ant-color-border, #f0f0f0)", margin: "6px 0" }} />

              <Space orientation="vertical" size={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Defaults
                </Text>
                <Space wrap>
                  {orgId ? <Tag color="blue">{orgName || "Workspace"}</Tag> : <Tag>Workspace: none</Tag>}
                  {queueId ? <Tag color="geekblue">Default queue</Tag> : <Tag>Queue: none</Tag>}
                  <Tag color={priorityColor(priority || "normal")}>Priority: {priority || "normal"}</Tag>
                </Space>
              </Space>
            </Space>
          </Card>

          <Card style={{ borderRadius: 16, marginTop: 12 }}>
            <Space orientation="vertical" size={6}>
              <Text strong>Next polish (optional)</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                On create: auto add activity note + “Assign to me”.
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

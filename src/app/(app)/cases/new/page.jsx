"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { createCase, getMyWorkspaces, getActiveWorkspace } from "@/lib/db";

import { App, Col, Form, Row, Space, Spin } from "antd";

import NewCaseHeader from "@/app/(app)/cases/new/NewCaseHeader";
import NewCaseForm from "@/app/(app)/cases/new/NewCaseForm";
import NewCaseSidebar from "@/app/(app)/cases/new/NewCaseSidebar";

export default function NewCasePage() {
  const router = useRouter();
  const search = useSearchParams();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  // optional prefill
  const requesterFromUrl = search.get("requester");
  const queueFromUrl = search.get("queue");

  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [orgId, setOrgId] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [workspace, setWorkspace] = useState(null);

  // queues
  const [queues, setQueues] = useState([]);
  const [queuesLoading, setQueuesLoading] = useState(false);
  const [queueId, setQueueId] = useState(null);

  // contacts
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // watch priority for sidebar tag
  const priority = Form.useWatch("priority", form);

  // 1) Load workspace
  useEffect(() => {
    let mounted = true;

    async function loadWorkspace() {
      try {
        setBooting(true);
        setError("");

        const workspaces = await getMyWorkspaces();
        if (!workspaces?.length) {
          if (!mounted) return;
          setOrgId(null);
          setOrgName("");
          return;
        }

        const ws0 = workspaces[0];
        const oId = ws0.org_id;
        const oName = ws0.org_name || ws0.name || "";

        const ws = await getActiveWorkspace();
        if (!mounted) return;

        setWorkspace(ws);
        setOrgId(oId);
        setOrgName(oName);

        form.setFieldsValue({
          title: "",
          description: "",
          priority: "normal",
          requester_contact_id: requesterFromUrl || null,
        });
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to initialize");
      } finally {
        if (mounted) setBooting(false);
      }
    }

    loadWorkspace();
    return () => {
      mounted = false;
    };
  }, [form, requesterFromUrl]);

  // 2) Load queues + choose default queueId
  useEffect(() => {
    let mounted = true;

    async function loadQueues() {
      if (!orgId) return;

      try {
        setQueuesLoading(true);

        const { data, error } = await supabase
          .from("queues")
          .select("id,name,is_default,created_at")
          .eq("org_id", orgId)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true });

        if (error) throw error;

        const list = data || [];
        if (!mounted) return;

        setQueues(list);

        const fromUrlOk = queueFromUrl && list.some((q) => q.id === queueFromUrl);
        const defaultQ = list.find((q) => q.is_default);
        const firstQ = list[0];

        const chosen = fromUrlOk ? queueFromUrl : defaultQ?.id || firstQ?.id || null;

        setQueueId(chosen);
        form.setFieldsValue({ queue_id: chosen });
      } catch (e) {
        if (mounted) {
          setQueues([]);
          setQueueId(null);
        }
        message.error(e?.message || "Failed to load queues");
      } finally {
        if (mounted) setQueuesLoading(false);
      }
    }

    loadQueues();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // 3) Load contacts
  useEffect(() => {
    let mounted = true;

    async function loadContacts() {
      if (!orgId) {
        if (mounted) setContacts([]);
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

        if (mounted) setContacts(data || []);
      } catch (e) {
        if (mounted) setContacts([]);
        message.error(e?.message || "Failed to load contacts");
      } finally {
        if (mounted) setContactsLoading(false);
      }
    }

    loadContacts();
    return () => {
      mounted = false;
    };
  }, [orgId, message]);

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

  const queueOptions = useMemo(() => {
    return (queues || []).map((q) => ({
      value: q.id,
      label: q.is_default ? `${q.name} (Default)` : q.name,
    }));
  }, [queues]);

  async function onSubmit(values) {
    setBusy(true);
    setError("");

    try {
      if (!orgId) throw new Error("No workspace selected. Create an org + membership first.");

      const selectedQueueId = values.queue_id || queueId;
      if (!selectedQueueId) throw new Error("No queue found. Create at least one queue first.");

      const caseId = await createCase({
        orgId,
        queueId: selectedQueueId,
        title: values.title.trim(),
        description: values.description?.trim() || "",
        priority: values.priority || "normal",
        requesterContactId: values.requester_contact_id || null,
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

  const hasQueues = queues.length > 0;

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      <NewCaseHeader
        router={router}
        form={form}
        busy={busy}
        orgId={orgId}
        workspace={workspace}
        queuesLoading={queuesLoading}
        queueId={queueId}
        requesterFromUrl={requesterFromUrl}
        hasQueues={hasQueues}
      />

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={16}>
          <NewCaseForm
            router={router}
            form={form}
            onSubmit={onSubmit}
            busy={busy}
            error={error}
            orgId={orgId}
            queuesLoading={queuesLoading}
            hasQueues={hasQueues}
            queueOptions={queueOptions}
            queueId={queueId}
            setQueueId={setQueueId}
            contactsLoading={contactsLoading}
            requesterOptions={requesterOptions}
            filterOption={filterOption}
          />
        </Col>

        <Col xs={24} lg={8}>
          <NewCaseSidebar
            orgId={orgId}
            orgName={orgName}
            queueId={queueId}
            priority={priority}
          />
        </Col>
      </Row>
    </Space>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Select, Space, Tag, Typography, message } from "antd";
import { UserOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabase/client";
import { assignCase, getOrgMembers } from "@/lib/db";

const { Text } = Typography;

function shortId(id) {
  if (!id) return "Unassigned";
  return `${String(id).slice(0, 8)}…`;
}

export default function CaseAssignment({ caseId, orgId, assignedTo, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState([]);
  const [me, setMe] = useState(null);
  const [value, setValue] = useState(assignedTo || null);

  useEffect(() => setValue(assignedTo || null), [assignedTo]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setMe(data?.session?.user || null);
    })();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const list = await getOrgMembers(orgId);
        setMembers(list);
      } catch (e) {
        message.error(e.message || "Failed to load members");
      }
    })();
  }, [orgId]);

  function displayName(m) {
    return m.full_name || `${String(m.user_id).slice(0, 8)}…`;
  }
  

  const options = useMemo(() => {
    return members.map((m) => ({
      value: m.user_id,
      label: (
        <Space>
          <UserOutlined />
          <span>{displayName(m)}</span>
          <Tag>{m.role}</Tag>
        </Space>
      ),
    }));
  }, [members]);
  
  async function doAssign(toUserId) {
    if (!toUserId) return;
    setBusy(true);
    try {
      await assignCase({ caseId, orgId, toUserId });
      message.success("Assignment updated");
      onChanged?.();
    } catch (e) {
      message.error(e.message || "Failed to assign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
        <Space>
          <Text strong>Assigned</Text>
          <Tag color={value ? "geekblue" : "default"}>
            {members.find((x) => x.user_id === value)?.full_name
                || (value ? `${String(value).slice(0, 8)}…` : "Unassigned")}
            </Tag>
        </Space>

        <Button
          icon={<ThunderboltOutlined />}
          disabled={!me?.id}
          loading={busy}
          onClick={() => doAssign(me.id)}
        >
          Assign to me
        </Button>
      </Space>

      <Select
        value={value}
        placeholder="Select assignee…"
        options={options}
        onChange={(v) => {
          setValue(v);
          doAssign(v);
        }}
        disabled={busy}
        style={{ width: "100%" }}
        showSearch
        optionFilterProp="value"
      />
      <Text type="secondary" style={{ fontSize: 12 }}>
        MVP note: showing user IDs only (we’ll add profiles for names/emails later).
      </Text>
    </Space>
  );
}

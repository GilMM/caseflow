"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Select, Space, Tag, Typography, message, Grid } from "antd";
import { UserOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabase/client";
import { assignCase, getOrgMembers } from "@/lib/db";

const { Text } = Typography;
const { useBreakpoint } = Grid;

function shortId(id) {
  if (!id) return "Unassigned";
  return `${String(id).slice(0, 8)}…`;
}

export default function CaseAssignment({ caseId, orgId, assignedTo, onChanged }) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
        message.error(e?.message || "Failed to load members");
      }
    })();
  }, [orgId]);

  function displayName(m) {
    return m.full_name || shortId(m.user_id);
  }

  const options = useMemo(() => {
    return members.map((m) => {
      const name = displayName(m);
      // labelText משמש לחיפוש
      const labelText = `${name} ${m.role} ${m.email || ""}`.toLowerCase();

      return {
        value: m.user_id,
        labelText,
        label: (
          <Space>
            <UserOutlined />
            <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </span>
            <Tag>{m.role}</Tag>
          </Space>
        ),
      };
    });
  }, [members]);

  async function doAssign(toUserId) {
    if (!toUserId) return;
    setBusy(true);
    try {
      await assignCase({ caseId, orgId, toUserId });
      message.success("Assignment updated");
      onChanged?.();
    } catch (e) {
      message.error(e?.message || "Failed to assign");
    } finally {
      setBusy(false);
    }
  }

  const assignedLabel =
    members.find((x) => x.user_id === value)?.full_name ||
    (value ? shortId(value) : "Unassigned");

  return (
    <Space orientation="vertical" size={10} style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          flexWrap: "wrap",
        }}
      >
        <Space style={{ minWidth: 0 }}>
          <Text strong>Assigned</Text>
          <Tag
            color={value ? "geekblue" : "default"}
            style={{
              maxWidth: isMobile ? "100%" : 320,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {assignedLabel}
          </Tag>
        </Space>

        <Button
          icon={<ThunderboltOutlined />}
          disabled={!me?.id}
          loading={busy}
          onClick={() => doAssign(me.id)}
          block={isMobile}
        >
          Assign to me
        </Button>
      </div>

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
        optionFilterProp="labelText"
        filterOption={(input, option) =>
          (option?.labelText || "").includes(String(input || "").toLowerCase())
        }
      />

      <Text type="secondary" style={{ fontSize: 12 }}>
        Tip: search by name / role (UUID search is still supported by typing the first chars).
      </Text>
    </Space>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Select, Space, Tag, Typography, message, Grid, Tooltip } from "antd";
import { UserOutlined, ThunderboltOutlined, SwapOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabase/client";
import { assignCase, getOrgMembers } from "@/lib/db";

const { Text } = Typography;
const { useBreakpoint } = Grid;

function shortId(id) {
  if (!id) return "—";
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
        setMembers(list || []);
      } catch (e) {
        message.error(e?.message || "Failed to load members");
      }
    })();
  }, [orgId]);

  function displayName(m) {
    return m.full_name || m.email || shortId(m.user_id);
  }

  const options = useMemo(() => {
    return (members || []).map((m) => {
      const name = displayName(m);
      const labelText = `${name} ${m.role || ""} ${m.email || ""}`.toLowerCase();

      return {
        value: m.user_id,
        labelText,
        label: (
          <Space>
            <UserOutlined />
            <span
              style={{
                maxWidth: 220,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
            {m.role ? <Tag>{m.role}</Tag> : null}
          </Space>
        ),
      };
    });
  }, [members]);

  async function doAssign(toUserId) {
    // allow unassign too:
    setBusy(true);
    try {
      await assignCase({ caseId, toUserId: toUserId || null });
      message.success("Owner updated");
      onChanged?.();
    } catch (e) {
      message.error(e?.message || "Failed to update owner");
    } finally {
      setBusy(false);
    }
  }

  const assignedLabel =
    members.find((x) => x.user_id === value)?.full_name ||
    members.find((x) => x.user_id === value)?.email ||
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
          <Text strong>Owner</Text>
          <Tag
            color={value ? "geekblue" : "default"}
            style={{
              maxWidth: isMobile ? "100%" : 360,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {assignedLabel}
          </Tag>
        </Space>

        <Space wrap>
          <Tooltip title="Assign this case to yourself">
            <Button
              icon={<ThunderboltOutlined />}
              disabled={!me?.id}
              loading={busy}
              onClick={() => doAssign(me?.id)}
              block={isMobile}
            >
              Take ownership
            </Button>
          </Tooltip>

          <Tooltip title="Clear owner (leave unassigned)">
            <Button
              icon={<SwapOutlined />}
              disabled={busy}
              onClick={() => {
                setValue(null);
                doAssign(null);
              }}
              block={isMobile}
            >
              Unassign
            </Button>
          </Tooltip>
        </Space>
      </div>

      <Select
        value={value}
        placeholder="Change owner…"
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
        allowClear
        onClear={() => {
          setValue(null);
          doAssign(null);
        }}
      />

      <Text type="secondary" style={{ fontSize: 12 }}>
        Owner is who is responsible right now. Participants are handled separately.
      </Text>
    </Space>
  );
}

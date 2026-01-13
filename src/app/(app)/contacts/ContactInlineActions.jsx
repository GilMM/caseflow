"use client";

import { Button, Dropdown, Space, Switch, Tooltip } from "antd";
import { EditOutlined, MoreOutlined } from "@ant-design/icons";

export default function ContactInlineActions({
  isMobile,
  isActive,
  onEdit,
  onToggleActive,
  onNewCase,
}) {
  const moreMenu = {
    items: [
      {
        key: "edit",
        label: "Edit",
        icon: <EditOutlined />,
        onClick: onEdit,
      },
      {
        key: "toggle",
        label: isActive ? "Deactivate" : "Activate",
        onClick: () => onToggleActive(!isActive),
      },
    ],
  };

  if (isMobile) {
    return (
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        <Button type="primary" block onClick={onNewCase}>
          New case
        </Button>

        <Space style={{ width: "100%" }}>
          <Dropdown menu={moreMenu} trigger={["click"]} placement="bottomRight">
            <Button icon={<MoreOutlined />} block>
              More
            </Button>
          </Dropdown>

          <Tooltip title="Activate / Deactivate">
            <Switch checked={isActive} onChange={(v) => onToggleActive(v)} />
          </Tooltip>
        </Space>
      </Space>
    );
  }

  return (
    <Space wrap>
      <Tooltip title="Activate / Deactivate">
        <Switch checked={isActive} onChange={(v) => onToggleActive(v)} />
      </Tooltip>

      <Button icon={<EditOutlined />} onClick={onEdit}>
        Edit
      </Button>

      <Button type="primary" onClick={onNewCase}>
        New case
      </Button>
    </Space>
  );
}

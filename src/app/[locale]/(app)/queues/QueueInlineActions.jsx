"use client";

import { Button, Dropdown, Space, Switch, Tooltip } from "antd";
import { EditOutlined, InboxOutlined, MoreOutlined, StarFilled } from "@ant-design/icons";

export default function QueueInlineActions({
  isMobile,
  isActive,
  isDefault,
  onToggleActive,
  onEdit,
  onSetDefault,
  onViewCases,
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
        key: "default",
        label: isDefault ? "Default" : "Set default",
        icon: <StarFilled />,
        disabled: isDefault,
        onClick: onSetDefault,
      },
    ],
  };

  if (isMobile) {
    return (
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        <Button type="primary" icon={<InboxOutlined />} block onClick={onViewCases}>
          View cases
        </Button>

        <Space style={{ width: "100%" }}>
          <Dropdown menu={moreMenu} trigger={["click"]} placement="bottomRight">
            <Button icon={<MoreOutlined />} block>
              More
            </Button>
          </Dropdown>

          {!isDefault ? (
            <Button onClick={onSetDefault} block>
              Set default
            </Button>
          ) : (
            <Button disabled block>
              Default
            </Button>
          )}
        </Space>

        {/* במובייל עדיין נוח להשאיר את הסוויץ’ כאן (כמו שהיה אצלך) */}
        <Tooltip title="Activate / Deactivate queue">
          <Switch checked={isActive} onChange={onToggleActive} />
        </Tooltip>
      </Space>
    );
  }

  return (
    <Space wrap>
      <Tooltip title="Activate / Deactivate queue">
        <Switch checked={isActive} onChange={onToggleActive} />
      </Tooltip>

      {!isDefault ? <Button onClick={onSetDefault}>Set default</Button> : <Button disabled>Default</Button>}

      <Button icon={<EditOutlined />} onClick={onEdit}>
        Edit
      </Button>

      <Button type="primary" icon={<InboxOutlined />} onClick={onViewCases}>
        View cases
      </Button>
    </Space>
  );
}

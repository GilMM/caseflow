"use client";

import { Button, Dropdown, Space, Switch, Tooltip } from "antd";
import { EditOutlined, MoreOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

export default function ContactInlineActions({
  isMobile,
  isActive,
  onEdit,
  onToggleActive,
  onNewCase,
}) {
  const t = useTranslations();

  const moreMenu = {
    items: [
      {
        key: "edit",
        label: t("common.edit"),
        icon: <EditOutlined />,
        onClick: onEdit,
      },
      {
        key: "toggle",
        label: isActive ? t("contacts.actions.deactivate") : t("contacts.actions.activate"),
        onClick: () => onToggleActive(!isActive),
      },
    ],
  };

  if (isMobile) {
    return (
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        <Button type="primary" block onClick={onNewCase}>
          {t("cases.header.newCase")}
        </Button>

        <Space style={{ width: "100%" }}>
          <Dropdown menu={moreMenu} trigger={["click"]} placement="bottomRight">
            <Button icon={<MoreOutlined />} block>
              {t("common.more")}
            </Button>
          </Dropdown>

          <Tooltip title={t("contacts.actions.toggleTooltip")}>
            <Switch checked={isActive} onChange={(v) => onToggleActive(v)} />
          </Tooltip>
        </Space>
      </Space>
    );
  }

  return (
    <Space wrap>
      <Tooltip title={t("contacts.actions.toggleTooltip")}>
        <Switch checked={isActive} onChange={(v) => onToggleActive(v)} />
      </Tooltip>

      <Button icon={<EditOutlined />} onClick={onEdit}>
        {t("common.edit")}
      </Button>

      <Button type="primary" onClick={onNewCase}>
        {t("cases.header.newCase")}
      </Button>
    </Space>
  );
}

"use client";

import { Button, Dropdown, Space, Switch, Tooltip } from "antd";
import { EditOutlined, InboxOutlined, MoreOutlined, StarFilled } from "@ant-design/icons";
import { useTranslations } from "next-intl";

export default function QueueInlineActions({
  isMobile,
  isActive,
  isDefault,
  onToggleActive,
  onEdit,
  onSetDefault,
  onViewCases,
}) {
  const t = useTranslations();

  const moreMenu = {
    items: [
      {
        key: "edit",
        label: t("queues.actions.edit"),
        icon: <EditOutlined />,
        onClick: onEdit,
      },
      {
        key: "default",
        label: isDefault ? t("queues.actions.default") : t("queues.actions.setDefault"),
        icon: <StarFilled />,
        disabled: isDefault,
        onClick: onSetDefault,
      },
    ],
  };

  const toggleTitle = t("queues.actions.toggleActive");

  if (isMobile) {
    return (
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        <Button type="primary" icon={<InboxOutlined />} block onClick={onViewCases}>
          {t("queues.actions.viewCases")}
        </Button>

        <Space style={{ width: "100%" }}>
          <Dropdown menu={moreMenu} trigger={["click"]} placement="bottomRight">
            <Button icon={<MoreOutlined />} block>
              {t("common.more")}
            </Button>
          </Dropdown>

          {!isDefault ? (
            <Button onClick={onSetDefault} block>
              {t("queues.actions.setDefault")}
            </Button>
          ) : (
            <Button disabled block>
              {t("queues.actions.default")}
            </Button>
          )}
        </Space>

        {/* במובייל עדיין נוח להשאיר את הסוויץ’ כאן (כמו שהיה אצלך) */}
        <Tooltip title={toggleTitle}>
          <Switch checked={isActive} onChange={onToggleActive} />
        </Tooltip>
      </Space>
    );
  }

  return (
    <Space wrap>
      <Tooltip title={toggleTitle}>
        <Switch checked={isActive} onChange={onToggleActive} />
      </Tooltip>

      {!isDefault ? (
        <Button onClick={onSetDefault}>{t("queues.actions.setDefault")}</Button>
      ) : (
        <Button disabled>{t("queues.actions.default")}</Button>
      )}

      <Button icon={<EditOutlined />} onClick={onEdit}>
        {t("queues.actions.edit")}
      </Button>

      <Button type="primary" icon={<InboxOutlined />} onClick={onViewCases}>
        {t("queues.actions.viewCases")}
      </Button>
    </Space>
  );
}

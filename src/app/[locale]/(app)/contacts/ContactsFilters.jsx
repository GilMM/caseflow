"use client";

import { Card, Col, Input, Row, Select, Space, Button, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Text } = Typography;

export default function ContactsFilters({
  isMobile,
  q,
  setQ,
  active,
  setActive,
  dept,
  setDept,
  deptOptions,
  onClear,
}) {
  const t = useTranslations();

  return (
    <Card style={{ borderRadius: 16 }}>
      <Row gutter={[10, 10]} align="middle">
        <Col xs={24} md={10}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("contacts.filters.searchPlaceholder")}
            prefix={<SearchOutlined />}
            allowClear
          />
        </Col>

        <Col xs={24} sm={12} md={7}>
          <Select
            value={active}
            onChange={setActive}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: t("contacts.filters.allStates") },
              { value: "active", label: t("contacts.filters.active") },
              { value: "inactive", label: t("contacts.filters.inactive") },
            ]}
          />
        </Col>

        <Col xs={24} sm={12} md={7}>
          <Select
            value={dept}
            onChange={setDept}
            style={{ width: "100%" }}
            options={deptOptions.map((d) => ({
              value: d,
              label: d === "all" ? t("contacts.filters.allDepartments") : d,
            }))}
          />
        </Col>

        <Col xs={24}>
          <Space wrap size={8} style={{ width: "100%", justifyContent: "space-between" }}>
            <Button onClick={onClear}>{t("common.clearFilters")}</Button>

            {!isMobile ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("contacts.filters.hint")}
              </Text>
            ) : null}
          </Space>

          {isMobile ? (
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              {t("contacts.filters.hint")}
            </Text>
          ) : null}
        </Col>
      </Row>
    </Card>
  );
}

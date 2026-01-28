"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
} from "antd";
import { FilterOutlined, ClearOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabase/client";

const { RangePicker } = DatePicker;

export default function ReportFilters({
  reportKey,
  orgId,
  initialValue,
  onApply,
}) {
  const tReports = useTranslations("reports");
  const [form] = Form.useForm();
  const [queues, setQueues] = useState([]);

  useEffect(() => {
    // אנחנו שומרים בפילטרים date_from/date_to, אבל ה-Form משתמש ב-date_range
    // לכן לא מנסים להחזיר date_range מה-state, רק משאירים ריק כברירת מחדל.
    form.setFieldsValue({
      queue_id: initialValue?.queue_id ?? null,
      status: initialValue?.status ?? null,
      priority: initialValue?.priority ?? null,
      search: initialValue?.search ?? "",
      date_range: null,
    });
  }, [initialValue, form]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const { data, error } = await supabase
        .from("queues")
        .select("id,name,is_active")
        .eq("org_id", orgId)
        .order("name", { ascending: true });

      if (!error) setQueues(data || []);
    })();
  }, [orgId]);

  const statusOptions = useMemo(
    () => [
      { value: "new", label: "new" },
      { value: "in_progress", label: "in_progress" },
      { value: "resolved", label: "resolved" },
      { value: "closed", label: "closed" },
    ],
    [],
  );

  const priorityOptions = useMemo(
    () => [
      { value: "low", label: "low" },
      { value: "normal", label: "normal" },
      { value: "high", label: "high" },
      { value: "urgent", label: "urgent" },
    ],
    [],
  );

  const showCaseFilters = reportKey === "cases";

  const apply = () => {
    const v = form.getFieldsValue();

    const range = v.date_range || null;

    // ✅ FIX: range[0] startOf('day'), range[1] endOf('day')
    const date_from = range?.[0] ? range[0].startOf("day").toISOString() : null;

    const date_to = range?.[1] ? range[1].endOf("day").toISOString() : null;

    onApply({
      date_from,
      date_to,
      queue_id: v.queue_id || null,
      status: v.status || null,
      priority: v.priority || null,
      search: v.search || "",
    });
  };

  const clear = () => {
    form.resetFields();
    onApply({
      date_from: null,
      date_to: null,
      queue_id: null,
      status: null,
      priority: null,
      search: "",
    });
  };

  return (
    <Card>
      <Form form={form} layout="vertical" onFinish={apply}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Form.Item label={tReports("filters.dateRange")} name="date_range">
              <RangePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label={tReports("filters.queue")} name="queue_id">
              <Select
                allowClear
                placeholder={tReports("filters.queuePlaceholder")}
                options={queues.map((q) => ({ value: q.id, label: q.name }))}
              />
            </Form.Item>
          </Col>

          {showCaseFilters && (
            <>
              <Col xs={24} md={4}>
                <Form.Item label={tReports("filters.status")} name="status">
                  <Select
                    allowClear
                    placeholder={tReports("filters.statusPlaceholder")}
                    options={statusOptions}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item label={tReports("filters.priority")} name="priority">
                  <Select
                    allowClear
                    placeholder={tReports("filters.priorityPlaceholder")}
                    options={priorityOptions}
                  />
                </Form.Item>
              </Col>
            </>
          )}

          <Col xs={24} md={showCaseFilters ? 12 : 8}>
            <Form.Item label={tReports("filters.search")} name="search">
              <Input
                allowClear
                placeholder={tReports("filters.searchPlaceholder")}
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<FilterOutlined />}
              >
                {tReports("filters.apply")}
              </Button>
              <Button onClick={clear} icon={<ClearOutlined />}>
                {tReports("filters.clear")}
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </Card>
  );
}

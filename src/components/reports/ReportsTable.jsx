"use client";

import { Card, Table } from "antd";

export default function ReportsTable({
  columns,
  rows,
  loading,
  total,
  page,
  pageSize,
  onChange,
}) {
  return (
    <Card
      styles={{
        body: {
          padding: 0, // ✅ עושה את הטבלה "flush" ויפה בתוך הכרטיס
        },
      }}
    >
      <Table
        rowKey={(r) => r.id}
        loading={loading}
        columns={(columns || []).map((c) => ({
          // ✅ ברירת מחדל טובה לכל העמודות
          ellipsis: c.ellipsis ?? true,
          ...c,
        }))}
        dataSource={rows}
        size="middle"
        sticky
        tableLayout="fixed" // ✅ הכי חשוב! מונע מתיחות/בלגן ברוחבים
        scroll={{
          x: "max-content", // ✅ אם יש הרבה עמודות - טוען scroll אופקי במקום "למרוח" הכל
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t, range) => `${range[0]}-${range[1]} / ${t}`,
          position: ["bottomCenter"],
        }}
        onChange={(pagination, _filters, sorter) => {
          onChange({
            page: pagination.current,
            pageSize: pagination.pageSize,
            sorter: Array.isArray(sorter) ? sorter[0] : sorter,
          });
        }}
      />
    </Card>
  );
}

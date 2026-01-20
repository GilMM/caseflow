// src/app/[locale]/(app)/loading.jsx

import { Skeleton, Card, Row, Col } from "antd";

export default function AppLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", padding: 16 }}>
      {/* Header skeleton */}
      <Skeleton active title={{ width: 200 }} paragraph={false} />

      {/* KPI cards skeleton */}
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col key={i} xs={12} sm={6}>
            <Card style={{ borderRadius: 12 }}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Content skeleton */}
      <Card style={{ borderRadius: 12 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </div>
  );
}

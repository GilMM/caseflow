"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CasesPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setError("");
      // כרגע זה יחזיר ריק עד שניצור org + membership + case
      const { data, error } = await supabase
        .from("cases")
        .select("id,title,status,priority,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return setError(error.message);
      setRows(data || []);
    }

    load();
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 10 }}>Cases</h1>
      <button
        onClick={() => router.push("/cases/new")}
        style={{ padding: 10, marginBottom: 12 }}
      >
        + New Case
      </button>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/cases/${c.id}`}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              borderRadius: 12,
              textDecoration: "none",
              color: "black",
            }}
          >
            <div style={{ fontWeight: 700 }}>{c.title}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {c.status} • {c.priority}
            </div>
          </Link>
        ))}
        {!rows.length && !error ? (
          <p>אין עדיין תיקים. עוד רגע ניצור seed.</p>
        ) : null}
      </div>
    </div>
  );
}

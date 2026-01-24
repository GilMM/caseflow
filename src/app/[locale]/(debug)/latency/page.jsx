"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LatencyDebugPage() {
  useEffect(() => {
    async function run() {
      const results = [];

      for (let i = 0; i < 15; i++) {
        const t0 = performance.now();

        const { error } = await supabase
          .from("organizations")
          .select("id")
          .limit(1);

        const ms = Math.round(performance.now() - t0);

        results.push({
          run: i + 1,
          ms,
          ok: !error,
          error: error?.message || null,
        });
      }

      const ok = results.filter(r => r.ok).map(r => r.ms).sort((a,b)=>a-b);
      const avg = ok.reduce((a,b)=>a+b,0) / ok.length;

      console.table(results);
      console.log({
        avg: Math.round(avg),
        p50: ok[Math.floor(ok.length * 0.5)],
        p90: ok[Math.floor(ok.length * 0.9)],
      });
    }

    run();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Supabase Latency Debug</h2>
      <p>Open DevTools → Console</p>
    </div>
  );
}

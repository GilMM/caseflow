"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCase, getMyWorkspaces } from "@/lib/db";
import { supabase } from "@/lib/supabase/client";

export default function NewCasePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [org, setOrg] = useState(null);
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const workspaces = await getMyWorkspaces();
      if (!workspaces.length) return;
      const orgId = workspaces[0].org_id;

      const { data: q } = await supabase
        .from("queues")
        .select("id")
        .eq("org_id", orgId)
        .eq("is_default", true)
        .single();

      setOrg(orgId);
      setQueue(q?.id);
    }
    load();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const caseId = await createCase({
        orgId: org,
        queueId: queue,
        title,
        description,
        priority,
      });
      router.push(`/cases/${caseId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>New Case</h1>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      <form onSubmit={onSubmit} style={{ maxWidth: 520, display: "grid", gap: 10 }}>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />

        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        <button disabled={busy}>
          {busy ? "Creating..." : "Create Case"}
        </button>
      </form>
    </div>
  );
}

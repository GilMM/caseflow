// src/app/(app)/announcements/useAnnouncements.js
"use client";

import { useEffect, useState } from "react";
import { getOrgAnnouncements } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/db";

/**
 * Hook to fetch active announcements for the current workspace
 * @returns {{ items: Array, loading: boolean, error: Error | null }}
 */
export function useAnnouncements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const workspace = await getActiveWorkspace();
        if (!workspace?.orgId) {
          setItems([]);
          return;
        }
        const announcements = await getOrgAnnouncements(workspace.orgId);
        setItems(announcements || []);
      } catch (e) {
        console.error("Failed to load announcements:", e);
        setError(e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { items, loading, error };
}

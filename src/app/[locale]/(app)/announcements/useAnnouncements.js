// src/app/(app)/announcements/useAnnouncements.js
"use client";

import { useEffect, useRef, useState } from "react";
import { getOrgAnnouncements } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/db";
import {
  getCachedAnnouncements,
  setCachedAnnouncements,
} from "@/lib/workspaceCache";

/**
 * Hook to fetch active announcements for the current workspace.
 * Uses in-memory cache to avoid repeated fetches on navigation.
 * @returns {{ items: Array, loading: boolean, error: Error | null, refresh: Function }}
 */
export function useAnnouncements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadedRef = useRef(false);

  async function load(force = false) {
    try {
      const workspace = await getActiveWorkspace();
      if (!workspace?.orgId) {
        setItems([]);
        return;
      }

      // Check cache first (unless forced refresh)
      if (!force) {
        const cached = getCachedAnnouncements(workspace.orgId);
        if (cached) {
          setItems(cached);
          return;
        }
      }

      setLoading(true);
      setError(null);

      const announcements = await getOrgAnnouncements(workspace.orgId);
      const result = announcements || [];

      setItems(result);
      setCachedAnnouncements(workspace.orgId, result);
    } catch (e) {
      console.error("Failed to load announcements:", e);
      setError(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Only load once per session, not on every mount
    if (!loadedRef.current) {
      loadedRef.current = true;
      load();
    }
  }, []);

  return { items, loading, error, refresh: () => load(true) };
}

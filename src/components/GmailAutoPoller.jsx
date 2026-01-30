"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/contexts";
import { useWorkspace } from "@/contexts";

const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

/**
 * Background component that auto-polls Gmail every 2 minutes.
 * Mounted in AppShell so it runs whenever the app is open.
 * Only polls if the org has Gmail integration enabled.
 */
export default function GmailAutoPoller() {
  const { user } = useUser();
  const { workspace } = useWorkspace();
  const timerRef = useRef(null);
  const pollingRef = useRef(false);

  useEffect(() => {
    const orgId = workspace?.orgId;
    if (!user?.id || !orgId) return;

    async function poll() {
      if (pollingRef.current) return;
      pollingRef.current = true;

      try {
        const { data: sessData } = await supabase.auth.getSession();
        const accessToken = sessData?.session?.access_token;
        if (!accessToken) return;

        // Quick check: is Gmail enabled for this org?
        const statusRes = await fetch(
          `/api/integrations/gmail/status?orgId=${encodeURIComponent(orgId)}`,
          {
            credentials: "include",
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        const statusData = await statusRes.json().catch(() => null);
        if (!statusData?.is_enabled) return;

        // Poll for new emails
        await fetch(`/api/integrations/gmail/check-now`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ orgId }),
        });
      } catch {
        // Silent — don't disrupt the user
      } finally {
        pollingRef.current = false;
      }
    }

    // Initial poll after a short delay (don't block page load)
    const initialTimeout = setTimeout(poll, 10_000);

    // Then poll every 2 minutes
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user?.id, workspace?.orgId]);

  return null; // No UI
}

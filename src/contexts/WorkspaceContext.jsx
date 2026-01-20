"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { getOrgMembers } from "@/lib/db";
import {
  getCachedWorkspace,
  setCachedWorkspace,
  invalidateWorkspaceCache,
} from "@/lib/workspaceCache";

const WorkspaceContext = createContext(null);

// Cache for org members (in-memory, per session)
let membersCache = {
  data: null,
  orgId: null,
  timestamp: 0,
};
const MEMBERS_CACHE_TTL = 60000; // 1 minute

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserId(data?.session?.user?.id || null);
    }

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      setUserId(session?.user?.id || null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const fetchWorkspace = useCallback(async () => {
    // Check cache first
    const cached = getCachedWorkspace();
    if (cached) {
      setWorkspace(cached);
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from("org_memberships")
        .select(
          "org_id, role, is_active, created_at, organizations:org_id ( id, name, logo_url, owner_user_id )",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const m = data?.[0];
      if (!m) {
        setWorkspace(null);
        return null;
      }

      const result = {
        orgId: m.org_id,
        orgName: m.organizations?.name || "Workspace",
        orgLogoUrl: m.organizations?.logo_url || null,
        role: m.role,
        ownerUserId: m.organizations?.owner_user_id || null,
      };

      setCachedWorkspace(result);
      setWorkspace(result);
      return result;
    } catch (e) {
      console.error("Failed to fetch workspace:", e);
      setWorkspace(null);
      return null;
    }
  }, []);

  const fetchMembers = useCallback(async (orgId) => {
    if (!orgId) {
      setMembers([]);
      return [];
    }

    // Check cache
    const now = Date.now();
    if (
      membersCache.data &&
      membersCache.orgId === orgId &&
      now - membersCache.timestamp < MEMBERS_CACHE_TTL
    ) {
      setMembers(membersCache.data);
      return membersCache.data;
    }

    setMembersLoading(true);
    try {
      const list = await getOrgMembers(orgId);
      membersCache = {
        data: list || [],
        orgId,
        timestamp: Date.now(),
      };
      setMembers(list || []);
      return list || [];
    } catch (e) {
      console.error("Failed to fetch org members:", e);
      setMembers([]);
      return [];
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const refreshWorkspace = useCallback(async () => {
    invalidateWorkspaceCache();
    const ws = await fetchWorkspace();
    if (ws?.orgId) {
      await fetchMembers(ws.orgId);
    }
    return ws;
  }, [fetchWorkspace, fetchMembers]);

  const refreshMembers = useCallback(async () => {
    if (workspace?.orgId) {
      // Invalidate cache and refetch
      membersCache = { data: null, orgId: null, timestamp: 0 };
      await fetchMembers(workspace.orgId);
    }
  }, [workspace?.orgId, fetchMembers]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // Check for refresh parameter in URL (e.g., after creating org)
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("refresh") === "1") {
          // Remove the parameter from URL
          params.delete("refresh");
          const newUrl = params.toString()
            ? `${window.location.pathname}?${params}`
            : window.location.pathname;
          window.history.replaceState({}, "", newUrl);
          // Force refresh workspace by clearing cache
          invalidateWorkspaceCache();
          membersCache = { data: null, orgId: null, timestamp: 0 };
        }
      }

      const ws = await fetchWorkspace();
      if (!mounted) return;

      setLoading(false); // ✅ מוריד מהר כדי שלא יהיה "פלאש" מוזר

      if (ws?.orgId) {
        fetchMembers(ws.orgId); // ✅ בלי await (לא חוסם הרשאות)
      }
    }

    init();

    // Listen for auth state changes to refresh workspace
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (session) {
        // User logged in, refresh workspace
        invalidateWorkspaceCache();
        membersCache = { data: null, orgId: null, timestamp: 0 };
        fetchWorkspace().then((ws) => {
          if (ws?.orgId && mounted) {
            fetchMembers(ws.orgId);
          }
        });
      } else {
        // User logged out
        setWorkspace(null);
        setMembers([]);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [fetchWorkspace, fetchMembers]);

  // Derived values
  const isOwner = useMemo(() => {
    return (
      !!userId && !!workspace?.ownerUserId && userId === workspace.ownerUserId
    );
  }, [userId, workspace?.ownerUserId]);

  const isAdmin = useMemo(() => {
    return workspace?.role === "admin" || isOwner;
  }, [workspace?.role, isOwner]);

  const value = {
    workspace,
    members,
    loading,
    membersLoading,
    refreshWorkspace,
    refreshMembers,
    isOwner,
    isAdmin,
    orgId: workspace?.orgId || null,
    orgName: workspace?.orgName || null,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

export default WorkspaceContext;

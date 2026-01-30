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
import { getOrgMembers, getMyWorkspaces } from "@/lib/db";
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
  const [workspaces, setWorkspaces] = useState([]); // All user's orgs
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
      // 1) Get current user
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;
      if (!currentUserId) {
        setWorkspace(null);
        return null;
      }

      // 2) Check active_org_id
      let activeOrgId = null;
      const { data: uw, error: uwErr } = await supabase
        .from("user_workspaces")
        .select("active_org_id")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (uwErr) throw uwErr;
      if (uw?.active_org_id) activeOrgId = uw.active_org_id;

      // helper: fetch a valid membership FOR THIS USER (active + org not deleted)
      async function fetchMembershipForOrg(orgId) {
        const { data, error } = await supabase
          .from("org_memberships")
          .select(
            "org_id, user_id, role, is_active, created_at, organizations:org_id ( id, name, logo_url, owner_user_id, deleted_at )"
          )
          .eq("org_id", orgId)
          .eq("user_id", currentUserId) // ✅ CRITICAL FIX
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .maybeSingle();

        if (error) throw error;

        const m = data || null;
        if (!m) return null;

        // ✅ org deleted? ignore
        if (m.organizations?.deleted_at) return null;

        return m;
      }

      // 3) Try active org first
      let m = null;
      if (activeOrgId) {
        m = await fetchMembershipForOrg(activeOrgId);
      }

      // 4) Fallback: pick latest active membership for THIS USER with org not deleted
      if (!m) {
        const { data, error } = await supabase
          .from("org_memberships")
          .select(
            "org_id, user_id, role, is_active, created_at, organizations:org_id ( id, name, logo_url, owner_user_id, deleted_at )"
          )
          .eq("user_id", currentUserId) // ✅ CRITICAL FIX
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        m = (data || []).find((row) => !row.organizations?.deleted_at) || null;

        // persist fallback as active
        if (m?.org_id) {
          await supabase
            .from("user_workspaces")
            .upsert(
              {
                user_id: currentUserId,
                active_org_id: m.org_id,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );
        }
      }

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
        orgDeletedAt: m.organizations?.deleted_at || null,
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

  const fetchAllWorkspaces = useCallback(async () => {
    try {
      const list = await getMyWorkspaces();

      const transformed = (list || [])
        .map((m) => ({
          orgId: m.org_id,
          orgName: m.organizations?.name || "Workspace",
          orgLogoUrl: m.organizations?.logo_url || null,
          role: m.role,
          isActive: m.is_active,
          ownerUserId: m.organizations?.owner_user_id || null,
          deletedAt: m.organizations?.deleted_at || null,
        }))
        .filter((ws) => !ws.deletedAt);

      setWorkspaces(transformed);
      return transformed;
    } catch (e) {
      console.error("Failed to fetch workspaces:", e);
      setWorkspaces([]);
      return [];
    }
  }, []);

  const fetchMembers = useCallback(async (orgId) => {
    if (!orgId) {
      setMembers([]);
      return [];
    }

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

  const switchWorkspace = useCallback(
    async (orgId) => {
      try {
        const res = await fetch("/api/orgs/active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to switch org");
        }

        invalidateWorkspaceCache();
        membersCache = { data: null, orgId: null, timestamp: 0 };

        const ws = await fetchWorkspace();
        if (ws?.orgId) {
          await fetchMembers(ws.orgId);
        }

        fetchAllWorkspaces();
        return ws;
      } catch (e) {
        console.error("Failed to switch workspace:", e);
        throw e;
      }
    },
    [fetchWorkspace, fetchMembers, fetchAllWorkspaces]
  );

  const refreshWorkspace = useCallback(async () => {
    invalidateWorkspaceCache();
    const ws = await fetchWorkspace();
    if (ws?.orgId) {
      await fetchMembers(ws.orgId);
    }
    fetchAllWorkspaces();
    return ws;
  }, [fetchWorkspace, fetchMembers, fetchAllWorkspaces]);

  const refreshMembers = useCallback(async () => {
    if (workspace?.orgId) {
      membersCache = { data: null, orgId: null, timestamp: 0 };
      await fetchMembers(workspace.orgId);
    }
  }, [workspace?.orgId, fetchMembers]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("refresh") === "1") {
          params.delete("refresh");
          const newUrl = params.toString()
            ? `${window.location.pathname}?${params}`
            : window.location.pathname;
          window.history.replaceState({}, "", newUrl);

          invalidateWorkspaceCache();
          membersCache = { data: null, orgId: null, timestamp: 0 };
        }
      }

      const ws = await fetchWorkspace();
      if (!mounted) return;

      setLoading(false);

      if (ws?.orgId) {
        fetchMembers(ws.orgId);
      }

      fetchAllWorkspaces();
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (session) {
        invalidateWorkspaceCache();
        membersCache = { data: null, orgId: null, timestamp: 0 };
        fetchWorkspace().then((ws) => {
          if (ws?.orgId && mounted) {
            fetchMembers(ws.orgId);
          }
        });
        fetchAllWorkspaces();
      } else {
        setWorkspace(null);
        setWorkspaces([]);
        setMembers([]);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [fetchWorkspace, fetchMembers, fetchAllWorkspaces]);

  const isOwner = useMemo(() => {
    return (
      !!userId &&
      !!workspace?.ownerUserId &&
      userId === workspace.ownerUserId
    );
  }, [userId, workspace?.ownerUserId]);

  const isAdmin = useMemo(() => {
    // אם אצלך supervisor נחשב admin בפועל, תוסיף כאן:
    // return workspace?.role === "admin" || workspace?.role === "supervisor" || isOwner;
    return workspace?.role === "admin" || isOwner;
  }, [workspace?.role, isOwner]);

  const value = {
    workspace,
    workspaces,
    members,
    loading,
    membersLoading,
    refreshWorkspace,
    refreshMembers,
    switchWorkspace,
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

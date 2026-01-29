import { supabase } from "@/lib/supabase/client";
import { logAuditClient } from "@/lib/audit/client";

// ═══════════════════════════════════════════════════════════════════
// Auth session cache - prevents redundant auth calls
// ═══════════════════════════════════════════════════════════════════
let _cachedUser = null;
let _cacheTimestamp = 0;
const AUTH_CACHE_TTL = 30000; // 30 seconds

/**
 * Get current user with caching to prevent redundant auth calls.
 * Cache is invalidated after 30 seconds or on auth state change.
 */
export async function getCurrentUser() {
  const now = Date.now();
  if (_cachedUser && now - _cacheTimestamp < AUTH_CACHE_TTL) {
    return _cachedUser;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  _cachedUser = data?.session?.user || null;
  _cacheTimestamp = now;
  return _cachedUser;
}

// Clear cache on auth state change
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => {
    _cachedUser = null;
    _cacheTimestamp = 0;
  });
}

/**
 * Creates an org, adds current user as admin member, creates default queue.
 * Returns { orgId, queueId }.
 */
export async function initializeWorkspace({
  orgName = "Weizmann Service Desk",
} = {}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // 1) Create organization (✅ includes owner_user_id)
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      created_by: user.id,
      owner_user_id: user.id, // ✅ primary admin / owner
    })
    .select("id,name,owner_user_id")
    .single();

  if (orgErr) throw orgErr;

  // 2) Create membership (admin)
  const { error: memErr } = await supabase.from("org_memberships").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
    is_active: true,
  });

  if (memErr) throw memErr;

  // 3) Create default queue
  const { data: queue, error: qErr } = await supabase
    .from("queues")
    .insert({
      org_id: org.id,
      name: "General",
      is_default: true,
    })
    .select("id,name")
    .single();

  if (qErr) throw qErr;

  return { orgId: org.id, queueId: queue.id };
}

/**
 * Returns user's memberships with org info.
 */
export async function getMyWorkspaces() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("org_memberships")
    .select(
      "org_id, role, is_active, created_at, organizations:org_id ( id, name, logo_url, owner_user_id, deleted_at )",
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // optional: filter soft-deleted orgs
  return (data || []).filter((m) => !m?.organizations?.deleted_at);
}

export async function createCase({
  orgId,
  queueId,
  title,
  description,
  priority,
  requesterContactId,
  assignedTo,
  eligibleUserIds = [],
}) {
  if (!queueId) throw new Error("Queue is required");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const cleanEligible =
    Array.isArray(eligibleUserIds) && eligibleUserIds.length > 0
      ? Array.from(new Set(eligibleUserIds)).filter(Boolean)
      : null;

  const { data, error } = await supabase
    .from("cases")
    .insert({
      org_id: orgId,
      queue_id: queueId,
      title,
      description: description || null,
      priority,
      created_by: user.id,
      requester_contact_id: requesterContactId || null,
      assigned_to: assignedTo || null,
      eligible_user_ids: cleanEligible,
    })
    .select(
      "id, org_id, queue_id, title, priority, requester_contact_id, assigned_to",
    )
    .single();

  if (error) throw error;

  // ✅ audit
  logAuditClient({
    orgId,
    entityType: "cases",
    entityId: data.id,
    action: "case_created",
    changes: {
      title: data.title,
      priority: data.priority,
      queue_id: data.queue_id,
      requester_contact_id: data.requester_contact_id,
      assigned_to: data.assigned_to,
      eligible_user_ids: cleanEligible,
    },
  });

  return data.id;
}

/** Load one case */
export async function getCaseById(caseId) {
  const { data, error } = await supabase
    .from("cases")
    .select(
      `
      id,
      org_id,
      queue_id,
      title,
      description,
      status,
      priority,
      assigned_to,
      requester_contact_id,
      eligible_user_ids,
      created_at,
      updated_at,
      queue:queues (
        id,
        name
      )
    `,
    )
    .eq("id", caseId)
    .single();

  if (error) throw error;

  // Fetch requester separately if exists
  if (data?.requester_contact_id) {
    const { data: requester } = await supabase
      .from("contacts")
      .select("id, full_name, email, phone, department")
      .eq("id", data.requester_contact_id)
      .maybeSingle();

    data.requester = requester || null;
  } else {
    data.requester = null;
  }

  // Fetch assignee profile if exists
  if (data?.assigned_to) {
    const { data: assignee } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, email")
      .eq("id", data.assigned_to)
      .maybeSingle();

    data.assignee = assignee || null;
  } else {
    data.assignee = null;
  }

  return data;
}

/** Load timeline */
export async function getCaseActivities(caseId) {
  const { data, error } = await supabase
    .from("case_activities")
    .select("id, type, body, meta, created_at, created_by")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data || [];
}
/** Add a note activity */
export async function addCaseNote({ caseId, orgId, body }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("case_activities")
    .insert({
      org_id: orgId,
      case_id: caseId,
      type: "note",
      body,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw error;

  logAuditClient({
    orgId,
    entityType: "cases",
    entityId: caseId,
    action: "case_note_added",
    changes: {
      activity_id: data?.id || null,
      body_preview: String(body || "").slice(0, 200),
    },
  });
}

/** Update case status (activity is logged by DB trigger) */
export async function updateCaseStatus({ caseId, status }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const toStatus = String(status || "").toLowerCase();

  const { data: before, error: bErr } = await supabase
    .from("cases")
    .select("id, org_id, status")
    .eq("id", caseId)
    .maybeSingle();
  if (bErr) throw bErr;

  const fromStatus = String(before?.status || "").toLowerCase();
  if (fromStatus === toStatus) return; // ✅ no-op

  const { data: after, error: upErr } = await supabase
    .from("cases")
    .update({ status: toStatus })
    .eq("id", caseId)
    .select("id, org_id, status")
    .single();
  if (upErr) throw upErr;

  logAuditClient({
    orgId: after.org_id || before?.org_id,
    entityType: "cases",
    entityId: caseId,
    action: "case_status_changed",
    changes: { from: before?.status || null, to: after.status },
  });

  // 🔁 Push back to Sheet (best-effort)
  try {
    await fetch("/api/integrations/google-sheets/sync-case-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: after.org_id,
        caseId,
        status: toStatus,
      }),
    });
  } catch (e) {
    console.warn("Sheet sync failed:", e);
  }
}


/**
 * Active workspace for current user.
 * Returns orgId, orgName, role, ownerUserId, orgLogoUrl
 * Uses in-memory cache to avoid repeated calls on navigation.
 */
export async function getActiveWorkspace() {
  // Cache first (client-side only)
  if (typeof window !== "undefined") {
    const { getCachedWorkspace } = await import("@/lib/workspaceCache");
    const cached = getCachedWorkspace();
    if (cached) return cached;
  }

  // 1) Get current user
  const user = await getCurrentUser();
  const userId = user?.id;
  if (!userId) return null;

  // 2) Try to read user's active org preference
  const { data: uw, error: uwErr } = await supabase
    .from("user_workspaces")
    .select("active_org_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (uwErr) throw uwErr;

  async function fetchMembership(orgId) {
    const { data, error } = await supabase
      .from("org_memberships")
      .select(
        "org_id, role, is_active, created_at, organizations:org_id ( id, name, logo_url, owner_user_id, deleted_at )",
      )
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .eq("is_active", true)
      .limit(1);

    if (error) throw error;

    const m = data?.[0] || null;
    if (m?.organizations?.deleted_at) return null; // soft delete
    return m;
  }

  let m = null;

  // 3) If user has active_org_id, use it
  if (uw?.active_org_id) {
    m = await fetchMembership(uw.active_org_id);
  }

  // 4) Fallback: newest membership of THIS user
  if (!m) {
    const { data, error } = await supabase
      .from("org_memberships")
      .select(
        "org_id, role, is_active, created_at, organizations:org_id ( id, name, logo_url, owner_user_id, deleted_at )",
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    m = data?.[0] || null;

    // Save as active for next time
    if (m?.org_id) {
      await supabase
        .from("user_workspaces")
        .upsert(
          { user_id: userId, active_org_id: m.org_id },
          { onConflict: "user_id" },
        );
    }
  }

  if (!m) return null;
  if (m.organizations?.deleted_at) return null;

  const result = {
    orgId: m.org_id,
    orgName: m.organizations?.name || "Workspace",
    orgLogoUrl: m.organizations?.logo_url || null,
    role: m.role,
    ownerUserId: m.organizations?.owner_user_id || null,
  };

  // Cache (client-side only)
  if (typeof window !== "undefined") {
    const { setCachedWorkspace } = await import("@/lib/workspaceCache");
    setCachedWorkspace(result);
  }

  return result;
}

export async function getDashboardStats(orgId) {
  const { data, error } = await supabase
    .from("cases")
    .select("id,status,priority,created_at,assigned_to")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  const rows = data || [];
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  const day = (startOfWeek.getDay() + 6) % 7; // 0=Mon
  startOfWeek.setDate(startOfWeek.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  const isOpen = (s) => s !== "closed";
  const open = rows.filter((c) => isOpen(c.status));
  const urgentOpen = open.filter((c) => c.priority === "urgent");

  const newToday = rows.filter((c) => new Date(c.created_at) >= startOfToday);
  const resolvedThisWeek = rows.filter(
    (c) => c.status === "resolved" && new Date(c.created_at) >= startOfWeek,
  );

  const byStatus = rows.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  return {
    total: rows.length,
    openCount: open.length,
    urgentOpenCount: urgentOpen.length,
    newTodayCount: newToday.length,
    resolvedThisWeekCount: resolvedThisWeek.length,
    byStatus,
  };
}

export async function getMyOpenCases(orgId, userId) {
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id,title,status,priority,created_at, queue_id, queues(name,is_default)",
    )
    .eq("org_id", orgId)
    .eq("assigned_to", userId)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;
  return data || [];
}

export async function getRecentActivity(orgId, { limit = 5 } = {}) {
  const { data, error } = await supabase
    .from("case_activities")
    .select(
      "id, case_id, type, body, meta, created_at, created_by, cases:case_id ( id, queue_id, queues(name,is_default) )",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// Get org members list for assignment UI
export async function getOrgMembers(orgId) {
  if (!orgId) return [];

  // First get org memberships
  const { data: memberships, error: membersErr } = await supabase
    .from("org_memberships")
    .select("user_id, role, is_active")
    .eq("org_id", orgId)
    .eq("is_active", true);

  if (membersErr) throw membersErr;
  if (!memberships || memberships.length === 0) return [];

  // Then get profiles for those users
  const userIds = memberships.map((m) => m.user_id);
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  if (profilesErr) throw profilesErr;

  // Create a map for quick lookup
  const profileMap = {};
  for (const p of profiles || []) {
    profileMap[p.id] = p;
  }

  // Combine the data
  return memberships.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    full_name: profileMap[m.user_id]?.full_name || null,
    avatar_url: profileMap[m.user_id]?.avatar_url || null,
  }));
}

/** Assign case (activity is logged by DB trigger) */
export async function assignCase({ caseId, toUserId }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data: before, error: bErr } = await supabase
    .from("cases")
    .select("id, org_id, assigned_to")
    .eq("id", caseId)
    .maybeSingle();
  if (bErr) throw bErr;

  const { data: after, error: upErr } = await supabase
    .from("cases")
    .update({ assigned_to: toUserId || null })
    .eq("id", caseId)
    .select("id, org_id, assigned_to")
    .single();

  if (upErr) throw upErr;

  logAuditClient({
    orgId: after.org_id || before?.org_id,
    entityType: "cases",
    entityId: caseId,
    action: "case_assignee_changed",
    changes: {
      from: before?.assigned_to || null,
      to: after.assigned_to || null,
    },
  });
}

export async function addOrgMember({ orgId, userId, role = "viewer" }) {
  const { error } = await supabase.from("org_memberships").insert({
    org_id: orgId,
    user_id: userId,
    role,
    is_active: true,
  });
  if (error) throw error;
}

export async function updateOrgMemberRole({ orgId, userId, role }) {
  const { error } = await supabase
    .from("org_memberships")
    .update({ role })
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setOrgMemberActive({ orgId, userId, isActive }) {
  const { error } = await supabase
    .from("org_memberships")
    .update({ is_active: isActive })
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Admin only */
export async function getJoinRequests(orgId) {
  const { data, error } = await supabase
    .from("org_join_requests")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function approveJoinRequest(request) {
  const { error: updErr } = await supabase
    .from("org_join_requests")
    .update({
      status: "approved",
      decided_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (updErr) throw updErr;

  const { error: memErr } = await supabase.from("org_memberships").insert({
    org_id: request.org_id,
    user_id: request.requester_user_id,
    role: "agent",
    is_active: true,
  });

  if (memErr) throw memErr;
}

export async function rejectJoinRequest(requestId) {
  const { error } = await supabase
    .from("org_join_requests")
    .update({
      status: "rejected",
      decided_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) throw error;
}

export async function createOrgInvite({ orgId, email, role = "agent" }) {
  const { data, error } = await supabase.rpc("create_org_invite", {
    p_org_id: orgId,
    p_email: email,
    p_role: role,
    p_days_valid: 7,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.token) throw new Error("Invite RPC returned no token");
  return row;
}

export async function getOrgInvites(orgId) {
  const { data, error } = await supabase.rpc("get_org_invites", {
    p_org_id: orgId,
  });

  if (error) throw error;
  return data || [];
}

export async function revokeOrgInvite(inviteId) {
  const { error } = await supabase.rpc("revoke_org_invite", {
    p_invite_id: inviteId,
  });

  if (error) throw error;
}

export async function getInviteByToken(token) {
  const { data, error } = await supabase.rpc("get_invite_by_token", {
    p_token: token,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) || null;
}

export async function listOrgMembers(orgId) {
  const { data, error } = await supabase.rpc("list_org_members_v2", {
    p_org_id: orgId,
  });
  if (error) throw error;
  return data || [];
}

export async function setMemberRole({ orgId, userId, role }) {
  const { error } = await supabase.rpc("set_member_role", {
    p_org_id: orgId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
}

export async function setMemberActive({ orgId, userId, isActive }) {
  const { error } = await supabase.rpc("set_member_active", {
    p_org_id: orgId,
    p_user_id: userId,
    p_is_active: isActive,
  });
  if (error) throw error;
}

export async function removeOrgMember({ orgId, userId }) {
  const { error } = await supabase
    .from("org_memberships")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) throw error;
}

/**
 * Update org settings (name + logo_url + dashboard_update)
 */
export async function updateOrgSettings({
  orgId,
  name,
  logoUrl = null,
  dashboardUpdate = null,
}) {
  if (!orgId) throw new Error("Missing orgId");

  const user = await getCurrentUser();
  const userId = user?.id;

  // fetch before
  const { data: before } = await supabase
    .from("organizations")
    .select("id, name, logo_url, dashboard_update")
    .eq("id", orgId)
    .maybeSingle();

  const payload = { name, logo_url: logoUrl };

  if (dashboardUpdate !== null && dashboardUpdate !== undefined) {
    payload.dashboard_update = dashboardUpdate;
    payload.dashboard_update_updated_at = new Date().toISOString();
    if (userId) payload.dashboard_update_updated_by = userId;
  }

  Object.keys(payload).forEach(
    (k) => payload[k] === undefined && delete payload[k],
  );

  const { error } = await supabase
    .from("organizations")
    .update(payload)
    .eq("id", orgId);
  if (error) throw error;

  logAuditClient({
    orgId,
    entityType: "organizations",
    entityId: orgId,
    action: "org_settings_updated",
    changes: {
      before: before || null,
      after: { ...before, ...payload },
    },
  });
}

export async function diagnosticsOrgAccess(orgId) {
  const { data, error } = await supabase.rpc("diagnostics_org_access", {
    p_org_id: orgId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row || null;
}
// ✅ Priority (activity logged by DB trigger)
export async function updateCasePriority({ caseId, priority }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const toPriority = String(priority || "").toLowerCase();

  const { data: before, error: bErr } = await supabase
    .from("cases")
    .select("id, org_id, priority")
    .eq("id", caseId)
    .maybeSingle();
  if (bErr) throw bErr;

  const { data: after, error: upErr } = await supabase
    .from("cases")
    .update({ priority: toPriority })
    .eq("id", caseId)
    .select("id, org_id, priority")
    .single();

  if (upErr) throw upErr;

  logAuditClient({
    orgId: after.org_id || before?.org_id,
    entityType: "cases",
    entityId: caseId,
    action: "case_priority_changed",
    changes: { from: before?.priority || null, to: after.priority },
  });
}

/* ---------------- profiles ---------------- */

export async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  // if missing row, return empty object (UI can still work)
  return data || { id: user.id, full_name: "", avatar_url: null };
}
/**
 * Profile upsert (profiles.id = auth.users.id)
 */
export async function upsertMyProfile({
  fullName = null,
  avatarUrl = null,
} = {}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const payload = {
    id: user.id,
    full_name: fullName,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  };

  // avoid overwriting with undefined
  Object.keys(payload).forEach(
    (k) => payload[k] === undefined && delete payload[k],
  );

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;
}

/**
 * Returns active announcements for org (ordered).
 * Also filters by starts_at/ends_at if set.
 */
export async function getOrgAnnouncements(orgId) {
  if (!orgId) return [];

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("org_announcements")
    .select(
      "id, title, body, is_active, sort_order, starts_at, ends_at, created_at, updated_at",
    )
    .eq("org_id", orgId)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/** Admin: list all announcements for org */
export async function listOrgAnnouncements(orgId) {
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("org_announcements")
    .select(
      "id, title, body, is_active, sort_order, starts_at, ends_at, created_at, updated_at",
    )
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createAnnouncement({
  orgId,
  title = null,
  body,
  isActive = true,
  sortOrder = 0,
  startsAt = null,
  endsAt = null,
}) {
  if (!orgId) throw new Error("Missing orgId");
  if (!body?.trim()) throw new Error("Announcement body is required");

  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("org_announcements")
    .insert({
      org_id: orgId,
      title: title?.trim() || null,
      body: body.trim(),
      is_active: !!isActive,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      starts_at: startsAt,
      ends_at: endsAt,
      created_by: user?.id || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAnnouncement(id, patch) {
  if (!id) throw new Error("Missing id");

  const clean = {};
  if (typeof patch.title !== "undefined")
    clean.title = patch.title?.trim() || null;
  if (typeof patch.body !== "undefined") clean.body = patch.body?.trim() || "";
  if (typeof patch.is_active !== "undefined")
    clean.is_active = !!patch.is_active;
  if (typeof patch.sort_order !== "undefined")
    clean.sort_order = Number(patch.sort_order) || 0;
  if (typeof patch.starts_at !== "undefined") clean.starts_at = patch.starts_at;
  if (typeof patch.ends_at !== "undefined") clean.ends_at = patch.ends_at;

  if ("body" in clean && !clean.body) throw new Error("Body cannot be empty");

  const { error } = await supabase
    .from("org_announcements")
    .update(clean)
    .eq("id", id);
  if (error) throw error;
  return true;
}

export async function deleteAnnouncement(id) {
  if (!id) throw new Error("Missing id");
  const { error } = await supabase
    .from("org_announcements")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
}

/* ---------------- Calendar Events ---------------- */

/**
 * Get calendar events for org within date range
 */
// export async function getCalendarEvents(orgId, startDate, endDate) {
//   if (!orgId) return [];

//   let query = supabase
//     .from("calendar_events")
//     .select(`
//       id, org_id, title, description,
//       start_date, end_date, all_day,
//       priority, status, assigned_to,
//       created_at, updated_at, created_by,
//       profiles:assigned_to ( full_name, avatar_url )
//     `)
//     .eq("org_id", orgId)
//     .order("start_date", { ascending: true });

//   if (startDate) {
//     query = query.gte("start_date", startDate);
//   }
//   if (endDate) {
//     query = query.lte("start_date", endDate);
//   }

//   const { data, error } = await query;
//   if (error) throw error;
//   return data || [];
// }

// /**
//  * Get single calendar event by ID
//  */
// export async function getCalendarEventById(eventId) {
//   const { data, error } = await supabase
//     .from("calendar_events")
//     .select(`
//       id, org_id, title, description,
//       start_date, end_date, all_day,
//       priority, status, assigned_to,
//       created_at, updated_at, created_by,
//       profiles:assigned_to ( full_name, avatar_url )
//     `)
//     .eq("id", eventId)
//     .single();

//   if (error) throw error;
//   return data;
// }

// /**
//  * Create a new calendar event
//  */
// export async function createCalendarEvent({
//   orgId,
//   title,
//   description,
//   startDate,
//   endDate,
//   allDay = false,
//   priority = "normal",
//   assignedTo = null,
// }) {
//   if (!orgId) throw new Error("Missing orgId");
//   if (!title?.trim()) throw new Error("Title is required");
//   if (!startDate) throw new Error("Start date is required");

//   const { data: sessionData } = await supabase.auth.getSession();
//   const user = sessionData?.session?.user;
//   if (!user) throw new Error("Not authenticated");

//   const { data, error } = await supabase
//     .from("calendar_events")
//     .insert({
//       org_id: orgId,
//       title: title.trim(),
//       description: description?.trim() || null,
//       start_date: startDate,
//       end_date: endDate || startDate,
//       all_day: allDay,
//       priority,
//       status: "scheduled",
//       assigned_to: assignedTo || null,
//       created_by: user.id,
//     })
//     .select("id")
//     .single();

//   if (error) throw error;
//   return data.id;
// }

// /**
//  * Update calendar event
//  */
// export async function updateCalendarEvent(eventId, patch) {
//   if (!eventId) throw new Error("Missing eventId");

//   const clean = {};
//   if (typeof patch.title !== "undefined") clean.title = patch.title?.trim() || "";
//   if (typeof patch.description !== "undefined") clean.description = patch.description?.trim() || null;
//   if (typeof patch.start_date !== "undefined") clean.start_date = patch.start_date;
//   if (typeof patch.end_date !== "undefined") clean.end_date = patch.end_date;
//   if (typeof patch.all_day !== "undefined") clean.all_day = !!patch.all_day;
//   if (typeof patch.priority !== "undefined") clean.priority = patch.priority;
//   if (typeof patch.status !== "undefined") clean.status = patch.status;
//   if (typeof patch.assigned_to !== "undefined") clean.assigned_to = patch.assigned_to || null;

//   if ("title" in clean && !clean.title) throw new Error("Title cannot be empty");

//   clean.updated_at = new Date().toISOString();

//   const { error } = await supabase
//     .from("calendar_events")
//     .update(clean)
//     .eq("id", eventId);

//   if (error) throw error;
//   return true;
// }

// /**
//  * Delete calendar event
//  */
// export async function deleteCalendarEvent(eventId) {
//   if (!eventId) throw new Error("Missing eventId");
//   const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
//   if (error) throw error;
//   return true;
// }
import { logCalendarActivity } from "@/lib/calendarActivity";

export async function listCalendarEvents(orgId, { start, end } = {}) {
  if (!orgId) return [];

  let q = supabase
    .from("calendar_events")
    .select(
      "id, org_id, case_id, title, description, location, start_at, end_at, all_day, color, created_at, updated_at",
    )
    .eq("org_id", orgId)
    .order("start_at", { ascending: true });

  if (start) q = q.gte("start_at", start);
  if (end) q = q.lte("start_at", end);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getCalendarEventById(id) {
  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "id, org_id, case_id, title, description, location, start_at, end_at, all_day, color, created_at, updated_at",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createCalendarEvent(payload) {
  const user = await getCurrentUser();
  const userId = user?.id || null;

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      org_id: payload.orgId,
      case_id: payload.caseId || null,
      title: payload.title,
      description: payload.description || null,
      location: payload.location || null,
      start_at: payload.startAt,
      end_at: payload.endAt || null,
      all_day: !!payload.allDay,
      color: payload.color || null,
      created_by: userId,
    })
    .select(
      "id, org_id, case_id, title, description, location, start_at, end_at, all_day, color, created_at, updated_at",
    )
    .single();

  if (error) throw error;

  // ✅ log to Live Activity (only if attached to a case)
  await logCalendarActivity({
    orgId: data.org_id,
    caseId: data.case_id,
    createdBy: userId,
    type: "calendar_created",
    event: data,
  });
  logAuditClient({
    orgId: data.org_id,
    entityType: "calendar_events",
    entityId: data.id,
    action: "calendar_created",
    changes: {
      title: data.title,
      start_at: data.start_at,
      end_at: data.end_at,
      all_day: data.all_day,
      case_id: data.case_id,
    },
  });
  return data;
}

export async function updateCalendarEvent(
  id,
  patch,
  { activityType = "calendar_updated" } = {},
) {
  const user = await getCurrentUser();
  const userId = user?.id || null;

  // fetch before (so we have org/case/title even if patch is partial)
  const before = await getCalendarEventById(id);

  const { data: after, error } = await supabase
    .from("calendar_events")
    .update(patch)
    .eq("id", id)
    .select(
      "id, org_id, case_id, title, description, location, start_at, end_at, all_day, color, created_at, updated_at",
    )
    .single();

  if (error) throw error;

  await logCalendarActivity({
    orgId: after.org_id || before.org_id,
    caseId: after.case_id || before.case_id,
    createdBy: userId,
    type: activityType, // "calendar_updated" or "calendar_moved"
    event: after,
  });
  logAuditClient({
    orgId: after.org_id || before.org_id,
    entityType: "calendar_events",
    entityId: after.id,
    action:
      activityType === "calendar_moved" ? "calendar_moved" : "calendar_updated",
    changes: { before, after },
  });

  return true;
}

export async function deleteCalendarEvent(id) {
  const user = await getCurrentUser();
  const userId = user?.id || null;

  // fetch before delete so we can log it
  const before = await getCalendarEventById(id);

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);
  if (error) throw error;

  await logCalendarActivity({
    orgId: before.org_id,
    caseId: before.case_id,
    createdBy: userId,
    type: "calendar_deleted",
    event: before,
  });
  logAuditClient({
    orgId: after.org_id || before.org_id,
    entityType: "calendar_events",
    entityId: after.id,
    action:
      activityType === "calendar_moved" ? "calendar_moved" : "calendar_updated",
    changes: { before, after },
  });
  return true;
}

/**
 * Returns upcoming calendar events for an org, ordered by start_at.
 * Includes also events without case_id.
 */
export async function getUpcomingCalendarEvents(orgId, { limit = 6 } = {}) {
  if (!orgId) return [];

  // now in ISO
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "id, org_id, case_id, title, start_at, end_at, all_day, color, location, description, updated_at, created_at",
    )
    .eq("org_id", orgId)
    .gte("start_at", now)
    .order("start_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════
// Case Attachments
// ═══════════════════════════════════════════════════════════════════

const ATTACHMENTS_BUCKET = "case-attachments";

/**
 * Upload a file to Supabase Storage and create attachment record.
 * Returns the attachment object { id, url, file_name, file_type, file_size }.
 */
export async function uploadCaseAttachment({ caseId, orgId, file }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // Generate unique filename
  const ext = file.name.split(".").pop() || "bin";
  const uniqueName = `${orgId}/${caseId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(uniqueName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .getPublicUrl(uniqueName);

  const publicUrl = urlData?.publicUrl;

  // Create database record
  const { data: attachment, error: dbError } = await supabase
    .from("case_attachments")
    .insert({
      case_id: caseId,
      org_id: orgId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: uniqueName,
      url: publicUrl,
      uploaded_by: user.id,
    })
    .select("id, url, file_name, file_type, file_size, created_at")
    .single();

  if (dbError) {
    // Cleanup storage if DB insert fails
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([uniqueName]);
    throw dbError;
  }

  return attachment;
}

/**
 * Get all attachments for a case.
 */
export async function getCaseAttachments(caseId) {
  const { data, error } = await supabase
    .from("case_attachments")
    .select("id, url, file_name, file_type, file_size, created_at, uploaded_by")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Delete a case attachment.
 */
export async function deleteCaseAttachment(attachmentId) {
  // Get attachment to find storage path
  const { data: attachment, error: fetchError } = await supabase
    .from("case_attachments")
    .select("id, storage_path")
    .eq("id", attachmentId)
    .single();

  if (fetchError) throw fetchError;

  // Delete from storage
  if (attachment.storage_path) {
    await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .remove([attachment.storage_path]);
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from("case_attachments")
    .delete()
    .eq("id", attachmentId);

  if (deleteError) throw deleteError;
}

/**
 * Get attachment count for multiple cases (for list view indicator).
 * Returns { [caseId]: count }
 */
export async function getCaseAttachmentCounts(caseIds) {
  if (!caseIds?.length) return {};

  const { data, error } = await supabase
    .from("case_attachments")
    .select("case_id")
    .in("case_id", caseIds);

  if (error) throw error;

  const counts = {};
  for (const row of data || []) {
    counts[row.case_id] = (counts[row.case_id] || 0) + 1;
  }
  return counts;
}

// ═══════════════════════════════════════════════════════════════════
// Queue Members
// ═══════════════════════════════════════════════════════════════════

/**
 * Get members of a specific queue with their profiles.
 */
export async function getQueueMembers(queueId) {
  if (!queueId) return [];

  // First get queue members
  const { data: members, error: membersErr } = await supabase
    .from("queue_members")
    .select("id, user_id, created_at")
    .eq("queue_id", queueId);

  if (membersErr) throw membersErr;
  if (!members || members.length === 0) return [];

  // Then get profiles for those users
  const userIds = members.map((m) => m.user_id);
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  if (profilesErr) throw profilesErr;

  // Create a map for quick lookup
  const profileMap = {};
  for (const p of profiles || []) {
    profileMap[p.id] = p;
  }

  // Combine the data
  return members.map((m) => ({
    ...m,
    profiles: profileMap[m.user_id] || null,
  }));
}

/**
 * Set queue members (replace all members with new list).
 */
export async function setQueueMembers({ queueId, userIds }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // Delete all existing members
  const { error: deleteErr } = await supabase
    .from("queue_members")
    .delete()
    .eq("queue_id", queueId);

  if (deleteErr) throw deleteErr;

  // Insert new members
  if (userIds && userIds.length > 0) {
    const rows = userIds.map((userId) => ({
      queue_id: queueId,
      user_id: userId,
      created_by: user.id,
    }));

    const { error: insertErr } = await supabase
      .from("queue_members")
      .insert(rows);

    if (insertErr) throw insertErr;
  }
}

/**
 * Add a single member to a queue.
 */
export async function addQueueMember({ queueId, userId }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("queue_members").insert({
    queue_id: queueId,
    user_id: userId,
    created_by: user.id,
  });

  if (error) throw error;
}

/**
 * Remove a single member from a queue.
 */
export async function removeQueueMember({ queueId, userId }) {
  const { error } = await supabase
    .from("queue_members")
    .delete()
    .eq("queue_id", queueId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Get queue by ID.
 */
export async function getQueueById(queueId) {
  if (!queueId) return null;

  const { data, error } = await supabase
    .from("queues")
    .select("id, org_id, name, is_default, is_active, created_at, updated_at")
    .eq("id", queueId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get cases by queue ID.
 */
export async function getCasesByQueue(queueId, { limit = 50 } = {}) {
  if (!queueId) return [];

  const { data, error } = await supabase
    .from("cases")
    .select("id, title, status, priority, created_at, assigned_to")
    .eq("queue_id", queueId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

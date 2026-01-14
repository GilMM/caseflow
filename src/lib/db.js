import { supabase } from "@/lib/supabase/client";

/**
 * Creates an org, adds current user as admin member, creates default queue.
 * Returns { orgId, queueId }.
 */
export async function initializeWorkspace({
  orgName = "Weizmann Service Desk",
} = {}) {
  // must have session
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData?.session?.user;
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
  const { data, error } = await supabase
    .from("org_memberships")
    .select(
      "org_id, role, is_active, organizations:org_id ( id, name, owner_user_id )"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createCase({
  orgId,
  queueId,
  title,
  description,
  priority,
  requesterContactId,
}) {
  if (!queueId) throw new Error("Queue is required");

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("cases")
    .insert({
      org_id: orgId,
      queue_id: queueId, // ✅ no null
      title,
      description: description || null,
      priority,
      created_by: user.id,
      requester_contact_id: requesterContactId || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/** Load one case */
export async function getCaseById(caseId) {
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, org_id, title, description, status, priority, assigned_to, created_at, updated_at"
    )
    .eq("id", caseId)
    .single();

  if (error) throw error;
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
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("case_activities").insert({
    org_id: orgId,
    case_id: caseId,
    type: "note",
    body,
    created_by: user.id,
  });

  if (error) throw error;
}

/** Update case status (activity is logged by DB trigger) */
export async function updateCaseStatus({ caseId, status }) {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) throw error;

  const user = sessionData?.session?.user;
  if (!user) throw new Error("Not authenticated");

  const toStatus = String(status || "").toLowerCase();

  const { error: upErr } = await supabase
    .from("cases")
    .update({ status: toStatus })
    .eq("id", caseId);

  if (upErr) throw upErr;
}

/**
 * Active workspace for current user.
 * Returns orgId, orgName, role, ownerUserId, orgLogoUrl
 */
export async function getActiveWorkspace() {
  const { data, error } = await supabase
    .from("org_memberships")
    .select(
      "org_id, role, is_active, created_at, organizations:org_id ( id, name, logo_url, owner_user_id )"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  const m = data?.[0];
  if (!m) return null;

  return {
    orgId: m.org_id,
    orgName: m.organizations?.name || "Workspace",
    orgLogoUrl: m.organizations?.logo_url || null,
    role: m.role,
    ownerUserId: m.organizations?.owner_user_id || null,
  };
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
    (c) => c.status === "resolved" && new Date(c.created_at) >= startOfWeek
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
      "id,title,status,priority,created_at, queue_id, queues(name,is_default)"
    )
    .eq("org_id", orgId)
    .eq("assigned_to", userId)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;
  return data || [];
}

export async function getRecentActivity(orgId) {
  const { data, error } = await supabase
    .from("case_activities")
    .select(
      "id, case_id, type, body, meta, created_at, created_by, cases:case_id ( id, queue_id, queues(name,is_default) )"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) throw error;
  return data || [];
}

// Get org members list for assignment UI
export async function getOrgMembers(orgId) {
  const { data, error } = await supabase
    .from("org_members_with_profiles")
    .select("user_id, role, full_name, avatar_url")
    .eq("org_id", orgId)
    .eq("is_active", true);

  if (error) throw error;
  return data || [];
}

/** Assign case (activity is logged by DB trigger) */
export async function assignCase({ caseId, toUserId }) {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) throw error;

  const user = sessionData?.session?.user;
  if (!user) throw new Error("Not authenticated");

  const { error: upErr } = await supabase
    .from("cases")
    .update({ assigned_to: toUserId || null })
    .eq("id", caseId);

  if (upErr) throw upErr;
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
  const { data, error } = await supabase.rpc("list_org_members", {
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

/**
 * Update org settings (name + logo_url)
 */
export async function updateOrgSettings({ orgId, name, logoUrl = null }) {
  if (!orgId) throw new Error("Missing orgId");

  const payload = {
    name,
    logo_url: logoUrl,
  };

  // avoid overwriting with undefined
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const { error } = await supabase
    .from("organizations")
    .update(payload)
    .eq("id", orgId);

  if (error) throw error;
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
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!sessionData?.session?.user) throw new Error("Not authenticated");

  const toPriority = String(priority || "").toLowerCase();

  const { error: upErr } = await supabase
    .from("cases")
    .update({ priority: toPriority })
    .eq("id", caseId);

  if (upErr) throw upErr;
}


/* ---------------- profiles ---------------- */


export async function getMyProfile() {
  const { data: s, error: sErr } = await supabase.auth.getSession();
  if (sErr) throw sErr;

  const user = s?.session?.user;
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
export async function upsertMyProfile({ fullName = null, avatarUrl = null } = {}) {
  const { data: s, error: sErr } = await supabase.auth.getSession();
  if (sErr) throw sErr;

  const user = s?.session?.user;
  if (!user) throw new Error("Not authenticated");

  const payload = {
    id: user.id,
    full_name: fullName,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  };

  // avoid overwriting with undefined
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;
}



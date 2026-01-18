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
 * Uses in-memory cache to avoid repeated calls on navigation.
 */
export async function getActiveWorkspace() {
  // Check cache first (client-side only)
  if (typeof window !== "undefined") {
    const { getCachedWorkspace, setCachedWorkspace } = await import(
      "@/lib/workspaceCache"
    );
    const cached = getCachedWorkspace();
    if (cached) return cached;
  }

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

  const result = {
    orgId: m.org_id,
    orgName: m.organizations?.name || "Workspace",
    orgLogoUrl: m.organizations?.logo_url || null,
    role: m.role,
    ownerUserId: m.organizations?.owner_user_id || null,
  };

  // Cache the result (client-side only)
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

export async function getRecentActivity(orgId, { limit = 5 } = {}) {
  const { data, error } = await supabase
    .from("case_activities")
    .select(
      "id, case_id, type, body, meta, created_at, created_by, cases:case_id ( id, queue_id, queues(name,is_default) )"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

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
 * Update org settings (name + logo_url + dashboard_update)
 */
export async function updateOrgSettings({ orgId, name, logoUrl = null, dashboardUpdate = null }) {
  if (!orgId) throw new Error("Missing orgId");

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const payload = {
    name,
    logo_url: logoUrl,
  };

  // Add dashboard_update fields if provided
  if (dashboardUpdate !== null && dashboardUpdate !== undefined) {
    payload.dashboard_update = dashboardUpdate;
    payload.dashboard_update_updated_at = new Date().toISOString();
    if (userId) {
      payload.dashboard_update_updated_by = userId;
    }
  }

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




/**
 * Returns active announcements for org (ordered).
 * Also filters by starts_at/ends_at if set.
 */
export async function getOrgAnnouncements(orgId) {
  if (!orgId) return [];

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("org_announcements")
    .select("id, title, body, is_active, sort_order, starts_at, ends_at, created_at, updated_at")
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
    .select("id, title, body, is_active, sort_order, starts_at, ends_at, created_at, updated_at")
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

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;

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
      created_by: userData?.user?.id || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAnnouncement(id, patch) {
  if (!id) throw new Error("Missing id");

  const clean = {};
  if (typeof patch.title !== "undefined") clean.title = patch.title?.trim() || null;
  if (typeof patch.body !== "undefined") clean.body = patch.body?.trim() || "";
  if (typeof patch.is_active !== "undefined") clean.is_active = !!patch.is_active;
  if (typeof patch.sort_order !== "undefined") clean.sort_order = Number(patch.sort_order) || 0;
  if (typeof patch.starts_at !== "undefined") clean.starts_at = patch.starts_at;
  if (typeof patch.ends_at !== "undefined") clean.ends_at = patch.ends_at;

  if ("body" in clean && !clean.body) throw new Error("Body cannot be empty");

  const { error } = await supabase.from("org_announcements").update(clean).eq("id", id);
  if (error) throw error;
  return true;
}

export async function deleteAnnouncement(id) {
  if (!id) throw new Error("Missing id");
  const { error } = await supabase.from("org_announcements").delete().eq("id", id);
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
      "id, org_id, case_id, title, description, location, start_at, end_at, all_day, color, created_at, updated_at"
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
      "id, org_id, case_id, title, description, location, start_at, end_at, all_day, color, created_at, updated_at"
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createCalendarEvent(payload) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id || null;

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
      "id, org_id, case_id, title, description, location, start_at, end_at, all_day, color, created_at, updated_at"
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

  return data;
}

export async function updateCalendarEvent(id, patch, { activityType = "calendar_updated" } = {}) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id || null;

  // fetch before (so we have org/case/title even if patch is partial)
  const before = await getCalendarEventById(id);

  const { data: after, error } = await supabase
    .from("calendar_events")
    .update(patch)
    .eq("id", id)
    .select(
      "id, org_id, case_id, title, description, location, start_at, end_at, all_day, color, created_at, updated_at"
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

  return true;
}

export async function deleteCalendarEvent(id) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id || null;

  // fetch before delete so we can log it
  const before = await getCalendarEventById(id);

  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;

  await logCalendarActivity({
    orgId: before.org_id,
    caseId: before.case_id,
    createdBy: userId,
    type: "calendar_deleted",
    event: before,
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
      "id, org_id, case_id, title, start_at, end_at, all_day, color, location, description, updated_at, created_at"
    )
    .eq("org_id", orgId)
    .gte("start_at", now)
    .order("start_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
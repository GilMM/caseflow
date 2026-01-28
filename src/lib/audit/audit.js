// src/lib/audit/audit.js
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Writes an audit event into public.audit_log
 *
 * @param {Object} params
 * @param {string} params.orgId
 * @param {string} params.entityType  e.g. "cases", "contacts", "queues", "calendar"
 * @param {string} params.entityId
 * @param {string} params.action      e.g. "created", "updated", "deleted", "status_changed"
 * @param {string|null} params.actorUserId
 * @param {Object} params.changes     any json
 */
export async function writeAudit({
  orgId,
  entityType,
  entityId,
  action,
  actorUserId = null,
  changes = {},
}) {
  if (!orgId || !entityType || !entityId || !action) {
    // don't crash app for audit
    return { ok: false, error: "Missing required audit fields" };
  }

  try {
    const admin = supabaseAdmin();

    const { error } = await admin.from("audit_log").insert({
      org_id: orgId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor_user_id: actorUserId,
      changes,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Audit write failed" };
  }
}

// src/lib/audit/client.js

export async function logAuditClient({
  orgId,
  entityType,
  entityId,
  action,
  changes = {},
}) {
  try {
    if (!orgId || !entityType || !entityId || !action) return;

    await fetch("/api/audit/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, entityType, entityId, action, changes }),
    }).catch(() => {});
  } catch {
    // audit must never break UX
  }
}

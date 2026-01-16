// src/lib/calendarActivity.js
import { supabase } from "@/lib/supabase/client";
import { caseKey } from "@/lib/ui/status";

function fmtRange(startISO, endISO, allDay) {
  try {
    const s = startISO ? new Date(startISO) : null;
    const e = endISO ? new Date(endISO) : null;

    if (!s) return "";

    const optsDate = { year: "numeric", month: "short", day: "2-digit" };
    const optsTime = { hour: "2-digit", minute: "2-digit" };

    if (allDay) {
      return `${s.toLocaleDateString(undefined, optsDate)} (all-day)`;
    }

    const startStr = `${s.toLocaleDateString(undefined, optsDate)} ${s.toLocaleTimeString(
      undefined,
      optsTime
    )}`;
    const endStr = e
      ? `${e.toLocaleDateString(undefined, optsDate)} ${e.toLocaleTimeString(undefined, optsTime)}`
      : "";

    return endStr ? `${startStr} → ${endStr}` : startStr;
  } catch {
    return "";
  }
}

/**
 * Writes a calendar activity to case_activities so it appears in Dashboard live feed.
 *
 * ✅ IMPORTANT:
 * - caseId is OPTIONAL, because events can be standalone (no linked case).
 * - If caseId is missing, we simply do nothing (no error).
 *
 * Required:
 * - orgId
 * - createdBy
 * - type: calendar_created | calendar_updated | calendar_moved | calendar_deleted
 * - event: { title, start_at, end_at, all_day, id }
 *
 * Optional:
 * - caseId
 */
export async function logCalendarActivity({ orgId, caseId, createdBy, type, event }) {
  if (!orgId) throw new Error("Missing orgId");
  if (!createdBy) throw new Error("Missing createdBy");

  // ✅ Standalone events: nothing to log into case_activities
  if (!caseId) return false;

  const title = event?.title || "Event";
  const when = fmtRange(event?.start_at, event?.end_at, !!event?.all_day);

  const body =
    type === "calendar_created"
      ? `Scheduled "${title}" • ${when} • ${caseKey(caseId)}`
      : type === "calendar_deleted"
      ? `Removed "${title}" • ${caseKey(caseId)}`
      : type === "calendar_moved"
      ? `Rescheduled "${title}" • ${when} • ${caseKey(caseId)}`
      : `Updated "${title}" • ${when} • ${caseKey(caseId)}`;

  const meta = {
    calendar_event_id: event?.id || null,
    title,
    start_at: event?.start_at || null,
    end_at: event?.end_at || null,
    all_day: !!event?.all_day,
  };

  const { error } = await supabase.from("case_activities").insert({
    org_id: orgId,
    case_id: caseId,
    type,
    body,
    meta,
    created_by: createdBy,
  });

  if (error) throw error;
  return true;
}

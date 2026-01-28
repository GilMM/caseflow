import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server"; // התאמה אם צריך

function applyCommonFilters(q, filters, dateField = "created_at") {
  if (filters?.date_from) q = q.gte(dateField, filters.date_from);
  if (filters?.date_to) q = q.lte(dateField, filters.date_to);

  if (filters?.search?.trim()) {
    // נחיל טקסט חופשי בזהירות - לכל דוח שדה אחר; כאן בסיסי
    // בדוחות ספציפיים נטפל יותר טוב
  }
  return q;
}

async function enrichUsers(supabase, rows, userIdFields = []) {
  const ids = new Set();
  for (const r of rows) {
    for (const f of userIdFields) {
      if (r?.[f]) ids.add(r[f]);
    }
  }

  const list = Array.from(ids);
  if (!list.length) return rows;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", list);

  const map = new Map((profiles || []).map((p) => [p.id, p.full_name || p.id]));

  return rows.map((r) => {
    const out = { ...r };
    for (const f of userIdFields) {
      const nameKey = `${f}_name`;
      if (out[f]) out[nameKey] = map.get(out[f]) || out[f];
    }
    return out;
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { orgId, report, filters, sort, page = 1, pageSize = 25 } = body || {};

    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    if (!report) return NextResponse.json({ error: "Missing report" }, { status: 400 });

    const supabase = await createServerSupabaseClient();

    const sortField = sort?.field || "created_at";
    const sortAsc = (sort?.dir || "desc") === "asc";

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // ---- CASES
    if (report === "cases") {
      let q = supabase
        .from("cases")
        .select(
          "id, org_id, title, description, status, priority, queue_id, requester_contact_id, assigned_to, created_by, source, created_at, updated_at",
          { count: "exact" }
        )
        .eq("org_id", orgId);

      q = applyCommonFilters(q, filters, "created_at");

      if (filters?.queue_id) q = q.eq("queue_id", filters.queue_id);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.priority) q = q.eq("priority", filters.priority);

      if (filters?.search?.trim()) {
        const s = filters.search.trim();
        q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
      }

      q = q.order(sortField, { ascending: sortAsc }).range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;

      // enrich queue + requester contact names
      const rows = data || [];

      const queueIds = Array.from(new Set(rows.map((r) => r.queue_id).filter(Boolean)));
      const contactIds = Array.from(new Set(rows.map((r) => r.requester_contact_id).filter(Boolean)));

      const [{ data: qs }, { data: cs }] = await Promise.all([
        queueIds.length
          ? supabase.from("queues").select("id,name").in("id", queueIds)
          : Promise.resolve({ data: [] }),
        contactIds.length
          ? supabase.from("contacts").select("id,full_name,email").in("id", contactIds)
          : Promise.resolve({ data: [] }),
      ]);

      const qMap = new Map((qs || []).map((x) => [x.id, x.name]));
      const cMap = new Map((cs || []).map((x) => [x.id, x]));

      let out = rows.map((r) => {
        const contact = cMap.get(r.requester_contact_id);
        return {
          ...r,
          queue_name: qMap.get(r.queue_id) || r.queue_id,
          requester_name: contact?.full_name || null,
          requester_email: contact?.email || null,
        };
      });

      out = await enrichUsers(supabase, out, ["assigned_to", "created_by"]);

      return NextResponse.json({ rows: out, total: count || 0 });
    }

    // ---- ACTIVITIES
    if (report === "activities") {
      let q = supabase
        .from("case_activities")
        .select("id, org_id, case_id, type, body, created_by, created_at", { count: "exact" })
        .eq("org_id", orgId);

      q = applyCommonFilters(q, filters, "created_at");

      if (filters?.search?.trim()) {
        const s = filters.search.trim();
        q = q.or(`body.ilike.%${s}%`);
      }

      q = q.order(sortField, { ascending: sortAsc }).range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;

      let out = await enrichUsers(supabase, data || [], ["created_by"]);
      // נוח יותר לשם עמודה
      out = out.map((r) => ({ ...r, created_by_name: r.created_by_name || r.created_by }));

      return NextResponse.json({ rows: out, total: count || 0 });
    }

    // ---- CONTACTS
    if (report === "contacts") {
      let q = supabase
        .from("contacts")
        .select(
          "id, org_id, full_name, email, phone, department, job_title, location, notes, is_active, created_at, updated_at",
          { count: "exact" }
        )
        .eq("org_id", orgId);

      q = applyCommonFilters(q, filters, "created_at");

      if (filters?.search?.trim()) {
        const s = filters.search.trim();
        q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
      }

      q = q.order(sortField, { ascending: sortAsc }).range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;

      return NextResponse.json({ rows: data || [], total: count || 0 });
    }

    // ---- AUDIT LOG
    if (report === "audit") {
      let q = supabase
        .from("audit_log")
        .select("id, org_id, entity_type, entity_id, action, actor_user_id, changes, created_at", {
          count: "exact",
        })
        .eq("org_id", orgId);

      q = applyCommonFilters(q, filters, "created_at");

      if (filters?.search?.trim()) {
        const s = filters.search.trim();
        q = q.or(`entity_type.ilike.%${s}%,action.ilike.%${s}%`);
      }

      q = q.order(sortField, { ascending: sortAsc }).range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;

      let out = (data || []).map((r) => ({ ...r, actor: r.actor_user_id }));
      out = await enrichUsers(supabase, out, ["actor"]);
      out = out.map((r) => ({ ...r, actor_name: r.actor_name || r.actor }));

      return NextResponse.json({ rows: out, total: count || 0 });
    }

    // ---- CALENDAR
    if (report === "calendar") {
      let q = supabase
        .from("calendar_events")
        .select(
          "id, org_id, case_id, title, description, location, start_at, end_at, all_day, color, created_by, created_at, updated_at",
          { count: "exact" }
        )
        .eq("org_id", orgId);

      q = applyCommonFilters(q, filters, "start_at");

      if (filters?.search?.trim()) {
        const s = filters.search.trim();
        q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%,location.ilike.%${s}%`);
      }

      q = q.order(sortField, { ascending: sortAsc }).range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;

      let out = await enrichUsers(supabase, data || [], ["created_by"]);
      out = out.map((r) => ({ ...r, created_by_name: r.created_by_name || r.created_by }));

      return NextResponse.json({ rows: out, total: count || 0 });
    }

    return NextResponse.json({ error: `Unknown report: ${report}` }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

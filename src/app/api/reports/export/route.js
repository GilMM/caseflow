import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ---------- utils ----------
function safeStr(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateCell(v) {
  const d = toDate(v);
  return d || "";
}

function label(locale, he, en) {
  return locale === "he" ? he : en;
}

function dash(v) {
  return v === null || v === undefined || v === "" ? "—" : v;
}

function applyCommonFilters(q, filters, dateField = "created_at") {
  if (filters?.date_from) q = q.gte(dateField, filters.date_from);
  if (filters?.date_to) q = q.lte(dateField, filters.date_to);
  return q;
}

async function enrichUsers(supabase, rows, userIdFields = []) {
  const ids = new Set();
  for (const r of rows) for (const f of userIdFields) if (r?.[f]) ids.add(r[f]);
  const list = Array.from(ids);
  if (!list.length) return rows;

  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", list);
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

async function assertUserCanExport({ serverSupabase, orgId }) {
  const { data: sessionData, error: sessErr } = await serverSupabase.auth.getSession();
  if (sessErr) throw new Error(sessErr.message);

  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data: membership, error } = await serverSupabase
    .from("org_memberships")
    .select("org_id, role, is_active")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!membership || membership.is_active === false) throw new Error("No access to this org");

  return { userId, role: membership.role };
}

// ---------- report runner (no pagination, capped) ----------
async function runReportAll({ admin, orgId, report, filters, sort }) {
  const MAX = 5000;

  const sortField = sort?.field || "created_at";
  const sortAsc = (sort?.dir || "desc") === "asc";
  const from = 0;
  const to = MAX - 1;

  if (report === "cases") {
    let q = admin
      .from("cases")
      .select(
        "id, org_id, title, description, status, priority, queue_id, requester_contact_id, assigned_to, created_by, source, created_at, updated_at"
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

    const { data, error } = await q;
    if (error) throw error;

    const rows = data || [];

    const queueIds = Array.from(new Set(rows.map((r) => r.queue_id).filter(Boolean)));
    const contactIds = Array.from(new Set(rows.map((r) => r.requester_contact_id).filter(Boolean)));

    const [{ data: qs }, { data: cs }] = await Promise.all([
      queueIds.length ? admin.from("queues").select("id,name").in("id", queueIds) : { data: [] },
      contactIds.length ? admin.from("contacts").select("id,full_name,email").in("id", contactIds) : { data: [] },
    ]);

    const qMap = new Map((qs || []).map((x) => [x.id, x.name]));
    const cMap = new Map((cs || []).map((x) => [x.id, x]));

    let out = rows.map((r) => {
      const contact = cMap.get(r.requester_contact_id);
      return {
        ...r,
        queue_name: qMap.get(r.queue_id) || null,
        requester_name: contact?.full_name || null,
        requester_email: contact?.email || null,
      };
    });

    out = await enrichUsers(admin, out, ["assigned_to", "created_by"]);
    return out;
  }

  if (report === "activities") {
    let q = admin
      .from("case_activities")
      .select("id, org_id, case_id, type, body, created_by, created_at")
      .eq("org_id", orgId);

    q = applyCommonFilters(q, filters, "created_at");

    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      q = q.or(`body.ilike.%${s}%`);
    }

    q = q.order(sortField, { ascending: sortAsc }).range(from, to);

    const { data, error } = await q;
    if (error) throw error;

    let out = await enrichUsers(admin, data || [], ["created_by"]);
    out = out.map((r) => ({ ...r, created_by_name: r.created_by_name || r.created_by }));
    return out;
  }

  if (report === "contacts") {
    let q = admin
      .from("contacts")
      .select("id, org_id, full_name, email, phone, department, job_title, location, is_active, created_at, updated_at")
      .eq("org_id", orgId);

    q = applyCommonFilters(q, filters, "created_at");

    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
    }

    q = q.order(sortField, { ascending: sortAsc }).range(from, to);

    const { data, error } = await q;
    if (error) throw error;

    return data || [];
  }

  if (report === "audit") {
    let q = admin
      .from("audit_log")
      .select("id, org_id, entity_type, entity_id, action, actor_user_id, created_at")
      .eq("org_id", orgId);

    q = applyCommonFilters(q, filters, "created_at");

    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      q = q.or(`entity_type.ilike.%${s}%,action.ilike.%${s}%`);
    }

    q = q.order(sortField, { ascending: sortAsc }).range(from, to);

    const { data, error } = await q;
    if (error) throw error;

    let out = (data || []).map((r) => ({ ...r, actor: r.actor_user_id }));
    out = await enrichUsers(admin, out, ["actor"]);
    out = out.map((r) => ({ ...r, actor_name: r.actor_name || r.actor }));
    return out;
  }

  if (report === "calendar") {
    let q = admin
      .from("calendar_events")
      .select("id, org_id, case_id, title, location, start_at, end_at, all_day, created_by, created_at, updated_at")
      .eq("org_id", orgId);

    q = applyCommonFilters(q, filters, "start_at");

    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      q = q.or(`title.ilike.%${s}%,location.ilike.%${s}%`);
    }

    q = q.order(sortField, { ascending: sortAsc }).range(from, to);

    const { data, error } = await q;
    if (error) throw error;

    let out = await enrichUsers(admin, data || [], ["created_by"]);
    out = out.map((r) => ({ ...r, created_by_name: r.created_by_name || r.created_by }));
    return out;
  }

  throw new Error(`Unknown report: ${report}`);
}

// ---------- export schema ----------
function getExportSchema(report, locale) {
  const yes = label(locale, "כן", "Yes");
  const no = label(locale, "לא", "No");

  const statusMap = {
    new: label(locale, "חדש", "New"),
    in_progress: label(locale, "בטיפול", "In progress"),
    resolved: label(locale, "נפתר", "Resolved"),
    closed: label(locale, "סגור", "Closed"),
  };

  const prioMap = {
    low: label(locale, "נמוכה", "Low"),
    normal: label(locale, "רגילה", "Normal"),
    high: label(locale, "גבוהה", "High"),
    urgent: label(locale, "דחופה", "Urgent"),
  };

  const sourceMap = {
    manual: label(locale, "ידני", "Manual"),
    google_sheets: "Google Sheets",
  };

  const dateCol = (key, header) => ({
    key,
    header,
    width: 20,
    type: "date",
    value: (r) => formatDateCell(r[key]),
  });

  if (report === "cases") {
    return {
      title: label(locale, "דוח פניות", "Cases Report"),
      sheetName: label(locale, "פניות", "Cases"),
      columns: [
        { key: "title", header: label(locale, "כותרת", "Title"), width: 32, value: (r) => safeStr(r.title) },
        { key: "status", header: label(locale, "סטטוס", "Status"), width: 14, value: (r) => statusMap[r.status] || dash(r.status) },
        { key: "priority", header: label(locale, "עדיפות", "Priority"), width: 14, value: (r) => prioMap[r.priority] || dash(r.priority) },
        { key: "queue_name", header: label(locale, "תור", "Queue"), width: 18, value: (r) => dash(r.queue_name) },
        { key: "requester_name", header: label(locale, "פונה", "Requester"), width: 22, value: (r) => dash(r.requester_name) },
        { key: "requester_email", header: label(locale, "אימייל פונה", "Requester Email"), width: 26, value: (r) => dash(r.requester_email) },
        { key: "assigned_to_name", header: label(locale, "מוקצה ל", "Assignee"), width: 22, value: (r) => dash(r.assigned_to_name) },
        dateCol("created_at", label(locale, "נוצר בתאריך", "Created")),
        dateCol("updated_at", label(locale, "עודכן", "Updated")),
        { key: "source", header: label(locale, "מקור", "Source"), width: 14, value: (r) => sourceMap[r.source] || dash(r.source) },
        { key: "created_by_name", header: label(locale, "נוצר ע״י", "Created by"), width: 22, value: (r) => dash(r.created_by_name) },
      ],
      summary: (rows) => {
        const byStatus = { new: 0, in_progress: 0, resolved: 0, closed: 0 };
        const byPrio = { low: 0, normal: 0, high: 0, urgent: 0 };

        for (const r of rows) {
          if (r.status && byStatus[r.status] !== undefined) byStatus[r.status]++;
          if (r.priority && byPrio[r.priority] !== undefined) byPrio[r.priority]++;
        }

        return [
          {
            title: label(locale, "סיכום סטטוסים", "Status Summary"),
            items: [
              [label(locale, "חדש", "New"), byStatus.new],
              [label(locale, "בטיפול", "In progress"), byStatus.in_progress],
              [label(locale, "נפתר", "Resolved"), byStatus.resolved],
              [label(locale, "סגור", "Closed"), byStatus.closed],
            ],
          },
          {
            title: label(locale, "סיכום עדיפויות", "Priority Summary"),
            items: [
              [label(locale, "נמוכה", "Low"), byPrio.low],
              [label(locale, "רגילה", "Normal"), byPrio.normal],
              [label(locale, "גבוהה", "High"), byPrio.high],
              [label(locale, "דחופה", "Urgent"), byPrio.urgent],
            ],
          },
        ];
      },
    };
  }

  if (report === "contacts") {
    return {
      title: label(locale, "דוח אנשי קשר", "Contacts Report"),
      sheetName: label(locale, "אנשי קשר", "Contacts"),
      columns: [
        { key: "full_name", header: label(locale, "שם", "Name"), width: 26, value: (r) => safeStr(r.full_name) },
        { key: "email", header: label(locale, "אימייל", "Email"), width: 28, value: (r) => dash(r.email) },
        { key: "phone", header: label(locale, "טלפון", "Phone"), width: 18, value: (r) => dash(r.phone) },
        { key: "department", header: label(locale, "מחלקה", "Department"), width: 18, value: (r) => dash(r.department) },
        { key: "job_title", header: label(locale, "תפקיד", "Job Title"), width: 18, value: (r) => dash(r.job_title) },
        { key: "location", header: label(locale, "מיקום", "Location"), width: 18, value: (r) => dash(r.location) },
        { key: "is_active", header: label(locale, "פעיל", "Active"), width: 10, value: (r) => (r.is_active === true ? yes : r.is_active === false ? no : "—") },
        dateCol("created_at", label(locale, "נוצר בתאריך", "Created")),
        dateCol("updated_at", label(locale, "עודכן", "Updated")),
      ],
    };
  }

  if (report === "activities") {
    return {
      title: label(locale, "דוח פעילויות", "Activities Report"),
      sheetName: label(locale, "פעילויות", "Activities"),
      columns: [
        { key: "case_id", header: label(locale, "מזהה פנייה", "Case ID"), width: 26, value: (r) => dash(r.case_id) },
        { key: "type", header: label(locale, "סוג", "Type"), width: 16, value: (r) => dash(r.type) },
        { key: "body", header: label(locale, "תוכן", "Body"), width: 40, value: (r) => safeStr(r.body || "") },
        { key: "created_by_name", header: label(locale, "נוצר ע״י", "Created by"), width: 22, value: (r) => dash(r.created_by_name) },
        dateCol("created_at", label(locale, "נוצר בתאריך", "Created")),
      ],
    };
  }

  if (report === "audit") {
    return {
      title: label(locale, "דוח Audit", "Audit Report"),
      sheetName: "Audit",
      columns: [
        { key: "entity_type", header: label(locale, "סוג ישות", "Entity Type"), width: 18, value: (r) => dash(r.entity_type) },
        { key: "action", header: label(locale, "פעולה", "Action"), width: 18, value: (r) => dash(r.action) },
        { key: "entity_id", header: label(locale, "מזהה ישות", "Entity ID"), width: 30, value: (r) => dash(r.entity_id) },
        { key: "actor_name", header: label(locale, "מבצע", "Actor"), width: 22, value: (r) => dash(r.actor_name) },
        dateCol("created_at", label(locale, "נוצר בתאריך", "Created")),
      ],
    };
  }

  if (report === "calendar") {
    return {
      title: label(locale, "דוח יומן", "Calendar Report"),
      sheetName: label(locale, "יומן", "Calendar"),
      columns: [
        { key: "title", header: label(locale, "כותרת", "Title"), width: 30, value: (r) => safeStr(r.title) },
        dateCol("start_at", label(locale, "התחלה", "Start")),
        dateCol("end_at", label(locale, "סיום", "End")),
        { key: "location", header: label(locale, "מיקום", "Location"), width: 18, value: (r) => dash(r.location) },
        { key: "all_day", header: label(locale, "כל היום", "All day"), width: 10, value: (r) => (r.all_day === true ? yes : r.all_day === false ? no : "—") },
        { key: "case_id", header: label(locale, "מזהה פנייה", "Case ID"), width: 26, value: (r) => dash(r.case_id) },
        { key: "created_by_name", header: label(locale, "נוצר ע״י", "Created by"), width: 22, value: (r) => dash(r.created_by_name) },
        dateCol("created_at", label(locale, "נוצר בתאריך", "Created")),
      ],
    };
  }

  return {
    title: "Report",
    sheetName: String(report),
    columns: [{ key: "empty", header: "empty", width: 20, value: () => "" }],
  };
}

// ---------- sheet styling helpers ----------
function styleHeaderRow(ws, rowNumber, fromCol, toCol) {
  const row = ws.getRow(rowNumber);
  row.height = 20;

  for (let c = fromCol; c <= toCol; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    cell.border = {
      top: { style: "thin", color: { argb: "FFBFBFBF" } },
      left: { style: "thin", color: { argb: "FFBFBFBF" } },
      bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
      right: { style: "thin", color: { argb: "FFBFBFBF" } },
    };
  }
}

function styleDataArea(ws, startRow, endRow, fromCol, toCol) {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    row.alignment = { vertical: "top", wrapText: true };

    const zebra = r % 2 === 0;
    for (let c = fromCol; c <= toCol; c++) {
      const cell = row.getCell(c);

      // Zebra rows
      if (zebra) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F7F7" } };
      }

      // Borders
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };

      // Dates
      if (cell.value instanceof Date) {
        cell.numFmt = "dd/mm/yyyy hh:mm";
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: false };
      }
    }
  }
}

function setMetaLabel(ws, row, col, text, isRTL) {
  const cell = ws.getCell(row, col);
  cell.value = text;
  cell.font = { bold: true, color: { argb: "FF1F4E79" } };
  cell.alignment = { vertical: "middle", horizontal: isRTL ? "right" : "left" };
}

function setMetaValue(ws, row, col, text, isRTL) {
  const cell = ws.getCell(row, col);
  cell.value = text;
  cell.alignment = { vertical: "middle", horizontal: isRTL ? "right" : "left" };
}

// ---------- main ----------
export async function POST(req) {
  try {
    const body = await req.json();
    const { orgId, report, filters, sort } = body || {};

    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    if (!report) return NextResponse.json({ error: "Missing report" }, { status: 400 });

    const locale = (req.headers.get("x-locale") || "en").toLowerCase() === "he" ? "he" : "en";
    const isRTL = locale === "he";

    const serverSupabase = await createServerSupabaseClient();
    await assertUserCanExport({ serverSupabase, orgId });

    const admin = supabaseAdmin();

    // org name
    const { data: orgRow } = await admin.from("organizations").select("id,name").eq("id", orgId).maybeSingle();
    const orgName = orgRow?.name || orgId;

    const rows = await runReportAll({ admin, orgId, report, filters, sort });
    const schema = getExportSchema(report, locale);

    const wb = new ExcelJS.Workbook();
    wb.creator = "CaseFlow";
    wb.created = new Date();

    const ws = wb.addWorksheet(schema.sheetName);

    // RTL view (Excel)
    ws.views = [{ state: "normal", rightToLeft: isRTL }];

    // ---- Meta header area (top)
    // We'll use 2 columns for meta labels/values, and keep table starting later.
    // Row plan:
    // 1: Big title (merged)
    // 2: Org name + Generated at
    // 3: Date range + Total rows
    // 4-?: Optional summary blocks
    // After meta: blank row
    // Then table header row

    const COLS = schema.columns.length;

    // Title row
    ws.mergeCells(1, 1, 1, Math.max(4, COLS));
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `${schema.title}`;
    titleCell.font = { bold: true, size: 16, color: { argb: "FF1F4E79" } };
    titleCell.alignment = { vertical: "middle", horizontal: isRTL ? "right" : "left" };
    ws.getRow(1).height = 26;

    // Row 2
    setMetaLabel(ws, 2, 1, label(locale, "ארגון:", "Organization:"), isRTL);
    setMetaValue(ws, 2, 2, orgName, isRTL);

    setMetaLabel(ws, 2, 4, label(locale, "נוצר בתאריך:", "Generated at:"), isRTL);
    setMetaValue(ws, 2, 5, new Date().toLocaleString(isRTL ? "he-IL" : "en-US"), isRTL);

    // Row 3
    const rangeText =
      filters?.date_from || filters?.date_to
        ? `${filters?.date_from ? new Date(filters.date_from).toLocaleDateString(isRTL ? "he-IL" : "en-US") : "—"}  →  ${
            filters?.date_to ? new Date(filters.date_to).toLocaleDateString(isRTL ? "he-IL" : "en-US") : "—"
          }`
        : label(locale, "כל הזמנים", "All time");

    setMetaLabel(ws, 3, 1, label(locale, "טווח:", "Range:"), isRTL);
    setMetaValue(ws, 3, 2, rangeText, isRTL);

    setMetaLabel(ws, 3, 4, label(locale, "שורות:", "Rows:"), isRTL);
    setMetaValue(ws, 3, 5, String(rows.length), isRTL);

    // Optional summary blocks (Cases only)
    let cursorRow = 5;
    if (typeof schema.summary === "function") {
      const blocks = schema.summary(rows) || [];
      for (const block of blocks) {
        // block title
        ws.mergeCells(cursorRow, 1, cursorRow, 3);
        const c = ws.getCell(cursorRow, 1);
        c.value = block.title;
        c.font = { bold: true, color: { argb: "FF1F4E79" } };
        c.alignment = { vertical: "middle", horizontal: isRTL ? "right" : "left" };
        cursorRow++;

        for (const [k, v] of block.items || []) {
          setMetaValue(ws, cursorRow, 1, safeStr(k), isRTL);
          setMetaValue(ws, cursorRow, 2, safeStr(v), isRTL);
          cursorRow++;
        }

        cursorRow++; // space between blocks
      }
    }

    // one blank line before table
    const tableHeaderRow = cursorRow + 1;

    // ---- table columns
    ws.columns = schema.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width || 18,
    }));

    // place header row values manually at the desired row
    const headerRow = ws.getRow(tableHeaderRow);
    schema.columns.forEach((c, idx) => {
      headerRow.getCell(idx + 1).value = c.header;
    });

    // style header
    styleHeaderRow(ws, tableHeaderRow, 1, COLS);

    // freeze panes at the table header row (keep meta scrollable)
    ws.views = [{ state: "frozen", ySplit: tableHeaderRow, rightToLeft: isRTL }];

    // add data rows starting after header
    let dataStart = tableHeaderRow + 1;
    for (const r of rows) {
      const values = schema.columns.map((c) => c.value(r));
      const row = ws.getRow(dataStart);
      values.forEach((val, idx) => {
        const cell = row.getCell(idx + 1);

        // Date cells
        if (schema.columns[idx]?.type === "date") {
          cell.value = val; // Date or ""
          if (cell.value instanceof Date) cell.numFmt = "dd/mm/yyyy hh:mm";
        } else {
          cell.value = val;
        }
      });
      row.commit?.();
      dataStart++;
    }

    const dataEnd = dataStart - 1;

    // autofilter (header row)
    ws.autoFilter = {
      from: { row: tableHeaderRow, column: 1 },
      to: { row: tableHeaderRow, column: COLS },
    };

    // style data area
    if (dataEnd >= tableHeaderRow + 1) {
      styleDataArea(ws, tableHeaderRow + 1, dataEnd, 1, COLS);
    }

    // make meta area columns a bit wider
    ws.getColumn(1).width = Math.max(ws.getColumn(1).width || 10, 18);
    ws.getColumn(2).width = Math.max(ws.getColumn(2).width || 10, 30);
    ws.getColumn(4).width = Math.max(ws.getColumn(4).width || 10, 18);
    ws.getColumn(5).width = Math.max(ws.getColumn(5).width || 10, 26);

    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="caseflow_${report}_report.xlsx"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Export error" }, { status: 500 });
  }
}

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const STATUSES = [
  "Draft","Submitted","Under Review","Approved","Payroll Exported","Closed","Rejected","Revision Requested","Cancelled","Archived",
] as const;
export const TYPES = ["Daily","Weekly","Monthly","Project","Subcontractor","Payroll Period"] as const;
export const SHIFTS = ["Day","Night","Split","Overtime","Weekend","Holiday"] as const;
export const TRADES = [
  "General Labour","Mason","Carpenter","Steel Fixer","Welder","Electrician","Plumber","HVAC Technician",
  "Painter","Tiler","Scaffolder","Rigger","Crane Operator","Equipment Operator","Driver","Storekeeper",
  "Safety Officer","QA/QC Inspector","Site Engineer","Supervisor","Foreman","Cleaning Team","Security","Other",
] as const;
export const WORKER_TYPES = [
  "Company Worker","Subcontractor Worker","Temporary Worker","Daily Labour","Consultant Staff","Client Staff","Other",
] as const;
export const ATTENDANCE_STATUSES = [
  "Present","Absent","Late","Half Day","Leave","Sick","Off Day","Idle","Transferred","Holiday",
] as const;
export const SKILL_LEVELS = ["Helper","Semi-Skilled","Skilled","Technician","Foreman","Supervisor","Engineer","Operator","Specialist"] as const;
export const SOURCES = ["Manual","HRM","Biometric","Mobile","Manpower","Daily Report","Import"] as const;

const TS_COLS =
  "id, company_id, project_id, timesheet_number, timesheet_title, timesheet_type, timesheet_date, " +
  "week_start, week_end, month, shift, work_area, location, daily_report_id, manpower_record_id, " +
  "prepared_by, submitted_by, reviewed_by, approved_by, status, total_workers, " +
  "total_regular_hours, total_overtime_hours, total_night_hours, total_weekend_hours, total_holiday_hours, " +
  "total_idle_hours, total_leave_hours, total_hours, total_cost, currency, " +
  "payroll_exported, payroll_exported_at, payroll_exported_by, remarks, rejection_reason, revision_notes, " +
  "submitted_at, reviewed_at, approved_at, created_by, is_archived, created_at, updated_at";

const ENTRY_COLS =
  "id, company_id, project_id, timesheet_id, employee_id, worker_id, subcontractor_id, " +
  "worker_code, worker_name, worker_type, trade, designation, skill_level, " +
  "wbs_id, task_id, milestone_id, boq_item_id, cost_code_id, " +
  "work_activity, work_area, location, attendance_status, check_in_time, check_out_time, break_hours, " +
  "regular_hours, overtime_hours, night_hours, weekend_hours, holiday_hours, idle_hours, leave_hours, total_hours, " +
  "hourly_rate, overtime_rate, cost_amount, productivity_quantity, productivity_unit, " +
  "remarks, source, created_by, is_archived, created_at, updated_at";

function num(n: any) { return Number(n || 0); }

export function calcEntryHours(e: any) {
  const total = num(e.regular_hours) + num(e.overtime_hours) + num(e.night_hours) +
    num(e.weekend_hours) + num(e.holiday_hours) + num(e.idle_hours) + num(e.leave_hours);
  const cost = num(e.regular_hours) * num(e.hourly_rate) + num(e.overtime_hours) * num(e.overtime_rate);
  return { total_hours: total, cost_amount: cost };
}

function rollUp(entries: any[]) {
  const t = entries.reduce((a, e) => ({
    total_workers: a.total_workers + 1,
    total_regular_hours: a.total_regular_hours + num(e.regular_hours),
    total_overtime_hours: a.total_overtime_hours + num(e.overtime_hours),
    total_night_hours: a.total_night_hours + num(e.night_hours),
    total_weekend_hours: a.total_weekend_hours + num(e.weekend_hours),
    total_holiday_hours: a.total_holiday_hours + num(e.holiday_hours),
    total_idle_hours: a.total_idle_hours + num(e.idle_hours),
    total_leave_hours: a.total_leave_hours + num(e.leave_hours),
    total_hours: a.total_hours + num(e.total_hours),
    total_cost: a.total_cost + num(e.cost_amount),
  }), {
    total_workers: 0, total_regular_hours: 0, total_overtime_hours: 0, total_night_hours: 0,
    total_weekend_hours: 0, total_holiday_hours: 0, total_idle_hours: 0, total_leave_hours: 0,
    total_hours: 0, total_cost: 0,
  });
  return t;
}

async function recomputeTotals(supabase: any, timesheetId: string) {
  const { data: entries } = await supabase.from("timesheet_entries").select("*").eq("timesheet_id", timesheetId).eq("is_archived", false);
  const t = rollUp(entries || []);
  await supabase.from("timesheets").update(t).eq("id", timesheetId);
  return t;
}

async function nextTsNumber(supabase: any, projectId: string, date: string) {
  const { data: proj } = await supabase.from("projects").select("code, name").eq("id", projectId).maybeSingle() as any;
  const code = (proj?.code || proj?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const ymd = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const prefix = `TS-${code}-${ymd}-`;
  const { data } = await supabase.from("timesheets").select("timesheet_number")
    .eq("project_id", projectId).ilike("timesheet_number", `${prefix}%`);
  const max = (data || []).reduce((m: number, r: any) => {
    const n = parseInt(String(r.timesheet_number || "").split("-").pop() || "0", 10);
    return n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function logStatus(supabase: any, t: any, oldStatus: string | null, newStatus: string, userId: string, remarks?: string) {
  await supabase.from("timesheet_status_history").insert({
    company_id: t.company_id, project_id: t.project_id, timesheet_id: t.id,
    old_status: oldStatus, new_status: newStatus, changed_by: userId, remarks: remarks || null,
  });
}

// ===== LIST / GET =====
export const listTimesheets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("timesheets").select(TS_COLS).eq("is_archived", false).order("timesheet_date", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows || [];
  });

export const getTimesheet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const [ts, entries, atts, comments, hist] = await Promise.all([
      context.supabase.from("timesheets").select(TS_COLS).eq("id", data.id).maybeSingle(),
      context.supabase.from("timesheet_entries").select(ENTRY_COLS).eq("timesheet_id", data.id).eq("is_archived", false).order("created_at"),
      context.supabase.from("timesheet_attachments").select("*").eq("timesheet_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("timesheet_comments").select("*").eq("timesheet_id", data.id).order("created_at"),
      context.supabase.from("timesheet_status_history").select("*").eq("timesheet_id", data.id).order("created_at", { ascending: false }),
    ]);
    if (ts.error) throw ts.error;
    return { timesheet: ts.data, entries: entries.data || [], attachments: atts.data || [], comments: comments.data || [], history: hist.data || [] };
  });

export const timesheetStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("timesheets").select("status, total_workers, total_regular_hours, total_overtime_hours, total_idle_hours, total_hours, total_cost, payroll_exported, timesheet_date").eq("is_archived", false);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    const today = new Date().toISOString().slice(0, 10);
    const list = rows || [];
    return {
      today: list.filter((r: any) => r.timesheet_date === today).length,
      pending: list.filter((r: any) => ["Submitted","Under Review"].includes(r.status)).length,
      approved: list.filter((r: any) => r.status === "Approved").length,
      payrollExported: list.filter((r: any) => r.payroll_exported).length,
      totalWorkers: list.reduce((s: number, r: any) => s + num(r.total_workers), 0),
      regularHours: list.reduce((s: number, r: any) => s + num(r.total_regular_hours), 0),
      overtimeHours: list.reduce((s: number, r: any) => s + num(r.total_overtime_hours), 0),
      idleHours: list.reduce((s: number, r: any) => s + num(r.total_idle_hours), 0),
      totalHours: list.reduce((s: number, r: any) => s + num(r.total_hours), 0),
      totalCost: list.reduce((s: number, r: any) => s + num(r.total_cost), 0),
    };
  });

// ===== CREATE / UPDATE / ARCHIVE =====
export const createTimesheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: proj } = await supabase.from("projects").select("company_id, currency").eq("id", data.project_id).maybeSingle() as any;
    if (!proj) throw new Error("Project not found");
    const number = data.timesheet_number || await nextTsNumber(supabase, data.project_id, data.timesheet_date);
    const payload: any = {
      company_id: proj.company_id,
      project_id: data.project_id,
      timesheet_number: number,
      timesheet_title: data.timesheet_title || null,
      timesheet_type: data.timesheet_type || "Daily",
      timesheet_date: data.timesheet_date || new Date().toISOString().slice(0, 10),
      week_start: data.week_start || null,
      week_end: data.week_end || null,
      month: data.month || null,
      shift: data.shift || "Day",
      work_area: data.work_area || null,
      location: data.location || null,
      daily_report_id: data.daily_report_id || null,
      manpower_record_id: data.manpower_record_id || null,
      prepared_by: data.prepared_by || userId,
      currency: data.currency || proj.currency || "MVR",
      remarks: data.remarks || null,
      status: "Draft",
      created_by: userId,
    };
    const { data: row, error } = await supabase.from("timesheets").insert(payload).select(TS_COLS).single();
    if (error) throw error;
    await logStatus(supabase, row, null, "Draft", userId, "Created");
    return row;
  });

export const updateTimesheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: any }) => d)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("timesheets").update(data.patch).eq("id", data.id).select(TS_COLS).single();
    if (error) throw error;
    return row;
  });

export const archiveTimesheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("timesheets").update({ is_archived: true, status: "Archived" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ===== STATUS WORKFLOW =====
async function setStatus(supabase: any, userId: string, id: string, newStatus: string, extra: any = {}, remarks?: string) {
  const { data: t } = await supabase.from("timesheets").select(TS_COLS).eq("id", id).maybeSingle() as any;
  if (!t) throw new Error("Timesheet not found");
  const patch: any = { status: newStatus, ...extra };
  const { data: row, error } = await supabase.from("timesheets").update(patch).eq("id", id).select(TS_COLS).single();
  if (error) throw error;
  await logStatus(supabase, row, t.status, newStatus, userId, remarks);
  return row;
}

export const submitTimesheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) =>
    setStatus(context.supabase, context.userId, data.id, "Submitted", { submitted_by: context.userId, submitted_at: new Date().toISOString() }, "Submitted"));

export const approveTimesheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) =>
    setStatus(context.supabase, context.userId, data.id, "Approved", { approved_by: context.userId, approved_at: new Date().toISOString() }, "Approved"));

export const rejectTimesheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason: string }) => d)
  .handler(async ({ data, context }) =>
    setStatus(context.supabase, context.userId, data.id, "Rejected", { rejection_reason: data.reason }, data.reason));

export const requestTimesheetRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; notes: string }) => d)
  .handler(async ({ data, context }) =>
    setStatus(context.supabase, context.userId, data.id, "Revision Requested", { revision_notes: data.notes }, data.notes));

// ===== ENTRIES =====
export const addTimesheetEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ts } = await supabase.from("timesheets").select("company_id, project_id").eq("id", data.timesheet_id).maybeSingle() as any;
    if (!ts) throw new Error("Timesheet not found");
    const calc = calcEntryHours(data);
    const payload = {
      company_id: ts.company_id, project_id: ts.project_id, timesheet_id: data.timesheet_id,
      employee_id: data.employee_id || null, worker_id: data.worker_id || null, subcontractor_id: data.subcontractor_id || null,
      worker_code: data.worker_code || null, worker_name: data.worker_name,
      worker_type: data.worker_type || "Company Worker",
      trade: data.trade || null, designation: data.designation || null, skill_level: data.skill_level || null,
      wbs_id: data.wbs_id || null, task_id: data.task_id || null, milestone_id: data.milestone_id || null,
      boq_item_id: data.boq_item_id || null, cost_code_id: data.cost_code_id || null,
      work_activity: data.work_activity || null, work_area: data.work_area || null, location: data.location || null,
      attendance_status: data.attendance_status || "Present",
      check_in_time: data.check_in_time || null, check_out_time: data.check_out_time || null,
      break_hours: num(data.break_hours),
      regular_hours: num(data.regular_hours), overtime_hours: num(data.overtime_hours),
      night_hours: num(data.night_hours), weekend_hours: num(data.weekend_hours),
      holiday_hours: num(data.holiday_hours), idle_hours: num(data.idle_hours), leave_hours: num(data.leave_hours),
      total_hours: calc.total_hours,
      hourly_rate: num(data.hourly_rate), overtime_rate: num(data.overtime_rate), cost_amount: calc.cost_amount,
      productivity_quantity: num(data.productivity_quantity), productivity_unit: data.productivity_unit || null,
      remarks: data.remarks || null, source: data.source || "Manual",
      created_by: userId,
    };
    const { data: row, error } = await supabase.from("timesheet_entries").insert(payload).select(ENTRY_COLS).single();
    if (error) throw error;
    await recomputeTotals(supabase, data.timesheet_id);
    return row;
  });

export const updateTimesheetEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: any }) => d)
  .handler(async ({ data, context }) => {
    const calc = calcEntryHours(data.patch);
    const patch = { ...data.patch, total_hours: calc.total_hours, cost_amount: calc.cost_amount };
    const { data: row, error } = await context.supabase.from("timesheet_entries").update(patch).eq("id", data.id).select(ENTRY_COLS).single();
    if (error) throw error;
    await recomputeTotals(context.supabase, row.timesheet_id);
    return row;
  });

export const deleteTimesheetEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("timesheet_entries").select("timesheet_id").eq("id", data.id).maybeSingle() as any;
    const { error } = await context.supabase.from("timesheet_entries").delete().eq("id", data.id);
    if (error) throw error;
    if (row?.timesheet_id) await recomputeTotals(context.supabase, row.timesheet_id);
    return { ok: true };
  });

// ===== ATTACHMENTS / COMMENTS =====
export const addTimesheetAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ts } = await supabase.from("timesheets").select("company_id, project_id").eq("id", data.timesheet_id).maybeSingle() as any;
    if (!ts) throw new Error("Timesheet not found");
    const { data: row, error } = await supabase.from("timesheet_attachments").insert({
      company_id: ts.company_id, project_id: ts.project_id, timesheet_id: data.timesheet_id,
      uploaded_by: userId, file_name: data.file_name, file_url: data.file_url,
      file_type: data.file_type || null, description: data.description || null,
      attachment_type: data.attachment_type || "Timesheet Document",
    }).select("*").single();
    if (error) throw error;
    return row;
  });

export const deleteTimesheetAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("timesheet_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const addTimesheetComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ts } = await supabase.from("timesheets").select("company_id, project_id").eq("id", data.timesheet_id).maybeSingle() as any;
    if (!ts) throw new Error("Timesheet not found");
    const { data: row, error } = await supabase.from("timesheet_comments").insert({
      company_id: ts.company_id, project_id: ts.project_id, timesheet_id: data.timesheet_id,
      user_id: userId, comment: data.comment, visibility: data.visibility || "internal",
    }).select("*").single();
    if (error) throw error;
    return row;
  });

// ===== MANPOWER SYNC =====
export const pullFromManpower = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { timesheet_id: string; manpower_record_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ts } = await supabase.from("timesheets").select("company_id, project_id").eq("id", data.timesheet_id).maybeSingle() as any;
    if (!ts) throw new Error("Timesheet not found");
    const { data: mp } = await supabase.from("manpower_records").select("*").eq("id", data.manpower_record_id).maybeSingle() as any;
    if (!mp) throw new Error("Manpower record not found");
    const calc = calcEntryHours(mp);
    const payload = {
      company_id: ts.company_id, project_id: ts.project_id, timesheet_id: data.timesheet_id,
      worker_name: `${mp.trade || "Crew"} (${mp.actual_count || mp.planned_count || 0} workers)`,
      worker_type: mp.manpower_source === "Subcontractor" ? "Subcontractor Worker" : "Company Worker",
      trade: mp.trade, work_area: mp.work_area, location: mp.location,
      wbs_id: mp.wbs_id, task_id: mp.task_id, milestone_id: mp.milestone_id,
      boq_item_id: mp.boq_item_id, cost_code_id: mp.cost_code_id,
      regular_hours: num(mp.regular_hours), overtime_hours: num(mp.overtime_hours),
      idle_hours: num(mp.idle_hours), total_hours: calc.total_hours,
      hourly_rate: num(mp.hourly_rate), overtime_rate: num(mp.overtime_rate),
      cost_amount: calc.cost_amount, source: "Manpower",
      attendance_status: "Present", created_by: userId,
    };
    const { data: row, error } = await supabase.from("timesheet_entries").insert(payload).select(ENTRY_COLS).single();
    if (error) throw error;
    await supabase.from("timesheets").update({ manpower_record_id: data.manpower_record_id }).eq("id", data.timesheet_id);
    await recomputeTotals(supabase, data.timesheet_id);
    return row;
  });

// ===== PAYROLL EXPORT =====
export const recordPayrollExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null; periodStart: string; periodEnd: string; timesheetIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.timesheetIds.length) throw new Error("No timesheets to export");
    const { data: tss } = await supabase.from("timesheets").select(TS_COLS).in("id", data.timesheetIds).eq("status", "Approved");
    const list = tss || [];
    if (!list.length) throw new Error("Only approved timesheets can be exported");
    const companyId = list[0].company_id;
    const totals = list.reduce((a: any, t: any) => ({
      total_workers: a.total_workers + num(t.total_workers),
      total_regular_hours: a.total_regular_hours + num(t.total_regular_hours),
      total_overtime_hours: a.total_overtime_hours + num(t.total_overtime_hours),
      total_hours: a.total_hours + num(t.total_hours),
      total_cost: a.total_cost + num(t.total_cost),
    }), { total_workers: 0, total_regular_hours: 0, total_overtime_hours: 0, total_hours: 0, total_cost: 0 });
    const exportNumber = `PE-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${String(Date.now()).slice(-4)}`;
    const { data: rec, error } = await supabase.from("timesheet_payroll_exports").insert({
      company_id: companyId, project_id: data.projectId || null, export_number: exportNumber,
      export_period_start: data.periodStart, export_period_end: data.periodEnd,
      total_timesheets: list.length, ...totals,
      export_status: "Generated", exported_by: userId,
    }).select("*").single();
    if (error) throw error;
    const now = new Date().toISOString();
    await supabase.from("timesheets").update({
      payroll_exported: true, payroll_exported_at: now, payroll_exported_by: userId, status: "Payroll Exported",
    }).in("id", data.timesheetIds);
    return rec;
  });

// ===== LOOKUPS =====
export const listProjectsLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("projects").select("id, name, code, currency").order("name");
    return data || [];
  });

export const listManpowerForProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase.from("manpower_records")
      .select("id, record_number, record_date, trade, actual_count, regular_hours, overtime_hours")
      .eq("project_id", data.projectId).eq("is_archived", false).order("record_date", { ascending: false }).limit(50);
    return rows || [];
  });

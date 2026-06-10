import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const REC_COLS =
  "id, company_id, project_id, record_number, record_date, shift, work_area, location, " +
  "wbs_id, task_id, milestone_id, boq_item_id, cost_code_id, daily_report_id, subcontractor_id, " +
  "manpower_source, trade, manpower_category, planned_count, actual_count, present_count, absent_count, idle_count, " +
  "regular_hours, overtime_hours, idle_hours, total_hours, " +
  "productivity_quantity, productivity_unit, productivity_rate, " +
  "hourly_rate, overtime_rate, regular_cost, overtime_cost, total_cost, " +
  "status, remarks, approved_by, approved_at, created_by, is_archived, created_at, updated_at";

export const STATUSES = ["Draft","Submitted","Approved","Rejected","Revision Requested","Closed","Cancelled","Archived"] as const;
export const SHIFTS = ["Day","Night","Split","Overtime","Weekend","Holiday"] as const;
export const SOURCES = ["Company","Subcontractor","Supplier","Consultant","Client","Temporary Labour","Other"] as const;
export const CATEGORIES = ["Skilled","Semi-Skilled","Unskilled","Supervisor","Engineer","Operator","Technician","Admin","Subcontractor","Temporary","Other"] as const;
export const TRADES = [
  "General Labour","Mason","Carpenter","Steel Fixer","Welder","Electrician","Plumber","HVAC Technician",
  "Painter","Tiler","Scaffolder","Rigger","Crane Operator","Equipment Operator","Driver","Storekeeper",
  "Safety Officer","QA/QC Inspector","Site Engineer","Supervisor","Foreman","Cleaning Team","Security","Other",
] as const;
export const SKILL_LEVELS = ["Helper","Semi-Skilled","Skilled","Technician","Foreman","Supervisor","Engineer","Operator","Specialist"] as const;
export const WORKER_TYPES = ["Company Worker","Subcontractor Worker","Temporary Worker","Daily Labour","Consultant Staff","Client Staff","Other"] as const;
export const ATTENDANCE_STATUSES = ["Present","Absent","Late","Half Day","Leave","Sick","Idle","Transferred","Off Day"] as const;

function calcTotals(input: any) {
  const reg = Number(input.regular_hours || 0);
  const ot = Number(input.overtime_hours || 0);
  const idle = Number(input.idle_hours || 0);
  const total = reg + ot + idle;
  const qty = Number(input.productivity_quantity || 0);
  const labourHrs = reg + ot;
  const rate = labourHrs > 0 ? qty / labourHrs : 0;
  const hr = Number(input.hourly_rate || 0);
  const otr = Number(input.overtime_rate || 0);
  const regCost = reg * hr;
  const otCost = ot * otr;
  return {
    total_hours: total,
    productivity_rate: rate,
    regular_cost: regCost,
    overtime_cost: otCost,
    total_cost: regCost + otCost,
  };
}

async function nextRecNumber(supabase: any, projectId: string) {
  const { data: proj } = await supabase.from("projects").select("code, name").eq("id", projectId).maybeSingle();
  const code = (proj?.code || proj?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const prefix = `MP-${code}-${ymd}-`;
  const { data } = await supabase
    .from("manpower_records").select("record_number")
    .eq("project_id", projectId).ilike("record_number", `${prefix}%`);
  const max = (data || []).reduce((m: number, r: any) => {
    const n = parseInt(String(r.record_number || "").split("-").pop() || "0", 10);
    return n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

// ============ LIST / GET ============
export const listManpower = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("manpower_records").select(REC_COLS).eq("is_archived", false).order("record_date", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows || [];
  });

export const getManpower = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rec, error } = await context.supabase.from("manpower_records").select(REC_COLS).eq("id", data.id).maybeSingle();
    if (error) throw error;
    const [att, prod, atts, com, hist] = await Promise.all([
      context.supabase.from("manpower_attendance").select("*").eq("manpower_record_id", data.id).eq("is_archived", false).order("attendance_date", { ascending: false }),
      context.supabase.from("manpower_productivity").select("*").eq("manpower_record_id", data.id).eq("is_archived", false).order("record_date", { ascending: false }),
      context.supabase.from("manpower_attachments").select("*").eq("manpower_record_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("manpower_comments").select("*").eq("manpower_record_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("manpower_status_history").select("*").eq("manpower_record_id", data.id).order("created_at", { ascending: false }),
    ]);
    return { record: rec, attendance: att.data || [], productivity: prod.data || [], attachments: atts.data || [], comments: com.data || [], history: hist.data || [] };
  });

// ============ SAVE / DELETE ============
const saveSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  record_number: z.string().max(80).nullable().optional(),
  record_date: z.string(),
  shift: z.string().default("Day"),
  work_area: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  milestone_id: z.string().uuid().nullable().optional(),
  boq_item_id: z.string().uuid().nullable().optional(),
  cost_code_id: z.string().uuid().nullable().optional(),
  daily_report_id: z.string().uuid().nullable().optional(),
  subcontractor_id: z.string().uuid().nullable().optional(),
  manpower_source: z.string().default("Company"),
  trade: z.string().min(1),
  manpower_category: z.string().default("Skilled"),
  planned_count: z.number().int().min(0).default(0),
  actual_count: z.number().int().min(0).default(0),
  present_count: z.number().int().min(0).default(0),
  absent_count: z.number().int().min(0).default(0),
  idle_count: z.number().int().min(0).default(0),
  regular_hours: z.number().min(0).default(0),
  overtime_hours: z.number().min(0).default(0),
  idle_hours: z.number().min(0).default(0),
  productivity_quantity: z.number().min(0).default(0),
  productivity_unit: z.string().nullable().optional(),
  hourly_rate: z.number().min(0).default(0),
  overtime_rate: z.number().min(0).default(0),
  status: z.string().default("Draft"),
  remarks: z.string().nullable().optional(),
});

export const saveManpower = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { data: prof } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    const companyId = prof?.company_id;
    const totals = calcTotals(rest);
    const recordNumber = rest.record_number || (id ? undefined : await nextRecNumber(context.supabase, rest.project_id));
    const payload: any = { ...rest, ...totals };
    if (recordNumber) payload.record_number = recordNumber;

    if (id) {
      const { data: out, error } = await context.supabase.from("manpower_records").update(payload).eq("id", id).select(REC_COLS).maybeSingle();
      if (error) throw error;
      return out;
    }
    payload.company_id = companyId;
    payload.created_by = context.userId;
    const { data: out, error } = await context.supabase.from("manpower_records").insert(payload).select(REC_COLS).maybeSingle();
    if (error) throw error;
    return out;
  });

export const setManpowerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string; remarks?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { data: cur } = await context.supabase.from("manpower_records").select("status, project_id, company_id").eq("id", data.id).maybeSingle();
    const patch: any = { status: data.status };
    if (data.status === "Approved") { patch.approved_by = context.userId; patch.approved_at = new Date().toISOString(); }
    const { error } = await context.supabase.from("manpower_records").update(patch).eq("id", data.id);
    if (error) throw error;
    await context.supabase.from("manpower_status_history").insert({
      company_id: cur?.company_id, project_id: cur?.project_id, manpower_record_id: data.id,
      old_status: cur?.status, new_status: data.status, changed_by: context.userId, remarks: data.remarks ?? null,
    });
    return { ok: true };
  });

export const archiveManpower = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("manpower_records").update({ is_archived: true, status: "Archived" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ PLANS ============
export const listManpowerPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("manpower_plans").select("*").eq("is_archived", false).order("plan_date", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows || [];
  });

const planSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  plan_name: z.string().default("Main Manpower Plan"),
  plan_date: z.string(),
  week_start: z.string().nullable().optional(),
  week_end: z.string().nullable().optional(),
  month: z.string().nullable().optional(),
  trade: z.string().nullable().optional(),
  manpower_category: z.string().default("General"),
  planned_count: z.number().int().min(0).default(0),
  planned_hours: z.number().min(0).default(0),
  planned_overtime_hours: z.number().min(0).default(0),
  planned_cost: z.number().min(0).default(0),
  remarks: z.string().nullable().optional(),
  status: z.string().default("Active"),
});

export const saveManpowerPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => planSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { data: prof } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (id) {
      const { data: out, error } = await context.supabase.from("manpower_plans").update(rest).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return out;
    }
    const { data: out, error } = await context.supabase.from("manpower_plans").insert({ ...rest, company_id: prof?.company_id, created_by: context.userId }).select().maybeSingle();
    if (error) throw error;
    return out;
  });

export const archiveManpowerPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("manpower_plans").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ WORKERS ============
export const listWorkers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("manpower_workers").select("*").eq("is_archived", false).order("worker_name");
    if (data.projectId) q = q.or(`project_id.eq.${data.projectId},project_id.is.null`);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows || [];
  });

const workerSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid().nullable().optional(),
  worker_code: z.string().nullable().optional(),
  worker_name: z.string().min(1),
  worker_type: z.string().default("Company Worker"),
  trade: z.string().nullable().optional(),
  skill_level: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  subcontractor_id: z.string().uuid().nullable().optional(),
  phone: z.string().nullable().optional(),
  id_number: z.string().nullable().optional(),
  joining_date: z.string().nullable().optional(),
  status: z.string().default("Active"),
  hourly_rate: z.number().min(0).default(0),
  overtime_rate: z.number().min(0).default(0),
});

export const saveWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => workerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { data: prof } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (id) {
      const { data: out, error } = await context.supabase.from("manpower_workers").update(rest).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return out;
    }
    const { data: out, error } = await context.supabase.from("manpower_workers").insert({ ...rest, company_id: prof?.company_id, created_by: context.userId }).select().maybeSingle();
    if (error) throw error;
    return out;
  });

export const archiveWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("manpower_workers").update({ is_archived: true, status: "Inactive" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ ATTENDANCE ============
const attSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  manpower_record_id: z.string().uuid().nullable().optional(),
  worker_id: z.string().uuid().nullable().optional(),
  attendance_date: z.string(),
  shift: z.string().default("Day"),
  trade: z.string().nullable().optional(),
  work_area: z.string().nullable().optional(),
  check_in_time: z.string().nullable().optional(),
  check_out_time: z.string().nullable().optional(),
  status: z.string().default("Present"),
  regular_hours: z.number().min(0).default(0),
  overtime_hours: z.number().min(0).default(0),
  idle_hours: z.number().min(0).default(0),
  remarks: z.string().nullable().optional(),
  source: z.string().default("Manual"),
});

export const saveAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => attSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const total = Number(rest.regular_hours || 0) + Number(rest.overtime_hours || 0) + Number(rest.idle_hours || 0);
    const payload: any = { ...rest, total_hours: total };
    const { data: prof } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (id) {
      const { data: out, error } = await context.supabase.from("manpower_attendance").update(payload).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return out;
    }
    payload.company_id = prof?.company_id;
    payload.created_by = context.userId;
    const { data: out, error } = await context.supabase.from("manpower_attendance").insert(payload).select().maybeSingle();
    if (error) throw error;
    return out;
  });

export const deleteAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("manpower_attendance").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ PRODUCTIVITY ============
const prodSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  manpower_record_id: z.string().uuid().nullable().optional(),
  record_date: z.string(),
  work_activity: z.string().min(1),
  trade: z.string().nullable().optional(),
  output_quantity: z.number().min(0).default(0),
  output_unit: z.string().nullable().optional(),
  labour_hours: z.number().min(0).default(0),
  remarks: z.string().nullable().optional(),
});

export const saveProductivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => prodSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const rate = rest.labour_hours > 0 ? rest.output_quantity / rest.labour_hours : 0;
    const payload: any = { ...rest, productivity_rate: rate };
    const { data: prof } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (id) {
      const { data: out, error } = await context.supabase.from("manpower_productivity").update(payload).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return out;
    }
    payload.company_id = prof?.company_id;
    payload.created_by = context.userId;
    const { data: out, error } = await context.supabase.from("manpower_productivity").insert(payload).select().maybeSingle();
    if (error) throw error;
    return out;
  });

export const deleteProductivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("manpower_productivity").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ ATTACHMENTS / COMMENTS ============
export const addManpowerAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { manpower_record_id: string; project_id: string; file_name: string; file_url: string; file_type?: string | null; description?: string | null; attachment_type?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    const { data: out, error } = await context.supabase.from("manpower_attachments").insert({
      ...data, company_id: prof?.company_id, uploaded_by: context.userId,
      attachment_type: data.attachment_type || "Manpower Document",
    }).select().maybeSingle();
    if (error) throw error;
    return out;
  });

export const deleteManpowerAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("manpower_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const addManpowerComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { manpower_record_id: string; project_id: string; comment: string; visibility?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    const { data: out, error } = await context.supabase.from("manpower_comments").insert({
      ...data, company_id: prof?.company_id, user_id: context.userId, visibility: data.visibility || "internal",
    }).select().maybeSingle();
    if (error) throw error;
    return out;
  });

// ============ STATS ============
export const manpowerStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null; date?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const today = data.date || new Date().toISOString().slice(0, 10);
    let q = context.supabase.from("manpower_records").select(REC_COLS).eq("is_archived", false);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    const todayRows = (rows || []).filter((r: any) => r.record_date === today);
    const sum = (arr: any[], k: string) => arr.reduce((a, r) => a + Number(r[k] || 0), 0);
    return {
      todayCount: sum(todayRows, "actual_count"),
      todayPlanned: sum(todayRows, "planned_count"),
      present: sum(todayRows, "present_count"),
      absent: sum(todayRows, "absent_count"),
      idle: sum(todayRows, "idle_count"),
      regularHours: sum(todayRows, "regular_hours"),
      overtimeHours: sum(todayRows, "overtime_hours"),
      idleHours: sum(todayRows, "idle_hours"),
      totalHours: sum(todayRows, "total_hours"),
      laborCost: sum(todayRows, "total_cost"),
      subcontractor: sum(todayRows.filter((r: any) => r.manpower_source === "Subcontractor"), "actual_count"),
      company: sum(todayRows.filter((r: any) => r.manpower_source === "Company"), "actual_count"),
    };
  });

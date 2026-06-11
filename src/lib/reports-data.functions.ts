import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function getCompanyId(sb: any, userId: string): Promise<string> {
  const { data } = await sb.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  if (!data?.company_id) throw new Error("No company");
  return data.company_id as string;
}

const MODULES = [
  "projects", "tasks", "milestones", "daily_reports", "issues", "snags", "meetings",
  "approvals", "rfis", "submittals", "boq_items", "variations", "payment_claims",
  "project_budgets", "cash_flow_entries", "procurement_requests", "rfqs", "purchase_orders",
  "deliveries", "suppliers", "quality_inspections", "ncrs", "safety_inspections",
  "safety_hazards", "risks", "manpower_records", "equipment", "timesheets",
  "documents", "drawings", "notifications", "audit_logs",
] as const;

type Module = (typeof MODULES)[number];

const MODULE_CONFIG: Record<string, {
  label: string; category: string; dateCol: string;
  select: string; columns: { key: string; label: string }[];
}> = {
  projects: { label: "Projects", category: "Project Management", dateCol: "created_at",
    select: "id, code, name, status, progress, start_date, end_date, budget",
    columns: [
      { key: "code", label: "Code" }, { key: "name", label: "Project" },
      { key: "status", label: "Status" }, { key: "progress", label: "Progress %" },
      { key: "start_date", label: "Start" }, { key: "end_date", label: "End" },
      { key: "budget", label: "Budget" },
    ]},
  tasks: { label: "Tasks", category: "Project Management", dateCol: "created_at",
    select: "id, title, status, priority, due_date, assigned_to",
    columns: [
      { key: "title", label: "Task" }, { key: "status", label: "Status" },
      { key: "priority", label: "Priority" }, { key: "due_date", label: "Due" },
    ]},
  milestones: { label: "Milestones", category: "Project Management", dateCol: "created_at",
    select: "id, name, due_date, completed_at, status",
    columns: [{ key: "name", label: "Milestone" }, { key: "due_date", label: "Due" }, { key: "status", label: "Status" }, { key: "completed_at", label: "Completed" }]},
  daily_reports: { label: "Daily Reports", category: "Progress", dateCol: "report_date",
    select: "id, report_date, weather, work_completed, status",
    columns: [{ key: "report_date", label: "Date" }, { key: "weather", label: "Weather" }, { key: "status", label: "Status" }, { key: "work_completed", label: "Work" }]},
  issues: { label: "Issues", category: "Project Management", dateCol: "created_at",
    select: "id, title, status, priority, due_date",
    columns: [{ key: "title", label: "Issue" }, { key: "status", label: "Status" }, { key: "priority", label: "Priority" }, { key: "due_date", label: "Due" }]},
  snags: { label: "Snags", category: "Quality", dateCol: "created_at",
    select: "id, title, status, location",
    columns: [{ key: "title", label: "Snag" }, { key: "status", label: "Status" }, { key: "location", label: "Location" }]},
  meetings: { label: "Meetings", category: "Meetings", dateCol: "meeting_date",
    select: "id, title, meeting_date, status",
    columns: [{ key: "title", label: "Meeting" }, { key: "meeting_date", label: "Date" }, { key: "status", label: "Status" }]},
  approvals: { label: "Approvals", category: "Approvals", dateCol: "created_at",
    select: "id, title, entity_type, status",
    columns: [{ key: "title", label: "Item" }, { key: "entity_type", label: "Type" }, { key: "status", label: "Status" }]},
  rfis: { label: "RFIs", category: "Approvals", dateCol: "created_at",
    select: "id, rfi_number, subject, status, due_date",
    columns: [{ key: "rfi_number", label: "#" }, { key: "subject", label: "Subject" }, { key: "status", label: "Status" }, { key: "due_date", label: "Due" }]},
  submittals: { label: "Submittals", category: "Approvals", dateCol: "created_at",
    select: "id, submittal_number, title, status, due_date",
    columns: [{ key: "submittal_number", label: "#" }, { key: "title", label: "Title" }, { key: "status", label: "Status" }, { key: "due_date", label: "Due" }]},
  boq_items: { label: "BOQ Items", category: "Commercial / Cost", dateCol: "created_at",
    select: "id, item_code, description, unit, quantity, completed_qty, unit_rate",
    columns: [{ key: "item_code", label: "Code" }, { key: "description", label: "Description" }, { key: "unit", label: "Unit" }, { key: "quantity", label: "Qty" }, { key: "completed_qty", label: "Done" }, { key: "unit_rate", label: "Rate" }]},
  variations: { label: "Variations", category: "Commercial / Cost", dateCol: "created_at",
    select: "id, variation_number, title, status, cost_impact, approved_amount",
    columns: [{ key: "variation_number", label: "#" }, { key: "title", label: "Title" }, { key: "status", label: "Status" }, { key: "cost_impact", label: "Cost" }, { key: "approved_amount", label: "Approved" }]},
  payment_claims: { label: "Payment Claims", category: "Finance / Cash Flow", dateCol: "created_at",
    select: "id, claim_number, status, net_claim, period_end",
    columns: [{ key: "claim_number", label: "#" }, { key: "status", label: "Status" }, { key: "net_claim", label: "Net Claim" }, { key: "period_end", label: "Period End" }]},
  project_budgets: { label: "Budgets", category: "Commercial / Cost", dateCol: "created_at",
    select: "id, name, total_budget, status",
    columns: [{ key: "name", label: "Budget" }, { key: "total_budget", label: "Total" }, { key: "status", label: "Status" }]},
  cash_flow_entries: { label: "Cash Flow", category: "Finance / Cash Flow", dateCol: "entry_date",
    select: "id, entry_date, entry_type, amount, status",
    columns: [{ key: "entry_date", label: "Date" }, { key: "entry_type", label: "Type" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" }]},
  procurement_requests: { label: "Material Requests", category: "Procurement", dateCol: "created_at",
    select: "id, request_number, material_name, status, estimated_cost",
    columns: [{ key: "request_number", label: "#" }, { key: "material_name", label: "Material" }, { key: "status", label: "Status" }, { key: "estimated_cost", label: "Est. Cost" }]},
  rfqs: { label: "RFQs", category: "Procurement", dateCol: "created_at",
    select: "id, rfq_number, title, status",
    columns: [{ key: "rfq_number", label: "#" }, { key: "title", label: "Title" }, { key: "status", label: "Status" }]},
  purchase_orders: { label: "Purchase Orders", category: "Procurement", dateCol: "created_at",
    select: "id, po_number, status, total_amount",
    columns: [{ key: "po_number", label: "PO #" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Total" }]},
  deliveries: { label: "Deliveries", category: "Procurement", dateCol: "created_at",
    select: "id, delivery_note, status, delivery_date",
    columns: [{ key: "delivery_note", label: "Note" }, { key: "delivery_date", label: "Date" }, { key: "status", label: "Status" }]},
  suppliers: { label: "Suppliers", category: "Procurement", dateCol: "created_at",
    select: "id, name, status, category",
    columns: [{ key: "name", label: "Supplier" }, { key: "category", label: "Category" }, { key: "status", label: "Status" }]},
  quality_inspections: { label: "Quality Inspections", category: "Quality", dateCol: "created_at",
    select: "id, inspection_number, title, status, result",
    columns: [{ key: "inspection_number", label: "#" }, { key: "title", label: "Title" }, { key: "status", label: "Status" }, { key: "result", label: "Result" }]},
  ncrs: { label: "NCRs", category: "Quality", dateCol: "created_at",
    select: "id, ncr_number, title, status, severity",
    columns: [{ key: "ncr_number", label: "#" }, { key: "title", label: "Title" }, { key: "severity", label: "Severity" }, { key: "status", label: "Status" }]},
  safety_inspections: { label: "Safety Inspections", category: "Safety / HSE", dateCol: "created_at",
    select: "id, inspection_number, title, status, score",
    columns: [{ key: "inspection_number", label: "#" }, { key: "title", label: "Title" }, { key: "score", label: "Score" }, { key: "status", label: "Status" }]},
  safety_hazards: { label: "Safety Hazards", category: "Safety / HSE", dateCol: "created_at",
    select: "id, title, severity, status",
    columns: [{ key: "title", label: "Hazard" }, { key: "severity", label: "Severity" }, { key: "status", label: "Status" }]},
  risks: { label: "Risks", category: "Risk", dateCol: "created_at",
    select: "id, risk_number, title, risk_level, risk_score, status",
    columns: [{ key: "risk_number", label: "#" }, { key: "title", label: "Risk" }, { key: "risk_level", label: "Level" }, { key: "risk_score", label: "Score" }, { key: "status", label: "Status" }]},
  manpower_records: { label: "Manpower", category: "Resources", dateCol: "record_date",
    select: "id, record_date, trade, total_workers, total_hours",
    columns: [{ key: "record_date", label: "Date" }, { key: "trade", label: "Trade" }, { key: "total_workers", label: "Workers" }, { key: "total_hours", label: "Hours" }]},
  equipment: { label: "Equipment", category: "Resources", dateCol: "created_at",
    select: "id, equipment_code, name, status, equipment_type",
    columns: [{ key: "equipment_code", label: "Code" }, { key: "name", label: "Name" }, { key: "equipment_type", label: "Type" }, { key: "status", label: "Status" }]},
  timesheets: { label: "Timesheets", category: "Resources", dateCol: "period_start",
    select: "id, timesheet_number, period_start, period_end, status, total_hours",
    columns: [{ key: "timesheet_number", label: "#" }, { key: "period_start", label: "From" }, { key: "period_end", label: "To" }, { key: "total_hours", label: "Hours" }, { key: "status", label: "Status" }]},
  documents: { label: "Documents", category: "Documents", dateCol: "created_at",
    select: "id, document_number, name, status, expires_at",
    columns: [{ key: "document_number", label: "#" }, { key: "name", label: "Name" }, { key: "status", label: "Status" }, { key: "expires_at", label: "Expires" }]},
  drawings: { label: "Drawings", category: "Drawings", dateCol: "created_at",
    select: "id, drawing_number, title, discipline, status, current_revision",
    columns: [{ key: "drawing_number", label: "#" }, { key: "title", label: "Title" }, { key: "discipline", label: "Discipline" }, { key: "current_revision", label: "Rev" }, { key: "status", label: "Status" }]},
  notifications: { label: "Notifications", category: "System / Audit", dateCol: "created_at",
    select: "id, title, message, module_name, is_read",
    columns: [{ key: "title", label: "Title" }, { key: "module_name", label: "Module" }, { key: "is_read", label: "Read" }]},
  audit_logs: { label: "Audit Logs", category: "System / Audit", dateCol: "created_at",
    select: "id, action, entity_type, entity_id",
    columns: [{ key: "entity_type", label: "Entity" }, { key: "action", label: "Action" }, { key: "entity_id", label: "ID" }]},
};

export const listReportModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => Object.entries(MODULE_CONFIG).map(([k, v]) => ({
    module: k, label: v.label, category: v.category, columns: v.columns,
  })));

export const generateStandardReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    module: z.string(),
    projectId: z.string().uuid().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    limit: z.number().int().min(1).max(5000).optional().default(1000),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const cfg = MODULE_CONFIG[data.module];
    if (!cfg) throw new Error("Unknown module");
    const sb = context.supabase as any;
    let q = sb.from(data.module).select(cfg.select).limit(data.limit ?? 1000);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.dateFrom) q = q.gte(cfg.dateCol, data.dateFrom);
    if (data.dateTo) q = q.lte(cfg.dateCol, data.dateTo);
    q = q.order(cfg.dateCol, { ascending: false });
    const { data: rows, error } = await q;
    if (error) {
      return { module: data.module, label: cfg.label, category: cfg.category,
        columns: cfg.columns, rows: [], summary: { total: 0, error: error.message } };
    }
    const list = (rows ?? []) as any[];
    const summary: Record<string, any> = { total: list.length };
    // status breakdown
    if (list[0] && "status" in list[0]) {
      const breakdown: Record<string, number> = {};
      for (const r of list) {
        const s = String(r.status ?? "—");
        breakdown[s] = (breakdown[s] ?? 0) + 1;
      }
      summary.byStatus = breakdown;
    }
    return { module: data.module, label: cfg.label, category: cfg.category,
      columns: cfg.columns, rows: list, summary };
  });

// ---------- Templates ----------
export const listReportTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data } = await sb.from("report_templates").select("*")
      .eq("is_archived", false).order("created_at", { ascending: false });
    return data ?? [];
  });

export const saveReportTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    template_name: z.string().min(1).max(200),
    template_description: z.string().max(2000).optional().nullable(),
    report_module: z.string(),
    report_type: z.string().optional(),
    report_category: z.string().optional(),
    selected_columns: z.any().optional(),
    filters: z.any().optional(),
    grouping: z.any().optional(),
    sorting: z.any().optional(),
    chart_config: z.any().optional(),
    is_shared: z.boolean().optional(),
    is_client_visible: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const companyId = await getCompanyId(sb, context.userId!);
    const payload = { ...data, company_id: companyId, created_by: context.userId };
    if (data.id) {
      const { data: r, error } = await sb.from("report_templates").update(payload).eq("id", data.id).select().single();
      if (error) throw error; return r;
    }
    const { data: r, error } = await sb.from("report_templates").insert(payload).select().single();
    if (error) throw error; return r;
  });

export const archiveReportTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from("report_templates").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error; return { ok: true };
  });

// ---------- Saved Reports ----------
export const listSavedReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data } = await sb.from("saved_reports").select("id, report_name, report_module, report_category, project_id, generated_at, is_client_visible, status, date_from, date_to")
      .eq("is_archived", false).order("generated_at", { ascending: false }).limit(200);
    return data ?? [];
  });

export const getSavedReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: r, error } = await sb.from("saved_reports").select("*").eq("id", data.id).single();
    if (error) throw error; return r;
  });

export const saveGeneratedReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    report_name: z.string().min(1).max(200),
    report_description: z.string().max(2000).optional().nullable(),
    report_module: z.string(),
    report_type: z.string().optional(),
    report_category: z.string().optional(),
    project_id: z.string().uuid().optional().nullable(),
    date_from: z.string().optional().nullable(),
    date_to: z.string().optional().nullable(),
    report_filters: z.any().optional(),
    report_data: z.any().optional(),
    report_summary: z.any().optional(),
    is_client_visible: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const companyId = await getCompanyId(sb, context.userId!);
    const { data: r, error } = await sb.from("saved_reports").insert({
      ...data, company_id: companyId, generated_by: context.userId, created_by: context.userId,
    }).select().single();
    if (error) throw error; return r;
  });

export const archiveSavedReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from("saved_reports").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error; return { ok: true };
  });

export const setReportClientVisible = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), is_client_visible: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from("saved_reports").update({ is_client_visible: data.is_client_visible }).eq("id", data.id);
    if (error) throw error; return { ok: true };
  });

// ---------- Exports ----------
export const listReportExports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data } = await sb.from("report_exports").select("*").order("exported_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const recordReportExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    saved_report_id: z.string().uuid().optional().nullable(),
    report_template_id: z.string().uuid().optional().nullable(),
    project_id: z.string().uuid().optional().nullable(),
    export_type: z.string().default("CSV"),
    file_name: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const companyId = await getCompanyId(sb, context.userId!);
    const { data: r, error } = await sb.from("report_exports").insert({
      ...data, company_id: companyId, exported_by: context.userId, export_status: "Completed",
    }).select().single();
    if (error) throw error; return r;
  });

// ---------- Schedules ----------
export const listReportSchedules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data } = await sb.from("report_schedules").select("*")
      .eq("is_archived", false).order("created_at", { ascending: false });
    return data ?? [];
  });

export const saveReportSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    schedule_name: z.string().min(1).max(200),
    report_template_id: z.string().uuid().optional().nullable(),
    project_id: z.string().uuid().optional().nullable(),
    frequency: z.enum(["Daily", "Weekly", "Monthly", "Quarterly"]),
    recipients: z.any().optional(),
    next_run_date: z.string().optional().nullable(),
    status: z.string().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const companyId = await getCompanyId(sb, context.userId!);
    const payload = { ...data, company_id: companyId, created_by: context.userId };
    if (data.id) {
      const { data: r, error } = await sb.from("report_schedules").update(payload).eq("id", data.id).select().single();
      if (error) throw error; return r;
    }
    const { data: r, error } = await sb.from("report_schedules").insert(payload).select().single();
    if (error) throw error; return r;
  });

export const archiveReportSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from("report_schedules").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error; return { ok: true };
  });

// ---------- Stats ----------
export const reportStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const [tpl, saved, exp, sched, mo, cv] = await Promise.all([
      sb.from("report_templates").select("id", { count: "exact", head: true }).eq("is_archived", false),
      sb.from("saved_reports").select("id", { count: "exact", head: true }).eq("is_archived", false),
      sb.from("report_exports").select("id", { count: "exact", head: true }),
      sb.from("report_schedules").select("id", { count: "exact", head: true }).eq("is_archived", false).eq("status", "Active"),
      sb.from("saved_reports").select("id", { count: "exact", head: true }).gte("generated_at", monthStart.toISOString()),
      sb.from("saved_reports").select("id", { count: "exact", head: true }).eq("is_client_visible", true).eq("is_archived", false),
    ]);
    return {
      templates: tpl.count ?? 0,
      saved: saved.count ?? 0,
      exports: exp.count ?? 0,
      activeSchedules: sched.count ?? 0,
      generatedThisMonth: mo.count ?? 0,
      clientVisible: cv.count ?? 0,
      availableModules: Object.keys(MODULE_CONFIG).length,
    };
  });

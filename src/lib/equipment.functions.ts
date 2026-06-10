import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const EQ_COLS =
  "id, company_id, project_id, equipment_code, equipment_name, equipment_type, category, " +
  "make_brand, model, serial_number, registration_number, asset_number, ownership_type, " +
  "supplier_id, subcontractor_id, current_location, assigned_to_project_id, assigned_operator_id, " +
  "operator_name, operator_phone, purchase_date, purchase_cost, rental_rate_hourly, rental_rate_daily, " +
  "fuel_type, fuel_capacity, current_meter_reading, current_status, availability_status, condition_status, " +
  "last_maintenance_date, next_maintenance_date, insurance_expiry_date, registration_expiry_date, " +
  "inspection_expiry_date, remarks, created_by, is_archived, created_at, updated_at";

export const EQ_STATUSES = ["Available","Assigned","In Use","Idle","Under Maintenance","Breakdown","Out of Service","Retired","Sold","Archived"] as const;
export const AVAILABILITY = ["Available","Not Available","Assigned","In Use","Standby","Breakdown","Maintenance"] as const;
export const CONDITIONS = ["Excellent","Good","Fair","Poor","Damaged","Unsafe","Needs Repair"] as const;
export const OWNERSHIP = ["Owned","Rented","Leased","Subcontractor","Supplier Provided","Client Provided"] as const;
export const EQ_TYPES = ["Excavator","Crane","Forklift","Loader","Backhoe Loader","Truck","Concrete Mixer","Concrete Pump","Generator","Welding Machine","Compressor","Scaffolding","Hoist","Winch","Power Tools","Survey Equipment","Safety Equipment","Vehicle","General Equipment"] as const;
export const EQ_CATEGORIES = ["Heavy Equipment","Light Equipment","Lifting Equipment","Transport","Concrete Equipment","Electrical Equipment","Welding Equipment","Temporary Works","Tools","Vehicles","Testing Equipment","General"] as const;
export const SHIFTS = ["Day","Night","Split","Overtime","Weekend","Holiday"] as const;
export const MAINT_TYPES = ["Preventive","Corrective","Routine Service","Emergency Repair","Inspection-Based","Calibration","Oil Change","Tire / Track Maintenance","Electrical Repair","Mechanical Repair"] as const;
export const MAINT_STATUSES = ["Scheduled","Due","In Progress","Completed","Overdue","Cancelled"] as const;
export const BREAKDOWN_SEVERITY = ["Low","Medium","High","Critical"] as const;
export const BREAKDOWN_STATUSES = ["Open","Under Repair","Waiting Parts","Resolved","Closed","Cancelled"] as const;
export const INSPECTION_TYPES = ["Daily Check","Weekly Inspection","Monthly Inspection","Safety Inspection","Pre-Use Inspection","Post-Maintenance Inspection","Compliance Inspection"] as const;
export const INSPECTION_RESULTS = ["Pass","Pass with Comments","Fail","Unsafe","Not Applicable"] as const;
export const DOC_TYPES = ["Registration","Insurance","Operator Certificate","Inspection Certificate","Calibration Certificate","Fitness Certificate","Rental Agreement","Purchase Document","Warranty","Maintenance Record","Compliance Certificate","Other"] as const;
export const USAGE_STATUSES = ["Draft","Submitted","Approved","Rejected","Archived"] as const;

async function getCompanyId(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  return data?.company_id as string | undefined;
}

async function nextEquipmentCode(supabase: any, companyId: string) {
  const year = new Date().getFullYear();
  const prefix = `EQP-${year}-`;
  const { data } = await supabase.from("equipment").select("equipment_code")
    .eq("company_id", companyId).ilike("equipment_code", `${prefix}%`);
  const max = (data || []).reduce((m: number, r: any) => {
    const n = parseInt(String(r.equipment_code || "").split("-").pop() || "0", 10);
    return n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function nextNumber(supabase: any, table: string, field: string, companyId: string, prefix: string) {
  const { data } = await supabase.from(table).select(field).eq("company_id", companyId).ilike(field, `${prefix}%`);
  const max = (data || []).reduce((m: number, r: any) => {
    const n = parseInt(String(r[field] || "").split("-").pop() || "0", 10);
    return n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

// =================== EQUIPMENT MASTER ===================
export const listEquipment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("equipment").select("*").eq("is_archived", false).order("created_at", { ascending: false });
    if (data.projectId) q = q.or(`project_id.eq.${data.projectId},assigned_to_project_id.eq.${data.projectId}`);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows || [];
  });

export const getEquipment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: eq } = await context.supabase.from("equipment").select("*").eq("id", data.id).maybeSingle();
    const [assignments, usage, maint, breakdowns, inspections, docs, atts, comments, hist] = await Promise.all([
      context.supabase.from("equipment_assignments").select("*").eq("equipment_id", data.id).eq("is_archived", false).order("assignment_start_date", { ascending: false }),
      context.supabase.from("equipment_usage_logs").select("*").eq("equipment_id", data.id).eq("is_archived", false).order("usage_date", { ascending: false }),
      context.supabase.from("equipment_maintenance").select("*").eq("equipment_id", data.id).eq("is_archived", false).order("scheduled_date", { ascending: false }),
      context.supabase.from("equipment_breakdowns").select("*").eq("equipment_id", data.id).eq("is_archived", false).order("breakdown_date", { ascending: false }),
      context.supabase.from("equipment_inspections").select("*").eq("equipment_id", data.id).eq("is_archived", false).order("inspection_date", { ascending: false }),
      context.supabase.from("equipment_documents").select("*").eq("equipment_id", data.id).eq("is_archived", false).order("expiry_date", { ascending: true }),
      context.supabase.from("equipment_attachments").select("*").eq("equipment_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("equipment_comments").select("*").eq("equipment_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("equipment_status_history").select("*").eq("equipment_id", data.id).order("created_at", { ascending: false }),
    ]);
    return {
      equipment: eq,
      assignments: assignments.data || [],
      usage: usage.data || [],
      maintenance: maint.data || [],
      breakdowns: breakdowns.data || [],
      inspections: inspections.data || [],
      documents: docs.data || [],
      attachments: atts.data || [],
      comments: comments.data || [],
      history: hist.data || [],
    };
  });

const equipmentSchema = z.object({
  id: z.string().uuid().optional(),
  equipment_code: z.string().nullable().optional(),
  equipment_name: z.string().min(1),
  equipment_type: z.string().default("General Equipment"),
  category: z.string().default("General"),
  make_brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  serial_number: z.string().nullable().optional(),
  registration_number: z.string().nullable().optional(),
  asset_number: z.string().nullable().optional(),
  ownership_type: z.string().default("Owned"),
  supplier_id: z.string().uuid().nullable().optional(),
  subcontractor_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  assigned_to_project_id: z.string().uuid().nullable().optional(),
  current_location: z.string().nullable().optional(),
  operator_name: z.string().nullable().optional(),
  operator_phone: z.string().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  purchase_cost: z.number().min(0).default(0),
  rental_rate_hourly: z.number().min(0).default(0),
  rental_rate_daily: z.number().min(0).default(0),
  fuel_type: z.string().nullable().optional(),
  fuel_capacity: z.number().min(0).default(0),
  current_meter_reading: z.number().min(0).default(0),
  current_status: z.string().default("Available"),
  availability_status: z.string().default("Available"),
  condition_status: z.string().default("Good"),
  last_maintenance_date: z.string().nullable().optional(),
  next_maintenance_date: z.string().nullable().optional(),
  insurance_expiry_date: z.string().nullable().optional(),
  registration_expiry_date: z.string().nullable().optional(),
  inspection_expiry_date: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export const saveEquipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => equipmentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const companyId = await getCompanyId(context.supabase, context.userId);
    const code = rest.equipment_code || (id ? undefined : await nextEquipmentCode(context.supabase, companyId!));
    const payload: any = { ...rest };
    if (code) payload.equipment_code = code;
    // keep legacy "name" field populated for backwards compat
    payload.name = rest.equipment_name;
    if (id) {
      // status history
      const { data: cur } = await context.supabase.from("equipment").select("current_status, company_id, project_id").eq("id", id).maybeSingle();
      const { data: out, error } = await context.supabase.from("equipment").update(payload).eq("id", id).select("*").maybeSingle();
      if (error) throw error;
      if (cur && cur.current_status !== payload.current_status) {
        await context.supabase.from("equipment_status_history").insert({
          company_id: cur.company_id, equipment_id: id, project_id: cur.project_id,
          old_status: cur.current_status, new_status: payload.current_status, changed_by: context.userId,
        });
      }
      return out;
    }
    payload.company_id = companyId;
    payload.created_by = context.userId;
    const { data: out, error } = await context.supabase.from("equipment").insert(payload).select("*").maybeSingle();
    if (error) throw error;
    return out;
  });

export const archiveEquipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("equipment").update({ is_archived: true, current_status: "Archived" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// =================== ASSIGNMENTS ===================
export const listAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null; equipmentId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("equipment_assignments").select("*").eq("is_archived", false).order("assignment_start_date", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.equipmentId) q = q.eq("equipment_id", data.equipmentId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows || [];
  });

const assignmentSchema = z.object({
  id: z.string().uuid().optional(),
  equipment_id: z.string().uuid(),
  project_id: z.string().uuid(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  milestone_id: z.string().uuid().nullable().optional(),
  work_area: z.string().nullable().optional(),
  assignment_start_date: z.string(),
  assignment_end_date: z.string().nullable().optional(),
  operator_name: z.string().nullable().optional(),
  status: z.string().default("Active"),
  remarks: z.string().nullable().optional(),
});

export const saveAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assignmentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (rest.assignment_end_date && rest.assignment_end_date < rest.assignment_start_date) {
      throw new Error("End date cannot be before start date");
    }
    const companyId = await getCompanyId(context.supabase, context.userId);
    if (id) {
      const { data: out, error } = await context.supabase.from("equipment_assignments").update(rest).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return out;
    }
    const insertPayload: any = { ...rest, company_id: companyId, assigned_by: context.userId, created_by: context.userId };
    const { data: out, error } = await context.supabase.from("equipment_assignments").insert(insertPayload).select().maybeSingle();
    if (error) throw error;
    // update equipment
    await context.supabase.from("equipment").update({
      assigned_to_project_id: rest.project_id, current_status: "Assigned", availability_status: "Assigned",
      operator_name: rest.operator_name,
    }).eq("id", rest.equipment_id);
    return out;
  });

export const releaseAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; remarks?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { data: a } = await context.supabase.from("equipment_assignments").select("equipment_id").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("equipment_assignments").update({
      status: "Released", released_by: context.userId, released_at: new Date().toISOString(), remarks: data.remarks ?? null,
    }).eq("id", data.id);
    if (error) throw error;
    if (a?.equipment_id) {
      await context.supabase.from("equipment").update({
        assigned_to_project_id: null, current_status: "Available", availability_status: "Available",
      }).eq("id", a.equipment_id);
    }
    return { ok: true };
  });

// =================== USAGE LOGS ===================
function calcUsage(d: any) {
  const wh = Number(d.working_hours || 0);
  const ih = Number(d.idle_hours || 0);
  const bh = Number(d.breakdown_hours || 0);
  const total = wh + ih + bh;
  const qty = Number(d.productivity_quantity || 0);
  const rate = wh > 0 ? qty / wh : 0;
  const hr = Number(d.hourly_rate || 0);
  const fuelCost = Number(d.fuel_cost || 0);
  const rentalCost = wh * hr;
  return { total_hours: total, productivity_rate: rate, rental_cost: rentalCost, total_cost: rentalCost + fuelCost };
}

export const listUsageLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null; equipmentId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("equipment_usage_logs").select("*").eq("is_archived", false).order("usage_date", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.equipmentId) q = q.eq("equipment_id", data.equipmentId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows || [];
  });

const usageSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  equipment_id: z.string().uuid(),
  assignment_id: z.string().uuid().nullable().optional(),
  daily_report_id: z.string().uuid().nullable().optional(),
  usage_date: z.string(),
  shift: z.string().default("Day"),
  work_area: z.string().nullable().optional(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  operator_name: z.string().nullable().optional(),
  start_meter_reading: z.number().min(0).default(0),
  end_meter_reading: z.number().min(0).default(0),
  working_hours: z.number().min(0).default(0),
  idle_hours: z.number().min(0).default(0),
  breakdown_hours: z.number().min(0).default(0),
  fuel_consumed: z.number().min(0).default(0),
  fuel_unit: z.string().default("Liter"),
  productivity_quantity: z.number().min(0).default(0),
  productivity_unit: z.string().nullable().optional(),
  hourly_rate: z.number().min(0).default(0),
  fuel_cost: z.number().min(0).default(0),
  status: z.string().default("Draft"),
  remarks: z.string().nullable().optional(),
});

export const saveUsageLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => usageSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (rest.end_meter_reading < rest.start_meter_reading) throw new Error("End meter cannot be less than start meter");
    const totals = calcUsage(rest);
    const payload: any = { ...rest, ...totals };
    const companyId = await getCompanyId(context.supabase, context.userId);
    if (id) {
      const { data: out, error } = await context.supabase.from("equipment_usage_logs").update(payload).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return out;
    }
    payload.company_id = companyId;
    payload.created_by = context.userId;
    const { data: out, error } = await context.supabase.from("equipment_usage_logs").insert(payload).select().maybeSingle();
    if (error) throw error;
    if (rest.end_meter_reading > 0) {
      await context.supabase.from("equipment").update({ current_meter_reading: rest.end_meter_reading }).eq("id", rest.equipment_id);
    }
    return out;
  });

export const setUsageStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => d)
  .handler(async ({ data, context }) => {
    const patch: any = { status: data.status };
    if (data.status === "Approved") { patch.approved_by = context.userId; patch.approved_at = new Date().toISOString(); }
    const { error } = await context.supabase.from("equipment_usage_logs").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const archiveUsageLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("equipment_usage_logs").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// =================== MAINTENANCE ===================
const maintSchema = z.object({
  id: z.string().uuid().optional(),
  equipment_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  maintenance_type: z.string().default("Preventive"),
  maintenance_title: z.string().min(1),
  description: z.string().nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  completed_date: z.string().nullable().optional(),
  meter_reading: z.number().nullable().optional(),
  performed_by: z.string().nullable().optional(),
  service_provider: z.string().nullable().optional(),
  cost: z.number().min(0).default(0),
  status: z.string().default("Scheduled"),
  priority: z.string().default("Medium"),
  findings: z.string().nullable().optional(),
  action_taken: z.string().nullable().optional(),
  next_maintenance_date: z.string().nullable().optional(),
});

export const saveMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => maintSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const companyId = await getCompanyId(context.supabase, context.userId);
    const payload: any = { ...rest };
    if (id) {
      const { data: out, error } = await context.supabase.from("equipment_maintenance").update(payload).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return out;
    }
    payload.company_id = companyId;
    payload.created_by = context.userId;
    payload.maintenance_number = await nextNumber(context.supabase, "equipment_maintenance", "maintenance_number", companyId!, `MNT-${new Date().getFullYear()}-`);
    const { data: out, error } = await context.supabase.from("equipment_maintenance").insert(payload).select().maybeSingle();
    if (error) throw error;
    if (rest.status === "In Progress") {
      await context.supabase.from("equipment").update({ current_status: "Under Maintenance", availability_status: "Maintenance" }).eq("id", rest.equipment_id);
    } else if (rest.status === "Completed" && rest.next_maintenance_date) {
      await context.supabase.from("equipment").update({ last_maintenance_date: rest.completed_date, next_maintenance_date: rest.next_maintenance_date, current_status: "Available", availability_status: "Available" }).eq("id", rest.equipment_id);
    }
    return out;
  });

export const archiveMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("equipment_maintenance").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// =================== BREAKDOWNS ===================
const breakdownSchema = z.object({
  id: z.string().uuid().optional(),
  equipment_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  breakdown_date: z.string(),
  breakdown_time: z.string().nullable().optional(),
  operator_name: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  problem_description: z.string().min(1),
  severity: z.string().default("Medium"),
  downtime_hours: z.number().min(0).default(0),
  repair_action: z.string().nullable().optional(),
  repair_cost: z.number().min(0).default(0),
  repaired_by: z.string().nullable().optional(),
  resolved_date: z.string().nullable().optional(),
  resolved_time: z.string().nullable().optional(),
  status: z.string().default("Open"),
  remarks: z.string().nullable().optional(),
});

export const saveBreakdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => breakdownSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const companyId = await getCompanyId(context.supabase, context.userId);
    const payload: any = { ...rest };
    if (id) {
      const { data: out, error } = await context.supabase.from("equipment_breakdowns").update(payload).eq("id", id).select().maybeSingle();
      if (error) throw error;
      if (rest.status === "Resolved" || rest.status === "Closed") {
        await context.supabase.from("equipment").update({ current_status: "Available", availability_status: "Available" }).eq("id", rest.equipment_id);
      }
      return out;
    }
    payload.company_id = companyId;
    payload.created_by = context.userId;
    payload.reported_by = context.userId;
    payload.breakdown_number = await nextNumber(context.supabase, "equipment_breakdowns", "breakdown_number", companyId!, `BRK-${new Date().getFullYear()}-`);
    const { data: out, error } = await context.supabase.from("equipment_breakdowns").insert(payload).select().maybeSingle();
    if (error) throw error;
    if (rest.status === "Open" || rest.status === "Under Repair") {
      await context.supabase.from("equipment").update({ current_status: "Breakdown", availability_status: "Breakdown" }).eq("id", rest.equipment_id);
    }
    return out;
  });

export const archiveBreakdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("equipment_breakdowns").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// =================== INSPECTIONS ===================
const inspectionSchema = z.object({
  id: z.string().uuid().optional(),
  equipment_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  inspection_date: z.string(),
  inspection_type: z.string().default("Routine"),
  condition_status: z.string().default("Good"),
  result: z.string().default("Pass"),
  findings: z.string().nullable().optional(),
  corrective_action: z.string().nullable().optional(),
  next_inspection_date: z.string().nullable().optional(),
  status: z.string().default("Completed"),
});

export const saveInspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inspectionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const companyId = await getCompanyId(context.supabase, context.userId);
    const payload: any = { ...rest };
    if (id) {
      const { data: out, error } = await context.supabase.from("equipment_inspections").update(payload).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return out;
    }
    payload.company_id = companyId;
    payload.inspected_by = context.userId;
    payload.created_by = context.userId;
    payload.inspection_number = await nextNumber(context.supabase, "equipment_inspections", "inspection_number", companyId!, `INS-${new Date().getFullYear()}-`);
    const { data: out, error } = await context.supabase.from("equipment_inspections").insert(payload).select().maybeSingle();
    if (error) throw error;
    if (rest.result === "Fail" || rest.result === "Unsafe") {
      await context.supabase.from("equipment").update({ condition_status: "Unsafe", availability_status: "Not Available" }).eq("id", rest.equipment_id);
    } else if (rest.next_inspection_date) {
      await context.supabase.from("equipment").update({ inspection_expiry_date: rest.next_inspection_date, condition_status: rest.condition_status }).eq("id", rest.equipment_id);
    }
    return out;
  });

export const archiveInspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("equipment_inspections").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// =================== DOCUMENTS ===================
const docSchema = z.object({
  id: z.string().uuid().optional(),
  equipment_id: z.string().uuid(),
  document_name: z.string().min(1),
  document_type: z.string().default("General"),
  document_number: z.string().nullable().optional(),
  issue_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  file_name: z.string().nullable().optional(),
  file_url: z.string().nullable().optional(),
  file_type: z.string().nullable().optional(),
  status: z.string().default("Valid"),
  remarks: z.string().nullable().optional(),
});

export const saveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => docSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (rest.expiry_date && rest.issue_date && rest.expiry_date < rest.issue_date) throw new Error("Expiry date cannot be before issue date");
    const companyId = await getCompanyId(context.supabase, context.userId);
    // auto-status by expiry
    let status = rest.status;
    if (rest.expiry_date) {
      const days = (new Date(rest.expiry_date).getTime() - Date.now()) / 86400000;
      if (days < 0) status = "Expired";
      else if (days <= 30) status = "Expiring Soon";
      else status = "Valid";
    }
    const payload: any = { ...rest, status };
    if (id) {
      const { data: out, error } = await context.supabase.from("equipment_documents").update(payload).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return out;
    }
    payload.company_id = companyId;
    payload.uploaded_by = context.userId;
    const { data: out, error } = await context.supabase.from("equipment_documents").insert(payload).select().maybeSingle();
    if (error) throw error;
    return out;
  });

export const archiveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("equipment_documents").update({ is_archived: true, status: "Archived" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// =================== ATTACHMENTS / COMMENTS ===================
export const addAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { equipment_id: string; project_id?: string | null; file_name: string; file_url: string; file_type?: string | null; description?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { data: out, error } = await context.supabase.from("equipment_attachments").insert({
      ...data, company_id: companyId, uploaded_by: context.userId,
    }).select().maybeSingle();
    if (error) throw error;
    return out;
  });

export const deleteAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("equipment_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { equipment_id: string; project_id?: string | null; comment: string; visibility?: string }) => d)
  .handler(async ({ data, context }) => {
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { data: out, error } = await context.supabase.from("equipment_comments").insert({
      ...data, company_id: companyId, user_id: context.userId, visibility: data.visibility || "internal",
    }).select().maybeSingle();
    if (error) throw error;
    return out;
  });

// =================== STATS ===================
export const equipmentStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let eqQ = context.supabase.from("equipment").select("*").eq("is_archived", false);
    if (data.projectId) eqQ = eqQ.or(`project_id.eq.${data.projectId},assigned_to_project_id.eq.${data.projectId}`);
    const { data: eq } = await eqQ;
    let usageQ = context.supabase.from("equipment_usage_logs").select("*").eq("is_archived", false);
    if (data.projectId) usageQ = usageQ.eq("project_id", data.projectId);
    const { data: usage } = await usageQ;
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const byStatus = (s: string) => (eq || []).filter((r: any) => r.current_status === s).length;
    const sum = (k: string) => (usage || []).reduce((a: number, r: any) => a + Number(r[k] || 0), 0);
    return {
      total: (eq || []).length,
      available: byStatus("Available"),
      assigned: byStatus("Assigned"),
      inUse: byStatus("In Use"),
      idle: byStatus("Idle"),
      maintenance: byStatus("Under Maintenance"),
      breakdown: byStatus("Breakdown"),
      outOfService: byStatus("Out of Service"),
      maintenanceDue: (eq || []).filter((r: any) => r.next_maintenance_date && r.next_maintenance_date <= in30).length,
      expiredDocs: (eq || []).filter((r: any) =>
        (r.insurance_expiry_date && r.insurance_expiry_date < today) ||
        (r.registration_expiry_date && r.registration_expiry_date < today) ||
        (r.inspection_expiry_date && r.inspection_expiry_date < today)
      ).length,
      workingHours: sum("working_hours"),
      idleHours: sum("idle_hours"),
      breakdownHours: sum("breakdown_hours"),
      totalCost: sum("total_cost"),
      fuelConsumed: sum("fuel_consumed"),
    };
  });

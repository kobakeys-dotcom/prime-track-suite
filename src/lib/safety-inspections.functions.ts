import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SI_COLS =
  "id, company_id, project_id, inspection_number, inspection_title, inspection_type, category, " +
  "location, area, floor_level, work_activity, wbs_id, task_id, subcontractor_id, requested_by, " +
  "assigned_inspector_id, inspected_by, reviewed_by, approved_by, inspection_date, inspection_time, " +
  "due_date, status, inspection_result, overall_risk_level, priority, checklist_safe_count, " +
  "checklist_unsafe_count, checklist_na_count, total_checklist_items, hazards_found, " +
  "corrective_actions_open, corrective_actions_closed, findings, corrective_action_summary, " +
  "rejection_reason, revision_notes, approval_comments, issue_created, issue_id, ncr_created, " +
  "ncr_id, is_client_visible, submitted_at, inspected_at, reviewed_at, approved_at, rejected_at, " +
  "closed_at, created_by, is_archived, created_at, updated_at";

const STATUSES = [
  "Draft","Submitted","Scheduled","In Progress","Inspected","Under Review","Approved",
  "Unsafe / Failed","Corrective Action Required","Rejected","Revision Requested","Closed","Cancelled","Archived",
] as const;
const CHECK_RESULTS = ["Pending","Safe","Unsafe","N/A"] as const;
const RISK_LEVELS = ["Low","Medium","High","Critical"] as const;

const checklistSchema = z.object({
  id: z.string().uuid().optional(),
  item_number: z.string().max(40).nullable().optional(),
  checklist_item: z.string().min(1).max(500),
  safety_standard_reference: z.string().max(500).nullable().optional(),
  requirement: z.string().max(1000).nullable().optional(),
  result: z.enum(CHECK_RESULTS).default("Pending"),
  risk_level: z.enum(RISK_LEVELS).default("Medium"),
  remarks: z.string().max(2000).nullable().optional(),
  corrective_action: z.string().max(2000).nullable().optional(),
  responsible_user_id: z.string().uuid().nullable().optional(),
  target_closeout_date: z.string().nullable().optional(),
  closeout_status: z.string().max(40).default("Open"),
  photo_required: z.boolean().default(false),
  sort_order: z.number().default(0),
});

const siInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  inspection_number: z.string().max(80).nullable().optional(),
  inspection_title: z.string().min(1).max(300),
  inspection_type: z.string().max(120).default("General Safety Inspection"),
  category: z.string().max(80).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  area: z.string().max(200).nullable().optional(),
  floor_level: z.string().max(80).nullable().optional(),
  work_activity: z.string().max(300).nullable().optional(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  subcontractor_id: z.string().uuid().nullable().optional(),
  assigned_inspector_id: z.string().uuid().nullable().optional(),
  inspection_date: z.string(),
  inspection_time: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.string().max(40).default("Medium"),
  overall_risk_level: z.enum(RISK_LEVELS).default("Medium"),
  is_client_visible: z.boolean().default(false),
  findings: z.string().max(4000).nullable().optional(),
  corrective_action_summary: z.string().max(4000).nullable().optional(),
  status: z.enum(STATUSES).optional(),
  checklist: z.array(checklistSchema).optional(),
});

async function nextInspectionNumber(sb: any, projectId: string): Promise<string> {
  const { data: p } = await sb.from("projects").select("code,name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `SI-${code}-${ymd}-`;
  const { data } = await sb.from("safety_inspections").select("inspection_number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.inspection_number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function logStatus(sb: any, siId: string, projectId: string, companyId: string, oldS: string | null, newS: string, userId: string, remarks?: string | null) {
  await sb.from("safety_inspection_status_history").insert({
    safety_inspection_id: siId, project_id: projectId, company_id: companyId,
    old_status: oldS, new_status: newS, changed_by: userId, remarks: remarks ?? null,
  });
}

const RISK_RANK: Record<string, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };

async function recomputeCounts(sb: any, siId: string) {
  const { data: items } = await sb.from("safety_inspection_checklist_items")
    .select("result, risk_level, closeout_status").eq("safety_inspection_id", siId).eq("is_archived", false);
  const { data: hazards } = await sb.from("safety_hazards")
    .select("risk_level, closeout_status").eq("safety_inspection_id", siId).eq("is_archived", false);
  const arr = items ?? [];
  const safe = arr.filter((r: any) => r.result === "Safe").length;
  const unsafe = arr.filter((r: any) => r.result === "Unsafe").length;
  const na = arr.filter((r: any) => r.result === "N/A").length;
  const total = arr.length;
  let result = "Pending";
  if (total > 0 && unsafe === 0 && safe + na === total) result = "Safe";
  else if (unsafe > 0 && safe > 0) result = "Partially Safe";
  else if (unsafe > 0 && safe === 0) result = "Unsafe";

  // Overall risk = max of unsafe item risk and hazard risk
  let maxRank = 0;
  for (const it of arr) if (it.result === "Unsafe") maxRank = Math.max(maxRank, RISK_RANK[it.risk_level] ?? 0);
  for (const h of hazards ?? []) maxRank = Math.max(maxRank, RISK_RANK[h.risk_level] ?? 0);
  const overall = (Object.keys(RISK_RANK).find((k) => RISK_RANK[k] === maxRank) ?? "Medium");

  const openCa = arr.filter((r: any) => r.result === "Unsafe" && r.closeout_status !== "Closed" && r.closeout_status !== "Not Required").length
    + (hazards ?? []).filter((h: any) => h.closeout_status !== "Closed" && h.closeout_status !== "Not Required").length;
  const closedCa = arr.filter((r: any) => r.closeout_status === "Closed").length
    + (hazards ?? []).filter((h: any) => h.closeout_status === "Closed").length;

  await sb.from("safety_inspections").update({
    checklist_safe_count: safe, checklist_unsafe_count: unsafe,
    checklist_na_count: na, total_checklist_items: total,
    hazards_found: (hazards ?? []).length,
    corrective_actions_open: openCa, corrective_actions_closed: closedCa,
    inspection_result: result,
    overall_risk_level: maxRank > 0 ? overall : "Low",
    updated_at: new Date().toISOString(),
  }).eq("id", siId);
  return { safe, unsafe, na, total, result, overall };
}

export const listSafetyInspections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid().optional(),
    status: z.string().optional(),
    includeArchived: z.boolean().optional(),
  }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("safety_inspections").select(SI_COLS).order("inspection_date", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getSafetyInspection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: si, error } = await sb.from("safety_inspections").select(SI_COLS).eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!si) return null;
    const [items, hazards, atts, hist] = await Promise.all([
      sb.from("safety_inspection_checklist_items").select("*")
        .eq("safety_inspection_id", data.id).eq("is_archived", false).order("sort_order"),
      sb.from("safety_hazards").select("*")
        .eq("safety_inspection_id", data.id).eq("is_archived", false).order("created_at", { ascending: false }),
      sb.from("safety_inspection_attachments").select("*")
        .eq("safety_inspection_id", data.id).order("created_at", { ascending: false }),
      sb.from("safety_inspection_status_history").select("*")
        .eq("safety_inspection_id", data.id).order("created_at", { ascending: false }),
    ]);
    return { ...(si as any), checklist: items.data ?? [], hazards: hazards.data ?? [], attachments: atts.data ?? [], history: hist.data ?? [] };
  });

export const saveSafetyInspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => siInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { checklist, id, ...rest } = data;
    const { data: proj } = await sb.from("projects").select("company_id").eq("id", rest.project_id).maybeSingle();
    if (!proj) throw new Error("Project not found");
    const companyId = proj.company_id;

    let recordId: string | undefined = id;
    if (id) {
      const { error } = await sb.from("safety_inspections").update({
        ...(rest as any), updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    } else {
      const inspection_number = rest.inspection_number || (await nextInspectionNumber(sb, rest.project_id));
      const payload: any = {
        ...rest,
        inspection_number,
        company_id: companyId,
        created_by: context.userId,
        requested_by: context.userId,
        status: rest.status ?? "Draft",
        inspection_result: "Pending",
      };
      const { data: ins, error } = await sb.from("safety_inspections").insert(payload).select("id").single();
      if (error) throw error;
      recordId = ins.id;
    }

    if (checklist && recordId) {
      const keepIds = checklist.filter((i) => i.id).map((i) => i.id!);
      const { data: existing } = await sb.from("safety_inspection_checklist_items").select("id").eq("safety_inspection_id", recordId);
      const toDelete = (existing ?? []).map((e: any) => e.id).filter((eid: string) => !keepIds.includes(eid));
      if (toDelete.length) await sb.from("safety_inspection_checklist_items").delete().in("id", toDelete);
      let idx = 0;
      for (const raw of checklist) {
        const base: any = {
          ...raw, sort_order: raw.sort_order ?? idx++,
          safety_inspection_id: recordId,
          project_id: rest.project_id,
          company_id: companyId,
          created_by: context.userId,
        };
        if (raw.id) {
          await sb.from("safety_inspection_checklist_items").update({ ...base, updated_at: new Date().toISOString() }).eq("id", raw.id);
        } else {
          delete base.id;
          await sb.from("safety_inspection_checklist_items").insert(base);
        }
      }
      await recomputeCounts(sb, recordId);
    }
    return { id: recordId };
  });

export const setSafetyInspectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(STATUSES),
    rejection_reason: z.string().max(2000).optional(),
    revision_notes: z.string().max(2000).optional(),
    approval_comments: z.string().max(2000).optional(),
    remarks: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: cur } = await sb.from("safety_inspections")
      .select("id, status, project_id, company_id, corrective_actions_open").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Not found");
    const now = new Date().toISOString();
    const patch: any = { status: data.status, updated_at: now };
    if (data.status === "Submitted") patch.submitted_at = now;
    if (data.status === "Inspected") { patch.inspected_at = now; patch.inspected_by = context.userId; }
    if (data.status === "Under Review") { patch.reviewed_at = now; patch.reviewed_by = context.userId; }
    if (data.status === "Approved") {
      patch.approved_at = now; patch.approved_by = context.userId;
      if (data.approval_comments) patch.approval_comments = data.approval_comments;
    }
    if (data.status === "Rejected") {
      if (!data.rejection_reason) throw new Error("Rejection reason required");
      patch.rejected_at = now; patch.rejection_reason = data.rejection_reason;
    }
    if (data.status === "Revision Requested") {
      if (!data.revision_notes) throw new Error("Revision notes required");
      patch.revision_notes = data.revision_notes;
    }
    if (data.status === "Closed") {
      patch.closed_at = now;
    }
    const { error } = await sb.from("safety_inspections").update(patch).eq("id", data.id);
    if (error) throw error;
    await logStatus(sb, data.id, cur.project_id, cur.company_id!, cur.status, data.status, context.userId,
      data.rejection_reason || data.revision_notes || data.approval_comments || data.remarks);
    return { ok: true };
  });

export const updateSafetyChecklistResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    safety_inspection_id: z.string().uuid(),
    items: z.array(z.object({
      id: z.string().uuid(),
      result: z.enum(CHECK_RESULTS),
      risk_level: z.enum(RISK_LEVELS).optional(),
      remarks: z.string().max(2000).nullable().optional(),
      corrective_action: z.string().max(2000).nullable().optional(),
    })),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    for (const it of data.items) {
      const patch: any = {
        result: it.result,
        remarks: it.remarks ?? null,
        corrective_action: it.corrective_action ?? null,
        updated_at: new Date().toISOString(),
      };
      if (it.risk_level) patch.risk_level = it.risk_level;
      await sb.from("safety_inspection_checklist_items").update(patch).eq("id", it.id);
    }
    return await recomputeCounts(sb, data.safety_inspection_id);
  });

export const closeCorrectiveAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    checklist_item_id: z.string().uuid().optional(),
    hazard_id: z.string().uuid().optional(),
    safety_inspection_id: z.string().uuid(),
    closeout_status: z.enum(["Open","In Progress","Closed","Overdue","Not Required"]),
    closeout_notes: z.string().max(2000).nullable().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const now = new Date().toISOString();
    const patch: any = {
      closeout_status: data.closeout_status,
      closeout_notes: data.closeout_notes ?? null,
      updated_at: now,
    };
    if (data.closeout_status === "Closed") {
      patch.closed_at = now; patch.closed_by = context.userId;
    } else {
      patch.closed_at = null; patch.closed_by = null;
    }
    if (data.checklist_item_id) {
      await sb.from("safety_inspection_checklist_items").update(patch).eq("id", data.checklist_item_id);
    } else if (data.hazard_id) {
      await sb.from("safety_hazards").update(patch).eq("id", data.hazard_id);
    }
    return await recomputeCounts(sb, data.safety_inspection_id);
  });

export const archiveSafetyInspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("safety_inspections")
      .update({ is_archived: true, status: "Archived", updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const addSafetyHazard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    safety_inspection_id: z.string().uuid(),
    hazard_title: z.string().min(1).max(300),
    hazard_description: z.string().max(2000).nullable().optional(),
    hazard_category: z.string().max(80).default("General"),
    risk_level: z.enum(RISK_LEVELS).default("Medium"),
    likelihood: z.string().max(40).nullable().optional(),
    severity: z.string().max(40).nullable().optional(),
    location: z.string().max(300).nullable().optional(),
    responsible_user_id: z.string().uuid().nullable().optional(),
    corrective_action: z.string().max(2000).nullable().optional(),
    target_closeout_date: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: si } = await sb.from("safety_inspections").select("project_id, company_id").eq("id", data.safety_inspection_id).maybeSingle();
    if (!si) throw new Error("Inspection not found");
    const { error } = await sb.from("safety_hazards").insert({
      ...data, project_id: si.project_id, company_id: si.company_id as string, created_by: context.userId,
    });
    if (error) throw error;
    await recomputeCounts(sb, data.safety_inspection_id);
    return { ok: true };
  });

export const archiveSafetyHazard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), safety_inspection_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await context.supabase.from("safety_hazards").update({ is_archived: true, updated_at: new Date().toISOString() }).eq("id", data.id);
    await recomputeCounts(context.supabase, data.safety_inspection_id);
    return { ok: true };
  });

export const addSafetyInspectionAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    safety_inspection_id: z.string().uuid(),
    file_name: z.string().min(1).max(300),
    file_url: z.string().url().max(2000),
    file_type: z.string().max(80).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    attachment_type: z.string().max(80).default("Safety Evidence"),
    is_client_visible: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: si } = await sb.from("safety_inspections").select("project_id, company_id").eq("id", data.safety_inspection_id).maybeSingle();
    if (!si) throw new Error("Inspection not found");
    const { error } = await sb.from("safety_inspection_attachments").insert({
      ...data, project_id: si.project_id, company_id: si.company_id as string, uploaded_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteSafetyInspectionAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("safety_inspection_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const safetyInspectionStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("safety_inspections")
      .select("status, inspection_result, overall_risk_level, corrective_actions_open, hazards_found, due_date").eq("is_archived", false);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    const today = new Date().toISOString().slice(0, 10);
    const r = rows ?? [];
    return {
      total: r.length,
      draft: r.filter((x: any) => x.status === "Draft").length,
      pending: r.filter((x: any) => ["Submitted","Scheduled","In Progress"].includes(x.status)).length,
      inspected: r.filter((x: any) => x.status === "Inspected").length,
      approved: r.filter((x: any) => x.status === "Approved").length,
      safe: r.filter((x: any) => x.inspection_result === "Safe").length,
      unsafe: r.filter((x: any) => x.inspection_result === "Unsafe").length,
      criticalRisk: r.filter((x: any) => x.overall_risk_level === "Critical").length,
      openCa: r.reduce((s: number, x: any) => s + (x.corrective_actions_open ?? 0), 0),
      hazards: r.reduce((s: number, x: any) => s + (x.hazards_found ?? 0), 0),
      overdue: r.filter((x: any) => x.due_date && x.due_date < today && !["Approved","Closed","Cancelled"].includes(x.status)).length,
    };
  });

export const listSafetyInspectors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("profiles").select("id, full_name, email").order("full_name");
    return data ?? [];
  });

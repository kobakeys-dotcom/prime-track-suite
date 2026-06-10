import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const QI_COLS =
  "id, company_id, project_id, inspection_number, inspection_title, inspection_type, discipline, " +
  "category, location, area, floor_level, room_zone, wbs_id, task_id, boq_item_id, drawing_id, " +
  "submittal_id, material_id, delivery_id, requested_by, assigned_inspector_id, inspected_by, " +
  "reviewed_by, approved_by, inspection_date, inspection_time, due_date, status, inspection_result, " +
  "priority, checklist_pass_count, checklist_fail_count, checklist_na_count, total_checklist_items, " +
  "findings, corrective_action, rejection_reason, revision_notes, approval_comments, " +
  "reinspection_required, parent_inspection_id, snag_created, snag_id, issue_created, issue_id, " +
  "ncr_created, ncr_id, is_client_visible, submitted_at, inspected_at, reviewed_at, approved_at, " +
  "rejected_at, created_by, is_archived, created_at, updated_at, comments";

const STATUSES = [
  "Draft","Submitted","Scheduled","In Progress","Inspected","Under Review","Approved",
  "Failed","Rejected","Revision Requested","Reinspection Required","Closed","Cancelled","Archived",
] as const;

const RESULTS = ["Pending","Pass","Pass with Comments","Fail","Partially Passed","Not Applicable"] as const;
const CHECK_RESULTS = ["Pending","Pass","Fail","N/A"] as const;

const checklistSchema = z.object({
  id: z.string().uuid().optional(),
  item_number: z.string().max(40).nullable().optional(),
  checklist_item: z.string().min(1).max(500),
  specification_reference: z.string().max(500).nullable().optional(),
  acceptance_criteria: z.string().max(1000).nullable().optional(),
  result: z.enum(CHECK_RESULTS).default("Pending"),
  remarks: z.string().max(2000).nullable().optional(),
  corrective_action: z.string().max(2000).nullable().optional(),
  responsible_user_id: z.string().uuid().nullable().optional(),
  target_date: z.string().nullable().optional(),
  photo_required: z.boolean().default(false),
  sort_order: z.number().default(0),
});

const qiInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  inspection_number: z.string().max(80).nullable().optional(),
  inspection_title: z.string().min(1).max(300),
  inspection_type: z.string().max(80).default("General"),
  discipline: z.string().max(80).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  area: z.string().max(200).nullable().optional(),
  floor_level: z.string().max(80).nullable().optional(),
  room_zone: z.string().max(200).nullable().optional(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  boq_item_id: z.string().uuid().nullable().optional(),
  drawing_id: z.string().uuid().nullable().optional(),
  submittal_id: z.string().uuid().nullable().optional(),
  material_id: z.string().uuid().nullable().optional(),
  delivery_id: z.string().uuid().nullable().optional(),
  assigned_inspector_id: z.string().uuid().nullable().optional(),
  inspection_date: z.string(),
  inspection_time: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.string().max(40).default("Medium"),
  is_client_visible: z.boolean().default(false),
  findings: z.string().max(4000).nullable().optional(),
  corrective_action: z.string().max(4000).nullable().optional(),
  status: z.enum(STATUSES).optional(),
  checklist: z.array(checklistSchema).optional(),
});

async function nextInspectionNumber(sb: any, projectId: string): Promise<string> {
  const { data: p } = await sb.from("projects").select("code,name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `QI-${code}-${ymd}-`;
  const { data } = await sb.from("quality_inspections").select("inspection_number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.inspection_number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function logStatus(sb: any, qiId: string, projectId: string, companyId: string, oldS: string | null, newS: string, userId: string, remarks?: string | null) {
  await sb.from("quality_inspection_status_history").insert({
    quality_inspection_id: qiId, project_id: projectId, company_id: companyId,
    old_status: oldS, new_status: newS, changed_by: userId, remarks: remarks ?? null,
  });
}

async function recomputeCounts(sb: any, qiId: string) {
  const { data: items } = await sb.from("quality_inspection_checklist_items")
    .select("result").eq("quality_inspection_id", qiId).eq("is_archived", false);
  const pass = (items ?? []).filter((r: any) => r.result === "Pass").length;
  const fail = (items ?? []).filter((r: any) => r.result === "Fail").length;
  const na = (items ?? []).filter((r: any) => r.result === "N/A").length;
  const total = (items ?? []).length;
  let result = "Pending";
  if (total > 0 && fail === 0 && pass + na === total) result = "Pass";
  else if (fail > 0 && pass > 0) result = "Partially Passed";
  else if (fail > 0 && pass === 0) result = "Fail";
  await sb.from("quality_inspections").update({
    checklist_pass_count: pass, checklist_fail_count: fail,
    checklist_na_count: na, total_checklist_items: total,
    inspection_result: result, updated_at: new Date().toISOString(),
  }).eq("id", qiId);
  return { pass, fail, na, total, result };
}

export const listInspections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid().optional(),
    status: z.string().optional(),
    includeArchived: z.boolean().optional(),
  }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("quality_inspections").select(QI_COLS).order("inspection_date", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getInspection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: qi, error } = await sb.from("quality_inspections").select(QI_COLS).eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!qi) return null;
    const [items, atts, hist] = await Promise.all([
      sb.from("quality_inspection_checklist_items").select("*")
        .eq("quality_inspection_id", data.id).eq("is_archived", false).order("sort_order"),
      sb.from("quality_inspection_attachments").select("*")
        .eq("quality_inspection_id", data.id).order("created_at", { ascending: false }),
      sb.from("quality_inspection_status_history").select("*")
        .eq("quality_inspection_id", data.id).order("created_at", { ascending: false }),
    ]);
    return { ...(qi as any), checklist: items.data ?? [], attachments: atts.data ?? [], history: hist.data ?? [] };
  });

export const saveInspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => qiInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { checklist, id, ...rest } = data;
    const { data: proj } = await sb.from("projects").select("company_id").eq("id", rest.project_id).maybeSingle();
    if (!proj) throw new Error("Project not found");
    const companyId = proj.company_id;

    let recordId: string | undefined = id;
    if (id) {
      const { error } = await sb.from("quality_inspections").update({
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
      const { data: ins, error } = await sb.from("quality_inspections").insert(payload).select("id").single();
      if (error) throw error;
      recordId = ins.id;
    }

    if (checklist && recordId) {
      const keepIds = checklist.filter((i) => i.id).map((i) => i.id!);
      const { data: existing } = await sb.from("quality_inspection_checklist_items").select("id").eq("quality_inspection_id", recordId);
      const toDelete = (existing ?? []).map((e: any) => e.id).filter((eid: string) => !keepIds.includes(eid));
      if (toDelete.length) await sb.from("quality_inspection_checklist_items").delete().in("id", toDelete);
      let idx = 0;
      for (const raw of checklist) {
        const base: any = {
          ...raw, sort_order: raw.sort_order ?? idx++,
          quality_inspection_id: recordId,
          project_id: rest.project_id,
          company_id: companyId,
          created_by: context.userId,
        };
        if (raw.id) {
          await sb.from("quality_inspection_checklist_items").update({ ...base, updated_at: new Date().toISOString() }).eq("id", raw.id);
        } else {
          delete base.id;
          await sb.from("quality_inspection_checklist_items").insert(base);
        }
      }
      await recomputeCounts(sb, recordId);
    }
    return { id: recordId };
  });

export const setInspectionStatus = createServerFn({ method: "POST" })
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
    const { data: cur } = await sb.from("quality_inspections")
      .select("id, status, project_id, company_id").eq("id", data.id).maybeSingle();
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
    if (data.status === "Reinspection Required") {
      patch.reinspection_required = true;
    }
    const { error } = await sb.from("quality_inspections").update(patch).eq("id", data.id);
    if (error) throw error;
    await logStatus(sb, data.id, cur.project_id, cur.company_id!, cur.status, data.status, context.userId,
      data.rejection_reason || data.revision_notes || data.approval_comments || data.remarks);
    return { ok: true };
  });

export const updateChecklistResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    quality_inspection_id: z.string().uuid(),
    items: z.array(z.object({
      id: z.string().uuid(),
      result: z.enum(CHECK_RESULTS),
      remarks: z.string().max(2000).nullable().optional(),
      corrective_action: z.string().max(2000).nullable().optional(),
    })),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    for (const it of data.items) {
      await sb.from("quality_inspection_checklist_items").update({
        result: it.result,
        remarks: it.remarks ?? null,
        corrective_action: it.corrective_action ?? null,
        updated_at: new Date().toISOString(),
      }).eq("id", it.id);
    }
    return await recomputeCounts(sb, data.quality_inspection_id);
  });

export const archiveInspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("quality_inspections")
      .update({ is_archived: true, status: "Archived", updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const createReinspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: src } = await sb.from("quality_inspections").select("*").eq("id", data.id).maybeSingle();
    if (!src) throw new Error("Not found");
    const inspection_number = await nextInspectionNumber(sb, src.project_id);
    const newRow: any = {
      company_id: src.company_id, project_id: src.project_id,
      inspection_number, inspection_title: `[Re-Inspection] ${src.inspection_title}`,
      inspection_type: src.inspection_type, discipline: src.discipline, category: src.category,
      location: src.location, area: src.area, floor_level: src.floor_level, room_zone: src.room_zone,
      wbs_id: src.wbs_id, task_id: src.task_id, boq_item_id: src.boq_item_id,
      drawing_id: src.drawing_id, submittal_id: src.submittal_id, material_id: src.material_id,
      delivery_id: src.delivery_id, assigned_inspector_id: src.assigned_inspector_id,
      inspection_date: new Date().toISOString().slice(0, 10),
      priority: src.priority, status: "Draft", inspection_result: "Pending",
      parent_inspection_id: src.id, requested_by: context.userId, created_by: context.userId,
    };
    const { data: ins, error } = await sb.from("quality_inspections").insert(newRow).select("id").single();
    if (error) throw error;
    // Copy failed checklist items
    const { data: failed } = await sb.from("quality_inspection_checklist_items")
      .select("*").eq("quality_inspection_id", src.id).eq("result", "Fail");
    if (failed?.length) {
      const copies = failed.map((c: any, i: number) => ({
        company_id: src.company_id, project_id: src.project_id, quality_inspection_id: ins.id,
        item_number: c.item_number, checklist_item: c.checklist_item,
        specification_reference: c.specification_reference, acceptance_criteria: c.acceptance_criteria,
        result: "Pending", photo_required: c.photo_required, sort_order: i, created_by: context.userId,
      }));
      await sb.from("quality_inspection_checklist_items").insert(copies);
      await recomputeCounts(sb, ins.id);
    }
    return { id: ins.id };
  });

export const addInspectionAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    quality_inspection_id: z.string().uuid(),
    file_name: z.string().min(1).max(300),
    file_url: z.string().url().max(2000),
    file_type: z.string().max(80).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    attachment_type: z.string().max(80).default("Inspection Evidence"),
    is_client_visible: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: qi } = await sb.from("quality_inspections").select("project_id, company_id").eq("id", data.quality_inspection_id).maybeSingle();
    if (!qi) throw new Error("Inspection not found");
    const { error } = await sb.from("quality_inspection_attachments").insert({
      ...data, project_id: qi.project_id, company_id: qi.company_id, uploaded_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteInspectionAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("quality_inspection_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const inspectionStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("quality_inspections")
      .select("status, inspection_result, reinspection_required, due_date").eq("is_archived", false);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    const today = new Date().toISOString().slice(0, 10);
    const r = rows ?? [];
    return {
      total: r.length,
      draft: r.filter((x: any) => x.status === "Draft").length,
      submitted: r.filter((x: any) => x.status === "Submitted").length,
      inspected: r.filter((x: any) => x.status === "Inspected").length,
      approved: r.filter((x: any) => x.status === "Approved").length,
      passed: r.filter((x: any) => x.inspection_result === "Pass").length,
      failed: r.filter((x: any) => x.inspection_result === "Fail").length,
      partially: r.filter((x: any) => x.inspection_result === "Partially Passed").length,
      reinspection: r.filter((x: any) => x.reinspection_required).length,
      overdue: r.filter((x: any) => x.due_date && x.due_date < today && !["Approved", "Closed", "Cancelled"].includes(x.status)).length,
    };
  });

export const listInspectors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("profiles")
      .select("id, full_name, email").order("full_name");
    return data ?? [];
  });

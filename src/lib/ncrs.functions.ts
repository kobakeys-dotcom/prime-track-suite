import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const NCR_COLS =
  "id, company_id, project_id, ncr_number, ncr_title, ncr_type, category, severity, priority, status, " +
  "ncr_source, source_record_id, quality_inspection_id, safety_inspection_id, issue_id, snag_id, " +
  "wbs_id, task_id, boq_item_id, drawing_id, submittal_id, material_id, delivery_id, supplier_id, " +
  "subcontractor_id, location, area, floor_level, description, non_conformance_details, " +
  "specification_reference, drawing_reference, standard_reference, detected_by, assigned_to, " +
  "responsible_user_id, responsible_party, root_cause, root_cause_category, corrective_action, " +
  "preventive_action, containment_action, due_date, target_closeout_date, actual_closeout_date, " +
  "verification_required, verification_notes, verified_by, approved_by, rejected_by, submitted_at, " +
  "verified_at, approved_at, rejected_at, closed_at, rejection_reason, revision_notes, closeout_notes, " +
  "cost_impact, cost_impact_amount, time_impact, time_impact_days, recurrence_risk, is_client_visible, " +
  "photos, created_by, is_archived, created_at, updated_at";

export const STATUSES = [
  "Draft","Submitted","Open","Action In Progress","Pending Verification","Verified","Closed",
  "Rejected","Revision Requested","Reopened","Cancelled","Archived",
] as const;
export const NCR_TYPES = [
  "Quality","Safety","Material","Workmanship","Design","Document","Submittal","Procurement",
  "Delivery","Environmental","Client / Consultant","Supplier","Subcontractor","General",
];
export const CATEGORIES = [
  "Specification Non-Compliance","Drawing Non-Compliance","Material Defect","Workmanship Defect",
  "Installation Defect","Testing Failure","Inspection Failure","Documentation Error",
  "Safety Non-Compliance","Supplier Non-Compliance","Subcontractor Non-Compliance","Delivery Damage",
  "Wrong Material","Repeated Defect","Process Failure","General",
];
export const SEVERITIES = ["Low","Medium","High","Critical"] as const;
export const PRIORITIES = ["Low","Medium","High","Urgent","Critical"] as const;
export const ROOT_CAUSE_CATEGORIES = [
  "Human Error","Method / Procedure","Material","Equipment","Design","Supervision","Training",
  "Supplier","Subcontractor","Communication","Environment","Management System","Unknown",
];
export const ACTION_TYPES = [
  "Containment Action","Corrective Action","Preventive Action","Verification Action","Follow-up Action",
];
export const ACTION_STATUSES = ["Open","In Progress","Completed","Verified","Rejected","Overdue","Cancelled"] as const;
export const ATTACHMENT_TYPES = [
  "NCR Evidence","Defect Photo","Inspection Evidence","Test Report","Drawing Reference",
  "Material Certificate","Corrective Action Evidence","Closeout Evidence","Verification Evidence",
  "Supporting Document",
];

const ncrInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  ncr_number: z.string().max(80).nullable().optional(),
  ncr_title: z.string().min(1).max(300),
  ncr_type: z.string().max(80).default("Quality"),
  category: z.string().max(120).default("General"),
  severity: z.enum(SEVERITIES).default("Medium"),
  priority: z.string().max(40).default("Medium"),
  ncr_source: z.string().max(80).nullable().optional(),
  quality_inspection_id: z.string().uuid().nullable().optional(),
  safety_inspection_id: z.string().uuid().nullable().optional(),
  issue_id: z.string().uuid().nullable().optional(),
  snag_id: z.string().uuid().nullable().optional(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  boq_item_id: z.string().uuid().nullable().optional(),
  drawing_id: z.string().uuid().nullable().optional(),
  submittal_id: z.string().uuid().nullable().optional(),
  material_id: z.string().uuid().nullable().optional(),
  delivery_id: z.string().uuid().nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  subcontractor_id: z.string().uuid().nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  area: z.string().max(200).nullable().optional(),
  floor_level: z.string().max(80).nullable().optional(),
  description: z.string().min(1).max(4000),
  non_conformance_details: z.string().max(4000).nullable().optional(),
  specification_reference: z.string().max(500).nullable().optional(),
  drawing_reference: z.string().max(500).nullable().optional(),
  standard_reference: z.string().max(500).nullable().optional(),
  detected_by: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  responsible_user_id: z.string().uuid().nullable().optional(),
  responsible_party: z.string().max(200).nullable().optional(),
  root_cause: z.string().max(2000).nullable().optional(),
  root_cause_category: z.string().max(120).nullable().optional(),
  corrective_action: z.string().max(4000).nullable().optional(),
  preventive_action: z.string().max(4000).nullable().optional(),
  containment_action: z.string().max(4000).nullable().optional(),
  target_closeout_date: z.string().nullable().optional(),
  verification_required: z.boolean().default(true),
  cost_impact: z.boolean().default(false),
  cost_impact_amount: z.number().min(0).default(0),
  time_impact: z.boolean().default(false),
  time_impact_days: z.number().min(0).default(0),
  recurrence_risk: z.string().max(40).default("Medium"),
  is_client_visible: z.boolean().default(false),
  status: z.enum(STATUSES).optional(),
});

async function nextNcrNumber(sb: any, projectId: string): Promise<string> {
  const { data: p } = await sb.from("projects").select("code,name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `NCR-${code}-${ymd}-`;
  const { data } = await sb.from("ncrs").select("ncr_number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.ncr_number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function logStatus(sb: any, ncrId: string, projectId: string, companyId: string, oldS: string | null, newS: string, userId: string, remarks?: string | null) {
  await sb.from("ncr_status_history").insert({
    ncr_id: ncrId, project_id: projectId, company_id: companyId,
    old_status: oldS, new_status: newS, changed_by: userId, remarks: remarks ?? null,
  });
}

export const listNcrs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null; status?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("ncrs").select(NCR_COLS).eq("is_archived", false).order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getNcr = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: ncr, error } = await sb.from("ncrs").select(NCR_COLS).eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const [actions, atts, comments, history] = await Promise.all([
      sb.from("ncr_actions").select("*").eq("ncr_id", data.id).eq("is_archived", false).order("created_at"),
      sb.from("ncr_attachments").select("*").eq("ncr_id", data.id).order("created_at", { ascending: false }),
      sb.from("ncr_comments").select("*").eq("ncr_id", data.id).order("created_at"),
      sb.from("ncr_status_history").select("*").eq("ncr_id", data.id).order("created_at"),
    ]);
    return { ncr, actions: actions.data ?? [], attachments: atts.data ?? [], comments: comments.data ?? [], history: history.data ?? [] };
  });

export const saveNcr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ncrInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const userId = context.userId;
    const { data: prof } = await sb.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    const companyId = prof?.company_id;
    if (!companyId) throw new Error("No company");

    const payload: any = { ...data, company_id: companyId };
    if (!data.id) {
      payload.ncr_number = data.ncr_number || (await nextNcrNumber(sb, data.project_id));
      payload.status = data.status || "Draft";
      payload.created_by = userId;
      payload.due_date = data.target_closeout_date ?? null;
      const { data: row, error } = await sb.from("ncrs").insert(payload).select(NCR_COLS).single();
      if (error) throw new Error(error.message);
      await logStatus(sb, (row as any).id, data.project_id, companyId, null, payload.status, userId ?? "", "Created");
      return row;
    } else {
      const { id, ...upd } = payload;
      upd.due_date = data.target_closeout_date ?? null;
      const { data: row, error } = await sb.from("ncrs").update(upd).eq("id", id).select(NCR_COLS).single();
      if (error) throw new Error(error.message);
      return row;
    }
  });

export const setNcrStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: typeof STATUSES[number]; remarks?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: existing, error: e1 } = await sb.from("ncrs").select("id, project_id, company_id, status, verification_required").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    const upd: any = { status: data.status };
    const now = new Date().toISOString();
    if (data.status === "Submitted") upd.submitted_at = now;
    if (data.status === "Verified") { upd.verified_at = now; upd.verified_by = context.userId; upd.verification_notes = data.remarks ?? null; }
    if (data.status === "Closed") { upd.closed_at = now; upd.actual_closeout_date = now.slice(0, 10); upd.closeout_notes = data.remarks ?? null; }
    if (data.status === "Rejected") { upd.rejected_at = now; upd.rejected_by = context.userId; upd.rejection_reason = data.remarks ?? null; }
    if (data.status === "Revision Requested") upd.revision_notes = data.remarks ?? null;
    if (data.status === "Reopened") { upd.closed_at = null; upd.actual_closeout_date = null; }
    const { error } = await sb.from("ncrs").update(upd).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logStatus(sb, data.id, existing.project_id, existing.company_id, existing.status, data.status, context.userId, data.remarks ?? null);
    return { ok: true };
  });

export const archiveNcr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ncrs").update({ is_archived: true, status: "Archived" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const actionInput = z.object({
  id: z.string().uuid().optional(),
  ncr_id: z.string().uuid(),
  action_type: z.string().max(80).default("Corrective Action"),
  action_title: z.string().min(1).max(300),
  action_description: z.string().max(4000).nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  target_date: z.string().nullable().optional(),
  status: z.enum(ACTION_STATUSES).default("Open"),
  priority: z.string().max(40).default("Medium"),
  completion_notes: z.string().max(4000).nullable().optional(),
  completed_date: z.string().nullable().optional(),
  verification_notes: z.string().max(4000).nullable().optional(),
});

export const saveNcrAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => actionInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: ncr, error: e1 } = await sb.from("ncrs").select("project_id, company_id").eq("id", data.ncr_id).single();
    if (e1) throw new Error(e1.message);
    if (!data.id) {
      const { error } = await sb.from("ncr_actions").insert({
        ...data, project_id: ncr.project_id, company_id: ncr.company_id, created_by: context.userId,
      });
      if (error) throw new Error(error.message);
    } else {
      const { id, ...upd } = data;
      const { error } = await sb.from("ncr_actions").update(upd).eq("id", id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setNcrActionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: typeof ACTION_STATUSES[number]; completion_notes?: string | null; verification_notes?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const upd: any = { status: data.status };
    if (data.status === "Completed") { upd.completed_date = new Date().toISOString().slice(0, 10); upd.completion_notes = data.completion_notes ?? null; }
    if (data.status === "Verified") { upd.verified_at = new Date().toISOString(); upd.verified_by = context.userId; upd.verification_notes = data.verification_notes ?? null; }
    if (data.status === "Rejected") upd.verification_notes = data.verification_notes ?? null;
    const { error } = await context.supabase.from("ncr_actions").update(upd).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveNcrAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ncr_actions").update({ is_archived: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addNcrAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ncr_id: string; file_name: string; file_url: string; attachment_type?: string; description?: string | null; is_client_visible?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: ncr } = await sb.from("ncrs").select("project_id, company_id").eq("id", data.ncr_id).maybeSingle();
    if (!ncr) throw new Error("NCR not found");
    const { error } = await sb.from("ncr_attachments").insert({
      ncr_id: data.ncr_id, project_id: ncr.project_id, company_id: ncr.company_id,
      uploaded_by: context.userId, file_name: data.file_name, file_url: data.file_url,
      attachment_type: data.attachment_type ?? "NCR Evidence", description: data.description ?? null,
      is_client_visible: data.is_client_visible ?? false,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNcrAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ncr_attachments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addNcrComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ncr_id: string; comment: string; visibility?: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: ncr } = await sb.from("ncrs").select("project_id, company_id").eq("id", data.ncr_id).maybeSingle();
    if (!ncr) throw new Error("NCR not found");
    const { error } = await sb.from("ncr_comments").insert({
      ncr_id: data.ncr_id, project_id: ncr.project_id, company_id: ncr.company_id,
      user_id: context.userId, comment: data.comment, visibility: data.visibility ?? "internal",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ncrStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("ncrs").select("status, severity, target_closeout_date, cost_impact, time_impact").eq("is_archived", false);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    const arr = rows ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const openStatuses = ["Submitted","Open","Action In Progress","Pending Verification","Reopened","Revision Requested"];
    return {
      total: arr.length,
      draft: arr.filter((r: any) => r.status === "Draft").length,
      open: arr.filter((r: any) => openStatuses.includes(r.status)).length,
      inProgress: arr.filter((r: any) => r.status === "Action In Progress").length,
      pendingVerification: arr.filter((r: any) => r.status === "Pending Verification").length,
      verified: arr.filter((r: any) => r.status === "Verified").length,
      closed: arr.filter((r: any) => r.status === "Closed").length,
      overdue: arr.filter((r: any) => r.target_closeout_date && r.target_closeout_date < today && !["Closed","Cancelled","Archived","Verified"].includes(r.status)).length,
      critical: arr.filter((r: any) => r.severity === "Critical" || r.severity === "High").length,
      costImpact: arr.filter((r: any) => r.cost_impact).length,
      timeImpact: arr.filter((r: any) => r.time_impact).length,
    };
  });

export const listProjectMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null }) => d)
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("profiles").select("id, full_name, email").order("full_name");
    return data ?? [];
  });

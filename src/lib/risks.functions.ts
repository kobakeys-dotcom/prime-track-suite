import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RISK_COLS =
  "id, company_id, project_id, risk_number, title, description, category, risk_category, risk_type, risk_source, location, " +
  "wbs_id, task_id, milestone_id, boq_item_id, variation_id, issue_id, ncr_id, quality_inspection_id, safety_inspection_id, " +
  "risk_owner_id, assigned_to, identified_by, owner_id, probability, impact, risk_score, risk_level, response_strategy, " +
  "mitigation_plan, mitigation_action, contingency_plan, trigger_condition, early_warning_signs, " +
  "residual_probability, residual_impact, residual_risk_score, residual_risk_level, " +
  "target_mitigation_date, actual_mitigation_date, review_date, due_date, status, " +
  "escalation_status, escalated_to, escalated_at, escalation_reason, converted_to_issue, converted_issue_id, " +
  "cost_impact, cost_impact_amount, time_impact, time_impact_days, safety_impact, quality_impact, client_impact, " +
  "remarks, is_client_visible, created_by, is_archived, closed_at, reopened_at, created_at, updated_at";

export const STATUSES = [
  "Draft","Open","Under Review","Mitigation In Progress","Monitoring","Escalated",
  "Occurred / Converted to Issue","Accepted","Avoided","Transferred","Closed","Cancelled","Archived",
] as const;
export const CATEGORIES = [
  "General","Scope","Schedule","Cost","Quality","Safety","Procurement","Material","Design","Contract",
  "Client","Consultant","Subcontractor","Supplier","Resource","Equipment","Environmental","Regulatory",
  "Financial","Payment","Weather","Logistics","Technical","Handover",
];
export const RISK_TYPES = ["Threat","Opportunity"] as const;
export const RESPONSE_STRATEGIES = ["Avoid","Mitigate","Transfer","Accept","Escalate","Exploit","Enhance","Share"];
export const ACTION_TYPES = ["Mitigation","Contingency","Preventive Action","Monitoring Action","Escalation Action","Review Action"];
export const ACTION_STATUSES = ["Open","In Progress","Completed","Overdue","Cancelled"] as const;
export const ATTACHMENT_TYPES = [
  "Risk Evidence","Risk Assessment","Mitigation Plan","Supporting Document","Site Photo",
  "Contract Reference","Email / Letter","Report","Other",
];

export function calcLevel(score: number): string {
  if (score >= 16) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

const riskInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  risk_number: z.string().max(80).nullable().optional(),
  risk_title: z.string().min(1).max(300),
  risk_description: z.string().max(4000).nullable().optional(),
  risk_category: z.string().max(80).default("General"),
  risk_type: z.string().max(40).default("Threat"),
  risk_source: z.string().max(200).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  milestone_id: z.string().uuid().nullable().optional(),
  boq_item_id: z.string().uuid().nullable().optional(),
  variation_id: z.string().uuid().nullable().optional(),
  issue_id: z.string().uuid().nullable().optional(),
  ncr_id: z.string().uuid().nullable().optional(),
  quality_inspection_id: z.string().uuid().nullable().optional(),
  safety_inspection_id: z.string().uuid().nullable().optional(),
  risk_owner_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  identified_by: z.string().uuid().nullable().optional(),
  probability: z.number().int().min(1).max(5).default(3),
  impact: z.number().int().min(1).max(5).default(3),
  response_strategy: z.string().max(40).default("Mitigate"),
  mitigation_plan: z.string().max(4000).nullable().optional(),
  contingency_plan: z.string().max(4000).nullable().optional(),
  trigger_condition: z.string().max(2000).nullable().optional(),
  early_warning_signs: z.string().max(2000).nullable().optional(),
  residual_probability: z.number().int().min(1).max(5).nullable().optional(),
  residual_impact: z.number().int().min(1).max(5).nullable().optional(),
  target_mitigation_date: z.string().nullable().optional(),
  review_date: z.string().nullable().optional(),
  cost_impact: z.boolean().default(false),
  cost_impact_amount: z.number().min(0).default(0),
  time_impact: z.boolean().default(false),
  time_impact_days: z.number().min(0).default(0),
  safety_impact: z.boolean().default(false),
  quality_impact: z.boolean().default(false),
  client_impact: z.boolean().default(false),
  remarks: z.string().max(4000).nullable().optional(),
  is_client_visible: z.boolean().default(false),
  status: z.enum(STATUSES).optional(),
});

async function nextRiskNumber(sb: any, projectId: string): Promise<string> {
  const { data: p } = await sb.from("projects").select("code,name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `RISK-${code}-${ymd}-`;
  const { data } = await sb.from("risks").select("risk_number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.risk_number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function logStatus(sb: any, riskId: string, projectId: string, companyId: string, oldS: string | null, newS: string, userId: string, remarks?: string | null) {
  await sb.from("risk_status_history").insert({
    risk_id: riskId, project_id: projectId, company_id: companyId,
    old_status: oldS, new_status: newS, changed_by: userId, remarks: remarks ?? null,
  });
}

export const listRisks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null; status?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("risks").select(RISK_COLS).eq("is_archived", false).order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getRisk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: risk, error } = await sb.from("risks").select(RISK_COLS).eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const [actions, atts, comments, history, reviews] = await Promise.all([
      sb.from("risk_actions").select("*").eq("risk_id", data.id).eq("is_archived", false).order("created_at"),
      sb.from("risk_attachments").select("*").eq("risk_id", data.id).order("created_at", { ascending: false }),
      sb.from("risk_comments").select("*").eq("risk_id", data.id).order("created_at"),
      sb.from("risk_status_history").select("*").eq("risk_id", data.id).order("created_at"),
      sb.from("risk_reviews").select("*").eq("risk_id", data.id).order("review_date", { ascending: false }),
    ]);
    return {
      risk,
      actions: actions.data ?? [],
      attachments: atts.data ?? [],
      comments: comments.data ?? [],
      history: history.data ?? [],
      reviews: reviews.data ?? [],
    };
  });

export const saveRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => riskInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const userId = context.userId;
    const { data: prof } = await sb.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    const companyId = prof?.company_id;
    if (!companyId) throw new Error("No company");

    const risk_score = data.probability * data.impact;
    const risk_level = calcLevel(risk_score);
    const residual_risk_score = data.residual_probability && data.residual_impact
      ? data.residual_probability * data.residual_impact : null;
    const residual_risk_level = residual_risk_score ? calcLevel(residual_risk_score) : null;

    const payload: any = {
      company_id: companyId,
      project_id: data.project_id,
      risk_number: data.risk_number ?? null,
      title: data.risk_title,
      description: data.risk_description ?? null,
      category: data.risk_category,
      risk_category: data.risk_category,
      risk_type: data.risk_type,
      risk_source: data.risk_source ?? null,
      location: data.location ?? null,
      wbs_id: data.wbs_id ?? null,
      task_id: data.task_id ?? null,
      milestone_id: data.milestone_id ?? null,
      boq_item_id: data.boq_item_id ?? null,
      variation_id: data.variation_id ?? null,
      issue_id: data.issue_id ?? null,
      ncr_id: data.ncr_id ?? null,
      quality_inspection_id: data.quality_inspection_id ?? null,
      safety_inspection_id: data.safety_inspection_id ?? null,
      risk_owner_id: data.risk_owner_id ?? null,
      owner_id: data.risk_owner_id ?? null,
      assigned_to: data.assigned_to ?? null,
      identified_by: data.identified_by ?? null,
      probability: data.probability,
      impact: data.impact,
      risk_score,
      risk_level,
      response_strategy: data.response_strategy,
      mitigation_plan: data.mitigation_plan ?? null,
      mitigation_action: data.mitigation_plan ?? null,
      contingency_plan: data.contingency_plan ?? null,
      trigger_condition: data.trigger_condition ?? null,
      early_warning_signs: data.early_warning_signs ?? null,
      residual_probability: data.residual_probability ?? null,
      residual_impact: data.residual_impact ?? null,
      residual_risk_score,
      residual_risk_level,
      target_mitigation_date: data.target_mitigation_date ?? null,
      due_date: data.target_mitigation_date ?? null,
      review_date: data.review_date ?? null,
      cost_impact: data.cost_impact,
      cost_impact_amount: data.cost_impact_amount,
      time_impact: data.time_impact,
      time_impact_days: data.time_impact_days,
      safety_impact: data.safety_impact,
      quality_impact: data.quality_impact,
      client_impact: data.client_impact,
      remarks: data.remarks ?? null,
      is_client_visible: data.is_client_visible,
    };

    if (!data.id) {
      payload.risk_number = data.risk_number || (await nextRiskNumber(sb, data.project_id));
      payload.status = data.status || "Open";
      payload.created_by = userId;
      const { data: row, error } = await sb.from("risks").insert(payload).select(RISK_COLS).single();
      if (error) throw new Error(error.message);
      await logStatus(sb, (row as any).id, data.project_id, companyId, null, payload.status, userId ?? "", "Created");
      return row;
    } else {
      const { data: row, error } = await sb.from("risks").update(payload).eq("id", data.id).select(RISK_COLS).single();
      if (error) throw new Error(error.message);
      return row;
    }
  });

export const setRiskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: typeof STATUSES[number]; remarks?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: existing, error: e1 } = await sb.from("risks").select("id, project_id, company_id, status").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    const upd: any = { status: data.status };
    const now = new Date().toISOString();
    if (data.status === "Closed") { upd.closed_at = now; upd.actual_mitigation_date = now.slice(0, 10); upd.remarks = data.remarks ?? null; }
    if (data.status === "Open" && (existing as any).status === "Closed") { upd.reopened_at = now; upd.closed_at = null; upd.actual_mitigation_date = null; }
    const { error } = await sb.from("risks").update(upd).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logStatus(sb, data.id, (existing as any).project_id, (existing as any).company_id, (existing as any).status, data.status, context.userId ?? "", data.remarks ?? null);
    return { ok: true };
  });

export const escalateRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; escalated_to?: string | null; reason: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: existing } = await sb.from("risks").select("project_id, company_id, status").eq("id", data.id).single();
    if (!existing) throw new Error("Risk not found");
    const { error } = await sb.from("risks").update({
      escalation_status: "Escalated",
      escalated_to: data.escalated_to ?? null,
      escalated_at: new Date().toISOString(),
      escalation_reason: data.reason,
      status: "Escalated",
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logStatus(sb, data.id, (existing as any).project_id, (existing as any).company_id, (existing as any).status, "Escalated", context.userId ?? "", data.reason);
    return { ok: true };
  });

export const convertRiskToIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: risk } = await sb.from("risks").select("*").eq("id", data.id).single();
    if (!risk) throw new Error("Risk not found");
    if ((risk as any).converted_to_issue) throw new Error("Risk already converted");
    let issueId: string | null = null;
    try {
      const { data: issue, error: ie } = await (sb.from("issues") as any).insert({
        project_id: (risk as any).project_id,
        company_id: (risk as any).company_id,
        title: (risk as any).title,
        description: (risk as any).description,
        priority: (risk as any).risk_level === "Critical" ? "Critical" : (risk as any).risk_level === "High" ? "High" : "Medium",
        status: "Open",
        category: "Risk",
        assigned_to: (risk as any).risk_owner_id ?? (risk as any).assigned_to,
        reported_by: context.userId,
      }).select("id").single();
      if (!ie && issue) issueId = (issue as any).id;
    } catch { /* issues table may have different shape */ }
    await sb.from("risks").update({
      converted_to_issue: true,
      converted_issue_id: issueId,
      status: "Occurred / Converted to Issue",
    }).eq("id", data.id);
    await logStatus(sb, data.id, (risk as any).project_id, (risk as any).company_id, (risk as any).status, "Occurred / Converted to Issue", context.userId ?? "", "Converted to issue");
    return { ok: true, issueId };
  });

export const archiveRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("risks").update({ is_archived: true, status: "Archived" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const actionInput = z.object({
  id: z.string().uuid().optional(),
  risk_id: z.string().uuid(),
  action_type: z.string().max(80).default("Mitigation"),
  action_title: z.string().min(1).max(300),
  action_description: z.string().max(4000).nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  target_date: z.string().nullable().optional(),
  status: z.enum(ACTION_STATUSES).default("Open"),
  priority: z.string().max(40).default("Medium"),
  progress_percentage: z.number().min(0).max(100).default(0),
  completion_notes: z.string().max(4000).nullable().optional(),
  completed_date: z.string().nullable().optional(),
});

export const saveRiskAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => actionInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: risk, error: e1 } = await sb.from("risks").select("project_id, company_id").eq("id", data.risk_id).single();
    if (e1) throw new Error(e1.message);
    if (!data.id) {
      const { error } = await sb.from("risk_actions").insert({
        ...data, project_id: (risk as any).project_id, company_id: (risk as any).company_id, created_by: context.userId ?? null,
      });
      if (error) throw new Error(error.message);
    } else {
      const { id, ...upd } = data;
      const { error } = await sb.from("risk_actions").update(upd).eq("id", id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setRiskActionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: typeof ACTION_STATUSES[number]; completion_notes?: string | null; progress_percentage?: number }) => d)
  .handler(async ({ data, context }) => {
    const upd: any = { status: data.status };
    if (typeof data.progress_percentage === "number") upd.progress_percentage = data.progress_percentage;
    if (data.status === "Completed") {
      upd.completed_date = new Date().toISOString().slice(0, 10);
      upd.completion_notes = data.completion_notes ?? null;
      upd.progress_percentage = 100;
    }
    const { error } = await context.supabase.from("risk_actions").update(upd).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveRiskAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("risk_actions").update({ is_archived: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addRiskAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { risk_id: string; file_name: string; file_url: string; attachment_type?: string; description?: string | null; is_client_visible?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: risk } = await sb.from("risks").select("project_id, company_id").eq("id", data.risk_id).maybeSingle();
    if (!risk) throw new Error("Risk not found");
    const { error } = await sb.from("risk_attachments").insert({
      risk_id: data.risk_id, project_id: (risk as any).project_id, company_id: (risk as any).company_id,
      uploaded_by: context.userId, file_name: data.file_name, file_url: data.file_url,
      attachment_type: data.attachment_type ?? "Risk Document", description: data.description ?? null,
      is_client_visible: data.is_client_visible ?? false,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRiskAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("risk_attachments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addRiskComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { risk_id: string; comment: string; visibility?: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: risk } = await sb.from("risks").select("project_id, company_id").eq("id", data.risk_id).maybeSingle();
    if (!risk) throw new Error("Risk not found");
    const { error } = await sb.from("risk_comments").insert({
      risk_id: data.risk_id, project_id: (risk as any).project_id, company_id: (risk as any).company_id,
      user_id: context.userId, comment: data.comment, visibility: data.visibility ?? "internal",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addRiskReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { risk_id: string; probability: number; impact: number; review_notes?: string | null; next_review_date?: string | null; applyToRisk?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: risk } = await sb.from("risks").select("project_id, company_id").eq("id", data.risk_id).maybeSingle();
    if (!risk) throw new Error("Risk not found");
    const score = data.probability * data.impact;
    const level = calcLevel(score);
    const { error } = await sb.from("risk_reviews").insert({
      risk_id: data.risk_id, project_id: (risk as any).project_id, company_id: (risk as any).company_id,
      reviewed_by: context.userId, probability: data.probability, impact: data.impact,
      risk_score: score, risk_level: level, review_notes: data.review_notes ?? null,
      next_review_date: data.next_review_date ?? null,
    });
    if (error) throw new Error(error.message);
    if (data.applyToRisk) {
      await sb.from("risks").update({
        probability: data.probability, impact: data.impact, risk_score: score, risk_level: level,
        review_date: new Date().toISOString().slice(0, 10),
      }).eq("id", data.risk_id);
    }
    return { ok: true };
  });

export const riskStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("risks").select("status, risk_level, target_mitigation_date, cost_impact, time_impact, escalation_status, converted_to_issue").eq("is_archived", false);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    const arr = rows ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const closedLike = ["Closed","Cancelled","Archived","Accepted","Avoided","Transferred"];
    return {
      total: arr.length,
      open: arr.filter((r: any) => !closedLike.includes(r.status)).length,
      closed: arr.filter((r: any) => r.status === "Closed").length,
      high: arr.filter((r: any) => r.risk_level === "High").length,
      critical: arr.filter((r: any) => r.risk_level === "Critical").length,
      overdue: arr.filter((r: any) => r.target_mitigation_date && r.target_mitigation_date < today && !closedLike.includes(r.status)).length,
      escalated: arr.filter((r: any) => r.escalation_status === "Escalated").length,
      converted: arr.filter((r: any) => r.converted_to_issue).length,
      costImpact: arr.filter((r: any) => r.cost_impact).length,
      timeImpact: arr.filter((r: any) => r.time_impact).length,
    };
  });

export const listRiskProjectMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: prof } = await sb.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (!prof?.company_id) return [];
    const { data: rows } = await sb.from("profiles").select("id, full_name, email").eq("company_id", prof.company_id).order("full_name");
    return rows ?? [];
  });

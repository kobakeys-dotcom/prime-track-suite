import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const approvalStatuses = ["draft", "submitted", "under_review", "approved", "rejected", "revise_resubmit", "closed"] as const;
type ApprovalStatus = (typeof approvalStatuses)[number];

// ============ RFIs ============

export const listRfis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("rfis")
      .select("id, number, subject, status, due_date, project_id, created_at, projects(name)")
      .order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).map((r: any) => ({ ...r, project_name: r.projects?.name ?? "—" }));
  });

export const createRfi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    project_id: z.string().uuid(),
    subject: z.string().min(1).max(200),
    number: z.string().max(50).optional().nullable(),
    question: z.string().max(5000).optional().nullable(),
    due_date: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("rfis").insert({ ...data, raised_by: context.userId, status: "submitted" }).select().single();
    if (error) throw error;
    return row;
  });

export const updateRfi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(approvalStatuses).optional(),
    answer: z.string().max(5000).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("rfis").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

// ============ Submittals ============

export const listSubmittals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("submittals")
      .select("id, number, title, spec_section, status, due_date, project_id, created_at, projects(name)")
      .order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).map((r: any) => ({ ...r, project_name: r.projects?.name ?? "—" }));
  });

export const createSubmittal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    project_id: z.string().uuid(),
    title: z.string().min(1).max(200),
    number: z.string().max(50).optional().nullable(),
    spec_section: z.string().max(100).optional().nullable(),
    due_date: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("submittals").insert({
        ...data, submitted_by: context.userId, status: "submitted", submitted_at: new Date().toISOString(),
      }).select().single();
    if (error) throw error;
    return row;
  });

export const updateSubmittalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(), status: z.enum(approvalStatuses),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("submittals").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ Approvals ============

export const listApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("approvals")
      .select("id, title, entity_type, entity_id, status, project_id, created_at, comment, projects(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ ...r, project_name: r.projects?.name ?? "—" }));
  });

const SYNCABLE_ENTITIES = new Set(["variations", "payment_claims", "procurement_requests", "purchase_orders", "submittals", "rfis"]);

export const updateApprovalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(approvalStatuses),
    comment: z.string().max(2000).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const patch: { status: ApprovalStatus; comment?: string | null; decided_at?: string; approver_id?: string } = {
      status: data.status,
      comment: data.comment,
    };
    if (["approved", "rejected", "revise_resubmit", "closed"].includes(data.status)) {
      patch.decided_at = new Date().toISOString();
      patch.approver_id = context.userId;
    }
    const { data: appr, error } = await context.supabase.from("approvals").update(patch).eq("id", data.id).select("entity_type, entity_id").maybeSingle();
    if (error) throw error;

    // Sync status back to source record where possible
    if (appr && appr.entity_id && SYNCABLE_ENTITIES.has(appr.entity_type)) {
      const sb = context.supabase as any;
      await sb.from(appr.entity_type).update({ status: data.status }).eq("id", appr.entity_id);
    }
    return { ok: true };
  });


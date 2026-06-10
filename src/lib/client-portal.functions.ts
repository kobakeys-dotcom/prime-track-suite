import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const projectIdSchema = z.object({ projectId: z.string().uuid() });

export const getClientSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const projectId = data.projectId;

    const [
      { data: project },
      { data: milestones },
      { data: claims },
      { data: vars },
      { data: docs },
      { data: approvals },
      { data: photoRows },
    ] = await Promise.all([
      sb.from("projects").select("id, name, code, client_name, consultant_name, contractor_name, location, status, progress, start_date, planned_end_date, revised_end_date, contract_value, currency, contract_number").eq("id", projectId).maybeSingle(),
      sb.from("milestones").select("id, name, due_date, completed_at").eq("project_id", projectId).order("due_date", { ascending: true }),
      sb.from("payment_claims").select("id, claim_number, period_end, gross_claim, net_claim, status").eq("project_id", projectId).order("period_end", { ascending: false }),
      sb.from("variations").select("id, variation_number, title, cost_impact, approved_amount, status").eq("project_id", projectId).order("created_at", { ascending: false }),
      sb.from("documents").select("id, name, category, file_url, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50),
      sb.from("approvals").select("id, title, status, entity_type, comment, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
      sb.from("daily_reports").select("photos").eq("project_id", projectId).eq("status", "approved").not("photos", "is", null).limit(50),
    ]);

    const flatPhotos: string[] = [];
    (photoRows ?? []).forEach((s: any) => { (s.photos ?? []).forEach((u: string) => flatPhotos.push(u)); });

    return {
      project,
      milestones: milestones ?? [],
      claims: claims ?? [],
      variations: vars ?? [],
      documents: docs ?? [],
      approvals: approvals ?? [],
      photos: flatPhotos.slice(0, 24),
    };
  });

export const listClientReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: rows } = await sb
      .from("daily_reports")
      .select("id, report_date, status, weather, work_completed, photos")
      .eq("project_id", data.projectId)
      .in("status", ["approved", "submitted"])
      .order("report_date", { ascending: false });
    return rows ?? [];
  });

export const listClientDrawings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: rows } = await sb
      .from("drawings")
      .select("id, number, title, discipline, revision, file_url, issued_date")
      .eq("project_id", data.projectId)
      .order("issued_date", { ascending: false, nullsFirst: false });
    return rows ?? [];
  });

export const listClientSnags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: rows } = await sb
      .from("snags")
      .select("id, snag_number, location, description, status, due_date, photos")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    return rows ?? [];
  });

const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "revision_requested"]),
  comment: z.string().max(2000).optional(),
});

export const decideClientApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decisionSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const status = data.decision === "revision_requested" ? "submitted" : data.decision;
    const { error } = await sb.from("approvals").update({
      status,
      comment: data.comment ?? null,
      approver_id: context.userId,
      decided_at: data.decision === "revision_requested" ? null : new Date().toISOString(),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideClientPaymentClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decisionSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const statusMap: Record<string, string> = {
      approved: "approved",
      rejected: "rejected",
      revision_requested: "revision_requested",
    };
    const patch: any = { status: statusMap[data.decision], notes: data.comment ?? null };
    if (data.decision === "approved") patch.approved_at = new Date().toISOString();
    const { error } = await sb.from("payment_claims").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

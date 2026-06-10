import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const COLS =
  "id, project_id, variation_number, title, description, variation_type, category, reason, " +
  "instruction_reference, priority, status, " +
  "submitted_by, reviewed_by, approved_by, client_approved_by, assigned_to, created_by, " +
  "due_date, submitted_at, reviewed_at, approved_at, rejected_at, client_approved_at, " +
  "submitted_amount, approved_amount, rejected_amount, pending_amount, " +
  "submitted_days, approved_days, time_impact_days, " +
  "cost_impact, cost_impact_description, time_impact_description, " +
  "rejection_reason, revision_notes, review_comments, approval_comments, " +
  "linked_rfi_id, linked_drawing_id, linked_document_id, linked_task_id, linked_wbs_id, linked_boq_item_id, " +
  "payment_claim_id, included_in_payment_claim, is_client_visible, is_archived, " +
  "created_at, updated_at";

const STATUSES = [
  "draft", "submitted", "under_review", "approved", "client_approved",
  "rejected", "revise_resubmit", "included_in_claim", "closed", "cancelled",
] as const;

const varInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  variation_number: z.string().max(80).optional().nullable(),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  variation_type: z.string().max(80).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  reason: z.string().max(2000).optional().nullable(),
  instruction_reference: z.string().max(200).optional().nullable(),
  priority: z.string().max(20).optional().nullable(),
  status: z.enum(STATUSES).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  time_impact_days: z.number().optional().nullable(),
  submitted_days: z.number().optional().nullable(),
  cost_impact_description: z.string().max(2000).optional().nullable(),
  time_impact_description: z.string().max(2000).optional().nullable(),
  linked_rfi_id: z.string().uuid().optional().nullable(),
  linked_drawing_id: z.string().uuid().optional().nullable(),
  linked_document_id: z.string().uuid().optional().nullable(),
  linked_task_id: z.string().uuid().optional().nullable(),
  linked_wbs_id: z.string().uuid().optional().nullable(),
  linked_boq_item_id: z.string().uuid().optional().nullable(),
  is_client_visible: z.boolean().optional(),
});

async function nextVariationNumber(sb: any, projectId: string): Promise<string> {
  const { data: p } = await sb.from("projects").select("code, name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const prefix = `VO-${code}-`;
  const { data } = await sb.from("variations").select("variation_number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.variation_number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function recalcTotals(sb: any, variationId: string) {
  const { data: items } = await sb.from("variation_line_items")
    .select("amount, approved_amount").eq("variation_id", variationId).eq("is_archived", false);
  const submitted = (items ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
  const approved = (items ?? []).reduce((s: number, r: any) => s + Number(r.approved_amount ?? 0), 0);
  await sb.from("variations").update({
    submitted_amount: submitted,
    approved_amount: approved,
    pending_amount: Math.max(0, submitted - approved),
    cost_impact: submitted, // keep legacy column synced
  }).eq("id", variationId);
}

export const listVariationsFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      projectId: z.string().uuid().optional(),
      includeArchived: z.boolean().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("variations").select(COLS).order("created_at", { ascending: false }).limit(1000);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    const list = (rows ?? []) as any[];
    const pids = Array.from(new Set(list.map((r) => r.project_id).filter(Boolean)));
    const uids = Array.from(new Set(list.flatMap((r) => [r.assigned_to, r.submitted_by, r.approved_by, r.reviewed_by, r.client_approved_by, r.created_by]).filter(Boolean)));
    const [{ data: projs }, { data: profs }] = await Promise.all([
      pids.length ? sb.from("projects").select("id, name, code").in("id", pids) : Promise.resolve({ data: [] }),
      uids.length ? sb.from("profiles").select("id, full_name, email").in("id", uids) : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((projs ?? []).map((p: any) => [p.id, p]));
    const uMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || p.email]));
    return list.map((r) => ({
      ...r,
      project_name: (pMap.get(r.project_id) as any)?.name ?? null,
      project_code: (pMap.get(r.project_id) as any)?.code ?? null,
      assigned_name: r.assigned_to ? uMap.get(r.assigned_to) ?? null : null,
      submitted_name: r.submitted_by ? uMap.get(r.submitted_by) ?? null : null,
      approved_name: r.approved_by ? uMap.get(r.approved_by) ?? null : null,
      reviewed_name: r.reviewed_by ? uMap.get(r.reviewed_by) ?? null : null,
      client_approved_name: r.client_approved_by ? uMap.get(r.client_approved_by) ?? null : null,
    }));
  });

export const getVariation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any).from("variations").select(COLS).eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });

export const upsertVariation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => varInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { id, ...rest } = data;
    const values: Record<string, any> = { ...rest };
    for (const k of Object.keys(values)) if (values[k] === "") values[k] = null;
    if (!values.priority) values.priority = "Medium";
    if (!values.variation_type) values.variation_type = "General";
    if (!values.status) values.status = "draft";

    if (id) {
      const { error } = await sb.from("variations").update(values).eq("id", id);
      if (error) throw error;
      return { ok: true, id };
    }
    if (!values.variation_number) values.variation_number = await nextVariationNumber(sb, values.project_id);
    values.created_by = context.userId;
    const { data: ins, error } = await sb.from("variations").insert(values).select("id, variation_number, title, assigned_to, priority").single();
    if (error) throw error;

    if (ins.assigned_to && ins.assigned_to !== context.userId) {
      await sb.from("notifications").insert({
        user_id: ins.assigned_to,
        title: `Variation assigned: ${ins.title}`,
        body: `You were assigned variation ${ins.variation_number}.`,
        severity: ins.priority === "Critical" ? "critical" : "info",
        link: `/variations?id=${ins.id}`,
      });
    }
    return { ok: true, id: ins.id };
  });

export const submitVariation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    await recalcTotals(sb, data.id);
    const { error } = await sb.from("variations").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      submitted_by: context.userId,
    }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const setVariationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(STATUSES),
    note: z.string().max(2000).optional(),
    approved_amount: z.number().optional(),
    approved_days: z.number().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const now = new Date().toISOString();
    const patch: any = { status: data.status };

    if (data.status === "under_review") { patch.reviewed_at = now; patch.reviewed_by = context.userId; }
    if (data.status === "approved") {
      patch.approved_at = now;
      patch.approved_by = context.userId;
      if (typeof data.approved_amount === "number") patch.approved_amount = data.approved_amount;
      if (typeof data.approved_days === "number") patch.approved_days = data.approved_days;
      if (data.note) patch.approval_comments = data.note;
      // compute pending
      const { data: cur } = await sb.from("variations").select("submitted_amount").eq("id", data.id).maybeSingle();
      const sub = Number(cur?.submitted_amount ?? 0);
      const appr = Number(patch.approved_amount ?? 0);
      patch.pending_amount = Math.max(0, sub - appr);
    }
    if (data.status === "client_approved") {
      patch.client_approved_at = now;
      patch.client_approved_by = context.userId;
    }
    if (data.status === "rejected") {
      patch.rejected_at = now;
      if (data.note) patch.rejection_reason = data.note;
      const { data: cur } = await sb.from("variations").select("submitted_amount").eq("id", data.id).maybeSingle();
      patch.rejected_amount = Number(cur?.submitted_amount ?? 0);
      patch.approved_amount = 0;
      patch.pending_amount = 0;
    }
    if (data.status === "revise_resubmit" && data.note) patch.revision_notes = data.note;
    if (data.status === "closed") patch.review_comments = data.note ?? null;

    const { data: row, error } = await sb.from("variations").update(patch).eq("id", data.id)
      .select("title, variation_number, submitted_by, assigned_to, created_by").single();
    if (error) throw error;

    if (data.note) {
      await sb.from("comments").insert({
        entity_type: "variations", entity_id: data.id,
        body: `[${data.status.replace(/_/g, " ")}] ${data.note}`,
        author_id: context.userId,
      });
    }
    const targets = new Set<string>();
    for (const u of [row.submitted_by, row.created_by, row.assigned_to]) {
      if (u && u !== context.userId) targets.add(u);
    }
    for (const u of targets) {
      await sb.from("notifications").insert({
        user_id: u,
        title: `Variation ${data.status.replace(/_/g, " ")}: ${row.title}`,
        body: `${row.variation_number} status changed.`,
        severity: data.status === "rejected" ? "warning" : "info",
        link: `/variations?id=${data.id}`,
      });
    }
    return { ok: true };
  });

export const archiveVariation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("variations").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ LINE ITEMS ============
const lineInput = z.object({
  id: z.string().uuid().optional(),
  variation_id: z.string().uuid(),
  project_id: z.string().uuid(),
  description: z.string().min(1).max(500),
  unit: z.string().max(40).optional().nullable(),
  quantity: z.number().optional(),
  rate: z.number().optional(),
  approved_quantity: z.number().optional(),
  approved_rate: z.number().optional(),
  item_type: z.string().max(40).optional().nullable(),
  remarks: z.string().max(500).optional().nullable(),
  boq_item_id: z.string().uuid().optional().nullable(),
  cost_code_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().optional(),
});

export const listVariationLineItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ variation_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await (context.supabase as any).from("variation_line_items")
      .select("*").eq("variation_id", data.variation_id).eq("is_archived", false)
      .order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const upsertVariationLineItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => lineInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { id, ...rest } = data;
    const qty = Number(rest.quantity ?? 0);
    const rate = Number(rest.rate ?? 0);
    const aqty = Number(rest.approved_quantity ?? 0);
    const arate = Number(rest.approved_rate ?? 0);
    const values: any = {
      ...rest,
      quantity: qty, rate, amount: +(qty * rate).toFixed(2),
      approved_quantity: aqty, approved_rate: arate, approved_amount: +(aqty * arate).toFixed(2),
    };
    for (const k of Object.keys(values)) if (values[k] === "") values[k] = null;
    if (id) {
      const { error } = await sb.from("variation_line_items").update(values).eq("id", id);
      if (error) throw error;
    } else {
      values.created_by = context.userId;
      const { error } = await sb.from("variation_line_items").insert(values);
      if (error) throw error;
    }
    await recalcTotals(sb, data.variation_id);
    return { ok: true };
  });

export const deleteVariationLineItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), variation_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from("variation_line_items").delete().eq("id", data.id);
    if (error) throw error;
    await recalcTotals(sb, data.variation_id);
    return { ok: true };
  });

// ============ ATTACHMENTS ============
export const listVariationAttachments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ variation_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await (context.supabase as any).from("variation_attachments")
      .select("*").eq("variation_id", data.variation_id).order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const addVariationAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    variation_id: z.string().uuid(),
    project_id: z.string().uuid(),
    file_name: z.string().min(1).max(255),
    file_url: z.string().url().max(1000),
    file_type: z.string().max(80).optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    attachment_type: z.string().max(80).optional().nullable(),
    is_client_visible: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("variation_attachments").insert({
      ...data, uploaded_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteVariationAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("variation_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ PAYMENT CLAIM INTEGRATION ============
export const includeVariationInClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    payment_claim_id: z.string().uuid().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const patch: any = {
      payment_claim_id: data.payment_claim_id,
      included_in_payment_claim: !!data.payment_claim_id,
    };
    if (data.payment_claim_id) patch.status = "included_in_claim";
    const { error } = await sb.from("variations").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

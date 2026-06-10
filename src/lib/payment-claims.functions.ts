import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CLAIM_COLS =
  "id, project_id, claim_number, claim_type, period_start, period_end, claim_date, due_date, status, currency, " +
  "previous_certified_amount, work_done_value, variation_value, material_at_site_value, other_claim_value, " +
  "gross_claim, retention_percentage, retention, advance_recovery, deductions, tax_amount, net_claim, " +
  "current_claim_amount, submitted_amount, certified_amount, paid_amount, outstanding_amount, " +
  "payment_reference, rejection_reason, revision_notes, review_comments, certification_comments, " +
  "submitted_at, reviewed_at, approved_at, certified_at, paid_at, client_approved_at, " +
  "created_by, reviewed_by, approved_by, certified_by, paid_by, client_approved_by, " +
  "is_client_visible, is_archived, notes, created_at, updated_at";

const STATUSES = [
  "draft", "submitted", "under_review", "approved", "client_approved",
  "certified", "paid", "partially_paid", "rejected", "revision_requested",
  "closed", "cancelled",
] as const;

const claimInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  claim_number: z.string().max(80).optional().nullable(),
  claim_type: z.string().max(80).optional().nullable(),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
  claim_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  status: z.enum(STATUSES).optional(),
  currency: z.string().max(10).optional().nullable(),
  previous_certified_amount: z.number().optional(),
  work_done_value: z.number().optional(),
  variation_value: z.number().optional(),
  material_at_site_value: z.number().optional(),
  other_claim_value: z.number().optional(),
  retention_percentage: z.number().min(0).max(100).optional(),
  advance_recovery: z.number().optional(),
  deductions: z.number().optional(),
  tax_amount: z.number().optional(),
  payment_reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  is_client_visible: z.boolean().optional(),
});

function calcTotals(c: any) {
  const work = Number(c.work_done_value ?? 0);
  const vari = Number(c.variation_value ?? 0);
  const mat = Number(c.material_at_site_value ?? 0);
  const other = Number(c.other_claim_value ?? 0);
  const gross = +(work + vari + mat + other).toFixed(2);
  const retPct = Number(c.retention_percentage ?? 0);
  const retention = +(gross * retPct / 100).toFixed(2);
  const adv = Number(c.advance_recovery ?? 0);
  const ded = Number(c.deductions ?? 0);
  const tax = Number(c.tax_amount ?? 0);
  const net = +(gross - retention - adv - ded - tax).toFixed(2);
  const prev = Number(c.previous_certified_amount ?? 0);
  const current = +(net - prev).toFixed(2);
  return { gross_claim: gross, retention, net_claim: net, current_claim_amount: current };
}

async function nextClaimNumber(sb: any, projectId: string, periodEnd?: string | null): Promise<string> {
  const { data: p } = await sb.from("projects").select("code, name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const ym = (periodEnd || new Date().toISOString()).slice(0, 7).replace("-", "");
  const prefix = `IPC-${code}-${ym}-`;
  const { data } = await sb.from("payment_claims").select("claim_number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.claim_number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export const listPaymentClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid().optional(), includeArchived: z.boolean().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("payment_claims").select(CLAIM_COLS).order("created_at", { ascending: false }).limit(1000);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    const list = (rows ?? []) as any[];
    const pids = Array.from(new Set(list.map((r) => r.project_id).filter(Boolean)));
    const uids = Array.from(new Set(list.flatMap((r) => [r.created_by, r.approved_by, r.certified_by, r.paid_by]).filter(Boolean)));
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
      created_name: r.created_by ? uMap.get(r.created_by) ?? null : null,
      approved_name: r.approved_by ? uMap.get(r.approved_by) ?? null : null,
      certified_name: r.certified_by ? uMap.get(r.certified_by) ?? null : null,
      paid_name: r.paid_by ? uMap.get(r.paid_by) ?? null : null,
    }));
  });

export const getPaymentClaim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("payment_claims").select(CLAIM_COLS).eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });

export const upsertPaymentClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => claimInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { id, ...rest } = data;
    const values: Record<string, any> = { ...rest };
    for (const k of Object.keys(values)) if (values[k] === "") values[k] = null;
    if (!values.currency) values.currency = "MVR";
    if (!values.claim_type) values.claim_type = "Interim Payment Claim";
    if (!values.status) values.status = "draft";
    if (values.period_start && values.period_end && values.period_end < values.period_start) {
      throw new Error("Period end cannot be before period start");
    }
    Object.assign(values, calcTotals(values));

    if (id) {
      const { error } = await sb.from("payment_claims").update(values).eq("id", id);
      if (error) throw error;
      return { ok: true, id };
    }
    if (!values.claim_number) values.claim_number = await nextClaimNumber(sb, values.project_id, values.period_end);
    values.created_by = context.userId;
    const { data: ins, error } = await sb.from("payment_claims").insert(values).select("id").single();
    if (error) throw error;
    return { ok: true, id: ins.id };
  });

async function recalcClaimFromItems(sb: any, claimId: string) {
  const [{ data: items }, { data: vars }] = await Promise.all([
    sb.from("payment_claim_items").select("current_amount, cumulative_amount, certified_amount").eq("payment_claim_id", claimId).eq("is_archived", false),
    sb.from("payment_claim_variations").select("claimed_amount").eq("payment_claim_id", claimId),
  ]);
  const workDone = (items ?? []).reduce((s: number, r: any) => s + Number(r.current_amount ?? 0), 0);
  const varVal = (vars ?? []).reduce((s: number, r: any) => s + Number(r.claimed_amount ?? 0), 0);
  const { data: cur } = await sb.from("payment_claims").select("*").eq("id", claimId).maybeSingle();
  if (!cur) return;
  const next = { ...cur, work_done_value: workDone, variation_value: varVal };
  const totals = calcTotals(next);
  await sb.from("payment_claims").update({ work_done_value: workDone, variation_value: varVal, ...totals }).eq("id", claimId);
}

export const submitPaymentClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    await recalcClaimFromItems(sb, data.id);
    const { data: cur } = await sb.from("payment_claims").select("net_claim, status").eq("id", data.id).maybeSingle();
    const { error } = await sb.from("payment_claims").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      submitted_amount: Number(cur?.net_claim ?? 0),
    }).eq("id", data.id);
    if (error) throw error;
    await sb.from("payment_claim_status_history").insert({
      payment_claim_id: data.id,
      project_id: (await sb.from("payment_claims").select("project_id").eq("id", data.id).maybeSingle()).data?.project_id,
      old_status: cur?.status, new_status: "submitted", changed_by: context.userId,
    });
    return { ok: true };
  });

export const setPaymentClaimStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(STATUSES),
    note: z.string().max(2000).optional(),
    certified_amount: z.number().optional(),
    paid_amount: z.number().optional(),
    payment_reference: z.string().max(200).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const now = new Date().toISOString();
    const { data: cur } = await sb.from("payment_claims").select("*").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Claim not found");
    const patch: any = { status: data.status };

    if (data.status === "under_review") { patch.reviewed_at = now; patch.reviewed_by = context.userId; }
    if (data.status === "approved") {
      patch.approved_at = now; patch.approved_by = context.userId;
      if (data.note) patch.review_comments = data.note;
    }
    if (data.status === "client_approved") {
      patch.client_approved_at = now; patch.client_approved_by = context.userId;
    }
    if (data.status === "rejected") {
      if (!data.note) throw new Error("Rejection reason required");
      patch.rejection_reason = data.note;
    }
    if (data.status === "revision_requested") {
      if (!data.note) throw new Error("Revision notes required");
      patch.revision_notes = data.note;
    }
    if (data.status === "certified") {
      const certAmt = Number(data.certified_amount ?? cur.net_claim ?? 0);
      const submitted = Number(cur.submitted_amount ?? cur.net_claim ?? 0);
      if (certAmt < 0) throw new Error("Certified amount cannot be negative");
      if (certAmt > submitted * 1.0001) throw new Error("Certified amount cannot exceed submitted amount");
      patch.certified_at = now; patch.certified_by = context.userId;
      patch.certified_amount = certAmt;
      patch.outstanding_amount = +(certAmt - Number(cur.paid_amount ?? 0)).toFixed(2);
      if (data.note) patch.certification_comments = data.note;
    }
    if (data.status === "paid" || data.status === "partially_paid") {
      const cert = Number(cur.certified_amount ?? 0);
      const paidPrev = Number(cur.paid_amount ?? 0);
      const paidAdd = Number(data.paid_amount ?? 0);
      const totalPaid = +(paidPrev + paidAdd).toFixed(2);
      if (paidAdd <= 0) throw new Error("Paid amount must be greater than zero");
      if (totalPaid > cert * 1.0001) throw new Error("Total paid cannot exceed certified amount");
      patch.paid_amount = totalPaid;
      patch.paid_at = now; patch.paid_by = context.userId;
      patch.outstanding_amount = +(cert - totalPaid).toFixed(2);
      patch.status = totalPaid >= cert ? "paid" : "partially_paid";
      if (data.payment_reference) patch.payment_reference = data.payment_reference;
    }

    const { error } = await sb.from("payment_claims").update(patch).eq("id", data.id);
    if (error) throw error;

    await sb.from("payment_claim_status_history").insert({
      payment_claim_id: data.id, project_id: cur.project_id,
      old_status: cur.status, new_status: patch.status, changed_by: context.userId,
      remarks: data.note ?? null,
    });
    if (data.note) {
      await sb.from("comments").insert({
        entity_type: "payment_claims", entity_id: data.id,
        body: `[${patch.status.replace(/_/g, " ")}] ${data.note}`,
        author_id: context.userId,
      });
    }
    return { ok: true };
  });

export const archivePaymentClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: cur } = await sb.from("payment_claims").select("status").eq("id", data.id).maybeSingle();
    if (cur && ["certified", "paid", "partially_paid"].includes(cur.status)) {
      throw new Error("Cannot archive a certified or paid claim");
    }
    const { error } = await sb.from("payment_claims").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ ITEMS ============
const itemInput = z.object({
  id: z.string().uuid().optional(),
  payment_claim_id: z.string().uuid(),
  project_id: z.string().uuid(),
  boq_item_id: z.string().uuid().optional().nullable(),
  cost_code_id: z.string().uuid().optional().nullable(),
  item_type: z.string().max(40).optional().nullable(),
  description: z.string().min(1).max(500),
  unit: z.string().max(40).optional().nullable(),
  contract_quantity: z.number().optional(),
  rate: z.number().optional(),
  previous_quantity: z.number().optional(),
  current_quantity: z.number().optional(),
  certified_quantity: z.number().optional(),
  remarks: z.string().max(500).optional().nullable(),
  sort_order: z.number().optional(),
});

export const listPaymentClaimItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ payment_claim_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await (context.supabase as any).from("payment_claim_items")
      .select("*").eq("payment_claim_id", data.payment_claim_id).eq("is_archived", false)
      .order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const upsertPaymentClaimItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => itemInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { id, ...rest } = data;
    const cq = Number(rest.contract_quantity ?? 0);
    const rate = Number(rest.rate ?? 0);
    const prev = Number(rest.previous_quantity ?? 0);
    const cur = Number(rest.current_quantity ?? 0);
    const cum = +(prev + cur).toFixed(3);
    const cert = Number(rest.certified_quantity ?? cum);
    const bal = +(cq - cum).toFixed(3);
    const progress = cq > 0 ? +((cum / cq) * 100).toFixed(2) : 0;
    const values: any = {
      ...rest,
      contract_quantity: cq, rate,
      contract_amount: +(cq * rate).toFixed(2),
      previous_quantity: prev, current_quantity: cur, cumulative_quantity: cum,
      certified_quantity: cert, balance_quantity: bal,
      previous_amount: +(prev * rate).toFixed(2),
      current_amount: +(cur * rate).toFixed(2),
      cumulative_amount: +(cum * rate).toFixed(2),
      certified_amount: +(cert * rate).toFixed(2),
      progress_percentage: progress,
    };
    for (const k of Object.keys(values)) if (values[k] === "") values[k] = null;
    if (id) {
      const { error } = await sb.from("payment_claim_items").update(values).eq("id", id);
      if (error) throw error;
    } else {
      values.created_by = context.userId;
      const { error } = await sb.from("payment_claim_items").insert(values);
      if (error) throw error;
    }
    await recalcClaimFromItems(sb, data.payment_claim_id);
    return { ok: true };
  });

export const deletePaymentClaimItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), payment_claim_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from("payment_claim_items").delete().eq("id", data.id);
    if (error) throw error;
    await recalcClaimFromItems(sb, data.payment_claim_id);
    return { ok: true };
  });

export const pullBoqIntoClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    payment_claim_id: z.string().uuid(), project_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: boq } = await sb.from("boq_items").select("id, item_code, description, unit, quantity, unit_rate, completed_qty, cost_code_id")
      .eq("project_id", data.project_id).eq("is_archived", false);
    const { data: existing } = await sb.from("payment_claim_items").select("boq_item_id").eq("payment_claim_id", data.payment_claim_id);
    const existSet = new Set((existing ?? []).map((r: any) => r.boq_item_id).filter(Boolean));
    const rows = (boq ?? []).filter((b: any) => !existSet.has(b.id)).map((b: any, idx: number) => {
      const cq = Number(b.quantity ?? 0);
      const rate = Number(b.unit_rate ?? 0);
      const cum = Number(b.completed_qty ?? 0);
      const bal = +(cq - cum).toFixed(3);
      const progress = cq > 0 ? +((cum / cq) * 100).toFixed(2) : 0;
      return {
        payment_claim_id: data.payment_claim_id,
        project_id: data.project_id,
        boq_item_id: b.id,
        cost_code_id: b.cost_code_id,
        item_type: "BOQ",
        description: `${b.item_code ? b.item_code + " — " : ""}${b.description ?? ""}`.trim() || "BOQ item",
        unit: b.unit,
        contract_quantity: cq, rate,
        contract_amount: +(cq * rate).toFixed(2),
        previous_quantity: cum, current_quantity: 0,
        cumulative_quantity: cum, certified_quantity: cum, balance_quantity: bal,
        previous_amount: +(cum * rate).toFixed(2),
        current_amount: 0, cumulative_amount: +(cum * rate).toFixed(2),
        certified_amount: +(cum * rate).toFixed(2),
        progress_percentage: progress,
        sort_order: idx,
        created_by: context.userId,
      };
    });
    if (rows.length) {
      const { error } = await sb.from("payment_claim_items").insert(rows);
      if (error) throw error;
    }
    await recalcClaimFromItems(sb, data.payment_claim_id);
    return { ok: true, inserted: rows.length };
  });

// ============ VARIATIONS ============
export const listPaymentClaimVariations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ payment_claim_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await (context.supabase as any).from("payment_claim_variations")
      .select("*").eq("payment_claim_id", data.payment_claim_id).order("created_at");
    if (error) throw error;
    return rows ?? [];
  });

export const listAvailableVariations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid(), payment_claim_id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: vars } = await sb.from("variations")
      .select("id, variation_number, title, approved_amount, submitted_amount, status")
      .eq("project_id", data.project_id).eq("is_archived", false)
      .in("status", ["approved", "client_approved", "included_in_claim"]);
    return vars ?? [];
  });

export const addPaymentClaimVariation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    payment_claim_id: z.string().uuid(),
    project_id: z.string().uuid(),
    variation_id: z.string().uuid(),
    claimed_amount: z.number().optional(),
    remarks: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: v } = await sb.from("variations").select("variation_number, title, approved_amount").eq("id", data.variation_id).maybeSingle();
    const approved = Number(v?.approved_amount ?? 0);
    const claimed = Number(data.claimed_amount ?? approved);
    const { error } = await sb.from("payment_claim_variations").insert({
      payment_claim_id: data.payment_claim_id,
      project_id: data.project_id,
      variation_id: data.variation_id,
      variation_number: v?.variation_number,
      description: v?.title,
      approved_amount: approved,
      claimed_amount: claimed,
      remarks: data.remarks ?? null,
    });
    if (error) throw error;
    await recalcClaimFromItems(sb, data.payment_claim_id);
    return { ok: true };
  });

export const updatePaymentClaimVariation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(), payment_claim_id: z.string().uuid(),
    claimed_amount: z.number().optional(), certified_amount: z.number().optional(),
    remarks: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { id, payment_claim_id, ...rest } = data;
    const { error } = await sb.from("payment_claim_variations").update(rest).eq("id", id);
    if (error) throw error;
    await recalcClaimFromItems(sb, payment_claim_id);
    return { ok: true };
  });

export const removePaymentClaimVariation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), payment_claim_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from("payment_claim_variations").delete().eq("id", data.id);
    if (error) throw error;
    await recalcClaimFromItems(sb, data.payment_claim_id);
    return { ok: true };
  });

// ============ ATTACHMENTS ============
export const listPaymentClaimAttachments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ payment_claim_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await (context.supabase as any).from("payment_claim_attachments")
      .select("*").eq("payment_claim_id", data.payment_claim_id).order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const addPaymentClaimAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    payment_claim_id: z.string().uuid(),
    project_id: z.string().uuid(),
    file_name: z.string().min(1).max(255),
    file_url: z.string().url().max(1000),
    file_type: z.string().max(80).optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    attachment_type: z.string().max(80).optional().nullable(),
    is_client_visible: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("payment_claim_attachments")
      .insert({ ...data, uploaded_by: context.userId });
    if (error) throw error;
    return { ok: true };
  });

export const deletePaymentClaimAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("payment_claim_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listPaymentClaimStatusHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ payment_claim_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await (context.supabase as any).from("payment_claim_status_history")
      .select("*").eq("payment_claim_id", data.payment_claim_id).order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

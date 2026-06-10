import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const num = (v: unknown) => Number(v ?? 0);

async function companyId(sb: any) {
  const r = await sb.rpc("current_company_id");
  return r.data as string;
}

function calcEntry(e: any) {
  const np = num(e.planned_inflow) - num(e.planned_outflow);
  const na = num(e.actual_inflow) - num(e.actual_outflow);
  const nf = num(e.forecast_inflow) - num(e.forecast_outflow);
  return { net_planned: np, net_actual: na, net_forecast: nf };
}

async function recalcPlan(sb: any, planId: string) {
  const { data: plan } = await sb.from("cash_flow_plans").select("*").eq("id", planId).maybeSingle();
  if (!plan) return;
  const { data: entries } = await sb
    .from("cash_flow_entries")
    .select("*")
    .eq("cash_flow_plan_id", planId)
    .eq("is_archived", false)
    .order("period_start", { ascending: true });
  const agg = (entries ?? []).reduce(
    (s: any, e: any) => {
      s.total_planned_inflow += num(e.planned_inflow);
      s.total_actual_inflow += num(e.actual_inflow);
      s.total_forecast_inflow += num(e.forecast_inflow);
      s.total_planned_outflow += num(e.planned_outflow);
      s.total_actual_outflow += num(e.actual_outflow);
      s.total_forecast_outflow += num(e.forecast_outflow);
      return s;
    },
    {
      total_planned_inflow: 0, total_actual_inflow: 0, total_forecast_inflow: 0,
      total_planned_outflow: 0, total_actual_outflow: 0, total_forecast_outflow: 0,
    }
  );
  const np = agg.total_planned_inflow - agg.total_planned_outflow;
  const na = agg.total_actual_inflow - agg.total_actual_outflow;
  const nf = agg.total_forecast_inflow - agg.total_forecast_outflow;
  await sb.from("cash_flow_plans").update({
    ...agg,
    net_planned_cash_flow: np,
    net_actual_cash_flow: na,
    net_forecast_cash_flow: nf,
    closing_balance: num(plan.opening_balance) + na,
  }).eq("id", planId);

  // recalc cumulative on entries in order
  let cp = num(plan.opening_balance), ca = num(plan.opening_balance), cf = num(plan.opening_balance);
  for (const e of entries ?? []) {
    cp += num(e.net_planned);
    ca += num(e.net_actual);
    cf += num(e.net_forecast);
    await sb.from("cash_flow_entries").update({
      cumulative_planned: cp,
      cumulative_actual: ca,
      cumulative_forecast: cf,
    }).eq("id", e.id);
  }
}

// ===== PLANS =====
export const listCashFlowPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("cash_flow_plans").select("*").eq("is_archived", false).order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const upsertCashFlowPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      project_id: z.string().uuid(),
      plan_name: z.string().min(1).max(200),
      plan_type: z.string().max(50).default("Monthly"),
      description: z.string().max(2000).nullable().optional(),
      start_date: z.string(),
      end_date: z.string(),
      currency: z.string().max(10).default("MVR"),
      opening_balance: z.number().default(0),
      status: z.string().max(50).default("Active"),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    if (data.end_date < data.start_date) throw new Error("End date cannot be before start date");
    const company_id = await companyId(sb);
    const payload = { ...data, company_id, created_by: context.userId };
    if (data.id) {
      const { data: r, error } = await sb.from("cash_flow_plans").update(payload).eq("id", data.id).select().single();
      if (error) throw error;
      await recalcPlan(sb, r.id);
      return r;
    }
    const { data: r, error } = await sb.from("cash_flow_plans").insert(payload).select().single();
    if (error) throw error;
    return r;
  });

export const archiveCashFlowPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    await sb.from("cash_flow_plans").update({ is_archived: true }).eq("id", data.id);
    return { ok: true };
  });

export const generateCashFlowPeriods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ planId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: plan } = await sb.from("cash_flow_plans").select("*").eq("id", data.planId).maybeSingle();
    if (!plan) throw new Error("Plan not found");
    const company_id = plan.company_id;
    const start = new Date(plan.start_date);
    const end = new Date(plan.end_date);
    const periods: any[] = [];
    let cursor = new Date(start);
    const stepDays = plan.plan_type === "Weekly" ? 7 : plan.plan_type === "Quarterly" ? 90 : 30;
    while (cursor <= end) {
      const pStart = new Date(cursor);
      let pEnd: Date;
      if (plan.plan_type === "Monthly") {
        pEnd = new Date(pStart.getFullYear(), pStart.getMonth() + 1, 0);
      } else {
        pEnd = new Date(pStart);
        pEnd.setDate(pEnd.getDate() + stepDays - 1);
      }
      if (pEnd > end) pEnd = new Date(end);
      const label = plan.plan_type === "Monthly"
        ? pStart.toISOString().slice(0, 7)
        : `${pStart.toISOString().slice(0, 10)} → ${pEnd.toISOString().slice(0, 10)}`;
      periods.push({
        company_id,
        project_id: plan.project_id,
        cash_flow_plan_id: plan.id,
        period_label: label,
        period_start: pStart.toISOString().slice(0, 10),
        period_end: pEnd.toISOString().slice(0, 10),
        entry_type: "Both",
        category: "General",
        created_by: context.userId,
      });
      cursor = new Date(pEnd);
      cursor.setDate(cursor.getDate() + 1);
    }
    if (!periods.length) return { inserted: 0 };
    // dedupe: skip existing labels
    const { data: existing } = await sb.from("cash_flow_entries")
      .select("period_label").eq("cash_flow_plan_id", plan.id).eq("is_archived", false);
    const seen = new Set((existing ?? []).map((r: any) => r.period_label));
    const fresh = periods.filter(p => !seen.has(p.period_label));
    if (fresh.length) await sb.from("cash_flow_entries").insert(fresh);
    await recalcPlan(sb, plan.id);
    return { inserted: fresh.length };
  });

// ===== ENTRIES =====
export const listCashFlowEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid().optional(),
    planId: z.string().uuid().optional(),
  }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("cash_flow_entries").select("*").eq("is_archived", false).order("period_start", { ascending: true });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.planId) q = q.eq("cash_flow_plan_id", data.planId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const upsertCashFlowEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      project_id: z.string().uuid(),
      cash_flow_plan_id: z.string().uuid().nullable().optional(),
      period_label: z.string().min(1).max(100),
      period_start: z.string(),
      period_end: z.string(),
      entry_type: z.string().max(20).default("Both"),
      category: z.string().max(50).default("General"),
      source_module: z.string().max(50).default("Manual"),
      source_record_id: z.string().uuid().nullable().optional(),
      description: z.string().max(500).nullable().optional(),
      planned_inflow: z.number().min(0).default(0),
      actual_inflow: z.number().min(0).default(0),
      forecast_inflow: z.number().min(0).default(0),
      planned_outflow: z.number().min(0).default(0),
      actual_outflow: z.number().min(0).default(0),
      forecast_outflow: z.number().min(0).default(0),
      status: z.string().max(50).default("Active"),
      remarks: z.string().max(2000).nullable().optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    if (data.period_end < data.period_start) throw new Error("Period end before start");
    const company_id = await companyId(sb);
    const totals = calcEntry(data);
    const payload = { ...data, ...totals, company_id, created_by: context.userId };
    let row;
    if (data.id) {
      const { data: r, error } = await sb.from("cash_flow_entries").update(payload).eq("id", data.id).select().single();
      if (error) throw error;
      row = r;
    } else {
      const { data: r, error } = await sb.from("cash_flow_entries").insert(payload).select().single();
      if (error) throw error;
      row = r;
    }
    if (row.cash_flow_plan_id) await recalcPlan(sb, row.cash_flow_plan_id);
    return row;
  });

export const archiveCashFlowEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: r } = await sb.from("cash_flow_entries").select("cash_flow_plan_id").eq("id", data.id).maybeSingle();
    await sb.from("cash_flow_entries").update({ is_archived: true }).eq("id", data.id);
    if (r?.cash_flow_plan_id) await recalcPlan(sb, r.cash_flow_plan_id);
    return { ok: true };
  });

// ===== RECEIVABLES =====
function calcReceivable(r: any) {
  const base = num(r.certified_amount) > 0 ? num(r.certified_amount) : num(r.claimed_amount);
  return { outstanding_amount: Math.max(0, base - num(r.received_amount)) };
}

export const listReceivables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("cash_flow_receivables").select("*").eq("is_archived", false).order("expected_receipt_date", { ascending: true });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const upsertReceivable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      project_id: z.string().uuid(),
      cash_flow_plan_id: z.string().uuid().nullable().optional(),
      payment_claim_id: z.string().uuid().nullable().optional(),
      invoice_number: z.string().max(100).nullable().optional(),
      claim_number: z.string().max(100).nullable().optional(),
      description: z.string().max(500).nullable().optional(),
      expected_receipt_date: z.string().nullable().optional(),
      actual_receipt_date: z.string().nullable().optional(),
      claimed_amount: z.number().min(0).default(0),
      certified_amount: z.number().min(0).default(0),
      received_amount: z.number().min(0).default(0),
      status: z.string().max(50).default("Expected"),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const company_id = await companyId(sb);
    const t = calcReceivable(data);
    const payload = { ...data, ...t, company_id, created_by: context.userId };
    if (data.id) {
      const { data: r, error } = await sb.from("cash_flow_receivables").update(payload).eq("id", data.id).select().single();
      if (error) throw error;
      return r;
    }
    const { data: r, error } = await sb.from("cash_flow_receivables").insert(payload).select().single();
    if (error) throw error;
    return r;
  });

export const archiveReceivable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    await sb.from("cash_flow_receivables").update({ is_archived: true }).eq("id", data.id);
    return { ok: true };
  });

// ===== PAYABLES =====
function calcPayable(p: any) {
  return { outstanding_amount: Math.max(0, num(p.committed_amount) - num(p.paid_amount)) };
}

export const listPayables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("cash_flow_payables").select("*").eq("is_archived", false).order("expected_payment_date", { ascending: true });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const upsertPayable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      project_id: z.string().uuid(),
      cash_flow_plan_id: z.string().uuid().nullable().optional(),
      purchase_order_id: z.string().uuid().nullable().optional(),
      supplier_id: z.string().uuid().nullable().optional(),
      subcontractor_id: z.string().uuid().nullable().optional(),
      payment_reference: z.string().max(100).nullable().optional(),
      description: z.string().max(500).nullable().optional(),
      expected_payment_date: z.string().nullable().optional(),
      actual_payment_date: z.string().nullable().optional(),
      committed_amount: z.number().min(0).default(0),
      paid_amount: z.number().min(0).default(0),
      status: z.string().max(50).default("Expected"),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const company_id = await companyId(sb);
    const t = calcPayable(data);
    const payload = { ...data, ...t, company_id, created_by: context.userId };
    if (data.id) {
      const { data: r, error } = await sb.from("cash_flow_payables").update(payload).eq("id", data.id).select().single();
      if (error) throw error;
      return r;
    }
    const { data: r, error } = await sb.from("cash_flow_payables").insert(payload).select().single();
    if (error) throw error;
    return r;
  });

export const archivePayable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    await sb.from("cash_flow_payables").update({ is_archived: true }).eq("id", data.id);
    return { ok: true };
  });

// ===== PULLS =====
export const pullReceivablesFromPaymentClaims = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid(), planId: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const company_id = await companyId(sb);
    const { data: claims } = await sb
      .from("payment_claims")
      .select("id, claim_number, net_claim, gross_claim, current_claim_amount, status, period_end, certified_amount_total, paid_at")
      .eq("project_id", data.projectId)
      .in("status", ["submitted", "under_review", "approved", "certified", "paid"]);
    const { data: existing } = await sb
      .from("cash_flow_receivables")
      .select("payment_claim_id")
      .eq("project_id", data.projectId)
      .eq("is_archived", false)
      .not("payment_claim_id", "is", null);
    const seen = new Set((existing ?? []).map((r: any) => r.payment_claim_id));
    let imported = 0;
    for (const c of claims ?? []) {
      if (seen.has(c.id)) continue;
      const claimed = num(c.current_claim_amount || c.net_claim || c.gross_claim);
      const certified = ["approved", "certified", "paid"].includes(c.status) ? claimed : 0;
      const received = c.status === "paid" ? claimed : 0;
      const base = certified > 0 ? certified : claimed;
      const { error } = await sb.from("cash_flow_receivables").insert({
        company_id,
        project_id: data.projectId,
        cash_flow_plan_id: data.planId ?? null,
        payment_claim_id: c.id,
        claim_number: c.claim_number,
        description: `Payment Claim ${c.claim_number}`,
        expected_receipt_date: c.period_end,
        actual_receipt_date: c.paid_at ? String(c.paid_at).slice(0, 10) : null,
        claimed_amount: claimed,
        certified_amount: certified,
        received_amount: received,
        outstanding_amount: Math.max(0, base - received),
        status: c.status === "paid" ? "Received" : c.status === "approved" || c.status === "certified" ? "Certified" : "Submitted",
        created_by: context.userId,
      });
      if (!error) imported++;
    }
    return { imported };
  });

export const pullPayablesFromPOs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid(), planId: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const company_id = await companyId(sb);
    const { data: pos } = await sb
      .from("purchase_orders")
      .select("id, po_number, total_amount, status, supplier_id, suppliers(name)")
      .eq("project_id", data.projectId)
      .in("status", ["approved", "issued", "received", "closed"]);
    const { data: existing } = await sb
      .from("cash_flow_payables")
      .select("purchase_order_id")
      .eq("project_id", data.projectId)
      .eq("is_archived", false)
      .not("purchase_order_id", "is", null);
    const seen = new Set((existing ?? []).map((r: any) => r.purchase_order_id));
    let imported = 0;
    for (const po of pos ?? []) {
      if (seen.has(po.id)) continue;
      const committed = num(po.total_amount);
      const { error } = await sb.from("cash_flow_payables").insert({
        company_id,
        project_id: data.projectId,
        cash_flow_plan_id: data.planId ?? null,
        purchase_order_id: po.id,
        supplier_id: po.supplier_id,
        payment_reference: po.po_number,
        description: `Purchase Order ${po.po_number}` + (po.suppliers?.name ? ` — ${po.suppliers.name}` : ""),
        committed_amount: committed,
        paid_amount: 0,
        outstanding_amount: committed,
        status: "Committed",
        created_by: context.userId,
      });
      if (!error) imported++;
    }
    return { imported };
  });

// ===== DASHBOARD =====
export const getCashFlowDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let pq = sb.from("cash_flow_plans").select("opening_balance").eq("is_archived", false);
    let eq_ = sb.from("cash_flow_entries").select("*").eq("is_archived", false).order("period_start");
    let rq = sb.from("cash_flow_receivables").select("*").eq("is_archived", false);
    let payq = sb.from("cash_flow_payables").select("*").eq("is_archived", false);
    if (data.projectId) {
      pq = pq.eq("project_id", data.projectId);
      eq_ = eq_.eq("project_id", data.projectId);
      rq = rq.eq("project_id", data.projectId);
      payq = payq.eq("project_id", data.projectId);
    }
    const [{ data: plans }, { data: entries }, { data: recv }, { data: pay }] = await Promise.all([pq, eq_, rq, payq]);
    const opening = (plans ?? []).reduce((s: number, p: any) => s + num(p.opening_balance), 0);
    const agg = (entries ?? []).reduce(
      (s: any, e: any) => {
        s.planned_inflow += num(e.planned_inflow);
        s.actual_inflow += num(e.actual_inflow);
        s.forecast_inflow += num(e.forecast_inflow);
        s.planned_outflow += num(e.planned_outflow);
        s.actual_outflow += num(e.actual_outflow);
        s.forecast_outflow += num(e.forecast_outflow);
        return s;
      },
      { planned_inflow: 0, actual_inflow: 0, forecast_inflow: 0, planned_outflow: 0, actual_outflow: 0, forecast_outflow: 0 }
    );
    const net_actual = agg.actual_inflow - agg.actual_outflow;
    const net_forecast = agg.forecast_inflow - agg.forecast_outflow;
    const outstanding_receivables = (recv ?? []).reduce((s: number, r: any) => s + num(r.outstanding_amount), 0);
    const outstanding_payables = (pay ?? []).reduce((s: number, r: any) => s + num(r.outstanding_amount), 0);
    const funding_gap = Math.max(0, outstanding_payables - outstanding_receivables);
    const today = new Date().toISOString().slice(0, 10);
    const overdue_receivables = (recv ?? []).filter((r: any) => r.expected_receipt_date && r.expected_receipt_date < today && r.status !== "Received").length;
    const overdue_payables = (pay ?? []).filter((p: any) => p.expected_payment_date && p.expected_payment_date < today && p.status !== "Paid").length;

    // monthly series
    const months = new Map<string, any>();
    for (const e of entries ?? []) {
      const k = String(e.period_start).slice(0, 7);
      const cur = months.get(k) ?? { period: k, planned_inflow: 0, actual_inflow: 0, forecast_inflow: 0, planned_outflow: 0, actual_outflow: 0, forecast_outflow: 0, net_actual: 0, net_forecast: 0 };
      cur.planned_inflow += num(e.planned_inflow);
      cur.actual_inflow += num(e.actual_inflow);
      cur.forecast_inflow += num(e.forecast_inflow);
      cur.planned_outflow += num(e.planned_outflow);
      cur.actual_outflow += num(e.actual_outflow);
      cur.forecast_outflow += num(e.forecast_outflow);
      cur.net_actual = cur.actual_inflow - cur.actual_outflow;
      cur.net_forecast = cur.forecast_inflow - cur.forecast_outflow;
      months.set(k, cur);
    }
    let cumA = opening, cumF = opening;
    const series = Array.from(months.values()).sort((a, b) => a.period.localeCompare(b.period)).map((m) => {
      cumA += m.net_actual; cumF += m.net_forecast;
      return { ...m, cumulative_actual: cumA, cumulative_forecast: cumF };
    });
    const negative_periods = series.filter((s) => s.cumulative_forecast < 0).length;

    return {
      summary: {
        opening_balance: opening,
        ...agg,
        net_actual,
        net_forecast,
        closing_balance: opening + net_actual,
        outstanding_receivables,
        outstanding_payables,
        funding_gap,
        overdue_receivables,
        overdue_payables,
        negative_periods,
      },
      series,
    };
  });

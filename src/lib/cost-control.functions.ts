import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const num = (v: unknown) => Number(v ?? 0);

function calcLine(line: any) {
  const revised = num(line.original_budget) + num(line.approved_changes);
  const actual = num(line.actual_cost);
  const committed = num(line.committed_cost);
  const ctc = num(line.cost_to_complete);
  const forecast = num(line.forecast_cost) || actual + committed + ctc;
  const cac = actual + committed + ctc;
  const variance = revised - forecast;
  const variancePct = revised > 0 ? (variance / revised) * 100 : 0;
  const util = revised > 0 ? (actual / revised) * 100 : 0;
  const overrun = forecast > revised ? forecast - revised : 0;
  return {
    revised_budget: +revised.toFixed(2),
    forecast_cost: +forecast.toFixed(2),
    cost_at_completion: +cac.toFixed(2),
    variance_amount: +variance.toFixed(2),
    variance_percentage: +variancePct.toFixed(2),
    budget_utilization_percentage: +util.toFixed(2),
    forecast_overrun_amount: +overrun.toFixed(2),
  };
}

async function recalcBudgetTotals(sb: any, projectBudgetId: string) {
  const { data: lines } = await sb
    .from("budget_lines")
    .select("original_budget, approved_changes, actual_cost, committed_cost, forecast_cost, cost_to_complete")
    .eq("project_budget_id", projectBudgetId)
    .eq("is_archived", false);
  const agg = (lines ?? []).reduce(
    (s: any, l: any) => ({
      original_budget: s.original_budget + num(l.original_budget),
      approved_changes: s.approved_changes + num(l.approved_changes),
      actual_cost: s.actual_cost + num(l.actual_cost),
      committed_cost: s.committed_cost + num(l.committed_cost),
      cost_to_complete: s.cost_to_complete + num(l.cost_to_complete),
    }),
    { original_budget: 0, approved_changes: 0, actual_cost: 0, committed_cost: 0, cost_to_complete: 0 }
  );
  const t = calcLine(agg);
  await sb.from("project_budgets").update({ ...agg, ...t }).eq("id", projectBudgetId);
}

async function recalcLine(sb: any, budgetLineId: string) {
  const [{ data: actuals }, { data: commits }, { data: line }] = await Promise.all([
    sb.from("actual_cost_entries").select("amount").eq("budget_line_id", budgetLineId).eq("is_archived", false),
    sb.from("committed_cost_entries").select("amount").eq("budget_line_id", budgetLineId).eq("is_archived", false),
    sb.from("budget_lines").select("*").eq("id", budgetLineId).maybeSingle(),
  ]);
  if (!line) return;
  const actual = (actuals ?? []).reduce((s: number, r: any) => s + num(r.amount), 0);
  const committed = (commits ?? []).reduce((s: number, r: any) => s + num(r.amount), 0);
  const updated = { ...line, actual_cost: actual, committed_cost: committed };
  const t = calcLine(updated);
  await sb.from("budget_lines").update({ actual_cost: actual, committed_cost: committed, ...t }).eq("id", budgetLineId);
  if (line.project_budget_id) await recalcBudgetTotals(sb, line.project_budget_id);
}

// ===== PROJECT BUDGETS =====
export const listProjectBudgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("project_budgets").select("*, projects(name)").eq("is_archived", false).order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const upsertProjectBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      project_id: z.string().uuid(),
      budget_name: z.string().min(1).max(200),
      budget_version: z.string().max(50).optional(),
      description: z.string().max(2000).optional().nullable(),
      original_budget: z.number().min(0).default(0),
      approved_changes: z.number().default(0),
      cost_to_complete: z.number().min(0).default(0),
      status: z.string().max(50).optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const company_id = await sb.rpc("current_company_id").then((r: any) => r.data);
    const t = calcLine(data);
    const payload = { ...data, company_id, ...t, created_by: context.userId };
    if (data.id) {
      const { data: row, error } = await sb.from("project_budgets").update(payload).eq("id", data.id).select().single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await sb.from("project_budgets").insert(payload).select().single();
    if (error) throw error;
    return row;
  });

export const archiveProjectBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    await sb.from("project_budgets").update({ is_archived: true }).eq("id", data.id);
    return { ok: true };
  });

// ===== BUDGET LINES =====
export const listBudgetLines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional(), projectBudgetId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("budget_lines").select("*, cost_codes(code, name), projects(name)").eq("is_archived", false).order("line_code", { ascending: true });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.projectBudgetId) q = q.eq("project_budget_id", data.projectBudgetId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const upsertBudgetLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      project_id: z.string().uuid(),
      project_budget_id: z.string().uuid().nullable().optional(),
      cost_code_id: z.string().uuid().nullable().optional(),
      boq_item_id: z.string().uuid().nullable().optional(),
      line_code: z.string().max(50).nullable().optional(),
      line_name: z.string().min(1).max(200),
      description: z.string().max(2000).nullable().optional(),
      category: z.string().max(100).optional(),
      trade: z.string().max(100).nullable().optional(),
      discipline: z.string().max(100).nullable().optional(),
      cost_type: z.string().max(50).optional(),
      original_budget: z.number().min(0).default(0),
      approved_changes: z.number().default(0),
      cost_to_complete: z.number().min(0).default(0),
      status: z.string().max(50).optional(),
      remarks: z.string().max(2000).nullable().optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const company_id = await sb.rpc("current_company_id").then((r: any) => r.data);
    const existing = data.id
      ? (await sb.from("budget_lines").select("actual_cost, committed_cost").eq("id", data.id).maybeSingle()).data
      : null;
    const merged = { ...data, actual_cost: num(existing?.actual_cost), committed_cost: num(existing?.committed_cost) };
    const t = calcLine(merged);
    const payload = { ...data, company_id, ...t, created_by: context.userId };
    let row;
    if (data.id) {
      const { data: r, error } = await sb.from("budget_lines").update(payload).eq("id", data.id).select().single();
      if (error) throw error;
      row = r;
    } else {
      const { data: r, error } = await sb.from("budget_lines").insert(payload).select().single();
      if (error) throw error;
      row = r;
    }
    if (row.project_budget_id) await recalcBudgetTotals(sb, row.project_budget_id);
    return row;
  });

export const archiveBudgetLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: line } = await sb.from("budget_lines").select("project_budget_id").eq("id", data.id).maybeSingle();
    await sb.from("budget_lines").update({ is_archived: true }).eq("id", data.id);
    if (line?.project_budget_id) await recalcBudgetTotals(sb, line.project_budget_id);
    return { ok: true };
  });

// ===== ACTUAL COST ENTRIES =====
export const listActualCosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional(), budgetLineId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("actual_cost_entries").select("*, budget_lines(line_name), cost_codes(code, name)").eq("is_archived", false).order("cost_date", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.budgetLineId) q = q.eq("budget_line_id", data.budgetLineId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const upsertActualCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      project_id: z.string().uuid(),
      budget_line_id: z.string().uuid().nullable().optional(),
      cost_code_id: z.string().uuid().nullable().optional(),
      source_module: z.string().max(50).optional(),
      cost_date: z.string().optional(),
      description: z.string().min(1).max(500),
      supplier_name: z.string().max(200).nullable().optional(),
      invoice_number: z.string().max(100).nullable().optional(),
      amount: z.number().min(0),
      currency: z.string().max(10).optional(),
      status: z.string().max(50).optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const company_id = await sb.rpc("current_company_id").then((r: any) => r.data);
    const payload = { ...data, company_id, entered_by: context.userId };
    let row;
    if (data.id) {
      const { data: r, error } = await sb.from("actual_cost_entries").update(payload).eq("id", data.id).select().single();
      if (error) throw error;
      row = r;
    } else {
      const { data: r, error } = await sb.from("actual_cost_entries").insert(payload).select().single();
      if (error) throw error;
      row = r;
    }
    if (row.budget_line_id) await recalcLine(sb, row.budget_line_id);
    return row;
  });

export const archiveActualCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: r } = await sb.from("actual_cost_entries").select("budget_line_id").eq("id", data.id).maybeSingle();
    await sb.from("actual_cost_entries").update({ is_archived: true }).eq("id", data.id);
    if (r?.budget_line_id) await recalcLine(sb, r.budget_line_id);
    return { ok: true };
  });

// ===== COMMITTED COST ENTRIES =====
export const listCommittedCosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional(), budgetLineId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("committed_cost_entries").select("*, budget_lines(line_name), cost_codes(code, name)").eq("is_archived", false).order("commitment_date", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.budgetLineId) q = q.eq("budget_line_id", data.budgetLineId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const upsertCommittedCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      project_id: z.string().uuid(),
      budget_line_id: z.string().uuid().nullable().optional(),
      cost_code_id: z.string().uuid().nullable().optional(),
      source_module: z.string().max(50).optional(),
      commitment_date: z.string().optional(),
      description: z.string().min(1).max(500),
      supplier_name: z.string().max(200).nullable().optional(),
      po_number: z.string().max(100).nullable().optional(),
      amount: z.number().min(0),
      currency: z.string().max(10).optional(),
      status: z.string().max(50).optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const company_id = await sb.rpc("current_company_id").then((r: any) => r.data);
    const payload = { ...data, company_id, entered_by: context.userId };
    let row;
    if (data.id) {
      const { data: r, error } = await sb.from("committed_cost_entries").update(payload).eq("id", data.id).select().single();
      if (error) throw error;
      row = r;
    } else {
      const { data: r, error } = await sb.from("committed_cost_entries").insert(payload).select().single();
      if (error) throw error;
      row = r;
    }
    if (row.budget_line_id) await recalcLine(sb, row.budget_line_id);
    return row;
  });

export const archiveCommittedCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: r } = await sb.from("committed_cost_entries").select("budget_line_id").eq("id", data.id).maybeSingle();
    await sb.from("committed_cost_entries").update({ is_archived: true }).eq("id", data.id);
    if (r?.budget_line_id) await recalcLine(sb, r.budget_line_id);
    return { ok: true };
  });

// ===== PULL FROM PURCHASE ORDERS =====
export const pullCommitmentsFromPOs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const company_id = await sb.rpc("current_company_id").then((r: any) => r.data);
    const { data: pos } = await sb
      .from("purchase_orders")
      .select("id, po_number, total_amount, cost_code_id, budget_line_id, status, suppliers(name)")
      .eq("project_id", data.projectId)
      .in("status", ["approved", "issued", "received", "closed"]);
    const { data: existing } = await sb
      .from("committed_cost_entries")
      .select("source_record_id")
      .eq("project_id", data.projectId)
      .eq("source_module", "PurchaseOrder")
      .eq("is_archived", false);
    const seen = new Set((existing ?? []).map((r: any) => r.source_record_id));
    let imported = 0;
    const linesToRecalc = new Set<string>();
    for (const po of pos ?? []) {
      if (seen.has(po.id)) continue;
      const { data: row, error } = await sb.from("committed_cost_entries").insert({
        company_id,
        project_id: data.projectId,
        budget_line_id: po.budget_line_id,
        cost_code_id: po.cost_code_id,
        source_module: "PurchaseOrder",
        source_record_id: po.id,
        commitment_date: new Date().toISOString().slice(0, 10),
        description: `Purchase Order ${po.po_number}`,
        supplier_name: po.suppliers?.name ?? null,
        po_number: po.po_number,
        amount: num(po.total_amount),
        status: "Committed",
        entered_by: context.userId,
      }).select().single();
      if (!error && row?.budget_line_id) linesToRecalc.add(row.budget_line_id);
      if (!error) imported++;
    }
    for (const id of linesToRecalc) await recalcLine(sb, id);
    return { imported };
  });

// ===== DASHBOARD STATS =====
export const getCostControlDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("budget_lines").select("*, cost_codes(code, name), projects(name)").eq("is_archived", false);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: lines } = await q;
    const agg = (lines ?? []).reduce(
      (s: any, l: any) => {
        s.original_budget += num(l.original_budget);
        s.approved_changes += num(l.approved_changes);
        s.revised_budget += num(l.revised_budget);
        s.actual_cost += num(l.actual_cost);
        s.committed_cost += num(l.committed_cost);
        s.forecast_cost += num(l.forecast_cost);
        s.cost_to_complete += num(l.cost_to_complete);
        s.cost_at_completion += num(l.cost_at_completion);
        if (num(l.forecast_overrun_amount) > 0) s.over_budget_lines++;
        return s;
      },
      { original_budget: 0, approved_changes: 0, revised_budget: 0, actual_cost: 0, committed_cost: 0, forecast_cost: 0, cost_to_complete: 0, cost_at_completion: 0, over_budget_lines: 0 }
    );
    const variance = agg.revised_budget - agg.forecast_cost;
    const variance_pct = agg.revised_budget > 0 ? (variance / agg.revised_budget) * 100 : 0;
    const utilization = agg.revised_budget > 0 ? (agg.actual_cost / agg.revised_budget) * 100 : 0;

    // group by category
    const byCategory = new Map<string, { category: string; budget: number; actual: number; committed: number; forecast: number }>();
    for (const l of lines ?? []) {
      const k = l.category || "General";
      const cur = byCategory.get(k) ?? { category: k, budget: 0, actual: 0, committed: 0, forecast: 0 };
      cur.budget += num(l.revised_budget);
      cur.actual += num(l.actual_cost);
      cur.committed += num(l.committed_cost);
      cur.forecast += num(l.forecast_cost);
      byCategory.set(k, cur);
    }

    const overBudgetLines = (lines ?? []).filter((l: any) => num(l.forecast_overrun_amount) > 0).sort((a: any, b: any) => num(b.forecast_overrun_amount) - num(a.forecast_overrun_amount)).slice(0, 10);

    return {
      summary: { ...agg, variance_amount: variance, variance_percentage: variance_pct, utilization_percentage: utilization },
      by_category: Array.from(byCategory.values()),
      over_budget_lines: overBudgetLines,
    };
  });

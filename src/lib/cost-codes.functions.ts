import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const idSchema = z.string().uuid();

const upsertSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().min(1).max(50).default("General"),
  trade: z.string().max(100).nullable().optional(),
  discipline: z.string().max(100).nullable().optional(),
  cost_type: z.string().min(1).max(50).default("Direct Cost"),
  budget_amount: z.number().default(0),
  actual_amount: z.number().default(0),
  committed_amount: z.number().default(0),
  forecast_amount: z.number().default(0),
  sort_order: z.number().int().default(0),
  status: z.string().default("active"),
});

const SELECT = "id, company_id, project_id, parent_id, code, name, description, category, trade, discipline, cost_type, budget_amount, actual_amount, committed_amount, forecast_amount, sort_order, status, is_archived, created_at, updated_at, projects(name)";

function enrich(r: any, rollups: { boq: number; po: number; count: number }) {
  const budget = Number(r.budget_amount) || 0;
  const actual = Number(r.actual_amount) || 0;
  const committed = Number(r.committed_amount) || 0;
  const forecast = Number(r.forecast_amount) || (actual + committed);
  const variance = budget - forecast;
  const variancePct = budget > 0 ? (variance / budget) * 100 : 0;
  const utilPct = budget > 0 ? (actual / budget) * 100 : 0;
  return {
    ...r,
    project_name: r.projects?.name ?? null,
    forecast_amount_effective: forecast,
    variance_amount: variance,
    variance_pct: Math.round(variancePct * 10) / 10,
    utilization_pct: Math.round(utilPct * 10) / 10,
    over_budget: forecast > budget && budget > 0,
    boq_amount: rollups.boq,
    po_committed: rollups.po,
    boq_count: rollups.count,
  };
}

export const listCostCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string | null } | undefined) =>
    z.object({ projectId: z.string().uuid().nullable().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("cost_codes").select(SELECT).eq("is_archived", false).order("sort_order").order("code");
    if (data.projectId === null) q = q.is("project_id", null);
    else if (data.projectId) q = q.or(`project_id.eq.${data.projectId},project_id.is.null`);
    const { data: rows, error } = await q;
    if (error) throw error;

    const ids = (rows ?? []).map((r: any) => r.id);
    const boqMap = new Map<string, { amt: number; count: number }>();
    const poMap = new Map<string, number>();
    if (ids.length) {
      const { data: bq } = await context.supabase
        .from("boq_items").select("cost_code_id, quantity, unit_rate")
        .in("cost_code_id", ids).eq("is_archived", false);
      for (const b of bq ?? []) {
        const k = b.cost_code_id as string;
        const amt = (Number(b.quantity) || 0) * (Number(b.unit_rate) || 0);
        const cur = boqMap.get(k) ?? { amt: 0, count: 0 };
        boqMap.set(k, { amt: cur.amt + amt, count: cur.count + 1 });
      }
      const { data: pos } = await context.supabase
        .from("purchase_orders").select("cost_code_id, total_amount, status")
        .in("cost_code_id", ids);
      for (const p of pos ?? []) {
        if (p.status === "cancelled" || p.status === "rejected") continue;
        const k = p.cost_code_id as string;
        poMap.set(k, (poMap.get(k) ?? 0) + (Number(p.total_amount) || 0));
      }
    }

    return (rows ?? []).map((r: any) => enrich(r, {
      boq: boqMap.get(r.id)?.amt ?? 0,
      count: boqMap.get(r.id)?.count ?? 0,
      po: poMap.get(r.id) ?? 0,
    }));
  });

export const getCostCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: idSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("cost_codes").select(SELECT).eq("id", data.id).single();
    if (error) throw error;
    const [{ data: boq }, { data: pos }, { data: children }] = await Promise.all([
      context.supabase.from("boq_items").select("id, item_code, description, quantity, unit_rate, completed_qty, project_id, projects(name)").eq("cost_code_id", data.id).eq("is_archived", false).limit(100),
      context.supabase.from("purchase_orders").select("id, po_number, total_amount, status, created_at").eq("cost_code_id", data.id).limit(100),
      context.supabase.from("cost_codes").select("id, code, name, budget_amount, forecast_amount").eq("parent_id", data.id).eq("is_archived", false).order("code"),
    ]);
    const boqAmt = (boq ?? []).reduce((s, b: any) => s + (Number(b.quantity) || 0) * (Number(b.unit_rate) || 0), 0);
    const poAmt = (pos ?? []).filter((p: any) => p.status !== "cancelled" && p.status !== "rejected").reduce((s, p: any) => s + (Number(p.total_amount) || 0), 0);
    return {
      item: enrich(row, { boq: boqAmt, po: poAmt, count: boq?.length ?? 0 }),
      boq: boq ?? [],
      pos: pos ?? [],
      children: children ?? [],
    };
  });

export const createCostCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: prof } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).single();
    if (!prof?.company_id) throw new Error("No company");
    const { data: row, error } = await context.supabase.from("cost_codes")
      .insert({ ...data, company_id: prof.company_id, created_by: context.userId }).select().single();
    if (error) {
      if ((error as any).code === "23505") throw new Error(`Cost code "${data.code}" already exists`);
      throw error;
    }
    return row;
  });

export const updateCostCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.partial().extend({ id: idSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    if (rest.parent_id && rest.parent_id === id) throw new Error("Cost code cannot be its own parent");
    const { error } = await context.supabase.from("cost_codes").update(rest).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const archiveCostCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: idSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { count } = await context.supabase.from("boq_items").select("id", { count: "exact", head: true }).eq("cost_code_id", data.id).eq("is_archived", false);
    if ((count ?? 0) > 0) throw new Error(`Cannot archive: linked to ${count} BOQ item(s). Unlink first.`);
    const { error } = await context.supabase.from("cost_codes").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listCostCodesLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cost_codes").select("id, code, name, project_id")
      .eq("is_archived", false).order("code").limit(500);
    if (error) throw error;
    return data ?? [];
  });

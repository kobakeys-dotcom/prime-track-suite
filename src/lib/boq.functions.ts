import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const idSchema = z.string().uuid();

const upsertSchema = z.object({
  project_id: z.string().uuid(),
  item_code: z.string().max(50).nullable().optional(),
  item_number: z.string().max(50).nullable().optional(),
  description: z.string().min(1).max(1000),
  section: z.string().max(200).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  quantity: z.number().min(0).default(0),
  unit_rate: z.number().min(0).default(0),
  trade: z.string().max(100).nullable().optional(),
  discipline: z.string().max(100).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  remarks: z.string().max(1000).nullable().optional(),
  status: z.string().max(30).default("active"),
  cost_code_id: z.string().uuid().nullable().optional(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  milestone_id: z.string().uuid().nullable().optional(),
  variation_qty: z.number().default(0).optional(),
});

const SELECT = "id, project_id, item_code, item_number, description, section, category, unit, quantity, unit_rate, completed_qty, certified_qty, variation_qty, trade, discipline, location, remarks, status, is_archived, cost_code_id, wbs_id, task_id, milestone_id, created_at, updated_at, projects(name, code)";

function enrich(r: any) {
  const qty = Number(r.quantity) || 0;
  const rate = Number(r.unit_rate) || 0;
  const done = Number(r.completed_qty) || 0;
  const cert = Number(r.certified_qty) || 0;
  const varq = Number(r.variation_qty) || 0;
  const amount = qty * rate;
  const revised_qty = qty + varq;
  const revised_amount = revised_qty * rate;
  const balance = Math.max(0, revised_qty - done);
  const progress = revised_qty > 0 ? Math.min(999, (done / revised_qty) * 100) : 0;
  return {
    ...r,
    project_name: r.projects?.name ?? null,
    amount,
    revised_qty,
    revised_amount,
    balance_qty: balance,
    progress_pct: Math.round(progress * 10) / 10,
    claimed_amount: done * rate,
    certified_amount: cert * rate,
    is_overrun: done > revised_qty,
  };
}

export const listBoqItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("boq_items").select(SELECT).eq("is_archived", false).order("section").order("item_code");
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).map(enrich);
  });

export const getBoqItem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: idSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("boq_items").select(SELECT).eq("id", data.id).single();
    if (error) throw error;
    const { data: history } = await context.supabase
      .from("progress_updates").select("id, qty, note, recorded_at, recorded_by")
      .eq("boq_item_id", data.id).order("recorded_at", { ascending: false });
    return { item: enrich(row), history: history ?? [] };
  });

export const createBoqItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("boq_items")
      .insert({ ...data, created_by: context.userId }).select().single();
    if (error) throw error;
    return row;
  });

export const updateBoqItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.partial().extend({ id: idSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("boq_items").update(rest).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const archiveBoqItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: idSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("boq_items").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const updateBoqProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: idSchema,
    completed_qty: z.number().min(0),
    certified_qty: z.number().min(0).optional(),
    note: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const patch: any = { completed_qty: data.completed_qty };
    if (data.certified_qty !== undefined) patch.certified_qty = data.certified_qty;
    const { error } = await context.supabase.from("boq_items").update(patch).eq("id", data.id);
    if (error) throw error;
    await context.supabase.from("progress_updates").insert({
      boq_item_id: data.id, qty: data.completed_qty, note: data.note ?? null, recorded_by: context.userId,
    });
    return { ok: true };
  });

export const importBoqRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    project_id: idSchema,
    rows: z.array(upsertSchema.omit({ project_id: true }).partial({ status: true }).extend({ description: z.string().min(1) })).min(1).max(2000),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const payload = data.rows.map((r) => ({ ...r, project_id: data.project_id, status: r.status ?? "active", created_by: context.userId }));
    const { data: ins, error } = await context.supabase.from("boq_items").insert(payload).select("id");
    if (error) throw error;
    return { inserted: ins?.length ?? 0 };
  });

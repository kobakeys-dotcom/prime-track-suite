import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listBoqItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("boq_items")
      .select("id, item_code, description, category, unit, quantity, completed_qty, unit_rate, project_id, projects(name)")
      .order("item_code", { ascending: true });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).map((r: any) => ({ ...r, project_name: r.projects?.name ?? "—" }));
  });

export const createBoqItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    project_id: z.string().uuid(),
    item_code: z.string().max(50).optional().nullable(),
    description: z.string().min(1).max(500),
    category: z.string().max(100).optional().nullable(),
    unit: z.string().max(20).optional().nullable(),
    quantity: z.number().min(0).default(0),
    unit_rate: z.number().min(0).default(0),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("boq_items").insert(data).select().single();
    if (error) throw error;
    return row;
  });

export const updateBoqProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    completed_qty: z.number().min(0),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("boq_items").update({ completed_qty: data.completed_qty }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

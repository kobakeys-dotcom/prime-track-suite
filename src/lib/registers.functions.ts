import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TABLES = [
  "suppliers", "cost_codes",
  "procurement_requests", "rfqs", "purchase_orders", "deliveries",
  "variations", "payment_claims",
  "quality_inspections", "safety_inspections", "ncrs", "snags",
  "risks", "issues",
  "meetings", "meeting_action_items",
  "resources", "equipment", "timesheets",
  "milestones",
] as const;

const tableSchema = z.enum(TABLES);

export const listRegister = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ table: tableSchema, projectId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from(data.table).select("*").order("created_at", { ascending: false }).limit(500);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as any[];
  });

export const upsertRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      table: tableSchema,
      id: z.string().uuid().optional(),
      values: z.record(z.string(), z.any()),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const values: Record<string, any> = { ...data.values };
    for (const k of Object.keys(values)) if (values[k] === "") values[k] = null;

    if (data.id) {
      const { error } = await sb.from(data.table).update(values).eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    }
    values.created_by = context.userId;
    if (data.table === "timesheets" && !values.user_id) values.user_id = context.userId;
    let r = await sb.from(data.table).insert(values).select("id").single();
    if (r.error && /created_by/.test(r.error.message)) {
      delete values.created_by;
      r = await sb.from(data.table).insert(values).select("id").single();
    }
    if (r.error) throw r.error;
    return { ok: true, id: r.data?.id };
  });

export const deleteRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ table: tableSchema, id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from(data.table).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const nextNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ table: tableSchema, projectId: z.string().uuid().optional(), prefix: z.string().max(20).default("") }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from(data.table).select("id", { count: "exact", head: true });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { count } = await q;
    const n = (count ?? 0) + 1;
    return { value: `${data.prefix}${String(n).padStart(4, "0")}` };
  });

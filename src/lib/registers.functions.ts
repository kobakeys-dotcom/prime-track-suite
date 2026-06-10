import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Whitelist of tables editable via the generic register API.
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
type Tbl = typeof TABLES[number];

const tableSchema = z.enum(TABLES);

export const listRegister = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ table: tableSchema, projectId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from(data.table as Tbl).select("*").order("created_at", { ascending: false }).limit(500);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
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
    const values: Record<string, any> = { ...data.values };
    // strip empty strings -> null
    for (const k of Object.keys(values)) if (values[k] === "") values[k] = null;

    if (data.id) {
      const { error } = await context.supabase.from(data.table as Tbl).update(values).eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    } else {
      // stamp created_by where column exists
      values.created_by = context.userId;
      const { data: row, error } = await context.supabase.from(data.table as Tbl).insert(values).select("id").single();
      if (error) {
        // retry without created_by if column doesn't exist
        if (/created_by/.test(error.message)) {
          delete values.created_by;
          const r = await context.supabase.from(data.table as Tbl).insert(values).select("id").single();
          if (r.error) throw r.error;
          return { ok: true, id: r.data?.id };
        }
        throw error;
      }
      return { ok: true, id: row?.id };
    }
  });

export const deleteRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ table: tableSchema, id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from(data.table as Tbl).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const nextNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ table: tableSchema, column: z.string().min(1).max(40), projectId: z.string().uuid().optional(), prefix: z.string().max(20).default("") }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from(data.table as Tbl).select("id", { count: "exact", head: true });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { count } = await q;
    const n = (count ?? 0) + 1;
    return { value: `${data.prefix}${String(n).padStart(4, "0")}` };
  });

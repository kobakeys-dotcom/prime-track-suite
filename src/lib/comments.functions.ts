import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const refSchema = z.object({
  entity_type: z.string().min(1).max(50),
  entity_id: z.string().uuid(),
});

export const listComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => refSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("comments")
      .select("id, body, created_at, author_id, profiles:author_id(full_name)")
      .eq("entity_type", data.entity_type)
      .eq("entity_id", data.entity_id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (rows ?? []).map((r: any) => ({ ...r, author_name: r.profiles?.full_name ?? "Member" }));
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => refSchema.extend({ body: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("comments").insert({
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      body: data.body,
      author_id: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

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
      .select("id, body, created_at, author_id")
      .eq("entity_type", data.entity_type)
      .eq("entity_id", data.entity_id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.author_id).filter(Boolean)));
    let nameMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids as string[]);
      nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    }
    return (rows ?? []).map((r: any) => ({ ...r, author_name: nameMap.get(r.author_id) ?? "Member" }));
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

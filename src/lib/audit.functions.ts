import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, actor_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const actorIds = Array.from(new Set((data ?? []).map((r) => r.actor_id).filter(Boolean))) as string[];
    const { data: actors } = actorIds.length
      ? await context.supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
    const map = new Map((actors ?? []).map((a) => [a.id, a]));
    return (data ?? []).map((r: any) => ({
      ...r,
      actor_name: r.actor_id ? (map.get(r.actor_id)?.full_name ?? map.get(r.actor_id)?.email ?? "—") : "system",
    }));
  });

export const listEntityActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    entity_type: z.string().min(1).max(50),
    entity_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("audit_logs")
      .select("id, action, actor_id, metadata, created_at")
      .eq("entity_type", data.entity_type)
      .eq("entity_id", data.entity_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const actorIds = Array.from(new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean))) as string[];
    const { data: actors } = actorIds.length
      ? await context.supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
      : { data: [] as any[] };
    const map = new Map((actors ?? []).map((a: any) => [a.id, a]));
    return (rows ?? []).map((r: any) => ({
      ...r,
      actor_name: r.actor_id ? (map.get(r.actor_id)?.full_name ?? map.get(r.actor_id)?.email ?? "—") : "system",
    }));
  });

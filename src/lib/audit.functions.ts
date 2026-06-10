import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

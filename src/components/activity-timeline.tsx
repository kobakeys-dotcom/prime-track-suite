import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock } from "lucide-react";
import { listEntityActivity } from "@/lib/audit.functions";

export function ActivityTimeline({ entityType, entityId }: { entityType: string; entityId: string }) {
  const list = useServerFn(listEntityActivity);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["activity", entityType, entityId],
    queryFn: () => list({ data: { entity_type: entityType, entity_id: entityId } }) as any,
  });

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <Clock className="size-3" /> Activity ({(rows as any[]).length})
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!isLoading && (rows as any[]).length === 0 && <p className="text-xs text-muted-foreground">No activity recorded yet.</p>}
        {(rows as any[]).map((r) => (
          <div key={r.id} className="text-xs flex items-start gap-2 py-1.5 border-b border-border/60 last:border-0">
            <span className={`mt-1 size-1.5 rounded-full shrink-0 ${
              r.action === "insert" ? "bg-emerald-500" :
              r.action === "update" ? "bg-blue-500" :
              r.action === "delete" ? "bg-rose-500" : "bg-zinc-400"
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium uppercase tracking-wider text-[10px]">{r.action}</span>
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="text-muted-foreground truncate">{r.actor_name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

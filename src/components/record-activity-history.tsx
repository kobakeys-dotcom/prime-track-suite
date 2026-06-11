import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEntityActivity } from "@/lib/audit.functions";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SEV_COLOR: Record<string, string> = {
  Info: "bg-slate-200 text-slate-700",
  Low: "bg-emerald-100 text-emerald-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-amber-200 text-amber-800",
  Critical: "bg-rose-600 text-white",
};

export function RecordActivityHistory({
  module_name,
  record_id,
  compact = false,
}: {
  module_name: string;
  record_id: string;
  project_id?: string;
  compact?: boolean;
}) {
  const fn = useServerFn(listEntityActivity);
  const { data, isLoading } = useQuery({
    queryKey: ["record-activity", module_name, record_id],
    queryFn: () => fn({ data: { entity_type: module_name, entity_id: record_id } }),
    enabled: !!record_id,
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading activity…</p>;
  const items = (data ?? []) as any[];
  if (!items.length) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        <Activity className="size-5 mx-auto mb-2 opacity-50" />
        No activity recorded for this record yet.
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {items.map((r) => (
        <li key={r.id} className="flex gap-3 text-xs">
          <div className="flex flex-col items-center">
            <div className="size-2 rounded-full bg-accent mt-1.5" />
            <div className="flex-1 w-px bg-border my-1" />
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{r.action}</span>
              {r.severity && <Badge className={SEV_COLOR[r.severity] ?? ""}>{r.severity}</Badge>}
              {r.status && r.status !== "Success" && <Badge>{r.status}</Badge>}
            </div>
            <div className="text-muted-foreground mt-0.5">
              {r.actor_name} · {new Date(r.created_at).toLocaleString()}
            </div>
            {!compact && r.description && <p className="text-muted-foreground mt-1">{r.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

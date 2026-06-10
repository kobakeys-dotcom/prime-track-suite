import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLogs } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Log — ProjectCore" }] }),
  component: AuditPage,
});

function AuditPage() {
  const fetcher = useServerFn(listAuditLogs);
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["audit-logs"], queryFn: () => fetcher() });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Recent system activity across your company.</p>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-12 text-center">
            <p className="text-sm font-medium">No audit entries yet</p>
            <p className="text-xs text-muted-foreground mt-1">Activity will be logged as users perform actions.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 w-44">When</th>
                  <th className="text-left px-4 py-3">Actor</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Entity</th>
                </tr>
              </thead>
              <tbody>
                {(rows as any[]).map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs font-mono">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">{r.actor_name}</td>
                    <td className="px-4 py-3 text-xs font-medium">{r.action}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.entity_type ?? "—"}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProjects } from "@/lib/projects.functions";

export const Route = createFileRoute("/_authenticated/client")({
  head: () => ({ meta: [{ title: "Client Portal — ProjectCore" }] }),
  component: ClientPortal,
});

function ClientPortal() {
  const fetcher = useServerFn(listProjects);
  const { data: projects = [] } = useQuery({ queryKey: ["client-projects"], queryFn: () => fetcher() });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Client Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">Project overview, progress and approved deliverables for clients.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(projects as any[]).map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-bold">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{p.client ?? "—"}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">{p.status?.replace("_", " ")}</span>
            </div>
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Progress</div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${p.progress ?? 0}%` }} />
              </div>
              <div className="text-right text-xs font-mono mt-1">{p.progress ?? 0}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

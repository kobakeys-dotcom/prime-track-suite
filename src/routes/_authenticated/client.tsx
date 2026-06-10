import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { UserCheck, Flag, Receipt, FileSignature, Files, Stamp, Image as ImageIcon } from "lucide-react";
import { listProjects } from "@/lib/projects.functions";
import { getClientSummary } from "@/lib/client-portal.functions";
import { ProjectPicker } from "@/components/project-picker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/client")({
  head: () => ({ meta: [{ title: "Client Portal — ProjectCore" }] }),
  component: ClientPortal,
});

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  on_hold: "bg-amber-100 text-amber-700",
  planning: "bg-zinc-200 text-zinc-700",
  approved: "bg-emerald-100 text-emerald-700",
  paid: "bg-emerald-100 text-emerald-700",
  submitted: "bg-blue-100 text-blue-700",
  rejected: "bg-rose-100 text-rose-700",
  draft: "bg-zinc-200 text-zinc-700",
};

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function ClientPortal() {
  const [projectId, setProjectId] = useState("");
  const fetcher = useServerFn(listProjects);
  const summaryFn = useServerFn(getClientSummary);
  const { data: projects = [] } = useQuery({ queryKey: ["client-projects"], queryFn: () => fetcher() });
  const { data: summary } = useQuery({
    queryKey: ["client-summary", projectId],
    queryFn: () => summaryFn({ data: { projectId } }) as any,
    enabled: !!projectId,
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><UserCheck className="size-6 text-accent" /> Client Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Restricted, client-facing view: progress, financial summary, approvals and shared documents.</p>
        </div>
        <div className="w-72"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="Choose a project" /></div>
      </div>

      {!projectId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(projects as any[]).map((p) => (
            <button key={p.id} onClick={() => setProjectId(p.id)} className="text-left bg-card border border-border rounded-sm p-5 hover:border-accent/60 transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-bold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.client ?? "—"} · {p.location ?? ""}</p>
                </div>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", STATUS_COLORS[p.status] ?? "bg-zinc-100 text-zinc-700")}>
                  {(p.status ?? "").replace("_", " ")}
                </span>
              </div>
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Progress</div>
                <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-accent" style={{ width: `${p.progress ?? 0}%` }} /></div>
                <div className="text-right text-xs font-mono mt-1">{p.progress ?? 0}%</div>
              </div>
            </button>
          ))}
        </div>
      ) : !summary ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Header card */}
          <div className="bg-card border border-border rounded-sm p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat label="Contract value" value={money(Number(summary.project?.contract_value ?? 0))} />
            <Stat label="Progress" value={`${summary.project?.progress ?? 0}%`} />
            <Stat label="Approved variations" value={money(summary.variations.filter((v: any) => v.status === "approved").reduce((s: number, v: any) => s + Number(v.amount ?? 0), 0))} />
            <Stat label="Certified to date" value={money(summary.claims.filter((c: any) => ["approved","paid"].includes(c.status)).reduce((s: number, c: any) => s + Number(c.net_amount ?? 0), 0))} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Milestones" icon={Flag}>
              {summary.milestones.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-border text-sm">
                  {summary.milestones.map((m: any) => (
                    <li key={m.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{m.title}</div>
                        <div className="text-xs text-muted-foreground">Due {m.due_date ?? "—"}</div>
                      </div>
                      <span className="text-xs font-mono">{m.completion_percentage ?? 0}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Pending approvals" icon={Stamp}>
              {summary.approvals.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-border text-sm">
                  {summary.approvals.map((a: any) => (
                    <li key={a.id} className="py-2 flex items-center justify-between">
                      <span className="truncate">{a.title}</span>
                      <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded", STATUS_COLORS[a.status] ?? "bg-zinc-100 text-zinc-700")}>{a.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Payment claims" icon={Receipt}>
              {summary.claims.length === 0 ? <Empty /> : (
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr><th className="text-left py-1">#</th><th className="text-left py-1">Date</th><th className="text-right py-1">Net</th><th className="text-right py-1">Status</th></tr>
                  </thead>
                  <tbody>
                    {summary.claims.map((c: any) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="py-1.5 text-xs font-mono">{c.claim_number ?? "—"}</td>
                        <td className="py-1.5 text-xs">{c.claim_date ?? "—"}</td>
                        <td className="py-1.5 text-xs text-right font-mono">{money(Number(c.net_amount ?? 0))}</td>
                        <td className="py-1.5 text-right"><span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded", STATUS_COLORS[c.status] ?? "bg-zinc-100 text-zinc-700")}>{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title="Variations" icon={FileSignature}>
              {summary.variations.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-border text-sm">
                  {summary.variations.map((v: any) => (
                    <li key={v.id} className="py-2 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{v.number ? `${v.number} — ` : ""}{v.title}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono">{money(Number(v.amount ?? 0))}</span>
                        <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded", STATUS_COLORS[v.status] ?? "bg-zinc-100 text-zinc-700")}>{v.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Shared documents" icon={Files}>
              {summary.documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents have been shared with you yet.</p> : (
                <ul className="divide-y divide-border text-sm">
                  {summary.documents.map((d: any) => (
                    <li key={d.id} className="py-2 flex items-center justify-between">
                      <span className="truncate">{d.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.category ?? "doc"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Site photos" icon={ImageIcon}>
              {summary.photos.length === 0 ? <Empty /> : (
                <div className="grid grid-cols-3 gap-2">
                  {summary.photos.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square bg-muted rounded overflow-hidden">
                      <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xl font-display font-bold mt-1">{value}</div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-sm p-5">
      <h3 className="font-display font-bold uppercase tracking-tight text-sm mb-3 flex items-center gap-2"><Icon className="size-4 text-accent" /> {title}</h3>
      {children}
    </section>
  );
}

function Empty() { return <p className="text-sm text-muted-foreground">Nothing yet.</p>; }

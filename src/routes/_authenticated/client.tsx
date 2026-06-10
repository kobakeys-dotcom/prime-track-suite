import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { UserCheck, Flag, Receipt, FileSignature, Files, Stamp, Image as ImageIcon, FileText, PencilRuler, Wrench, Check, X, RotateCcw, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listProjects } from "@/lib/projects.functions";
import {
  getClientSummary,
  listClientReports,
  listClientDrawings,
  listClientSnags,
  decideClientApproval,
  decideClientPaymentClaim,
} from "@/lib/client-portal.functions";
import { ProjectPicker } from "@/components/project-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CommentsThread } from "@/components/comments-thread";
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
  revision_requested: "bg-amber-100 text-amber-700",
  draft: "bg-zinc-200 text-zinc-700",
  open: "bg-rose-100 text-rose-700",
  in_progress: "bg-blue-100 text-blue-700",
  closed: "bg-emerald-100 text-emerald-700",
};

const money = (n: number, ccy = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n || 0);

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", STATUS_COLORS[status] ?? "bg-zinc-100 text-zinc-700")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ClientPortal() {
  const [projectId, setProjectId] = useState("");
  const listFn = useServerFn(listProjects);
  const summaryFn = useServerFn(getClientSummary);
  const { data: projects = [] } = useQuery({ queryKey: ["client-projects"], queryFn: () => listFn() as any });
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["client-summary", projectId],
    queryFn: () => summaryFn({ data: { projectId } }) as any,
    enabled: !!projectId,
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><UserCheck className="size-6 text-accent" /> Client Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Your assigned projects — progress, approvals, claims and shared documents.</p>
        </div>
        <div className="w-72"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="Choose a project" /></div>
      </div>

      {!projectId ? (
        (projects as any[]).length === 0 ? (
          <EmptyShell title="No projects have been assigned to your account yet." subtitle="Your project manager will share access shortly." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(projects as any[]).map((p) => (
              <button key={p.id} onClick={() => setProjectId(p.id)} className="text-left bg-card border border-border rounded-sm p-5 hover:border-accent/60 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold truncate">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.client ?? "—"} · {p.location ?? ""}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Progress</div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-accent" style={{ width: `${p.progress ?? 0}%` }} /></div>
                  <div className="text-right text-xs font-mono mt-1">{p.progress ?? 0}%</div>
                </div>
              </button>
            ))}
          </div>
        )
      ) : loadingSummary || !summary ? (
        <div className="p-12 text-center text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin inline mr-2" />Loading…</div>
      ) : (
        <ProjectView projectId={projectId} summary={summary} onBack={() => setProjectId("")} />
      )}
    </div>
  );
}

function ProjectView({ projectId, summary, onBack }: { projectId: string; summary: any; onBack: () => void }) {
  const ccy = summary.project?.currency ?? "USD";
  const certified = summary.claims
    .filter((c: any) => ["approved", "paid"].includes(c.status))
    .reduce((s: number, c: any) => s + Number(c.net_claim ?? 0), 0);
  const approvedVars = summary.variations
    .filter((v: any) => v.status === "approved")
    .reduce((s: number, v: any) => s + Number(v.approved_amount ?? v.cost_impact ?? 0), 0);
  const pendingApprovals = summary.approvals.filter((a: any) => a.status === "submitted");

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-xs text-accent hover:underline">← All my projects</button>

      <div className="bg-card border border-border rounded-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-xl font-bold">{summary.project?.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{summary.project?.code} · {summary.project?.location}</p>
          </div>
          <StatusBadge status={summary.project?.status} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
          <Stat label="Contract" value={money(Number(summary.project?.contract_value ?? 0), ccy)} />
          <Stat label="Progress" value={`${summary.project?.progress ?? 0}%`} />
          <Stat label="Approved variations" value={money(approvedVars, ccy)} />
          <Stat label="Certified to date" value={money(certified, ccy)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4 text-xs">
          <Meta label="Contractor" value={summary.project?.contractor_name} />
          <Meta label="Consultant" value={summary.project?.consultant_name} />
          <Meta label="Planned end" value={summary.project?.planned_end_date} />
          <Meta label="Revised end" value={summary.project?.revised_end_date} />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">Pending Your Review {pendingApprovals.length > 0 && <span className="ml-1 text-[10px] bg-amber-500 text-white px-1.5 rounded">{pendingApprovals.length}</span>}</TabsTrigger>
          <TabsTrigger value="claims">Payment Claims</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="drawings">Drawings</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="snags">Snags</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel title="Upcoming milestones" icon={Flag}>
              {summary.milestones.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-border text-sm">
                  {summary.milestones.slice(0, 6).map((m: any) => (
                    <li key={m.id} className="py-2 flex items-center justify-between">
                      <div><div className="font-medium">{m.name}</div><div className="text-xs text-muted-foreground">Due {m.due_date ?? "—"}</div></div>
                      <StatusBadge status={m.completed_at ? "completed" : "in_progress"} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Pending approvals" icon={Stamp}>
              {pendingApprovals.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-border text-sm">
                  {pendingApprovals.slice(0, 6).map((a: any) => (
                    <li key={a.id} className="py-2 flex items-center justify-between"><span className="truncate">{a.title}</span><StatusBadge status={a.status} /></li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalsTab approvals={summary.approvals} projectId={projectId} />
        </TabsContent>

        <TabsContent value="claims">
          <ClaimsTab claims={summary.claims} ccy={ccy} projectId={projectId} />
        </TabsContent>

        <TabsContent value="reports"><ReportsTab projectId={projectId} /></TabsContent>
        <TabsContent value="documents">
          <Panel title="Shared documents" icon={Files}>
            {summary.documents.length === 0 ? <Empty /> : (
              <ul className="divide-y divide-border text-sm">
                {summary.documents.map((d: any) => (
                  <li key={d.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0"><div className="font-medium truncate">{d.name}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.category ?? "doc"}</div></div>
                    {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-accent text-xs flex items-center gap-1 hover:underline"><Download className="size-3.5" /> Download</a>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="drawings"><DrawingsTab projectId={projectId} /></TabsContent>
        <TabsContent value="milestones">
          <Panel title="Milestones" icon={Flag}>
            {summary.milestones.length === 0 ? <Empty /> : (
              <ul className="divide-y divide-border text-sm">
                {summary.milestones.map((m: any) => (
                  <li key={m.id} className="py-3 flex items-center justify-between">
                    <div><div className="font-medium">{m.name}</div><div className="text-xs text-muted-foreground">Planned {m.due_date ?? "—"} {m.completed_at && `· Completed ${String(m.completed_at).slice(0,10)}`}</div></div>
                    <StatusBadge status={m.completed_at ? "completed" : "in_progress"} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="snags"><SnagsTab projectId={projectId} /></TabsContent>
        <TabsContent value="photos">
          <Panel title="Project photos" icon={ImageIcon}>
            {summary.photos.length === 0 ? <Empty /> : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {summary.photos.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square bg-muted rounded overflow-hidden">
                    <img src={url} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition" />
                  </a>
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApprovalsTab({ approvals, projectId }: { approvals: any[]; projectId: string }) {
  const [active, setActive] = useState<any | null>(null);
  const qc = useQueryClient();
  const decide = useServerFn(decideClientApproval);
  const mut = useMutation({
    mutationFn: (v: { id: string; decision: any; comment?: string }) => decide({ data: v }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-summary", projectId] }); toast.success("Decision recorded"); setActive(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Panel title="Approval inbox" icon={Stamp}>
      {approvals.length === 0 ? <Empty /> : (
        <ul className="divide-y divide-border text-sm">
          {approvals.map((a) => (
            <li key={a.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{a.title}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.entity_type?.replace(/_/g," ")}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={a.status} />
                <Button size="sm" variant="outline" onClick={() => setActive(a)}>Review</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <DecisionDialog open={!!active} item={active} onClose={() => setActive(null)} onDecide={(d, c) => active && mut.mutate({ id: active.id, decision: d, comment: c })} pending={mut.isPending} entityKey="approvals" />
    </Panel>
  );
}

function ClaimsTab({ claims, ccy, projectId }: { claims: any[]; ccy: string; projectId: string }) {
  const [active, setActive] = useState<any | null>(null);
  const qc = useQueryClient();
  const decide = useServerFn(decideClientPaymentClaim);
  const mut = useMutation({
    mutationFn: (v: { id: string; decision: any; comment?: string }) => decide({ data: v }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-summary", projectId] }); toast.success("Decision recorded"); setActive(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Panel title="Payment claims" icon={Receipt}>
      {claims.length === 0 ? <Empty /> : (
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr><th className="text-left py-1">#</th><th className="text-left py-1">Period</th><th className="text-right py-1">Net</th><th className="text-right py-1">Status</th><th /></tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="py-2 text-xs font-mono">{c.claim_number ?? "—"}</td>
                <td className="py-2 text-xs">{c.period_end ?? "—"}</td>
                <td className="py-2 text-xs text-right font-mono">{money(Number(c.net_claim ?? 0), ccy)}</td>
                <td className="py-2 text-right"><StatusBadge status={c.status} /></td>
                <td className="py-2 text-right">
                  {(c.status === "submitted" || c.status === "draft") && (
                    <Button size="sm" variant="outline" onClick={() => setActive(c)}>Review</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <DecisionDialog open={!!active} item={active} onClose={() => setActive(null)} onDecide={(d, c) => active && mut.mutate({ id: active.id, decision: d, comment: c })} pending={mut.isPending} entityKey="payment_claims" />
    </Panel>
  );
}

function ReportsTab({ projectId }: { projectId: string }) {
  const fn = useServerFn(listClientReports);
  const { data = [], isLoading } = useQuery({ queryKey: ["client-reports", projectId], queryFn: () => fn({ data: { projectId } }) as any });
  return (
    <Panel title="Shared reports" icon={FileText}>
      {isLoading ? <Loading /> : (data as any[]).length === 0 ? <Empty /> : (
        <ul className="divide-y divide-border text-sm">
          {(data as any[]).map((r) => (
            <li key={r.id} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{r.report_date} {r.weather && <span className="text-xs text-muted-foreground ml-2">· {r.weather}</span>}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{r.work_completed ?? "—"}</div>
              </div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function DrawingsTab({ projectId }: { projectId: string }) {
  const fn = useServerFn(listClientDrawings);
  const { data = [], isLoading } = useQuery({ queryKey: ["client-drawings", projectId], queryFn: () => fn({ data: { projectId } }) as any });
  return (
    <Panel title="Drawing register" icon={PencilRuler}>
      {isLoading ? <Loading /> : (data as any[]).length === 0 ? <Empty /> : (
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr><th className="text-left py-1">Number</th><th className="text-left py-1">Title</th><th className="text-left py-1">Discipline</th><th className="text-left py-1">Rev</th><th /></tr>
          </thead>
          <tbody>
            {(data as any[]).map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="py-2 text-xs font-mono">{d.number}</td>
                <td className="py-2">{d.title ?? "—"}</td>
                <td className="py-2 text-xs">{d.discipline ?? "—"}</td>
                <td className="py-2 text-xs">{d.revision ?? "—"}</td>
                <td className="py-2 text-right">{d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-accent text-xs flex items-center gap-1 hover:underline justify-end"><Download className="size-3.5" /> Open</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function SnagsTab({ projectId }: { projectId: string }) {
  const fn = useServerFn(listClientSnags);
  const { data = [], isLoading } = useQuery({ queryKey: ["client-snags", projectId], queryFn: () => fn({ data: { projectId } }) as any });
  return (
    <Panel title="Snags & handover" icon={Wrench}>
      {isLoading ? <Loading /> : (data as any[]).length === 0 ? <Empty /> : (
        <ul className="divide-y divide-border text-sm">
          {(data as any[]).map((s) => (
            <li key={s.id} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{s.snag_number} {s.location && <span className="text-xs text-muted-foreground">· {s.location}</span>}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{s.description ?? "—"}</div>
              </div>
              <StatusBadge status={s.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function DecisionDialog({ open, item, onClose, onDecide, pending, entityKey }: { open: boolean; item: any; onClose: () => void; onDecide: (d: "approved" | "rejected" | "revision_requested", c: string) => void; pending: boolean; entityKey: string }) {
  const [comment, setComment] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setComment(""); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{item?.title ?? item?.claim_number ?? "Review"}</DialogTitle></DialogHeader>
        {item && (
          <div className="space-y-3">
            {item.entity_type && <div className="text-xs text-muted-foreground uppercase tracking-wider">{item.entity_type.replace(/_/g," ")}</div>}
            {item.net_claim != null && <div className="text-sm">Net claim: <span className="font-mono">{money(Number(item.net_claim))}</span></div>}
            <div>
              <label className="text-xs text-muted-foreground">Comment (optional)</label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Add a note to your decision…" />
            </div>
            {item.id && (
              <div className="border-t border-border pt-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Discussion</div>
                <CommentsThread entityType={entityKey} entityId={item.id} />
              </div>
            )}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onDecide("revision_requested", comment)} disabled={pending}><RotateCcw className="size-4" /> Request revision</Button>
          <Button variant="outline" className="text-rose-600" onClick={() => onDecide("rejected", comment)} disabled={pending}><X className="size-4" /> Reject</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onDecide("approved", comment)} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (<div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="text-xl font-display font-bold mt-1">{value}</div></div>);
}
function Meta({ label, value }: { label: string; value?: string | null }) {
  return (<div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="mt-0.5">{value ?? "—"}</div></div>);
}
function Panel({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (<section className="bg-card border border-border rounded-sm p-5"><h3 className="font-display font-bold uppercase tracking-tight text-sm mb-3 flex items-center gap-2"><Icon className="size-4 text-accent" /> {title}</h3>{children}</section>);
}
function Empty() { return <p className="text-sm text-muted-foreground py-4 text-center">Nothing yet.</p>; }
function Loading() { return <p className="text-sm text-muted-foreground py-4 text-center"><Loader2 className="size-4 animate-spin inline mr-2" />Loading…</p>; }
function EmptyShell({ title, subtitle }: { title: string; subtitle?: string }) {
  return (<div className="bg-card border border-border rounded-sm p-16 text-center"><p className="font-medium">{title}</p>{subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}</div>);
}

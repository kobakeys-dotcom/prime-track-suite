import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listAuditModules, listAuditItems, functionalAuditStats, seedAuditDefaults,
  updateAuditItem, updateAuditModule, runFunctionalAudit, listAuditRuns,
  createAuditSnapshot, listAuditSnapshots, listCompanyUsers,
} from "@/lib/functional-audit.functions";
import { useMyPermissions } from "@/hooks/use-permissions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Lock, Play, Camera, Download, Printer, Search, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/audit-summary")({
  head: () => ({ meta: [{ title: "Functional Audit Summary — ProjectCore" }] }),
  component: AuditSummaryPage,
});

const SEV_COLOR: Record<string, string> = {
  Critical: "bg-rose-600 text-white",
  High: "bg-amber-200 text-amber-800",
  Medium: "bg-blue-100 text-blue-700",
  Low: "bg-emerald-100 text-emerald-700",
};
const STATUS_COLOR: Record<string, string> = {
  Passed: "bg-emerald-100 text-emerald-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  Failed: "bg-rose-100 text-rose-700",
  Warning: "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "Not Checked": "bg-slate-100 text-slate-600",
  "Not Applicable": "bg-slate-100 text-slate-500",
  Reopened: "bg-purple-100 text-purple-700",
};
const READINESS_COLOR: Record<string, string> = {
  "Ready for Production": "bg-emerald-600 text-white",
  "Ready for Client Demo": "bg-emerald-100 text-emerald-700",
  "Needs Minor Fixes": "bg-amber-100 text-amber-700",
  "Needs Major Fixes": "bg-orange-200 text-orange-800",
  "Not Ready": "bg-slate-300 text-slate-700",
  "Critical Issues": "bg-rose-600 text-white",
};

const STATUSES = ["Passed","Failed","Warning","Not Checked","Not Applicable","In Progress","Resolved","Reopened"];
const SEVERITIES = ["Low","Medium","High","Critical"];
const PRIORITIES = ["Low","Medium","High","Urgent","Critical"];

function csv(v: any) {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
}

function AuditSummaryPage() {
  const perms = useMyPermissions();
  const canView = perms.isCompanyAdmin();
  const qc = useQueryClient();

  const modulesFn = useServerFn(listAuditModules);
  const itemsFn = useServerFn(listAuditItems);
  const statsFn = useServerFn(functionalAuditStats);
  const seedFn = useServerFn(seedAuditDefaults);
  const updateItemFn = useServerFn(updateAuditItem);
  const updateModuleFn = useServerFn(updateAuditModule);
  const runFn = useServerFn(runFunctionalAudit);
  const runsFn = useServerFn(listAuditRuns);
  const snapshotFn = useServerFn(createAuditSnapshot);
  const snapshotsFn = useServerFn(listAuditSnapshots);
  const usersFn = useServerFn(listCompanyUsers);

  const modulesQ = useQuery({ queryKey: ["fa-modules"], queryFn: () => modulesFn(), enabled: canView });
  const itemsQ = useQuery({ queryKey: ["fa-items"], queryFn: () => itemsFn(), enabled: canView });
  const statsQ = useQuery({ queryKey: ["fa-stats"], queryFn: () => statsFn(), enabled: canView });
  const runsQ = useQuery({ queryKey: ["fa-runs"], queryFn: () => runsFn(), enabled: canView });
  const snapshotsQ = useQuery({ queryKey: ["fa-snapshots"], queryFn: () => snapshotsFn(), enabled: canView });
  const usersQ = useQuery({ queryKey: ["fa-users"], queryFn: () => usersFn(), enabled: canView });

  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [moduleStatus, setModuleStatus] = useState("");
  const [openModule, setOpenModule] = useState<string | null>(null);
  const [snapshotName, setSnapshotName] = useState("");

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["fa-modules"] });
    qc.invalidateQueries({ queryKey: ["fa-items"] });
    qc.invalidateQueries({ queryKey: ["fa-stats"] });
    qc.invalidateQueries({ queryKey: ["fa-runs"] });
  };

  const seedMut = useMutation({
    mutationFn: () => seedFn(),
    onSuccess: (r: any) => { toast.success(`Seeded ${r.modulesAdded} modules, ${r.itemsAdded} checklist items`); refreshAll(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to seed defaults"),
  });
  const runMut = useMutation({
    mutationFn: () => runFn({ data: {} }),
    onSuccess: (r: any) => { toast.success(`Audit run complete — ${r.overall}% (${r.readiness}). ${r.updates} auto-update(s).`); refreshAll(); },
    onError: (e: any) => toast.error(e?.message ?? "Audit run failed"),
  });
  const snapMut = useMutation({
    mutationFn: (name: string) => snapshotFn({ data: { name } }),
    onSuccess: () => { toast.success("Snapshot saved"); setSnapshotName(""); qc.invalidateQueries({ queryKey: ["fa-snapshots"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Snapshot failed"),
  });
  const updateItemMut = useMutation({
    mutationFn: (v: any) => updateItemFn({ data: v }),
    onSuccess: () => { refreshAll(); },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });
  const updateModuleMut = useMutation({
    mutationFn: (v: any) => updateModuleFn({ data: v }),
    onSuccess: () => { refreshAll(); toast.success("Module updated"); },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  if (!canView) {
    return (
      <div className="p-8">
        <div className="bg-card border border-border rounded-md p-12 text-center max-w-lg mx-auto">
          <Lock className="size-10 mx-auto mb-4 text-muted-foreground" />
          <h2 className="font-bold text-lg">Access denied</h2>
          <p className="text-sm text-muted-foreground mt-2">Functional Audit Summary is restricted to Company Administrators.</p>
        </div>
      </div>
    );
  }

  const modules = (modulesQ.data ?? []) as any[];
  const items = (itemsQ.data ?? []) as any[];
  const stats: any = statsQ.data ?? { overall: 0, readiness: "Not Ready", totalModules: 0, completeModules: 0, broken: 0, totalItems: 0, failedItems: 0, criticalIssues: 0, readyForDemo: 0, notReady: 0 };
  const users = (usersQ.data ?? []) as any[];
  const runs = (runsQ.data ?? []) as any[];
  const snapshots = (snapshotsQ.data ?? []) as any[];

  const itemsByModule = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const it of items) { const a = m.get(it.audit_module_id) ?? []; a.push(it); m.set(it.audit_module_id, a); }
    return m;
  }, [items]);

  const categories = useMemo(() => Array.from(new Set(modules.map((m: any) => m.module_category))).sort(), [modules]);

  const filteredModules = useMemo(() => {
    return modules.filter((m: any) => {
      if (category && m.module_category !== category) return false;
      if (moduleStatus && m.status !== moduleStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(m.module_name?.toLowerCase().includes(s) || m.module_key?.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [modules, category, moduleStatus, search]);

  const failedItems = items.filter((i: any) => i.status === "Failed" || i.status === "Warning");
  const criticalItems = items.filter((i: any) => i.status === "Failed" && i.severity === "Critical");

  const moduleNameById = new Map(modules.map((m: any) => [m.id, m.module_name]));

  function exportCSV() {
    const header = ["Module Category","Module Name","Checklist Category","Checklist Item","Expected Result","Actual Result","Status","Severity","Priority","Assigned To","Target Date","Resolution Notes","Last Checked"];
    const userMap = new Map(users.map((u: any) => [u.id, u.full_name ?? u.email]));
    const moduleById = new Map(modules.map((m: any) => [m.id, m]));
    const lines = [header.join(",")];
    for (const it of items) {
      const m = moduleById.get(it.audit_module_id) as any;
      lines.push([
        m?.module_category, m?.module_name, it.audit_category, it.checklist_item,
        it.expected_result, it.actual_result, it.status, it.severity, it.priority,
        it.assigned_to ? userMap.get(it.assigned_to) : "",
        it.target_completion_date, it.resolution_notes,
        m?.last_checked_at ? new Date(m.last_checked_at).toISOString() : "",
      ].map(csv).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `functional-audit-${new Date().toISOString().slice(0,10).replace(/-/g,"")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${items.length} items`);
  }

  const openModuleData = openModule ? modules.find((m: any) => m.id === openModule) : null;
  const openModuleItems = openModule ? (itemsByModule.get(openModule) ?? []) : [];

  return (
    <div className="p-6 space-y-6 print:p-0">
      <div className="flex items-start justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Sparkles className="size-6" />Functional Audit Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">Module-by-module system completion review for client demo and production readiness.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {modules.length === 0 && (
            <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending} className="inline-flex items-center gap-1 px-3 py-2 text-xs bg-accent text-accent-foreground rounded">
              {seedMut.isPending ? "Seeding…" : "Seed Default Modules"}
            </button>
          )}
          {modules.length > 0 && (
            <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending} className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-border rounded hover:bg-muted">
              {seedMut.isPending ? "Updating…" : "Sync Defaults"}
            </button>
          )}
          <button onClick={() => runMut.mutate()} disabled={runMut.isPending} className="inline-flex items-center gap-1 px-3 py-2 text-xs bg-blue-600 text-white rounded hover:opacity-90">
            <Play className="size-3.5" /> {runMut.isPending ? "Running…" : "Run Audit"}
          </button>
          <Dialog>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-border rounded hover:bg-muted"><Camera className="size-3.5" /> Snapshot</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Audit Snapshot</DialogTitle></DialogHeader>
              <Input placeholder="Snapshot name (e.g., Before Client Demo v2)" value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} />
              <DialogFooter>
                <button onClick={() => snapshotName && snapMut.mutate(snapshotName)} disabled={!snapshotName || snapMut.isPending} className="px-3 py-2 text-xs bg-accent text-accent-foreground rounded">{snapMut.isPending ? "Saving…" : "Save Snapshot"}</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <button onClick={exportCSV} className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-border rounded hover:bg-muted"><Download className="size-3.5" /> CSV</button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-border rounded hover:bg-muted"><Printer className="size-3.5" /> Print</button>
          <button onClick={refreshAll} className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-border rounded hover:bg-muted"><RefreshCw className="size-3.5" /></button>
        </div>
      </div>

      {/* Top summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 bg-card border border-border rounded-md p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall Completion</div>
          <div className="flex items-baseline gap-3 mt-1">
            <div className="text-4xl font-bold">{stats.overall}%</div>
            <Badge className={READINESS_COLOR[stats.readiness] ?? ""}>{stats.readiness}</Badge>
          </div>
          <div className="mt-3 h-2 bg-muted rounded overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${stats.overall}%` }} />
          </div>
        </div>
        <StatBox label="Total Modules" value={stats.totalModules} />
        <StatBox label="Complete (≥95%)" value={stats.completeModules} tone="emerald" />
        <StatBox label="Broken" value={stats.broken} tone="rose" />
        <StatBox label="Failed Items" value={stats.failedItems} tone="rose" icon={<XCircle className="size-3.5" />} />
        <StatBox label="Critical Issues" value={stats.criticalIssues} tone="rose" icon={<AlertTriangle className="size-3.5" />} />
        <StatBox label="Ready for Demo" value={stats.readyForDemo} tone="emerald" icon={<CheckCircle2 className="size-3.5" />} />
        <StatBox label="Not Ready" value={stats.notReady} tone="amber" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="print:hidden flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Module Audit ({modules.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failedItems.length})</TabsTrigger>
          <TabsTrigger value="critical">Critical ({criticalItems.length})</TabsTrigger>
          <TabsTrigger value="fix">Fix Checklist</TabsTrigger>
          <TabsTrigger value="runs">Audit Runs ({runs.length})</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots ({snapshots.length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {modules.length === 0 ? (
            <Empty title="No modules registered" desc="Click 'Seed Default Modules' above to populate the system module registry and checklist." />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section title="Modules by Category">
                  <div className="space-y-2">
                    {categories.map((cat: any) => {
                      const inCat = modules.filter((m: any) => m.module_category === cat);
                      const avg = inCat.length ? Math.round(inCat.reduce((a: number, m: any) => a + Number(m.completion_percentage ?? 0), 0) / inCat.length) : 0;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1"><span className="font-medium">{cat}</span><span className="text-muted-foreground">{avg}% · {inCat.length} module(s)</span></div>
                          <div className="h-1.5 bg-muted rounded overflow-hidden"><div className="h-full bg-accent" style={{ width: `${avg}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
                <Section title="Top Critical Issues">
                  {criticalItems.length === 0 ? <p className="text-xs text-muted-foreground">No critical issues recorded. 🎉</p> : (
                    <ul className="space-y-2">
                      {criticalItems.slice(0, 6).map((it: any) => (
                        <li key={it.id} className="text-xs flex items-start gap-2">
                          <AlertTriangle className="size-3.5 text-rose-600 mt-0.5 shrink-0" />
                          <div>
                            <div className="font-medium">{moduleNameById.get(it.audit_module_id)} · {it.checklist_item}</div>
                            <div className="text-muted-foreground">{it.actual_result ?? "No actual result recorded"}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </div>
              <Section title="Ready for Client Demo">
                <div className="flex flex-wrap gap-2">
                  {modules.filter((m: any) => Number(m.completion_percentage) >= 85).map((m: any) => (
                    <Badge key={m.id} className="bg-emerald-100 text-emerald-700">{m.module_name} · {Number(m.completion_percentage)}%</Badge>
                  ))}
                  {modules.filter((m: any) => Number(m.completion_percentage) >= 85).length === 0 && <p className="text-xs text-muted-foreground">No modules at demo readiness yet.</p>}
                </div>
              </Section>
              <Section title="Needs Attention (Lowest Completion)">
                <div className="space-y-2">
                  {[...modules].sort((a: any, b: any) => Number(a.completion_percentage) - Number(b.completion_percentage)).slice(0, 8).map((m: any) => (
                    <button key={m.id} onClick={() => setOpenModule(m.id)} className="w-full text-left flex items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="text-xs"><span className="font-medium">{m.module_name}</span> <span className="text-muted-foreground">· {m.module_category}</span></div>
                      <div className="flex items-center gap-2"><span className="text-xs">{Number(m.completion_percentage)}%</span><Badge className={STATUS_COLOR[m.status] ?? "bg-slate-100 text-slate-600"}>{m.status}</Badge></div>
                    </button>
                  ))}
                </div>
              </Section>
            </>
          )}
        </TabsContent>

        {/* Module Audit */}
        <TabsContent value="modules" className="mt-4 space-y-3">
          <div className="bg-card border border-border rounded-md p-3 flex flex-wrap gap-2 print:hidden">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search modules…" className="pl-7 h-9" />
            </div>
            <Select value={category} onValueChange={(v) => setCategory(v === "_all" ? "" : v)}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent><SelectItem value="_all">All Categories</SelectItem>{categories.map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={moduleStatus} onValueChange={(v) => setModuleStatus(v === "_all" ? "" : v)}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Status</SelectItem>
                {["Ready for Production","Ready for Client Demo","Mostly Complete","Partially Complete","Incomplete","Broken","Not Checked"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {modules.length === 0 ? <Empty title="No modules" desc="Seed defaults to begin." /> :
            <div className="bg-card border border-border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2">Module</th>
                      <th className="text-left px-3 py-2">Category</th>
                      <th className="text-left px-3 py-2 w-40">Completion</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Items</th>
                      <th className="text-left px-3 py-2">Last Checked</th>
                      <th className="text-left px-3 py-2 w-32"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModules.map((m: any) => {
                      const mItems = itemsByModule.get(m.id) ?? [];
                      const failed = mItems.filter((i: any) => i.status === "Failed").length;
                      return (
                        <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-3 py-2 text-xs font-medium">{m.module_name}{m.is_core_module && <Badge className="ml-1 bg-blue-50 text-blue-700">Core</Badge>}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{m.module_category}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden"><div className="h-full bg-accent" style={{ width: `${Number(m.completion_percentage)}%` }} /></div>
                              <span className="text-xs w-10 text-right">{Number(m.completion_percentage)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2"><Badge className={STATUS_COLOR[m.status] ?? "bg-slate-100 text-slate-600"}>{m.status}</Badge></td>
                          <td className="px-3 py-2 text-xs">{mItems.length} {failed > 0 && <span className="text-rose-600">· {failed} failed</span>}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{m.last_checked_at ? new Date(m.last_checked_at).toLocaleDateString() : "—"}</td>
                          <td className="px-3 py-2 text-xs">
                            <button onClick={() => setOpenModule(m.id)} className="text-accent hover:underline">Open</button>
                            {m.route_path && <Link to={m.route_path as any} className="ml-2 text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"><ExternalLink className="size-3" /></Link>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          }
        </TabsContent>

        {/* Failed */}
        <TabsContent value="failed" className="mt-4">
          <ItemTable items={failedItems} moduleNameById={moduleNameById} users={users} onUpdate={(v) => updateItemMut.mutate(v)} />
        </TabsContent>
        <TabsContent value="critical" className="mt-4">
          <ItemTable items={criticalItems} moduleNameById={moduleNameById} users={users} onUpdate={(v) => updateItemMut.mutate(v)} />
        </TabsContent>
        <TabsContent value="fix" className="mt-4">
          <FixChecklist items={items.filter((i: any) => i.status === "Failed" || i.status === "Warning" || i.status === "Reopened" || i.status === "In Progress")} moduleNameById={moduleNameById} users={users} onUpdate={(v) => updateItemMut.mutate(v)} />
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          {runs.length === 0 ? <Empty title="No audit runs yet" desc="Click 'Run Audit' to perform safe automatic checks." /> :
            <div className="bg-card border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr><th className="text-left px-3 py-2">When</th><th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Completion</th><th className="text-left px-3 py-2">Readiness</th><th className="text-left px-3 py-2">Pass / Fail / Warn</th></tr>
                </thead>
                <tbody>
                  {runs.map((r: any) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 text-xs font-mono">{new Date(r.started_at).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs">{r.audit_run_name}</td>
                      <td className="px-3 py-2 text-xs">{r.audit_run_type}</td>
                      <td className="px-3 py-2 text-xs font-medium">{Number(r.overall_completion_percentage)}%</td>
                      <td className="px-3 py-2"><Badge className={READINESS_COLOR[r.readiness_status] ?? ""}>{r.readiness_status}</Badge></td>
                      <td className="px-3 py-2 text-xs">{r.passed_items} / {r.failed_items} / {r.warning_items}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </TabsContent>

        <TabsContent value="snapshots" className="mt-4">
          {snapshots.length === 0 ? <Empty title="No snapshots" desc="Create snapshots to track progress over time." /> :
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {snapshots.map((s: any, idx: number) => {
                const prev = snapshots[idx + 1];
                const diff = prev ? Math.round((Number(s.overall_completion_percentage) - Number(prev.overall_completion_percentage)) * 10) / 10 : null;
                return (
                  <div key={s.id} className="bg-card border border-border rounded-md p-4">
                    <div className="font-medium text-sm">{s.snapshot_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="size-3" />{new Date(s.created_at).toLocaleString()}</div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <div className="text-2xl font-bold">{Number(s.overall_completion_percentage)}%</div>
                      {diff !== null && <span className={cn("text-xs", diff > 0 ? "text-emerald-600" : diff < 0 ? "text-rose-600" : "text-muted-foreground")}>{diff > 0 ? "+" : ""}{diff}%</span>}
                    </div>
                    <Badge className={cn("mt-2", READINESS_COLOR[s.readiness_status] ?? "")}>{s.readiness_status}</Badge>
                  </div>
                );
              })}
            </div>
          }
        </TabsContent>
      </Tabs>

      {/* Module detail drawer */}
      <Sheet open={!!openModule} onOpenChange={(o) => !o && setOpenModule(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {openModuleData && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {openModuleData.module_name}
                  <Badge className={STATUS_COLOR[openModuleData.status] ?? ""}>{openModuleData.status}</Badge>
                  <Badge>{openModuleData.module_category}</Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <Field label="Route" value={openModuleData.route_path ?? "—"} />
                <Field label="Primary Table" value={openModuleData.primary_table ?? "—"} />
                <Field label="Completion" value={`${Number(openModuleData.completion_percentage)}%`} />
                <Field label="Last Checked" value={openModuleData.last_checked_at ? new Date(openModuleData.last_checked_at).toLocaleString() : "—"} />
                <div className="col-span-2 grid grid-cols-3 gap-2 mt-2">
                  <Select value={openModuleData.owner_user_id ?? "_none"} onValueChange={(v) => updateModuleMut.mutate({ id: openModuleData.id, owner_user_id: v === "_none" ? null : v })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Owner" /></SelectTrigger>
                    <SelectContent><SelectItem value="_none">Unassigned</SelectItem>{users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={openModuleData.priority ?? "Medium"} onValueChange={(v) => updateModuleMut.mutate({ id: openModuleData.id, priority: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" defaultValue={openModuleData.target_completion_date ?? ""} onBlur={(e) => updateModuleMut.mutate({ id: openModuleData.id, target_completion_date: e.target.value || null })} className="h-8" />
                </div>
                <div className="col-span-2">
                  <Textarea defaultValue={openModuleData.notes ?? ""} placeholder="Module notes…" onBlur={(e) => updateModuleMut.mutate({ id: openModuleData.id, notes: e.target.value })} />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Checklist ({openModuleItems.length})</div>
                {Object.entries(openModuleItems.reduce((acc: Record<string, any[]>, it: any) => { (acc[it.audit_category] ||= []).push(it); return acc; }, {})).map(([cat, list]: any) => (
                  <div key={cat} className="mb-4">
                    <div className="text-xs font-semibold mb-1.5">{cat}</div>
                    <div className="space-y-1.5">
                      {list.map((it: any) => (
                        <ChecklistRow key={it.id} item={it} users={users} onUpdate={(v) => updateItemMut.mutate({ id: it.id, ...v })} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatBox({ label, value, tone, icon }: { label: string; value: any; tone?: string; icon?: any }) {
  const tones: Record<string, string> = { rose: "border-rose-200", amber: "border-amber-200", emerald: "border-emerald-200" };
  return (
    <div className={cn("bg-card border rounded-md p-3", tone ? tones[tone] : "border-border")}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-3">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-0.5">{value}</div></div>;
}

function Empty({ title, desc }: { title: string; desc: string }) {
  return <div className="bg-card border border-border rounded-md p-12 text-center"><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground mt-1">{desc}</p></div>;
}

function ChecklistRow({ item, users, onUpdate }: { item: any; users: any[]; onUpdate: (v: any) => void }) {
  return (
    <div className="border border-border rounded p-2 text-xs space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-medium">{item.checklist_item}</div>
          {item.expected_result && <div className="text-[10px] text-muted-foreground">Expected: {item.expected_result}</div>}
          {item.actual_result && <div className="text-[10px] text-amber-700">Actual: {item.actual_result}</div>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge className={SEV_COLOR[item.severity] ?? ""}>{item.severity}</Badge>
          <Badge className={STATUS_COLOR[item.status] ?? ""}>{item.status}</Badge>
          {item.is_automated && <Badge className="bg-blue-50 text-blue-700">Auto</Badge>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Select value={item.status} onValueChange={(v) => onUpdate({ status: v })}>
          <SelectTrigger className="h-7 w-[130px] text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={item.severity ?? "Medium"} onValueChange={(v) => onUpdate({ severity: v })}>
          <SelectTrigger className="h-7 w-[100px] text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={item.assigned_to ?? "_none"} onValueChange={(v) => onUpdate({ assigned_to: v === "_none" ? null : v })}>
          <SelectTrigger className="h-7 w-[140px] text-[11px]"><SelectValue placeholder="Assign" /></SelectTrigger>
          <SelectContent><SelectItem value="_none">Unassigned</SelectItem>{users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" defaultValue={item.target_completion_date ?? ""} onBlur={(e) => onUpdate({ target_completion_date: e.target.value || null })} className="h-7 w-[140px] text-[11px]" />
      </div>
      <Textarea defaultValue={item.actual_result ?? ""} placeholder="Finding / actual result…" onBlur={(e) => e.target.value !== item.actual_result && onUpdate({ actual_result: e.target.value })} className="text-[11px] min-h-[40px]" />
      {(item.status === "Failed" || item.status === "Resolved" || item.status === "Reopened") && (
        <Textarea defaultValue={item.resolution_notes ?? ""} placeholder="Resolution notes…" onBlur={(e) => e.target.value !== item.resolution_notes && onUpdate({ resolution_notes: e.target.value })} className="text-[11px] min-h-[40px]" />
      )}
    </div>
  );
}

function ItemTable({ items, moduleNameById, users, onUpdate }: { items: any[]; moduleNameById: Map<string, any>; users: any[]; onUpdate: (v: any) => void }) {
  if (!items.length) return <Empty title="No items" desc="No items match this filter. 🎉" />;
  return (
    <div className="space-y-2">
      {items.map((it: any) => (
        <div key={it.id} className="bg-card border border-border rounded-md p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground">{moduleNameById.get(it.audit_module_id)} · {it.audit_category}</div>
              <div className="text-sm font-medium">{it.checklist_item}</div>
              {it.actual_result && <div className="text-xs text-amber-700 mt-1">Actual: {it.actual_result}</div>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge className={SEV_COLOR[it.severity] ?? ""}>{it.severity}</Badge>
              <Badge className={STATUS_COLOR[it.status] ?? ""}>{it.status}</Badge>
            </div>
          </div>
          <div className="mt-2"><ChecklistRow item={it} users={users} onUpdate={onUpdate} /></div>
        </div>
      ))}
    </div>
  );
}

function FixChecklist({ items, moduleNameById, users, onUpdate }: { items: any[]; moduleNameById: Map<string, any>; users: any[]; onUpdate: (v: any) => void }) {
  if (!items.length) return <Empty title="Nothing to fix" desc="No outstanding failed, warning, in-progress, or reopened items." />;
  const groups: Record<string, any[]> = {};
  for (const it of items) {
    const k = it.severity ?? "Medium";
    (groups[k] ||= []).push(it);
  }
  const order = ["Critical","High","Medium","Low"];
  return (
    <div className="space-y-4">
      {order.filter(k => groups[k]).map(k => (
        <div key={k}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <Badge className={SEV_COLOR[k] ?? ""}>{k}</Badge>
            <span className="text-muted-foreground">({groups[k].length})</span>
          </div>
          <ItemTable items={groups[k]} moduleNameById={moduleNameById} users={users} onUpdate={onUpdate} />
        </div>
      ))}
    </div>
  );
}

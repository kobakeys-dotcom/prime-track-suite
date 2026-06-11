import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listAuditLogs, getAuditLogById, auditLogStats, listSecurityEvents,
  listAuditExports, recordAuditExport, listAuditUsers, listAuditProjects,
} from "@/lib/audit.functions";
import { useMyPermissions } from "@/hooks/use-permissions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, RefreshCw, Search, Shield, AlertTriangle, Activity, Eye, FileDown, Lock, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Log — ProjectCore" }] }),
  component: AuditPage,
});

const MODULES = [
  "projects","tasks","wbs","milestones","daily_reports","issues","snags","meetings","approvals",
  "rfis","submittals","boq","cost_codes","variations","payment_claims","budget","cash_flow",
  "procurement","rfqs","purchase_orders","deliveries","suppliers","quality","safety","ncrs",
  "risks","manpower","equipment","timesheets","documents","drawings","reports","report_builder",
  "ai_assistant","notifications","users","roles_permissions","audit_logs","settings",
];

const ACTION_TYPES = ["Create","Update","Delete","Archive","Restore","View","Download","Upload","Export","Print","Submit","Approve","Reject","Request Revision","Assign","Status Change","Comment","Login","Logout","Failed Login","Permission Change","Role Change","Client Publish","AI Prompt","AI Output Saved","Report Generated","Notification Sent","System","Error"];

const SEVERITIES = ["Info","Low","Medium","High","Critical"];
const STATUSES = ["Success","Failed","Warning","Pending"];

const SEV_COLOR: Record<string, string> = {
  Info: "bg-slate-200 text-slate-700",
  Low: "bg-emerald-100 text-emerald-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-amber-200 text-amber-800",
  Critical: "bg-rose-600 text-white",
};
const STATUS_COLOR: Record<string, string> = {
  Success: "bg-emerald-100 text-emerald-700",
  Failed: "bg-rose-100 text-rose-700",
  Warning: "bg-amber-100 text-amber-700",
  Pending: "bg-slate-100 text-slate-700",
};

function presetRange(p: string): { from: string | null; to: string | null } {
  const now = new Date();
  const start = (d: Date) => { d.setHours(0,0,0,0); return d.toISOString(); };
  const end = (d: Date) => { d.setHours(23,59,59,999); return d.toISOString(); };
  switch (p) {
    case "today": { const d = new Date(now); return { from: start(d), to: end(new Date(now)) }; }
    case "yesterday": { const d = new Date(now); d.setDate(d.getDate()-1); return { from: start(new Date(d)), to: end(new Date(d)) }; }
    case "this_week": { const d = new Date(now); d.setDate(d.getDate()-d.getDay()); return { from: start(d), to: end(new Date(now)) }; }
    case "this_month": { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: start(d), to: end(new Date(now)) }; }
    case "last_month": { const f = new Date(now.getFullYear(), now.getMonth()-1, 1); const t = new Date(now.getFullYear(), now.getMonth(), 0); return { from: start(f), to: end(t) }; }
    case "this_year": { const d = new Date(now.getFullYear(),0,1); return { from: start(d), to: end(new Date(now)) }; }
    default: return { from: null, to: null };
  }
}

function csvEscape(v: any): string {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
}

function AuditPage() {
  const perms = useMyPermissions();
  const canView = perms.hasPermission("audit_logs.view") || perms.isCompanyAdmin();
  const canExport = perms.hasPermission("audit_logs.export") || perms.isCompanyAdmin();

  const [search, setSearch] = useState("");
  const [project, setProject] = useState<string>("");
  const [moduleName, setModuleName] = useState<string>("");
  const [user, setUser] = useState<string>("");
  const [actionType, setActionType] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [preset, setPreset] = useState<string>("all");
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [failedOnly, setFailedOnly] = useState(false);
  const [tab, setTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const range = useMemo(() => preset === "all" ? { from: null, to: null } : presetRange(preset), [preset]);

  const filters = useMemo(() => ({
    search: search || undefined,
    project_id: project || undefined,
    module_name: moduleName || undefined,
    user_id: user || undefined,
    action_type: actionType || undefined,
    severity: severity || undefined,
    status: status || undefined,
    sensitive_only: sensitiveOnly || undefined,
    failed_only: failedOnly || undefined,
    date_from: range.from || undefined,
    date_to: range.to || undefined,
    limit: 500,
  }), [search, project, moduleName, user, actionType, severity, status, sensitiveOnly, failedOnly, range]);

  const listFn = useServerFn(listAuditLogs);
  const statsFn = useServerFn(auditLogStats);
  const usersFn = useServerFn(listAuditUsers);
  const projectsFn = useServerFn(listAuditProjects);
  const secFn = useServerFn(listSecurityEvents);
  const expFn = useServerFn(listAuditExports);
  const detailFn = useServerFn(getAuditLogById);
  const recordExportFn = useServerFn(recordAuditExport);

  const logsQ = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => listFn({ data: filters }),
    enabled: canView,
  });
  const statsQ = useQuery({ queryKey: ["audit-stats"], queryFn: () => statsFn(), enabled: canView });
  const usersQ = useQuery({ queryKey: ["audit-users"], queryFn: () => usersFn(), enabled: canView });
  const projectsQ = useQuery({ queryKey: ["audit-projects"], queryFn: () => projectsFn(), enabled: canView });
  const secQ = useQuery({ queryKey: ["audit-security"], queryFn: () => secFn(), enabled: canView && tab === "security" });
  const expQ = useQuery({ queryKey: ["audit-exports"], queryFn: () => expFn(), enabled: canView && tab === "exports" });
  const detailQ = useQuery({
    queryKey: ["audit-detail", selectedId],
    queryFn: () => detailFn({ data: { id: selectedId! } }),
    enabled: !!selectedId,
  });

  const recordExport = useMutation({
    mutationFn: (v: any) => recordExportFn({ data: v }),
  });

  if (!canView) {
    return (
      <div className="p-8">
        <div className="bg-card border border-border rounded-md p-12 text-center max-w-lg mx-auto">
          <Lock className="size-10 mx-auto mb-4 text-muted-foreground" />
          <h2 className="font-bold text-lg">Access denied</h2>
          <p className="text-sm text-muted-foreground mt-2">You do not have permission to view audit logs. Contact your company administrator.</p>
        </div>
      </div>
    );
  }

  const rows = (logsQ.data ?? []) as any[];
  const stats = statsQ.data ?? { total: 0, today: 0, critical: 0, failed: 0, sensitive: 0, permission: 0, exports: 0, ai: 0, activeUsersToday: 0 };

  const filteredByTab = useMemo(() => {
    switch (tab) {
      case "project": return rows.filter(r => r.project_id);
      case "user": return rows;
      case "sensitive": return rows.filter(r => r.is_sensitive);
      case "permissions": return rows.filter(r => r.action_type === "Permission Change" || r.action_type === "Role Change" || r.module_name === "roles_permissions");
      default: return rows;
    }
  }, [tab, rows]);

  async function handleExportCSV() {
    if (!canExport) { toast.error("You do not have permission to export audit logs"); return; }
    const header = ["Log ID","Date/Time","User Name","User Email","Project","Module","Action","Action Type","Record Number","Record Title","Description","Severity","Status","Source","Sensitive","Error Message"];
    const lines = [header.join(",")];
    for (const r of filteredByTab) {
      lines.push([
        r.id, new Date(r.created_at).toISOString(), r.actor_name, r.actor_email, r.project_name,
        r.module_name, r.action, r.action_type, r.record_number, r.record_title, r.description,
        r.severity, r.status, r.source, r.is_sensitive ? "Yes" : "No", r.error_message,
      ].map(csvEscape).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const fileName = `audit-logs-${new Date().toISOString().slice(0,10).replace(/-/g,"")}.csv`;
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
    try {
      await recordExport.mutateAsync({
        export_name: `Audit Log Export (${filteredByTab.length})`,
        date_from: range.from, date_to: range.to,
        filters, total_records: filteredByTab.length, file_name: fileName,
        project_id: project || null,
      });
      toast.success(`Exported ${filteredByTab.length} log entries`);
    } catch (e: any) {
      toast.error(e?.message ?? "Export logged locally but server record failed");
    }
  }

  function clearFilters() {
    setSearch(""); setProject(""); setModuleName(""); setUser(""); setActionType("");
    setSeverity(""); setStatus(""); setPreset("all"); setSensitiveOnly(false); setFailedOnly(false);
  }

  return (
    <div className="p-6 space-y-6 print:p-0">
      <div className="flex items-start justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Shield className="size-6" />Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all activities, data changes, approvals, and security events across your company.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { logsQ.refetch(); statsQ.refetch(); }} className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-border rounded hover:bg-muted">
            <RefreshCw className="size-3.5" /> Refresh
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-border rounded hover:bg-muted">
            <Printer className="size-3.5" /> Print
          </button>
          {canExport && (
            <button onClick={handleExportCSV} className="inline-flex items-center gap-1 px-3 py-2 text-xs bg-accent text-accent-foreground rounded hover:opacity-90">
              <Download className="size-3.5" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 print:grid-cols-4">
        <StatCard label="Total Logs" value={stats.total} />
        <StatCard label="Today" value={stats.today} icon={<Activity className="size-3.5" />} />
        <StatCard label="Critical" value={stats.critical} tone="rose" />
        <StatCard label="Failed" value={stats.failed} tone="amber" icon={<AlertTriangle className="size-3.5" />} />
        <StatCard label="Sensitive" value={stats.sensitive} tone="purple" />
        <StatCard label="Permissions" value={stats.permission} />
        <StatCard label="Exports" value={stats.exports} icon={<FileDown className="size-3.5" />} />
        <StatCard label="AI Actions" value={stats.ai} />
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-md p-4 space-y-3 print:hidden">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search action, user, record, description..." className="pl-7 h-9" />
          </div>
          <Select value={project} onValueChange={(v) => setProject(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent><SelectItem value="_all">All Projects</SelectItem>{(projectsQ.data ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={moduleName} onValueChange={(v) => setModuleName(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="All Modules" /></SelectTrigger>
            <SelectContent><SelectItem value="_all">All Modules</SelectItem>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={user} onValueChange={(v) => setUser(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="All Users" /></SelectTrigger>
            <SelectContent><SelectItem value="_all">All Users</SelectItem>{(usersQ.data ?? []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={actionType} onValueChange={(v) => setActionType(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Action Type" /></SelectTrigger>
            <SelectContent><SelectItem value="_all">All Actions</SelectItem>{ACTION_TYPES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={severity} onValueChange={(v) => setSeverity(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent><SelectItem value="_all">All Severity</SelectItem>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="_all">All Status</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <label className="text-xs inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={sensitiveOnly} onChange={(e) => setSensitiveOnly(e.target.checked)} />
            Sensitive only
          </label>
          <label className="text-xs inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={failedOnly} onChange={(e) => setFailedOnly(e.target.checked)} />
            Failed only
          </label>
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><X className="size-3" /> Clear</button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="print:hidden">
          <TabsTrigger value="all">All Logs</TabsTrigger>
          <TabsTrigger value="project">Project Activity</TabsTrigger>
          <TabsTrigger value="user">User Activity</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
          <TabsTrigger value="sensitive">Sensitive</TabsTrigger>
          <TabsTrigger value="permissions">Permission Changes</TabsTrigger>
          <TabsTrigger value="exports">Export History</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4"><LogsTable rows={filteredByTab} loading={logsQ.isLoading} onSelect={setSelectedId} /></TabsContent>
        <TabsContent value="project" className="mt-4"><LogsTable rows={filteredByTab} loading={logsQ.isLoading} onSelect={setSelectedId} /></TabsContent>
        <TabsContent value="user" className="mt-4"><LogsTable rows={filteredByTab} loading={logsQ.isLoading} onSelect={setSelectedId} /></TabsContent>
        <TabsContent value="sensitive" className="mt-4"><LogsTable rows={filteredByTab} loading={logsQ.isLoading} onSelect={setSelectedId} /></TabsContent>
        <TabsContent value="permissions" className="mt-4"><LogsTable rows={filteredByTab} loading={logsQ.isLoading} onSelect={setSelectedId} /></TabsContent>
        <TabsContent value="security" className="mt-4">
          {secQ.data && !(secQ.data as any).allowed ? (
            <EmptyState title="Security events restricted" desc="Only company administrators can view security events." />
          ) : (secQ.data as any)?.items?.length ? (
            <div className="bg-card border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr><th className="text-left px-4 py-2">When</th><th className="text-left px-4 py-2">Event</th><th className="text-left px-4 py-2">Severity</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">IP</th><th className="text-left px-4 py-2">Description</th></tr>
                </thead>
                <tbody>
                  {((secQ.data as any).items as any[]).map(e => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-2 text-xs font-mono">{new Date(e.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-xs">{e.event_type}</td>
                      <td className="px-4 py-2"><Badge className={SEV_COLOR[e.severity] ?? ""}>{e.severity}</Badge></td>
                      <td className="px-4 py-2"><Badge className={STATUS_COLOR[e.status] ?? ""}>{e.status}</Badge></td>
                      <td className="px-4 py-2 text-xs font-mono">{e.ip_address ?? "—"}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{e.event_description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No security events yet" desc="Login/logout tracking requires auth event logging setup. Application activity logs are available in other tabs." />
          )}
        </TabsContent>
        <TabsContent value="exports" className="mt-4">
          {(expQ.data ?? []).length === 0 ? (
            <EmptyState title="No exports yet" desc="Audit log exports will be recorded here." />
          ) : (
            <div className="bg-card border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr><th className="text-left px-4 py-2">When</th><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Records</th><th className="text-left px-4 py-2">File</th><th className="text-left px-4 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {((expQ.data ?? []) as any[]).map(e => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-2 text-xs font-mono">{new Date(e.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-xs">{e.export_name}</td>
                      <td className="px-4 py-2 text-xs">{e.total_records}</td>
                      <td className="px-4 py-2 text-xs font-mono">{e.file_name ?? "—"}</td>
                      <td className="px-4 py-2"><Badge>{e.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail drawer */}
      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>Audit Log Detail</SheetTitle></SheetHeader>
          {detailQ.isLoading ? <p className="text-sm text-muted-foreground mt-4">Loading…</p> : detailQ.data ? (
            <DetailView log={detailQ.data} />
          ) : <p className="text-sm text-muted-foreground mt-4">Not found.</p>}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone?: string; icon?: React.ReactNode }) {
  const tones: Record<string, string> = {
    rose: "border-rose-200", amber: "border-amber-200", purple: "border-purple-200",
  };
  return (
    <div className={`bg-card border ${tone ? tones[tone] : "border-border"} rounded-md p-3`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function LogsTable({ rows, loading, onSelect }: { rows: any[]; loading: boolean; onSelect: (id: string) => void }) {
  if (loading) return <div className="bg-card border border-border rounded-md p-12 text-center text-sm text-muted-foreground">Loading audit logs…</div>;
  if (!rows.length) return <EmptyState title="No audit entries" desc="No logs match the current filters." />;
  return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 w-40">When</th>
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Module</th>
              <th className="text-left px-3 py-2">Record</th>
              <th className="text-left px-3 py-2">Project</th>
              <th className="text-left px-3 py-2">Severity</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 text-xs font-mono">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs">{r.actor_name}</td>
                <td className="px-3 py-2 text-xs font-medium">{r.action}{r.action_type && <span className="ml-1 text-[10px] text-muted-foreground">· {r.action_type}</span>}</td>
                <td className="px-3 py-2 text-xs"><span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">{r.module_name ?? "—"}</span></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.record_number || r.record_title || (r.entity_id ? r.entity_id.slice(0,8) : "—")}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.project_name ?? "—"}</td>
                <td className="px-3 py-2"><Badge className={SEV_COLOR[r.severity] ?? ""}>{r.severity ?? "Info"}</Badge>{r.is_sensitive && <Badge className="ml-1 bg-purple-100 text-purple-700">Sensitive</Badge>}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLOR[r.status] ?? ""}>{r.status ?? "Success"}</Badge></td>
                <td className="px-3 py-2"><button onClick={() => onSelect(r.id)} className="text-accent hover:underline inline-flex items-center gap-1 text-xs"><Eye className="size-3" />View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailView({ log }: { log: any }) {
  return (
    <div className="mt-4 space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <Field label="Log ID" value={<code className="text-[10px]">{log.id}</code>} />
        <Field label="When" value={new Date(log.created_at).toLocaleString()} />
        <Field label="User" value={log.actor_name ?? "—"} />
        <Field label="Email" value={log.actor_email ?? "—"} />
        <Field label="Action" value={log.action} />
        <Field label="Action Type" value={log.action_type ?? "—"} />
        <Field label="Module" value={log.module_name ?? "—"} />
        <Field label="Project" value={log.project_name ?? "—"} />
        <Field label="Record #" value={log.record_number ?? "—"} />
        <Field label="Record Title" value={log.record_title ?? "—"} />
        <Field label="Severity" value={<Badge className={SEV_COLOR[log.severity] ?? ""}>{log.severity}</Badge>} />
        <Field label="Status" value={<Badge className={STATUS_COLOR[log.status] ?? ""}>{log.status}</Badge>} />
        <Field label="Source" value={log.source ?? "—"} />
        <Field label="Sensitive" value={log.is_sensitive ? "Yes" : "No"} />
        <Field label="IP Address" value={log.ip_address ?? "—"} />
        <Field label="Session" value={log.session_id ?? "—"} />
      </div>
      {log.description && <Section title="Description"><p className="text-xs">{log.description}</p></Section>}
      {log.error_message && <Section title="Error"><p className="text-xs text-rose-600">{log.error_message}</p></Section>}
      {log.changed_fields && Array.isArray(log.changed_fields) && log.changed_fields.length > 0 && (
        <Section title="Changed Fields"><div className="flex flex-wrap gap-1">{log.changed_fields.map((f: string) => <Badge key={f}>{f}</Badge>)}</div></Section>
      )}
      {log.old_values && <Section title="Old Values"><pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(log.old_values, null, 2)}</pre></Section>}
      {log.new_values && <Section title="New Values"><pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(log.new_values, null, 2)}</pre></Section>}
      {log.metadata && <Section title="Metadata"><pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(log.metadata, null, 2)}</pre></Section>}
      {log.user_agent && <Section title="User Agent"><p className="text-[10px] font-mono text-muted-foreground break-all">{log.user_agent}</p></Section>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{title}</div>
      {children}
    </div>
  );
}
function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-md p-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

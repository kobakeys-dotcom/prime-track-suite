import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileBarChart, Play, Save, Download, Printer, Loader2, Plus, Eye, Trash2,
  Sparkles, FileText, Clock, Calendar as CalIcon, Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ProjectPicker } from "@/components/project-picker";
import {
  listReportModules, generateStandardReport, listReportTemplates, saveReportTemplate,
  archiveReportTemplate, listSavedReports, getSavedReport, saveGeneratedReport,
  archiveSavedReport, setReportClientVisible, listReportExports, recordReportExport,
  listReportSchedules, saveReportSchedule, archiveReportSchedule, reportStats,
} from "@/lib/reports-data.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports & Analytics — ProjectCore" }] }),
  component: ReportsPage,
});

type ModuleMeta = { module: string; label: string; category: string; columns: { key: string; label: string }[] };
type ReportResult = { module: string; label: string; category: string;
  columns: { key: string; label: string }[]; rows: any[]; summary: Record<string, any> };

function csvEscape(v: any) {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCSV(filename: string, columns: { key: string; label: string }[], rows: any[]) {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c.key])).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const DATE_PRESETS = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
];
function presetRange(k: string): { from?: string; to?: string } {
  const now = new Date(); const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (k === "today") return { from: iso(now), to: iso(now) };
  if (k === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: iso(d), to: iso(now) }; }
  if (k === "month") { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: iso(d), to: iso(now) }; }
  if (k === "quarter") { const q = Math.floor(now.getMonth() / 3); const d = new Date(now.getFullYear(), q * 3, 1); return { from: iso(d), to: iso(now) }; }
  if (k === "year") { const d = new Date(now.getFullYear(), 0, 1); return { from: iso(d), to: iso(now) }; }
  return {};
}

function ReportsPage() {
  const qc = useQueryClient();
  const modulesFn = useServerFn(listReportModules);
  const statsFn = useServerFn(reportStats);
  const { data: modules = [] as ModuleMeta[] } = useQuery({ queryKey: ["report-modules"], queryFn: () => modulesFn() });
  const { data: stats } = useQuery({ queryKey: ["report-stats"], queryFn: () => statsFn() });

  const [tab, setTab] = useState("dashboard");
  const [projectId, setProjectId] = useState("");
  const [preset, setPreset] = useState("month");
  const [search, setSearch] = useState("");

  const dateRange = presetRange(preset);
  const grouped = useMemo(() => {
    const map: Record<string, ModuleMeta[]> = {};
    (modules as ModuleMeta[])
      .filter((m) => !search || m.label.toLowerCase().includes(search.toLowerCase()))
      .forEach((m) => { (map[m.category] ??= []).push(m); });
    return map;
  }, [modules, search]);

  // Preview state
  const [preview, setPreview] = useState<ReportResult | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ name: string; module: string; project?: string; from?: string; to?: string } | null>(null);
  const genFn = useServerFn(generateStandardReport);
  const genMut = useMutation({
    mutationFn: (args: { module: string }) => genFn({ data: { module: args.module, projectId: projectId || undefined, dateFrom: dateRange.from, dateTo: dateRange.to } }),
    onSuccess: (r, vars) => {
      setPreview(r as ReportResult);
      setPreviewMeta({ name: r.label, module: vars.module, project: projectId, from: dateRange.from, to: dateRange.to });
      toast.success(`${r.label} generated — ${r.rows.length} rows`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><FileBarChart className="size-6 text-accent" /> Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate, save, export, and schedule project & company reports.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-56"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{DATE_PRESETS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Templates" value={stats?.templates ?? 0} />
        <StatCard label="Saved Reports" value={stats?.saved ?? 0} />
        <StatCard label="This Month" value={stats?.generatedThisMonth ?? 0} />
        <StatCard label="Client Visible" value={stats?.clientVisible ?? 0} />
        <StatCard label="Exports" value={stats?.exports ?? 0} />
        <StatCard label="Available Modules" value={stats?.availableModules ?? 0} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="standard">Standard Reports</TabsTrigger>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
          <TabsTrigger value="client">Client Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Quick Reports</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {["projects","tasks","daily_reports","boq_items","payment_claims","procurement_requests","quality_inspections","safety_inspections","risks","manpower_records","documents","drawings"].map((m) => {
                const meta = (modules as ModuleMeta[]).find((x) => x.module === m); if (!meta) return null;
                return (
                  <Button key={m} variant="outline" size="sm" onClick={() => { setTab("standard"); genMut.mutate({ module: m }); }} disabled={genMut.isPending}>
                    <Sparkles className="size-3.5" /> {meta.label}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standard" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Input placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          </div>
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{cat}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((m) => (
                  <Card key={m.module}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm">{m.label}</div>
                        <Badge variant="secondary" className="text-[10px]">{m.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Generate {m.label.toLowerCase()} report with current filters.</p>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => genMut.mutate({ module: m.module })} disabled={genMut.isPending && genMut.variables?.module === m.module}>
                          {genMut.isPending && genMut.variables?.module === m.module ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Run
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="builder" className="mt-4">
          <ReportBuilder modules={modules as ModuleMeta[]} projectId={projectId} dateRange={dateRange}
            onPreview={(r, meta) => { setPreview(r); setPreviewMeta(meta); }} />
        </TabsContent>

        <TabsContent value="saved" className="mt-4"><SavedReportsTab onOpen={(r) => {
          setPreview({ module: r.report_module, label: r.report_name, category: r.report_category,
            columns: (r.report_data?.columns ?? []), rows: (r.report_data?.rows ?? []), summary: r.report_summary ?? {} });
          setPreviewMeta({ name: r.report_name, module: r.report_module, project: r.project_id, from: r.date_from, to: r.date_to });
        }} /></TabsContent>

        <TabsContent value="schedules" className="mt-4"><SchedulesTab templates={[]} /></TabsContent>

        <TabsContent value="exports" className="mt-4"><ExportsTab /></TabsContent>

        <TabsContent value="client" className="mt-4"><ClientReportsTab onOpen={(r) => {
          setPreview({ module: r.report_module, label: r.report_name, category: r.report_category,
            columns: (r.report_data?.columns ?? []), rows: (r.report_data?.rows ?? []), summary: r.report_summary ?? {} });
          setPreviewMeta({ name: r.report_name, module: r.report_module, project: r.project_id, from: r.date_from, to: r.date_to });
        }} /></TabsContent>
      </Tabs>

      <ReportPreviewSheet open={!!preview} onOpenChange={(o) => { if (!o) { setPreview(null); setPreviewMeta(null); } }}
        report={preview} meta={previewMeta} onSaved={() => qc.invalidateQueries({ queryKey: ["saved-reports"] })} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}

function ReportBuilder({ modules, projectId, dateRange, onPreview }: {
  modules: ModuleMeta[]; projectId: string; dateRange: { from?: string; to?: string };
  onPreview: (r: ReportResult, meta: { name: string; module: string; project?: string; from?: string; to?: string }) => void;
}) {
  const qc = useQueryClient();
  const [module, setModule] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [clientVisible, setClientVisible] = useState(false);

  const meta = modules.find((m) => m.module === module);
  const genFn = useServerFn(generateStandardReport);
  const saveTplFn = useServerFn(saveReportTemplate);

  const genMut = useMutation({
    mutationFn: () => genFn({ data: { module, projectId: projectId || undefined, dateFrom: dateRange.from, dateTo: dateRange.to } }),
    onSuccess: (r: any) => {
      const cols = selected.length ? r.columns.filter((c: any) => selected.includes(c.key)) : r.columns;
      onPreview({ ...r, columns: cols }, { name: name || r.label, module, project: projectId, from: dateRange.from, to: dateRange.to });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const tplMut = useMutation({
    mutationFn: () => saveTplFn({ data: {
      template_name: name, template_description: desc || null, report_module: module,
      report_category: meta?.category, selected_columns: selected, is_client_visible: clientVisible,
    } }),
    onSuccess: () => { toast.success("Template saved"); qc.invalidateQueries({ queryKey: ["report-templates"] }); qc.invalidateQueries({ queryKey: ["report-stats"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Report Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly Project Progress" />
          </div>
          <div>
            <Label>Module</Label>
            <Select value={module} onValueChange={(v) => { setModule(v); setSelected([]); }}>
              <SelectTrigger><SelectValue placeholder="Choose module..." /></SelectTrigger>
              <SelectContent>
                {modules.map((m) => <SelectItem key={m.module} value={m.module}>{m.label} — {m.category}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
        </div>
        {meta && (
          <div>
            <Label className="mb-2 block">Columns ({selected.length || "all"})</Label>
            <div className="flex flex-wrap gap-2">
              {meta.columns.map((c) => {
                const on = selected.includes(c.key);
                return (
                  <button type="button" key={c.key}
                    onClick={() => setSelected((s) => on ? s.filter((x) => x !== c.key) : [...s, c.key])}
                    className={`px-3 py-1 text-xs rounded border ${on ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border"}`}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Switch checked={clientVisible} onCheckedChange={setClientVisible} id="cv" />
          <Label htmlFor="cv" className="cursor-pointer text-sm">Client visible</Label>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button onClick={() => genMut.mutate()} disabled={!module || genMut.isPending}>
            {genMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Preview / Run
          </Button>
          <Button variant="outline" onClick={() => tplMut.mutate()} disabled={!module || !name || tplMut.isPending}>
            <Save className="size-4" /> Save Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SavedReportsTab({ onOpen }: { onOpen: (r: any) => void }) {
  const qc = useQueryClient();
  const fn = useServerFn(listSavedReports);
  const getFn = useServerFn(getSavedReport);
  const archFn = useServerFn(archiveSavedReport);
  const cvFn = useServerFn(setReportClientVisible);
  const { data = [], isLoading } = useQuery({ queryKey: ["saved-reports"], queryFn: () => fn() });
  const arch = useMutation({ mutationFn: (id: string) => archFn({ data: { id } }),
    onSuccess: () => { toast.success("Archived"); qc.invalidateQueries({ queryKey: ["saved-reports"] }); qc.invalidateQueries({ queryKey: ["report-stats"] }); } });
  const cv = useMutation({ mutationFn: (v: { id: string; is_client_visible: boolean }) => cvFn({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["saved-reports"] }); } });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="size-5 animate-spin" /></div>;
  if (!data.length) return <Empty icon={FileText} msg="No saved reports yet — run a report and click Save." />;

  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs"><tr>
          <th className="text-left p-2">Name</th><th className="text-left p-2">Module</th>
          <th className="text-left p-2">Generated</th><th className="text-left p-2">Client</th><th className="p-2"></th>
        </tr></thead>
        <tbody>
          {data.map((r: any) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 font-medium">{r.report_name}</td>
              <td className="p-2"><Badge variant="secondary" className="text-[10px]">{r.report_category}</Badge></td>
              <td className="p-2 text-xs text-muted-foreground">{new Date(r.generated_at).toLocaleString()}</td>
              <td className="p-2"><Switch checked={!!r.is_client_visible} onCheckedChange={(v) => cv.mutate({ id: r.id, is_client_visible: v })} /></td>
              <td className="p-2 text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={async () => { const full = await getFn({ data: { id: r.id } }); onOpen(full); }}><Eye className="size-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Archive?")) arch.mutate(r.id); }}><Trash2 className="size-3.5" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientReportsTab({ onOpen }: { onOpen: (r: any) => void }) {
  const fn = useServerFn(listSavedReports);
  const getFn = useServerFn(getSavedReport);
  const { data = [], isLoading } = useQuery({ queryKey: ["saved-reports"], queryFn: () => fn() });
  const visible = (data as any[]).filter((r) => r.is_client_visible);
  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="size-5 animate-spin" /></div>;
  if (!visible.length) return <Empty icon={UsersIcon} msg="No client-visible reports yet." />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {visible.map((r) => (
        <Card key={r.id}><CardContent className="p-4 space-y-2">
          <div className="font-semibold text-sm">{r.report_name}</div>
          <Badge variant="secondary" className="text-[10px]">{r.report_category}</Badge>
          <div className="text-xs text-muted-foreground">{new Date(r.generated_at).toLocaleString()}</div>
          <Button size="sm" variant="outline" onClick={async () => onOpen(await getFn({ data: { id: r.id } }))}><Eye className="size-3.5" /> Open</Button>
        </CardContent></Card>
      ))}
    </div>
  );
}

function ExportsTab() {
  const fn = useServerFn(listReportExports);
  const { data = [], isLoading } = useQuery({ queryKey: ["report-exports"], queryFn: () => fn() });
  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="size-5 animate-spin" /></div>;
  if (!data.length) return <Empty icon={Download} msg="No exports yet." />;
  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs"><tr>
          <th className="text-left p-2">File</th><th className="text-left p-2">Type</th>
          <th className="text-left p-2">Status</th><th className="text-left p-2">Exported</th>
        </tr></thead>
        <tbody>{data.map((e: any) => (
          <tr key={e.id} className="border-t">
            <td className="p-2">{e.file_name ?? "—"}</td>
            <td className="p-2"><Badge variant="secondary" className="text-[10px]">{e.export_type}</Badge></td>
            <td className="p-2 text-xs">{e.export_status}</td>
            <td className="p-2 text-xs text-muted-foreground">{new Date(e.exported_at).toLocaleString()}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function SchedulesTab({ templates: _t }: { templates: any[] }) {
  const qc = useQueryClient();
  const fn = useServerFn(listReportSchedules);
  const saveFn = useServerFn(saveReportSchedule);
  const archFn = useServerFn(archiveReportSchedule);
  const tplFn = useServerFn(listReportTemplates);
  const { data = [], isLoading } = useQuery({ queryKey: ["report-schedules"], queryFn: () => fn() });
  const { data: tpls = [] } = useQuery({ queryKey: ["report-templates"], queryFn: () => tplFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ schedule_name: "", report_template_id: "", frequency: "Weekly", next_run_date: "" });
  const save = useMutation({ mutationFn: () => saveFn({ data: { ...form, report_template_id: form.report_template_id || null, next_run_date: form.next_run_date || null } as any }),
    onSuccess: () => { toast.success("Schedule saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["report-schedules"] }); } });
  const arch = useMutation({ mutationFn: (id: string) => archFn({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["report-schedules"] }); } });

  return (
    <div className="space-y-3">
      <div className="bg-muted/50 border rounded p-3 text-sm">
        <Clock className="size-4 inline mr-2 text-muted-foreground" />
        Automated scheduled delivery requires background jobs. Manual report generation and saved templates are fully available now.
      </div>
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5" /> New Schedule</Button></div>
      {isLoading ? <div className="flex justify-center p-8"><Loader2 className="size-5 animate-spin" /></div>
        : !data.length ? <Empty icon={CalIcon} msg="No schedules configured." />
        : <div className="border rounded-md overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted text-xs"><tr>
              <th className="text-left p-2">Name</th><th className="text-left p-2">Frequency</th>
              <th className="text-left p-2">Next Run</th><th className="text-left p-2">Status</th><th className="p-2"></th>
            </tr></thead>
            <tbody>{data.map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-2 font-medium">{s.schedule_name}</td>
                <td className="p-2"><Badge variant="secondary" className="text-[10px]">{s.frequency}</Badge></td>
                <td className="p-2 text-xs">{s.next_run_date ?? "—"}</td>
                <td className="p-2 text-xs">{s.status}</td>
                <td className="p-2 text-right"><Button size="sm" variant="ghost" onClick={() => { if (confirm("Remove?")) arch.mutate(s.id); }}><Trash2 className="size-3.5" /></Button></td>
              </tr>
            ))}</tbody>
          </table></div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Schedule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.schedule_name} onChange={(e) => setForm({ ...form, schedule_name: e.target.value })} /></div>
            <div><Label>Template</Label>
              <Select value={form.report_template_id} onValueChange={(v) => setForm({ ...form, report_template_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose template" /></SelectTrigger>
                <SelectContent>{(tpls as any[]).map((t) => <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Daily","Weekly","Monthly","Quarterly"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Next Run Date</Label><Input type="date" value={form.next_run_date} onChange={(e) => setForm({ ...form, next_run_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.schedule_name || save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportPreviewSheet({ open, onOpenChange, report, meta, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  report: ReportResult | null; meta: any; onSaved: () => void;
}) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveGeneratedReport);
  const expFn = useServerFn(recordReportExport);
  const [saveName, setSaveName] = useState("");
  const [clientVis, setClientVis] = useState(false);

  const save = useMutation({
    mutationFn: () => {
      if (!report) throw new Error("No report");
      return saveFn({ data: {
        report_name: saveName || meta?.name || report.label,
        report_module: report.module, report_category: report.category,
        project_id: meta?.project || null, date_from: meta?.from || null, date_to: meta?.to || null,
        report_data: { columns: report.columns, rows: report.rows },
        report_summary: report.summary, is_client_visible: clientVis,
      } });
    },
    onSuccess: () => { toast.success("Report saved"); onSaved(); qc.invalidateQueries({ queryKey: ["report-stats"] }); setSaveName(""); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  function exportCsv() {
    if (!report) return;
    const name = `${(meta?.name || report.label).replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
    downloadCSV(name, report.columns, report.rows);
    expFn({ data: { export_type: "CSV", file_name: name, project_id: meta?.project || null } as any })
      .then(() => qc.invalidateQueries({ queryKey: ["report-exports"] })).catch(() => {});
    toast.success("CSV exported");
  }

  if (!report) return null;
  const byStatus = report.summary?.byStatus as Record<string, number> | undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto print:max-w-none print:w-full print:shadow-none">
        <SheetHeader><SheetTitle className="flex items-center gap-2"><FileBarChart className="size-5 text-accent" /> {meta?.name || report.label}</SheetTitle></SheetHeader>

        <div className="space-y-4 mt-4 print:mt-0" id="report-print-area">
          <div className="border-b pb-3">
            <div className="text-xs text-muted-foreground">Module: <span className="font-medium text-foreground">{report.label}</span> · Category: {report.category}</div>
            <div className="text-xs text-muted-foreground">Generated: {new Date().toLocaleString()}{meta?.from ? ` · Range: ${meta.from} → ${meta.to ?? "—"}` : ""}</div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard label="Total Rows" value={report.summary?.total ?? report.rows.length} />
            {byStatus && Object.entries(byStatus).slice(0, 3).map(([k, v]) => <StatCard key={k} label={k} value={v as number} />)}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button size="sm" onClick={exportCsv}><Download className="size-3.5" /> Export CSV</Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-3.5" /> Print / PDF</Button>
            <Input placeholder="Save as..." value={saveName} onChange={(e) => setSaveName(e.target.value)} className="w-48" />
            <div className="flex items-center gap-1"><Switch checked={clientVis} onCheckedChange={setClientVis} id="pv-cv" /><Label htmlFor="pv-cv" className="text-xs">Client</Label></div>
            <Button size="sm" variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save
            </Button>
          </div>

          {/* Table */}
          {!report.rows.length ? <Empty icon={FileText} msg="No data for selected filters." /> : (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted"><tr>
                  {report.columns.map((c) => <th key={c.key} className="text-left p-2 font-semibold">{c.label}</th>)}
                </tr></thead>
                <tbody>
                  {report.rows.slice(0, 500).map((row, i) => (
                    <tr key={i} className="border-t">
                      {report.columns.map((c) => <td key={c.key} className="p-2 align-top">{formatVal(row[c.key])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.rows.length > 500 && <div className="p-2 text-xs text-muted-foreground bg-muted">Showing first 500 of {report.rows.length} rows — full data included in CSV export.</div>}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatVal(v: any) {
  if (v == null) return <span className="text-muted-foreground">—</span>;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

function Empty({ icon: Icon, msg }: { icon: any; msg: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="size-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

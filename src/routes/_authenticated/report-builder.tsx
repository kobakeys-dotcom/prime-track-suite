import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Sparkles, FileBarChart, Play, Save, Download, Printer, Loader2, Wand2,
  History, FileText, Copy, BrainCircuit, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ProjectPicker } from "@/components/project-picker";
import {
  listReportModules, generateStandardReport, saveGeneratedReport,
  recordReportExport, saveReportTemplate,
} from "@/lib/reports-data.functions";
import {
  interpretAIReportPrompt, generateAIReportSummary, listAIPromptHistory,
} from "@/lib/report-ai.functions";

export const Route = createFileRoute("/_authenticated/report-builder")({
  head: () => ({ meta: [{ title: "AI Report Builder — ProjectCore" }] }),
  component: ReportBuilderPage,
});

type ModuleMeta = { module: string; label: string; category: string; columns: { key: string; label: string }[] };
type ReportResult = { module: string; label: string; category: string;
  columns: { key: string; label: string }[]; rows: any[]; summary: Record<string, any> };

const PROMPT_EXAMPLES = [
  "Show all overdue tasks for this project grouped by responsible person",
  "Generate a procurement report of pending material requests, RFQs and POs",
  "Show high and critical risks with overdue mitigation actions",
  "Create a cost report comparing budget vs actual for this month",
  "Summarize open NCRs and failed quality inspections",
  "Show manpower and equipment usage for the last 7 days",
  "Prepare a client-friendly progress summary for this project",
];

function csvEscape(v: any) {
  if (v == null) return ""; const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCSV(filename: string, columns: { key: string; label: string }[], rows: any[]) {
  const body = [columns.map((c) => csvEscape(c.label)).join(","),
    ...rows.map((r) => columns.map((c) => csvEscape(r[c.key])).join(","))].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function ReportBuilderPage() {
  const qc = useQueryClient();
  const modulesFn = useServerFn(listReportModules);
  const { data: modules = [] as ModuleMeta[] } = useQuery({ queryKey: ["report-modules"], queryFn: () => modulesFn() });
  const [tab, setTab] = useState("ai");
  const [projectId, setProjectId] = useState("");
  const [report, setReport] = useState<ReportResult | null>(null);
  const [reportName, setReportName] = useState("");

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <BrainCircuit className="size-6 text-accent" /> AI Report Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Describe what you need in plain English, or build manually. AI generates a safe report config — never raw SQL.
          </p>
        </div>
        <div className="w-64"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ai"><Sparkles className="size-3.5" /> AI Builder</TabsTrigger>
          <TabsTrigger value="manual"><Wand2 className="size-3.5" /> Manual Builder</TabsTrigger>
          <TabsTrigger value="history"><History className="size-3.5" /> AI History</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-4 space-y-4">
          <AIBuilder modules={modules as ModuleMeta[]} projectId={projectId}
            onReport={(r, name) => { setReport(r); setReportName(name); }} />
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <ManualBuilder modules={modules as ModuleMeta[]} projectId={projectId}
            onReport={(r, name) => { setReport(r); setReportName(name); }} />
        </TabsContent>

        <TabsContent value="history" className="mt-4"><AIHistory /></TabsContent>
      </Tabs>

      {report && (
        <ReportPreview report={report} reportName={reportName} projectId={projectId}
          onSaved={() => qc.invalidateQueries({ queryKey: ["saved-reports"] })} />
      )}
    </div>
  );
}

function AIBuilder({ modules, projectId, onReport }: {
  modules: ModuleMeta[]; projectId: string;
  onReport: (r: ReportResult, name: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [config, setConfig] = useState<any | null>(null);
  const [moduleInfo, setModuleInfo] = useState<{ label: string; category: string; available: string[] } | null>(null);

  const interpFn = useServerFn(interpretAIReportPrompt);
  const genFn = useServerFn(generateStandardReport);

  const interp = useMutation({
    mutationFn: () => interpFn({ data: { prompt, project_id: projectId || null } }),
    onSuccess: (r: any) => {
      setConfig(r.config);
      setModuleInfo({ label: r.module_label, category: r.module_category, available: r.available_columns });
      toast.success("AI generated a report setup — review and run");
    },
    onError: (e: any) => toast.error(e?.message ?? "AI failed"),
  });

  const run = useMutation({
    mutationFn: async () => {
      if (!config) throw new Error("No config");
      const r = await genFn({ data: {
        module: config.module, projectId: projectId || undefined,
        dateFrom: config.date_from || undefined, dateTo: config.date_to || undefined,
      } });
      const cols = (config.selected_columns?.length
        ? r.columns.filter((c: any) => config.selected_columns.includes(c.key))
        : r.columns);
      return { ...r, columns: cols };
    },
    onSuccess: (r: any) => {
      onReport(r as ReportResult, prompt.slice(0, 80) || r.label);
      toast.success(`Report ready — ${r.rows.length} rows`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4 space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-1"><Sparkles className="size-4 text-accent" /> Describe your report</Label>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
          placeholder="e.g. Show all overdue tasks for this project grouped by responsible person" />
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_EXAMPLES.map((p, i) => (
            <button key={i} type="button" onClick={() => setPrompt(p)}
              className="text-[11px] px-2 py-1 rounded bg-muted hover:bg-muted/70 border border-border text-muted-foreground">
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => interp.mutate()} disabled={!prompt.trim() || interp.isPending}>
            {interp.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Interpret with AI
          </Button>
        </div>
      </CardContent></Card>

      {config && moduleInfo && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <BrainCircuit className="size-4 text-accent" /> AI-suggested setup
            <Badge variant="secondary" className="text-[10px]">{moduleInfo.category}</Badge>
          </CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Module:</span> <span className="font-medium">{moduleInfo.label}</span></div>
              <div><span className="text-muted-foreground">Chart:</span> {config.chart_type ?? "none"}</div>
              <div><span className="text-muted-foreground">Date from:</span> {config.date_from ?? "—"}</div>
              <div><span className="text-muted-foreground">Date to:</span> {config.date_to ?? "—"}</div>
              <div><span className="text-muted-foreground">Group by:</span> {config.group_by ?? "—"}</div>
              <div><span className="text-muted-foreground">Sort by:</span> {config.sort_by ?? "—"}</div>
            </div>
            <div>
              <Label className="text-xs">Columns</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {moduleInfo.available.map((c) => {
                  const on = (config.selected_columns ?? []).includes(c);
                  return (
                    <button type="button" key={c}
                      onClick={() => setConfig({ ...config,
                        selected_columns: on ? config.selected_columns.filter((x: string) => x !== c) : [...(config.selected_columns ?? []), c] })}
                      className={`px-2 py-0.5 text-[11px] rounded border ${on ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border"}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            {config.rationale && <div className="text-xs text-muted-foreground italic border-l-2 border-accent pl-2">{config.rationale}</div>}
            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={() => run.mutate()} disabled={run.isPending}>
                {run.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!process.env.LOVABLE_API_KEY_HINT && (
        <div className="text-xs text-muted-foreground bg-muted/50 border rounded p-3">
          <AlertTriangle className="size-3.5 inline mr-1 text-amber-500" />
          AI never executes SQL or sees data from other companies. It only suggests safe report parameters which you can review and edit before running.
        </div>
      )}
    </div>
  );
}

function ManualBuilder({ modules, projectId, onReport }: {
  modules: ModuleMeta[]; projectId: string;
  onReport: (r: ReportResult, name: string) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [module, setModule] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientVisible, setClientVisible] = useState(false);

  const meta = modules.find((m) => m.module === module);
  const genFn = useServerFn(generateStandardReport);
  const saveTplFn = useServerFn(saveReportTemplate);

  const run = useMutation({
    mutationFn: async () => {
      if (!module) throw new Error("Pick a module");
      const r = await genFn({ data: { module, projectId: projectId || undefined,
        dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } });
      const cols = selected.length ? r.columns.filter((c: any) => selected.includes(c.key)) : r.columns;
      return { ...r, columns: cols };
    },
    onSuccess: (r: any) => { onReport(r as ReportResult, name || r.label); toast.success(`${r.rows.length} rows`); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const tpl = useMutation({
    mutationFn: () => saveTplFn({ data: {
      template_name: name, template_description: desc || null, report_module: module,
      report_category: meta?.category, selected_columns: selected, is_client_visible: clientVisible,
      filters: { date_from: dateFrom || null, date_to: dateTo || null },
    } }),
    onSuccess: () => { toast.success("Template saved"); qc.invalidateQueries({ queryKey: ["report-templates"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Card><CardContent className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label>Report Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Module</Label>
          <Select value={module} onValueChange={(v) => { setModule(v); setSelected([]); }}>
            <SelectTrigger><SelectValue placeholder="Pick module..." /></SelectTrigger>
            <SelectContent>{modules.map((m) => <SelectItem key={m.module} value={m.module}>{m.label} · {m.category}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Date from</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div><Label>Date to</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
      </div>
      <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
      {meta && (
        <div>
          <Label className="mb-2 block text-xs">Columns ({selected.length || "all"})</Label>
          <div className="flex flex-wrap gap-1.5">
            {meta.columns.map((c) => {
              const on = selected.includes(c.key);
              return (
                <button key={c.key} type="button"
                  onClick={() => setSelected((s) => on ? s.filter((x) => x !== c.key) : [...s, c.key])}
                  className={`px-2 py-1 text-[11px] rounded border ${on ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border"}`}>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Switch checked={clientVisible} onCheckedChange={setClientVisible} id="m-cv" />
        <Label htmlFor="m-cv" className="text-sm cursor-pointer">Client visible</Label>
      </div>
      <div className="flex gap-2 pt-2 border-t">
        <Button onClick={() => run.mutate()} disabled={!module || run.isPending}>
          {run.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run
        </Button>
        <Button variant="outline" onClick={() => tpl.mutate()} disabled={!module || !name || tpl.isPending}>
          <Save className="size-4" /> Save Template
        </Button>
      </div>
    </CardContent></Card>
  );
}

function AIHistory() {
  const fn = useServerFn(listAIPromptHistory);
  const { data = [], isLoading } = useQuery({ queryKey: ["ai-prompt-history"], queryFn: () => fn() });
  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="size-5 animate-spin" /></div>;
  if (!data.length) return (
    <div className="text-center py-12 text-muted-foreground">
      <History className="size-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">No AI prompts yet.</p>
    </div>
  );
  return (
    <div className="space-y-2">
      {(data as any[]).map((p) => (
        <Card key={p.id}><CardContent className="p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium">{p.prompt_text}</div>
            <Badge variant={p.status === "Completed" ? "secondary" : "destructive"} className="text-[10px]">{p.status}</Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {p.interpreted_module && <>Module: <span className="font-medium text-foreground">{p.interpreted_module}</span> · </>}
            {new Date(p.created_at).toLocaleString()}
          </div>
          {p.error_message && <div className="text-xs text-destructive mt-1">{p.error_message}</div>}
        </CardContent></Card>
      ))}
    </div>
  );
}

function ReportPreview({ report, reportName, projectId, onSaved }: {
  report: ReportResult; reportName: string; projectId: string; onSaved: () => void;
}) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveGeneratedReport);
  const expFn = useServerFn(recordReportExport);
  const aiFn = useServerFn(generateAIReportSummary);
  const [aiText, setAiText] = useState<{ summary?: string; insights?: string; recommendations?: string; narrative?: string }>({});
  const [style, setStyle] = useState("Executive");
  const [clientVis, setClientVis] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const ai = useMutation({
    mutationFn: (mode: "summary" | "insights" | "recommendations" | "narrative") =>
      aiFn({ data: { module_label: report.label, rows: report.rows, columns: report.columns,
        summary_kpis: report.summary, style: style as any, mode } }).then((r) => ({ mode, text: r.text })),
    onSuccess: (r: any) => { setAiText((t) => ({ ...t, [r.mode]: r.text })); toast.success(`AI ${r.mode} ready`); },
    onError: (e: any) => toast.error(e?.message ?? "AI failed"),
  });

  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      report_name: reportName || report.label, report_module: report.module, report_category: report.category,
      project_id: projectId || null, report_data: { columns: report.columns, rows: report.rows },
      report_summary: report.summary, is_client_visible: clientVis,
    } }),
    onSuccess: (r: any) => { setSavedId(r.id); toast.success("Report saved"); onSaved(); qc.invalidateQueries({ queryKey: ["report-stats"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  function exportCsv() {
    const name = `${(reportName || report.label).replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
    downloadCSV(name, report.columns, report.rows);
    expFn({ data: { export_type: "CSV", file_name: name, project_id: projectId || null, saved_report_id: savedId } as any })
      .catch(() => {});
    toast.success("CSV exported");
  }

  const byStatus = report.summary?.byStatus as Record<string, number> | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileBarChart className="size-4 text-accent" /> {reportName || report.label}
          <Badge variant="secondary" className="text-[10px]">{report.category}</Badge>
          <Badge className="text-[10px] bg-accent/15 text-accent border-accent/30">AI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KPI label="Total Rows" value={report.rows.length} />
          {byStatus && Object.entries(byStatus).slice(0, 3).map(([k, v]) => <KPI key={k} label={k} value={v as number} />)}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button size="sm" onClick={exportCsv}><Download className="size-3.5" /> CSV</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-3.5" /> Print / PDF</Button>
          <div className="flex items-center gap-1"><Switch checked={clientVis} onCheckedChange={setClientVis} id="pv-cv" />
            <Label htmlFor="pv-cv" className="text-xs">Client</Label></div>
          <Button size="sm" variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save
          </Button>
        </div>

        {/* AI Section */}
        <div className="border rounded-md p-3 space-y-2 bg-accent/5 print:bg-transparent">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold flex items-center gap-1"><Sparkles className="size-4 text-accent" /> AI Analysis</span>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{["Executive","Detailed","Client-friendly","Internal","Commercial","Site","QA/QC","HSE","Procurement"].map((s) =>
                <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {(["summary","insights","recommendations","narrative"] as const).map((m) => (
              <Button key={m} size="sm" variant="outline" onClick={() => ai.mutate(m)}
                disabled={ai.isPending || !report.rows.length}>
                {ai.isPending && ai.variables === m ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {m}
              </Button>
            ))}
          </div>
          {(Object.entries(aiText) as [string, string][]).map(([k, v]) => v && (
            <div key={k} className="bg-card border rounded p-2 text-xs whitespace-pre-wrap">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold uppercase text-[10px] tracking-wider text-muted-foreground">{k}</span>
                <button onClick={() => { navigator.clipboard.writeText(v); toast.success("Copied"); }}
                  className="text-muted-foreground hover:text-foreground"><Copy className="size-3" /></button>
              </div>
              {v}
            </div>
          ))}
        </div>

        {/* Table */}
        {!report.rows.length ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <FileText className="size-6 mx-auto mb-2 opacity-50" /> No data for selected filters.
          </div>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted"><tr>
                {report.columns.map((c) => <th key={c.key} className="text-left p-2 font-semibold">{c.label}</th>)}
              </tr></thead>
              <tbody>{report.rows.slice(0, 300).map((row, i) => (
                <tr key={i} className="border-t">
                  {report.columns.map((c) => <td key={c.key} className="p-2 align-top">
                    {row[c.key] == null ? <span className="text-muted-foreground">—</span> :
                      typeof row[c.key] === "object" ? JSON.stringify(row[c.key]) :
                      String(row[c.key]).slice(0, 80)}
                  </td>)}
                </tr>
              ))}</tbody>
            </table>
            {report.rows.length > 300 && <div className="p-2 text-xs bg-muted text-muted-foreground">Showing 300 of {report.rows.length} — full data in CSV.</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded p-3 bg-card">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}

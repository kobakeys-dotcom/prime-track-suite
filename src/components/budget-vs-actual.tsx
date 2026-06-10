import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search, Download, AlertTriangle, Archive, Pencil, Eye, RefreshCw, DollarSign } from "lucide-react";
import {
  listProjectBudgets, upsertProjectBudget, archiveProjectBudget,
  listBudgetLines, upsertBudgetLine, archiveBudgetLine,
  listActualCosts, upsertActualCost, archiveActualCost,
  listCommittedCosts, upsertCommittedCost, archiveCommittedCost,
  pullCommitmentsFromPOs, getCostControlDashboard,
} from "@/lib/cost-control.functions";
import { listCostCodes } from "@/lib/cost-codes.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProjectPicker } from "@/components/project-picker";

const fmt = (n: any) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtMoney = (n: any) => `$${fmt(n)}`;
const pct = (n: any) => `${Number(n || 0).toFixed(1)}%`;

interface Props { projectId?: string; variant?: "full" | "compact" }

export function BudgetVsActual({ projectId, variant = "full" }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [onlyOver, setOnlyOver] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any | null>(null);
  const [lineDialog, setLineDialog] = useState(false);
  const [budgetDialog, setBudgetDialog] = useState(false);
  const [actualDialog, setActualDialog] = useState(false);
  const [commitDialog, setCommitDialog] = useState(false);
  const [editingLine, setEditingLine] = useState<any | null>(null);
  const [editingBudget, setEditingBudget] = useState<any | null>(null);

  const fetchLines = useServerFn(listBudgetLines);
  const fetchBudgets = useServerFn(listProjectBudgets);
  const fetchDash = useServerFn(getCostControlDashboard);
  const fetchActuals = useServerFn(listActualCosts);
  const fetchCommits = useServerFn(listCommittedCosts);
  const fetchCC = useServerFn(listCostCodes);

  const input = projectId ? { projectId } : {};
  const linesQ = useQuery({ queryKey: ["bl", projectId ?? "all"], queryFn: () => fetchLines({ data: input }) });
  const budgetsQ = useQuery({ queryKey: ["pb", projectId ?? "all"], queryFn: () => fetchBudgets({ data: input }) });
  const dashQ = useQuery({ queryKey: ["ccd", projectId ?? "all"], queryFn: () => fetchDash({ data: input }) });
  const actualsQ = useQuery({ queryKey: ["ace", projectId ?? "all"], queryFn: () => fetchActuals({ data: input }) });
  const commitsQ = useQuery({ queryKey: ["cce", projectId ?? "all"], queryFn: () => fetchCommits({ data: input }) });
  const ccQ = useQuery({ queryKey: ["cc-all"], queryFn: () => fetchCC({ data: {} }) });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["bl"] });
    qc.invalidateQueries({ queryKey: ["pb"] });
    qc.invalidateQueries({ queryKey: ["ccd"] });
    qc.invalidateQueries({ queryKey: ["ace"] });
    qc.invalidateQueries({ queryKey: ["cce"] });
  };

  const upsertLineFn = useServerFn(upsertBudgetLine);
  const upsertBudgetFn = useServerFn(upsertProjectBudget);
  const upsertActualFn = useServerFn(upsertActualCost);
  const upsertCommitFn = useServerFn(upsertCommittedCost);
  const archiveLineFn = useServerFn(archiveBudgetLine);
  const archiveBudgetFn = useServerFn(archiveProjectBudget);
  const archiveActualFn = useServerFn(archiveActualCost);
  const archiveCommitFn = useServerFn(archiveCommittedCost);
  const pullFn = useServerFn(pullCommitmentsFromPOs);

  const saveLine = useMutation({
    mutationFn: (d: any) => upsertLineFn({ data: d }),
    onSuccess: () => { toast.success("Budget line saved"); setLineDialog(false); setEditingLine(null); refreshAll(); },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });
  const saveBudget = useMutation({
    mutationFn: (d: any) => upsertBudgetFn({ data: d }),
    onSuccess: () => { toast.success("Budget saved"); setBudgetDialog(false); setEditingBudget(null); refreshAll(); },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });
  const saveActual = useMutation({
    mutationFn: (d: any) => upsertActualFn({ data: d }),
    onSuccess: () => { toast.success("Actual cost recorded"); setActualDialog(false); refreshAll(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const saveCommit = useMutation({
    mutationFn: (d: any) => upsertCommitFn({ data: d }),
    onSuccess: () => { toast.success("Commitment recorded"); setCommitDialog(false); refreshAll(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const pullPOs = useMutation({
    mutationFn: () => pullFn({ data: { projectId: projectId! } }),
    onSuccess: (r: any) => { toast.success(`Imported ${r.imported} commitment(s) from POs`); refreshAll(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const lines: any[] = linesQ.data ?? [];
  const budgets: any[] = budgetsQ.data ?? [];
  const dash: any = dashQ.data;
  const summary = dash?.summary ?? {};

  const categories = useMemo(() => Array.from(new Set(lines.map((l) => l.category).filter(Boolean))), [lines]);

  const filtered = useMemo(() => {
    return lines.filter((l) => {
      if (filterCategory !== "all" && l.category !== filterCategory) return false;
      if (onlyOver && Number(l.forecast_overrun_amount || 0) <= 0) return false;
      if (search) {
        const s = search.toLowerCase();
        if (![l.line_code, l.line_name, l.description, l.cost_codes?.code, l.cost_codes?.name, l.category, l.trade, l.discipline].some((v) => v?.toString().toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [lines, search, filterCategory, onlyOver]);

  const exportCSV = () => {
    const headers = ["Line Code", "Line Name", "Cost Code", "Category", "Original", "Approved Δ", "Revised", "Actual", "Committed", "Forecast", "CTC", "Variance", "Variance %", "Utilization %", "Status"];
    const rows = filtered.map((l) => [l.line_code, l.line_name, l.cost_codes?.code, l.category, l.original_budget, l.approved_changes, l.revised_budget, l.actual_cost, l.committed_cost, l.forecast_cost, l.cost_to_complete, l.variance_amount, l.variance_percentage, l.budget_utilization_percentage, l.status]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `budget-vs-actual-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {variant === "full" && (
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold">Budget vs Actual / Cost Control</h1>
            <p className="text-sm text-muted-foreground mt-1">Track original budget, approved changes, actual cost, commitments and forecast variance.</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Revised Budget" value={fmtMoney(summary.revised_budget)} />
        <StatCard label="Actual" value={fmtMoney(summary.actual_cost)} />
        <StatCard label="Committed" value={fmtMoney(summary.committed_cost)} />
        <StatCard label="Forecast" value={fmtMoney(summary.forecast_cost)} />
        <StatCard label="Variance" value={fmtMoney(summary.variance_amount)} tone={Number(summary.variance_amount || 0) < 0 ? "bad" : "good"} sub={pct(summary.variance_percentage)} />
        <StatCard label="Over-Budget Lines" value={summary.over_budget_lines ?? 0} tone={(summary.over_budget_lines ?? 0) > 0 ? "bad" : undefined} />
      </div>

      <Tabs defaultValue="lines">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="lines">Budget Lines ({lines.length})</TabsTrigger>
          <TabsTrigger value="budgets">Project Budgets ({budgets.length})</TabsTrigger>
          <TabsTrigger value="actuals">Actual Costs ({(actualsQ.data ?? []).length})</TabsTrigger>
          <TabsTrigger value="commits">Commitments ({(commitsQ.data ?? []).length})</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* LINES TAB */}
        <TabsContent value="lines" className="pt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lines, cost codes…" className="pl-8" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant={onlyOver ? "default" : "outline"} size="sm" onClick={() => setOnlyOver(!onlyOver)}>
              <AlertTriangle className="size-4 mr-1" /> Over budget
            </Button>
            <div className="flex-1" />
            {projectId && (
              <Button variant="outline" size="sm" onClick={() => pullPOs.mutate()} disabled={pullPOs.isPending}>
                <RefreshCw className="size-4 mr-1" /> Pull POs
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="size-4 mr-1" /> Export</Button>
            <Button size="sm" onClick={() => { setEditingLine(null); setLineDialog(true); }} disabled={!projectId && variant !== "full"}>
              <Plus className="size-4 mr-1" /> Add Line
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActualDialog(true)}><DollarSign className="size-4 mr-1" /> Actual</Button>
            <Button size="sm" variant="outline" onClick={() => setCommitDialog(true)}>+ Commitment</Button>
          </div>

          {linesQ.isLoading && <div className="text-sm text-muted-foreground p-6 text-center">Loading…</div>}
          {linesQ.error && <div className="text-sm text-rose-600 p-6 text-center">{(linesQ.error as any).message}</div>}
          {!linesQ.isLoading && filtered.length === 0 && (
            <div className="bg-card border border-border rounded-sm p-10 text-center text-sm text-muted-foreground">
              No budget lines yet. {projectId ? "Click Add Line to start tracking budget vs actual." : "Select a project to add budget lines."}
            </div>
          )}
          {filtered.length > 0 && (
            <div className="bg-card border border-border rounded-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Code</th>
                    <th className="text-left p-3">Line</th>
                    <th className="text-left p-3">Cost Code</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-right p-3">Revised</th>
                    <th className="text-right p-3">Actual</th>
                    <th className="text-right p-3">Committed</th>
                    <th className="text-right p-3">Forecast</th>
                    <th className="text-right p-3">Variance</th>
                    <th className="text-right p-3">Util%</th>
                    <th className="text-left p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const over = Number(l.forecast_overrun_amount || 0) > 0;
                    return (
                      <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{l.line_code || "—"}</td>
                        <td className="p-3 font-medium">{l.line_name}</td>
                        <td className="p-3 text-xs">{l.cost_codes ? `${l.cost_codes.code} ${l.cost_codes.name}` : "—"}</td>
                        <td className="p-3 text-xs">{l.category}</td>
                        <td className="p-3 text-right font-mono">{fmt(l.revised_budget)}</td>
                        <td className="p-3 text-right font-mono">{fmt(l.actual_cost)}</td>
                        <td className="p-3 text-right font-mono">{fmt(l.committed_cost)}</td>
                        <td className="p-3 text-right font-mono">{fmt(l.forecast_cost)}</td>
                        <td className={`p-3 text-right font-mono ${over ? "text-rose-600 font-semibold" : "text-emerald-600"}`}>
                          {over && <AlertTriangle className="size-3 inline mr-1" />}{fmt(l.variance_amount)}
                        </td>
                        <td className="p-3 text-right font-mono text-xs">{pct(l.budget_utilization_percentage)}</td>
                        <td className="p-3 text-xs"><span className="inline-block px-2 py-0.5 rounded bg-muted">{l.status}</span></td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <Button size="icon" variant="ghost" onClick={() => setSelectedLine(l)}><Eye className="size-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { setEditingLine(l); setLineDialog(true); }}><Pencil className="size-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Archive this budget line?")) archiveLineFn({ data: { id: l.id } }).then(() => { toast.success("Archived"); refreshAll(); }); }}>
                            <Archive className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* BUDGETS TAB */}
        <TabsContent value="budgets" className="pt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingBudget(null); setBudgetDialog(true); }}><Plus className="size-4 mr-1" /> New Budget</Button>
          </div>
          <div className="bg-card border border-border rounded-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Name</th>
                  {!projectId && <th className="text-left p-3">Project</th>}
                  <th className="text-left p-3">Version</th>
                  <th className="text-right p-3">Original</th>
                  <th className="text-right p-3">Revised</th>
                  <th className="text-right p-3">Actual</th>
                  <th className="text-right p-3">Forecast</th>
                  <th className="text-right p-3">Variance</th>
                  <th className="text-left p-3">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {budgets.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-sm text-muted-foreground">No budgets yet.</td></tr>}
                {budgets.map((b) => (
                  <tr key={b.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{b.budget_name}</td>
                    {!projectId && <td className="p-3 text-xs">{b.projects?.name}</td>}
                    <td className="p-3 text-xs">{b.budget_version}</td>
                    <td className="p-3 text-right font-mono">{fmt(b.original_budget)}</td>
                    <td className="p-3 text-right font-mono">{fmt(b.revised_budget)}</td>
                    <td className="p-3 text-right font-mono">{fmt(b.actual_cost)}</td>
                    <td className="p-3 text-right font-mono">{fmt(b.forecast_cost)}</td>
                    <td className={`p-3 text-right font-mono ${Number(b.variance_amount) < 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmt(b.variance_amount)}</td>
                    <td className="p-3 text-xs">{b.status}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingBudget(b); setBudgetDialog(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Archive this budget?")) archiveBudgetFn({ data: { id: b.id } }).then(() => { toast.success("Archived"); refreshAll(); }); }}>
                        <Archive className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ACTUALS TAB */}
        <TabsContent value="actuals" className="pt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setActualDialog(true)}><Plus className="size-4 mr-1" /> Add Actual Cost</Button>
          </div>
          <EntriesTable rows={actualsQ.data ?? []} dateField="cost_date" refField="invoice_number" onArchive={(id) => archiveActualFn({ data: { id } }).then(() => { toast.success("Archived"); refreshAll(); })} />
        </TabsContent>

        {/* COMMITS TAB */}
        <TabsContent value="commits" className="pt-4 space-y-3">
          <div className="flex justify-end gap-2">
            {projectId && <Button size="sm" variant="outline" onClick={() => pullPOs.mutate()} disabled={pullPOs.isPending}><RefreshCw className="size-4 mr-1" /> Pull from POs</Button>}
            <Button size="sm" onClick={() => setCommitDialog(true)}><Plus className="size-4 mr-1" /> Add Commitment</Button>
          </div>
          <EntriesTable rows={commitsQ.data ?? []} dateField="commitment_date" refField="po_number" onArchive={(id) => archiveCommitFn({ data: { id } }).then(() => { toast.success("Archived"); refreshAll(); })} />
        </TabsContent>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="pt-4 space-y-4">
          <div className="bg-card border border-border rounded-sm p-4">
            <h3 className="font-semibold mb-3 text-sm">By Category</h3>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="text-left p-2">Category</th><th className="text-right p-2">Budget</th><th className="text-right p-2">Actual</th><th className="text-right p-2">Committed</th><th className="text-right p-2">Forecast</th><th className="text-right p-2">Variance</th></tr></thead>
              <tbody>
                {(dash?.by_category ?? []).map((c: any) => {
                  const v = c.budget - c.forecast;
                  return (
                    <tr key={c.category} className="border-t border-border">
                      <td className="p-2 font-medium">{c.category}</td>
                      <td className="p-2 text-right font-mono">{fmt(c.budget)}</td>
                      <td className="p-2 text-right font-mono">{fmt(c.actual)}</td>
                      <td className="p-2 text-right font-mono">{fmt(c.committed)}</td>
                      <td className="p-2 text-right font-mono">{fmt(c.forecast)}</td>
                      <td className={`p-2 text-right font-mono ${v < 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmt(v)}</td>
                    </tr>
                  );
                })}
                {(dash?.by_category ?? []).length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground text-xs">No data</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="bg-card border border-border rounded-sm p-4">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><AlertTriangle className="size-4 text-rose-600" /> Over-Budget Lines</h3>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="text-left p-2">Line</th><th className="text-right p-2">Revised</th><th className="text-right p-2">Forecast</th><th className="text-right p-2">Overrun</th></tr></thead>
              <tbody>
                {(dash?.over_budget_lines ?? []).map((l: any) => (
                  <tr key={l.id} className="border-t border-border"><td className="p-2 font-medium">{l.line_name}</td><td className="p-2 text-right font-mono">{fmt(l.revised_budget)}</td><td className="p-2 text-right font-mono">{fmt(l.forecast_cost)}</td><td className="p-2 text-right font-mono text-rose-600 font-semibold">{fmt(l.forecast_overrun_amount)}</td></tr>
                ))}
                {(dash?.over_budget_lines ?? []).length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground text-xs">All lines within budget</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail sheet */}
      <Sheet open={!!selectedLine} onOpenChange={(o) => !o && setSelectedLine(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{selectedLine?.line_name}</SheetTitle></SheetHeader>
          {selectedLine && (
            <div className="space-y-3 mt-4 text-sm">
              <Field label="Line Code" value={selectedLine.line_code || "—"} />
              <Field label="Cost Code" value={selectedLine.cost_codes ? `${selectedLine.cost_codes.code} ${selectedLine.cost_codes.name}` : "—"} />
              <Field label="Category / Trade" value={`${selectedLine.category} / ${selectedLine.trade || "—"}`} />
              <Field label="Description" value={selectedLine.description || "—"} />
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <Field label="Original" value={fmtMoney(selectedLine.original_budget)} />
                <Field label="Approved Changes" value={fmtMoney(selectedLine.approved_changes)} />
                <Field label="Revised Budget" value={fmtMoney(selectedLine.revised_budget)} />
                <Field label="Actual" value={fmtMoney(selectedLine.actual_cost)} />
                <Field label="Committed" value={fmtMoney(selectedLine.committed_cost)} />
                <Field label="Cost to Complete" value={fmtMoney(selectedLine.cost_to_complete)} />
                <Field label="Forecast" value={fmtMoney(selectedLine.forecast_cost)} />
                <Field label="Variance" value={`${fmtMoney(selectedLine.variance_amount)} (${pct(selectedLine.variance_percentage)})`} />
                <Field label="Utilization" value={pct(selectedLine.budget_utilization_percentage)} />
                <Field label="Overrun" value={fmtMoney(selectedLine.forecast_overrun_amount)} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Line dialog */}
      <LineDialog open={lineDialog} onOpenChange={setLineDialog} initial={editingLine} projectId={projectId} budgets={budgets} costCodes={ccQ.data ?? []} onSave={(d) => saveLine.mutate(d)} saving={saveLine.isPending} />
      <BudgetDialog open={budgetDialog} onOpenChange={setBudgetDialog} initial={editingBudget} projectId={projectId} onSave={(d) => saveBudget.mutate(d)} saving={saveBudget.isPending} />
      <EntryDialog open={actualDialog} onOpenChange={setActualDialog} kind="actual" projectId={projectId} lines={lines} costCodes={ccQ.data ?? []} onSave={(d) => saveActual.mutate(d)} saving={saveActual.isPending} />
      <EntryDialog open={commitDialog} onOpenChange={setCommitDialog} kind="commit" projectId={projectId} lines={lines} costCodes={ccQ.data ?? []} onSave={(d) => saveCommit.mutate(d)} saving={saveCommit.isPending} />
    </div>
  );
}

function StatCard({ label, value, sub, tone }: { label: string; value: any; sub?: string; tone?: "good" | "bad" }) {
  const color = tone === "bad" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : "";
  return (
    <div className="bg-card border border-border rounded-sm p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-xl font-display font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function EntriesTable({ rows, dateField, refField, onArchive }: { rows: any[]; dateField: string; refField: string; onArchive: (id: string) => void }) {
  if (rows.length === 0) return <div className="bg-card border border-border rounded-sm p-8 text-center text-sm text-muted-foreground">No entries</div>;
  return (
    <div className="bg-card border border-border rounded-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="text-left p-3">Date</th>
            <th className="text-left p-3">Description</th>
            <th className="text-left p-3">Budget Line</th>
            <th className="text-left p-3">Supplier</th>
            <th className="text-left p-3">Ref</th>
            <th className="text-right p-3">Amount</th>
            <th className="text-left p-3">Source</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border hover:bg-muted/30">
              <td className="p-3 text-xs">{r[dateField]}</td>
              <td className="p-3 font-medium">{r.description}</td>
              <td className="p-3 text-xs">{r.budget_lines?.line_name || "—"}</td>
              <td className="p-3 text-xs">{r.supplier_name || "—"}</td>
              <td className="p-3 text-xs font-mono">{r[refField] || "—"}</td>
              <td className="p-3 text-right font-mono">{fmt(r.amount)}</td>
              <td className="p-3 text-xs"><span className="inline-block px-2 py-0.5 rounded bg-muted text-[10px]">{r.source_module}</span></td>
              <td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => { if (confirm("Archive entry?")) onArchive(r.id); }}><Archive className="size-4" /></Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LineDialog({ open, onOpenChange, initial, projectId, budgets, costCodes, onSave, saving }: any) {
  const [form, setForm] = useState<any>({});
  const [pid, setPid] = useState<string>(projectId || "");
  useMemo(() => {
    if (open) {
      setForm(initial || { category: "General", cost_type: "Direct Cost", status: "Active", original_budget: 0, approved_changes: 0, cost_to_complete: 0 });
      setPid(initial?.project_id || projectId || "");
    }
  }, [open, initial, projectId]);
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const submit = () => {
    if (!pid) return toast.error("Select a project");
    if (!form.line_name) return toast.error("Line name required");
    onSave({
      ...form, project_id: pid,
      original_budget: Number(form.original_budget) || 0,
      approved_changes: Number(form.approved_changes) || 0,
      cost_to_complete: Number(form.cost_to_complete) || 0,
      cost_code_id: form.cost_code_id || null,
      project_budget_id: form.project_budget_id || null,
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit" : "New"} Budget Line</DialogTitle><DialogDescription>Track budget, actual, and forecast at the line level.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {!projectId && <div><Label>Project</Label><ProjectPicker value={pid} onChange={setPid} /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Line Code</Label><Input value={form.line_code ?? ""} onChange={(e) => upd("line_code", e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={form.status ?? "Active"} onValueChange={(v) => upd("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Active", "On Hold", "Completed", "Cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Line Name *</Label><Input value={form.line_name ?? ""} onChange={(e) => upd("line_name", e.target.value)} /></div>
          <div><Label>Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => upd("description", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cost Code</Label>
              <Select value={form.cost_code_id ?? "none"} onValueChange={(v) => upd("cost_code_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{costCodes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Budget</Label>
              <Select value={form.project_budget_id ?? "none"} onValueChange={(v) => upd("project_budget_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{budgets.filter((b: any) => !pid || b.project_id === pid).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.budget_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label><Input value={form.category ?? ""} onChange={(e) => upd("category", e.target.value)} /></div>
            <div><Label>Trade</Label><Input value={form.trade ?? ""} onChange={(e) => upd("trade", e.target.value)} /></div>
            <div><Label>Discipline</Label><Input value={form.discipline ?? ""} onChange={(e) => upd("discipline", e.target.value)} /></div>
            <div><Label>Cost Type</Label>
              <Select value={form.cost_type ?? "Direct Cost"} onValueChange={(v) => upd("cost_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Direct Cost", "Indirect Cost", "Overhead", "Subcontract", "Material", "Labor", "Equipment", "Other"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Original Budget</Label><Input type="number" value={form.original_budget ?? 0} onChange={(e) => upd("original_budget", e.target.value)} /></div>
            <div><Label>Approved Changes</Label><Input type="number" value={form.approved_changes ?? 0} onChange={(e) => upd("approved_changes", e.target.value)} /></div>
            <div><Label>Cost to Complete</Label><Input type="number" value={form.cost_to_complete ?? 0} onChange={(e) => upd("cost_to_complete", e.target.value)} /></div>
          </div>
          <div><Label>Remarks</Label><Textarea rows={2} value={form.remarks ?? ""} onChange={(e) => upd("remarks", e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BudgetDialog({ open, onOpenChange, initial, projectId, onSave, saving }: any) {
  const [form, setForm] = useState<any>({});
  const [pid, setPid] = useState<string>(projectId || "");
  useMemo(() => {
    if (open) {
      setForm(initial || { budget_name: "Main Project Budget", budget_version: "Original", status: "Active", original_budget: 0, approved_changes: 0, cost_to_complete: 0 });
      setPid(initial?.project_id || projectId || "");
    }
  }, [open, initial, projectId]);
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const submit = () => {
    if (!pid) return toast.error("Select a project");
    if (!form.budget_name) return toast.error("Name required");
    onSave({ ...form, project_id: pid, original_budget: Number(form.original_budget) || 0, approved_changes: Number(form.approved_changes) || 0, cost_to_complete: Number(form.cost_to_complete) || 0 });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit" : "New"} Project Budget</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {!projectId && <div><Label>Project</Label><ProjectPicker value={pid} onChange={setPid} /></div>}
          <div><Label>Budget Name *</Label><Input value={form.budget_name ?? ""} onChange={(e) => upd("budget_name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Version</Label><Input value={form.budget_version ?? ""} onChange={(e) => upd("budget_version", e.target.value)} /></div>
            <div><Label>Status</Label><Input value={form.status ?? ""} onChange={(e) => upd("status", e.target.value)} /></div>
            <div><Label>Original Budget</Label><Input type="number" value={form.original_budget ?? 0} onChange={(e) => upd("original_budget", e.target.value)} /></div>
            <div><Label>Approved Changes</Label><Input type="number" value={form.approved_changes ?? 0} onChange={(e) => upd("approved_changes", e.target.value)} /></div>
          </div>
          <div><Label>Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => upd("description", e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EntryDialog({ open, onOpenChange, kind, projectId, lines, costCodes, onSave, saving }: any) {
  const [form, setForm] = useState<any>({});
  const [pid, setPid] = useState<string>(projectId || "");
  useMemo(() => { if (open) { setForm({ amount: 0, currency: "MVR" }); setPid(projectId || ""); } }, [open, projectId]);
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const dateKey = kind === "actual" ? "cost_date" : "commitment_date";
  const refKey = kind === "actual" ? "invoice_number" : "po_number";
  const submit = () => {
    if (!pid) return toast.error("Select a project");
    if (!form.description) return toast.error("Description required");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Amount must be > 0");
    onSave({
      project_id: pid,
      [dateKey]: form[dateKey] || new Date().toISOString().slice(0, 10),
      description: form.description, supplier_name: form.supplier_name || null,
      [refKey]: form[refKey] || null,
      amount: Number(form.amount),
      currency: form.currency,
      budget_line_id: form.budget_line_id || null,
      cost_code_id: form.cost_code_id || null,
      source_module: "Manual",
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{kind === "actual" ? "Add Actual Cost" : "Add Commitment"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {!projectId && <div><Label>Project</Label><ProjectPicker value={pid} onChange={setPid} /></div>}
          <div><Label>Description *</Label><Input value={form.description ?? ""} onChange={(e) => upd("description", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{kind === "actual" ? "Cost Date" : "Commitment Date"}</Label><Input type="date" value={form[dateKey] ?? ""} onChange={(e) => upd(dateKey, e.target.value)} /></div>
            <div><Label>Amount *</Label><Input type="number" value={form.amount ?? 0} onChange={(e) => upd("amount", e.target.value)} /></div>
            <div><Label>Supplier</Label><Input value={form.supplier_name ?? ""} onChange={(e) => upd("supplier_name", e.target.value)} /></div>
            <div><Label>{kind === "actual" ? "Invoice #" : "PO #"}</Label><Input value={form[refKey] ?? ""} onChange={(e) => upd(refKey, e.target.value)} /></div>
            <div className="col-span-2"><Label>Budget Line</Label>
              <Select value={form.budget_line_id ?? "none"} onValueChange={(v) => upd("budget_line_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{lines.filter((l: any) => !pid || l.project_id === pid).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.line_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Cost Code</Label>
              <Select value={form.cost_code_id ?? "none"} onValueChange={(v) => upd("cost_code_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{costCodes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

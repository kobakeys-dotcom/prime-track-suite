import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search, Download, Pencil, Archive, Eye, AlertTriangle, FolderTree } from "lucide-react";
import { listCostCodes, createCostCode, updateCostCode, archiveCostCode, getCostCode } from "@/lib/cost-codes.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProjectPicker } from "@/components/project-picker";

export const Route = createFileRoute("/_authenticated/cost-codes")({
  head: () => ({ meta: [{ title: "Cost Codes — ProjectCore" }] }),
  component: CostCodesPage,
});

const CATEGORIES = ["General","Preliminaries","Civil Works","Structural Works","Architectural Works","MEP Works","Electrical","Plumbing","HVAC","Fire System","Finishing Works","External Works","Procurement","Labour","Equipment","Subcontractor","Consultant","Finance","Variation","Handover"];
const COST_TYPES = ["Direct Cost","Indirect Cost","Labour","Material","Equipment","Subcontractor","Overhead","Preliminaries","Contingency","Variation","Provisional Sum"];
const STATUSES = ["active","inactive","closed"];

const fmt = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-zinc-100 text-zinc-700",
  closed: "bg-zinc-200 text-zinc-600",
};

function CostCodesPage() {
  const qc = useQueryClient();
  const fetcher = useServerFn(listCostCodes);
  const { data: rows = [], isLoading, error } = useQuery({ queryKey: ["cost-codes"], queryFn: () => fetcher({ data: {} }) });

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [overBudget, setOverBudget] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r: any) => {
      if (catFilter !== "all" && r.category !== catFilter) return false;
      if (typeFilter !== "all" && r.cost_type !== typeFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (overBudget && !r.over_budget) return false;
      if (!q) return true;
      return [r.code, r.name, r.description, r.category, r.trade, r.discipline, r.cost_type]
        .some((v) => (v ?? "").toString().toLowerCase().includes(q));
    });
  }, [rows, search, catFilter, typeFilter, statusFilter, overBudget]);

  const stats = useMemo(() => {
    let budget = 0, actual = 0, committed = 0, forecast = 0, over = 0, boq = 0;
    for (const r of filtered as any[]) {
      budget += Number(r.budget_amount); actual += Number(r.actual_amount);
      committed += Number(r.committed_amount); forecast += r.forecast_amount_effective;
      boq += r.boq_amount; if (r.over_budget) over += 1;
    }
    return { budget, actual, committed, forecast, variance: budget - forecast, over, boq, active: filtered.length };
  }, [filtered]);

  // Build hierarchy: roots first, then children
  const tree = useMemo(() => {
    const byId = new Map(filtered.map((r: any) => [r.id, r]));
    const roots: any[] = [];
    const childMap = new Map<string, any[]>();
    for (const r of filtered as any[]) {
      if (r.parent_id && byId.has(r.parent_id)) {
        if (!childMap.has(r.parent_id)) childMap.set(r.parent_id, []);
        childMap.get(r.parent_id)!.push(r);
      } else {
        roots.push(r);
      }
    }
    const out: { row: any; depth: number }[] = [];
    function walk(node: any, depth: number) {
      out.push({ row: node, depth });
      for (const c of childMap.get(node.id) ?? []) walk(c, depth + 1);
    }
    for (const r of roots) walk(r, 0);
    return out;
  }, [filtered]);

  function exportCsv() {
    const headers = ["Code","Name","Category","Cost Type","Trade","Discipline","Budget","Actual","Committed","Forecast","Variance","Variance %","Status"];
    const lines = [headers.join(",")];
    for (const r of filtered as any[]) {
      lines.push([r.code, `"${(r.name ?? "").replace(/"/g,'""')}"`, r.category, r.cost_type, r.trade ?? "", r.discipline ?? "",
        r.budget_amount, r.actual_amount, r.committed_amount, r.forecast_amount_effective, r.variance_amount, r.variance_pct, r.status].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `cost-codes-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows`);
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Cost Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">Cost code structure with budget, committed, actual and forecast tracking.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}><Download className="size-4" /> Export</Button>
          <Button size="sm" className="bg-accent text-white hover:bg-accent/90" onClick={() => setOpenNew(true)}><Plus className="size-4" /> New Cost Code</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Stat label="Active" value={String(stats.active)} />
        <Stat label="Budget" value={fmt(stats.budget)} />
        <Stat label="Actual" value={fmt(stats.actual)} />
        <Stat label="Committed" value={fmt(stats.committed)} />
        <Stat label="Forecast" value={fmt(stats.forecast)} />
        <Stat label="Over Budget" value={String(stats.over)} accent={stats.over > 0 ? "warn" : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, trade…" className="pl-8 h-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cost types</SelectItem>
            {COST_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant={overBudget ? "default" : "outline"} onClick={() => setOverBudget(!overBudget)}>
          <AlertTriangle className="size-3.5" /> Over budget
        </Button>
      </div>

      {error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-sm p-6 text-sm text-rose-700">{(error as any)?.message ?? "Failed to load"}</div>
      ) : isLoading ? (
        <div className="bg-card border border-border rounded-sm p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-sm p-12 text-center">
          <FolderTree className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No cost codes{rows.length > 0 ? " matching filters" : " yet"}</p>
          <p className="text-xs text-muted-foreground mt-1">Create cost codes to classify and control project costs.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Code</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-right px-3 py-2">Budget</th>
                  <th className="text-right px-3 py-2">Actual</th>
                  <th className="text-right px-3 py-2">Committed</th>
                  <th className="text-right px-3 py-2">Forecast</th>
                  <th className="text-right px-3 py-2">Variance</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {tree.map(({ row: r, depth }) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap" style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}>
                      {depth > 0 && <span className="text-muted-foreground mr-1">└</span>}{r.code}
                    </td>
                    <td className="px-3 py-2">
                      <button className="text-left hover:underline" onClick={() => setDetailId(r.id)}>{r.name}</button>
                      {r.over_budget && <AlertTriangle className="inline ml-1 size-3 text-amber-600" />}
                      {r.project_name && <div className="text-[10px] text-muted-foreground">{r.project_name}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.category}</td>
                    <td className="px-3 py-2 text-xs">{r.cost_type}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmt(r.budget_amount)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmt(r.actual_amount)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmt(r.committed_amount + r.po_committed)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmt(r.forecast_amount_effective)}</td>
                    <td className={`px-3 py-2 text-right font-mono text-xs ${r.variance_amount < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      {fmt(r.variance_amount)} <span className="text-[10px] text-muted-foreground">({r.variance_pct.toFixed(0)}%)</span>
                    </td>
                    <td className="px-3 py-2"><span className={`text-[10px] px-2 py-0.5 rounded ${STATUS_STYLES[r.status] ?? ""}`}>{r.status}</span></td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailId(r.id)}><Eye className="size-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UpsertDialog open={openNew} onOpenChange={setOpenNew} parents={rows} onSaved={() => qc.invalidateQueries({ queryKey: ["cost-codes"] })} />
      {detailId && <DetailSheet id={detailId} onClose={() => setDetailId(null)} parents={rows} onChanged={() => qc.invalidateQueries({ queryKey: ["cost-codes"] })} />}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "warn" }) {
  return (
    <div className={`bg-card border rounded-sm p-3 ${accent === "warn" ? "border-amber-300" : "border-border"}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-display font-bold truncate">{value}</p>
    </div>
  );
}

function UpsertDialog({ open, onOpenChange, parents, onSaved, initial }:
  { open: boolean; onOpenChange: (v: boolean) => void; parents: any[]; onSaved: () => void; initial?: any }) {
  const create = useServerFn(createCostCode);
  const update = useServerFn(updateCostCode);
  const empty = { project_id: "", parent_id: "", code: "", name: "", description: "", category: "General", cost_type: "Direct Cost", trade: "", discipline: "", budget_amount: "", actual_amount: "", committed_amount: "", forecast_amount: "", status: "active", sort_order: "0" };
  const [f, setF] = useState<any>(initial ? {
    ...empty, ...initial,
    project_id: initial.project_id ?? "", parent_id: initial.parent_id ?? "",
    description: initial.description ?? "", trade: initial.trade ?? "", discipline: initial.discipline ?? "",
    budget_amount: String(initial.budget_amount ?? ""), actual_amount: String(initial.actual_amount ?? ""),
    committed_amount: String(initial.committed_amount ?? ""), forecast_amount: String(initial.forecast_amount ?? ""),
    sort_order: String(initial.sort_order ?? 0),
  } : empty);

  const mut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: f.code.trim(), name: f.name.trim(),
        description: f.description || null, category: f.category, cost_type: f.cost_type,
        trade: f.trade || null, discipline: f.discipline || null,
        project_id: f.project_id || null, parent_id: f.parent_id || null,
        budget_amount: Number(f.budget_amount) || 0, actual_amount: Number(f.actual_amount) || 0,
        committed_amount: Number(f.committed_amount) || 0, forecast_amount: Number(f.forecast_amount) || 0,
        status: f.status, sort_order: Number(f.sort_order) || 0,
      };
      if (initial) { await update({ data: { ...payload, id: initial.id } }); }
      else { await create({ data: payload }); }
    },
    onSuccess: () => { toast.success(initial ? "Updated" : "Created"); onSaved(); onOpenChange(false); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit cost code" : "New cost code"}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!f.code || !f.name) return toast.error("Code and name required"); mut.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Code *</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="2100" required /></div>
            <div><Label>Name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Excavation" required /></div>
          </div>
          <div><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category *</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cost Type *</Label>
              <Select value={f.cost_type} onValueChange={(v) => setF({ ...f, cost_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COST_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Trade</Label><Input value={f.trade} onChange={(e) => setF({ ...f, trade: e.target.value })} /></div>
            <div><Label>Discipline</Label><Input value={f.discipline} onChange={(e) => setF({ ...f, discipline: e.target.value })} /></div>
            <div><Label>Sort order</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Parent code</Label>
              <Select value={f.parent_id || "none"} onValueChange={(v) => setF({ ...f, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent</SelectItem>
                  {parents.filter((p) => p.id !== initial?.id).map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project (optional)</Label>
              <ProjectPicker value={f.project_id} onChange={(v) => setF({ ...f, project_id: v })} placeholder="Company-wide" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div><Label>Budget</Label><Input type="number" step="0.01" value={f.budget_amount} onChange={(e) => setF({ ...f, budget_amount: e.target.value })} /></div>
            <div><Label>Actual</Label><Input type="number" step="0.01" value={f.actual_amount} onChange={(e) => setF({ ...f, actual_amount: e.target.value })} /></div>
            <div><Label>Committed</Label><Input type="number" step="0.01" value={f.committed_amount} onChange={(e) => setF({ ...f, committed_amount: e.target.value })} /></div>
            <div><Label>Forecast</Label><Input type="number" step="0.01" value={f.forecast_amount} onChange={(e) => setF({ ...f, forecast_amount: e.target.value })} placeholder="auto" /></div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">{mut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DetailSheet({ id, onClose, parents, onChanged }: { id: string; onClose: () => void; parents: any[]; onChanged: () => void }) {
  const fetcher = useServerFn(getCostCode);
  const arch = useServerFn(archiveCostCode);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["cost-code", id], queryFn: () => fetcher({ data: { id } }) });
  const [edit, setEdit] = useState(false);
  const item = data?.item;

  const archMut = useMutation({
    mutationFn: () => arch({ data: { id } }),
    onSuccess: () => { toast.success("Archived"); onChanged(); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle className="pr-8">{isLoading ? "Loading…" : `${item?.code} — ${item?.name}`}</SheetTitle></SheetHeader>
        {item && (
          <div className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-muted px-2 py-0.5 rounded">{item.category}</span>
              <span className="bg-muted px-2 py-0.5 rounded">{item.cost_type}</span>
              <span className={`px-2 py-0.5 rounded ${STATUS_STYLES[item.status] ?? ""}`}>{item.status}</span>
              {item.over_budget && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">Over budget</span>}
              {item.project_name && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">{item.project_name}</span>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEdit(true)}><Pencil className="size-4" /> Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { if (confirm("Archive this cost code?")) archMut.mutate(); }}><Archive className="size-4" /> Archive</Button>
            </div>
            {item.description && <p className="text-sm whitespace-pre-wrap">{item.description}</p>}
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="boq">BOQ ({data?.boq.length ?? 0})</TabsTrigger>
                <TabsTrigger value="po">POs ({data?.pos.length ?? 0})</TabsTrigger>
                <TabsTrigger value="children">Children ({data?.children.length ?? 0})</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="pt-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <F label="Budget" value={fmt(item.budget_amount)} />
                  <F label="Actual" value={fmt(item.actual_amount)} />
                  <F label="Committed (manual)" value={fmt(item.committed_amount)} />
                  <F label="PO committed" value={fmt(item.po_committed)} />
                  <F label="Forecast" value={fmt(item.forecast_amount_effective)} />
                  <F label="Variance" value={`${fmt(item.variance_amount)} (${item.variance_pct.toFixed(1)}%)`} />
                  <F label="Utilization" value={`${item.utilization_pct.toFixed(1)}%`} />
                  <F label="Linked BOQ value" value={fmt(item.boq_amount)} />
                  <F label="Trade" value={item.trade ?? "—"} />
                  <F label="Discipline" value={item.discipline ?? "—"} />
                </div>
              </TabsContent>
              <TabsContent value="boq" className="pt-3">
                {data?.boq.length === 0 ? <p className="text-sm text-muted-foreground">No BOQ items linked.</p> : (
                  <ul className="space-y-2">
                    {data?.boq.map((b: any) => (
                      <li key={b.id} className="border border-border rounded p-2 text-sm flex justify-between gap-2">
                        <div><span className="font-mono text-xs">{b.item_code ?? "—"}</span> {b.description}<div className="text-xs text-muted-foreground">{b.projects?.name}</div></div>
                        <div className="text-right font-mono text-xs">{fmt(Number(b.quantity) * Number(b.unit_rate))}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
              <TabsContent value="po" className="pt-3">
                {data?.pos.length === 0 ? <p className="text-sm text-muted-foreground">No purchase orders linked.</p> : (
                  <ul className="space-y-2">
                    {data?.pos.map((p: any) => (
                      <li key={p.id} className="border border-border rounded p-2 text-sm flex justify-between">
                        <div><span className="font-mono text-xs">{p.po_number}</span> <span className="text-xs text-muted-foreground">· {p.status}</span></div>
                        <div className="font-mono text-xs">{fmt(p.total_amount)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
              <TabsContent value="children" className="pt-3">
                {data?.children.length === 0 ? <p className="text-sm text-muted-foreground">No child cost codes.</p> : (
                  <ul className="space-y-2">
                    {data?.children.map((c: any) => (
                      <li key={c.id} className="border border-border rounded p-2 text-sm flex justify-between">
                        <div><span className="font-mono text-xs">{c.code}</span> {c.name}</div>
                        <div className="font-mono text-xs">{fmt(c.budget_amount)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
        {edit && item && (
          <UpsertDialog open onOpenChange={() => setEdit(false)} parents={parents} initial={item}
            onSaved={() => { setEdit(false); qc.invalidateQueries({ queryKey: ["cost-code", id] }); onChanged(); }} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function F({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

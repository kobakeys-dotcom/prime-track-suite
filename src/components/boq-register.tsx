import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search, Upload, Download, Calculator, AlertTriangle, Archive, Pencil, TrendingUp, Eye } from "lucide-react";
import {
  listBoqItems, createBoqItem, updateBoqItem, archiveBoqItem,
  updateBoqProgress, importBoqRows, getBoqItem,
} from "@/lib/boq.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProjectPicker } from "@/components/project-picker";

type Variant = "full" | "compact";
const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtMoney = (n: number) => `$${fmt(n)}`;

const STATUS_STYLES: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
};

interface Props { projectId?: string; variant?: Variant; }

export function BoqRegister({ projectId, variant = "full" }: Props) {
  const qc = useQueryClient();
  const fetcher = useServerFn(listBoqItems);
  const key = ["boq", projectId ?? "all"];
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => fetcher({ data: projectId ? { projectId } : {} }),
  });

  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [progressFilter, setProgressFilter] = useState<string>("all");
  const [openNew, setOpenNew] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const sections = useMemo(() => Array.from(new Set(rows.map((r: any) => r.section).filter(Boolean))) as string[], [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r: any) => {
      if (sectionFilter !== "all" && (r.section ?? "") !== sectionFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (progressFilter === "completed" && r.progress_pct < 100) return false;
      if (progressFilter === "pending" && r.progress_pct >= 100) return false;
      if (progressFilter === "overrun" && !r.is_overrun) return false;
      if (!q) return true;
      return [r.item_code, r.item_number, r.description, r.section, r.trade, r.discipline, r.location]
        .some((v) => (v ?? "").toString().toLowerCase().includes(q));
    });
  }, [rows, search, sectionFilter, statusFilter, progressFilter]);

  const stats = useMemo(() => {
    let total = 0, claimed = 0, certified = 0, balance = 0, done = 0, overrun = 0;
    for (const r of filtered as any[]) {
      total += r.revised_amount;
      claimed += r.claimed_amount;
      certified += r.certified_amount;
      balance += (r.revised_amount - r.claimed_amount);
      if (r.progress_pct >= 100) done += 1;
      if (r.is_overrun) overrun += 1;
    }
    return { total, claimed, certified, balance, done, overrun, overall: total > 0 ? (claimed / total) * 100 : 0 };
  }, [filtered]);

  const grouped = useMemo(() => {
    const g = new Map<string, any[]>();
    for (const r of filtered as any[]) {
      const k = r.section ?? "(Unsectioned)";
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(r);
    }
    return Array.from(g.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function exportCsv() {
    const headers = ["Item No","Code","Section","Description","Unit","Qty","Rate","Amount","Done","Certified","Balance","Progress %","Claimed","Certified $","Status"];
    const lines = [headers.join(",")];
    for (const r of filtered as any[]) {
      lines.push([
        r.item_number ?? "", r.item_code ?? "", r.section ?? "", `"${(r.description ?? "").replace(/"/g,'""')}"`,
        r.unit ?? "", r.quantity, r.unit_rate, r.amount, r.completed_qty, r.certified_qty,
        r.balance_qty, r.progress_pct, r.claimed_amount, r.certified_amount, r.status,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `boq-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows`);
  }

  if (error) return <ErrState msg={(error as any)?.message ?? "Failed to load BOQ"} />;

  return (
    <div className="space-y-4">
      {variant === "full" && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Stat label="Contract" value={fmtMoney(stats.total)} />
          <Stat label="Claimed" value={fmtMoney(stats.claimed)} />
          <Stat label="Certified" value={fmtMoney(stats.certified)} />
          <Stat label="Balance" value={fmtMoney(stats.balance)} />
          <Stat label="Progress" value={`${stats.overall.toFixed(1)}%`} />
          <Stat label="Done / Overrun" value={`${stats.done} / ${stats.overrun}`} accent={stats.overrun > 0 ? "warn" : undefined} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, description, trade…" className="pl-8 h-9" />
        </div>
        {sections.length > 0 && (
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={progressFilter} onValueChange={setProgressFilter}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All progress</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overrun">Overrun</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}><Download className="size-4" /> Export</Button>
          <Button variant="outline" size="sm" onClick={() => setOpenImport(true)}><Upload className="size-4" /> Import</Button>
          <Button size="sm" className="bg-accent text-white hover:bg-accent/90" onClick={() => setOpenNew(true)}><Plus className="size-4" /> New Item</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-card border border-border rounded-sm p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-sm p-12 text-center">
          <Calculator className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No BOQ items{rows.length > 0 ? " matching filters" : " yet"}</p>
          <p className="text-xs text-muted-foreground mt-1">Create items manually or import from CSV.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([section, items]) => {
            const sTot = items.reduce((s, r) => s + r.revised_amount, 0);
            const sClaim = items.reduce((s, r) => s + r.claimed_amount, 0);
            const sPct = sTot > 0 ? (sClaim / sTot) * 100 : 0;
            return (
              <div key={section} className="bg-card border border-border rounded-sm overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="font-semibold text-sm">{section} <span className="text-xs text-muted-foreground font-normal">({items.length} items)</span></div>
                  <div className="text-xs flex gap-4">
                    <span>Contract: <b>{fmtMoney(sTot)}</b></span>
                    <span>Claimed: <b>{fmtMoney(sClaim)}</b></span>
                    <span>Progress: <b>{sPct.toFixed(1)}%</b></span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="text-[10px] uppercase tracking-widest text-muted-foreground bg-muted/20">
                      <tr>
                        <th className="text-left px-3 py-2">Code</th>
                        <th className="text-left px-3 py-2">Description</th>
                        <th className="text-right px-3 py-2">Unit</th>
                        <th className="text-right px-3 py-2">Qty</th>
                        <th className="text-right px-3 py-2">Rate</th>
                        <th className="text-right px-3 py-2">Amount</th>
                        <th className="text-right px-3 py-2">Done</th>
                        <th className="text-right px-3 py-2">Cert</th>
                        <th className="text-right px-3 py-2 w-32">Progress</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => (
                        <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{r.item_code ?? r.item_number ?? "—"}</td>
                          <td className="px-3 py-2">
                            <button className="text-left hover:underline" onClick={() => setDetailId(r.id)}>{r.description}</button>
                            {r.is_overrun && <AlertTriangle className="inline ml-1 size-3 text-amber-600" />}
                          </td>
                          <td className="px-3 py-2 text-right text-xs">{r.unit ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{fmt(r.revised_qty)}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{fmt(r.unit_rate)}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{fmtMoney(r.revised_amount)}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{fmt(r.completed_qty)}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{fmt(r.certified_qty)}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full ${r.is_overrun ? "bg-amber-500" : "bg-accent"}`} style={{ width: `${Math.min(100, r.progress_pct)}%` }} />
                              </div>
                              <span className="text-[10px] font-mono w-10 text-right">{r.progress_pct.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailId(r.id)}><Eye className="size-3.5" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewItemDialog open={openNew} onOpenChange={setOpenNew} projectId={projectId} onCreated={() => qc.invalidateQueries({ queryKey: key })} />
      <ImportDialog open={openImport} onOpenChange={setOpenImport} projectId={projectId} onImported={() => qc.invalidateQueries({ queryKey: key })} />
      {detailId && <DetailSheet id={detailId} onClose={() => setDetailId(null)} onChanged={() => qc.invalidateQueries({ queryKey: key })} />}
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

function ErrState({ msg }: { msg: string }) {
  return <div className="bg-rose-50 border border-rose-200 rounded-sm p-6 text-sm text-rose-700">{msg}</div>;
}

function NewItemDialog({ open, onOpenChange, projectId, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; projectId?: string; onCreated: () => void }) {
  const create = useServerFn(createBoqItem);
  const empty = { project_id: projectId ?? "", item_code: "", item_number: "", description: "", section: "", unit: "", quantity: "", unit_rate: "", trade: "", discipline: "", location: "", remarks: "" };
  const [f, setF] = useState(empty);
  const mut = useMutation({
    mutationFn: () => create({ data: {
      project_id: f.project_id, description: f.description,
      item_code: f.item_code || null, item_number: f.item_number || null,
      section: f.section || null, unit: f.unit || null,
      quantity: Number(f.quantity) || 0, unit_rate: Number(f.unit_rate) || 0,
      trade: f.trade || null, discipline: f.discipline || null,
      location: f.location || null, remarks: f.remarks || null,
      status: "active",
    } }),
    onSuccess: () => { toast.success("BOQ item created"); onCreated(); onOpenChange(false); setF({ ...empty, project_id: projectId ?? "" }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const amount = (Number(f.quantity) || 0) * (Number(f.unit_rate) || 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New BOQ item</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!f.project_id || !f.description) return toast.error("Project and description required"); mut.mutate(); }}>
          {!projectId && <div><Label>Project *</Label><ProjectPicker value={f.project_id} onChange={(v) => setF({ ...f, project_id: v })} /></div>}
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Item No.</Label><Input value={f.item_number} onChange={(e) => setF({ ...f, item_number: e.target.value })} /></div>
            <div><Label>Code</Label><Input value={f.item_code} onChange={(e) => setF({ ...f, item_code: e.target.value })} /></div>
            <div><Label>Section</Label><Input value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} placeholder="Foundation Works" /></div>
          </div>
          <div><Label>Description *</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required /></div>
          <div className="grid grid-cols-4 gap-3">
            <div><Label>Unit</Label><Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="m³" /></div>
            <div><Label>Quantity</Label><Input type="number" step="0.001" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
            <div><Label>Rate</Label><Input type="number" step="0.01" value={f.unit_rate} onChange={(e) => setF({ ...f, unit_rate: e.target.value })} /></div>
            <div><Label>Amount</Label><Input value={fmtMoney(amount)} disabled /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Trade</Label><Input value={f.trade} onChange={(e) => setF({ ...f, trade: e.target.value })} /></div>
            <div><Label>Discipline</Label><Input value={f.discipline} onChange={(e) => setF({ ...f, discipline: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
          </div>
          <div><Label>Remarks</Label><Textarea rows={2} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">{mut.isPending ? "Saving…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ open, onOpenChange, projectId, onImported }: { open: boolean; onOpenChange: (v: boolean) => void; projectId?: string; onImported: () => void }) {
  const imp = useServerFn(importBoqRows);
  const [pid, setPid] = useState(projectId ?? "");
  const [csv, setCsv] = useState("");
  const mut = useMutation({
    mutationFn: async () => {
      if (!pid) throw new Error("Project required");
      const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error("Need a header row and at least one data row");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const idx = (n: string) => headers.indexOf(n);
      const rows = lines.slice(1).map((l) => {
        const cells = l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        return {
          description: cells[idx("description")] || "",
          item_code: idx("item_code") >= 0 ? cells[idx("item_code")] || null : null,
          item_number: idx("item_number") >= 0 ? cells[idx("item_number")] || null : null,
          section: idx("section") >= 0 ? cells[idx("section")] || null : null,
          unit: idx("unit") >= 0 ? cells[idx("unit")] || null : null,
          quantity: idx("quantity") >= 0 ? Number(cells[idx("quantity")]) || 0 : 0,
          unit_rate: idx("rate") >= 0 ? Number(cells[idx("rate")]) || 0 : (idx("unit_rate") >= 0 ? Number(cells[idx("unit_rate")]) || 0 : 0),
          trade: idx("trade") >= 0 ? cells[idx("trade")] || null : null,
          discipline: idx("discipline") >= 0 ? cells[idx("discipline")] || null : null,
          location: idx("location") >= 0 ? cells[idx("location")] || null : null,
        };
      }).filter((r) => r.description);
      if (rows.length === 0) throw new Error("No valid rows (description required)");
      return imp({ data: { project_id: pid, rows } });
    },
    onSuccess: (r: any) => { toast.success(`Imported ${r.inserted} items`); onImported(); onOpenChange(false); setCsv(""); },
    onError: (e: any) => toast.error(e?.message ?? "Import failed"),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import BOQ from CSV</DialogTitle>
          <DialogDescription>Paste CSV with header row. Supported columns: description (required), item_code, item_number, section, unit, quantity, rate, trade, discipline, location.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!projectId && <div><Label>Project *</Label><ProjectPicker value={pid} onChange={setPid} /></div>}
          <div>
            <Label>CSV content</Label>
            <Textarea rows={10} className="font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)}
              placeholder={"item_code,section,description,unit,quantity,rate\n1.1,Foundation,Excavation,m3,100,25\n1.2,Foundation,Lean concrete,m3,20,180"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !csv.trim()} className="bg-accent text-white hover:bg-accent/90">{mut.isPending ? "Importing…" : "Import"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailSheet({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const fetcher = useServerFn(getBoqItem);
  const upd = useServerFn(updateBoqItem);
  const arch = useServerFn(archiveBoqItem);
  const prog = useServerFn(updateBoqProgress);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["boq-item", id], queryFn: () => fetcher({ data: { id } }) });

  const [tab, setTab] = useState("overview");
  const [edit, setEdit] = useState<any>(null);
  const [prgOpen, setPrgOpen] = useState(false);
  const [pf, setPf] = useState({ completed_qty: "", certified_qty: "", note: "" });

  const item = data?.item;
  const history = data?.history ?? [];

  const editMut = useMutation({
    mutationFn: () => upd({ data: {
      id, description: edit.description, item_code: edit.item_code || null, item_number: edit.item_number || null,
      section: edit.section || null, unit: edit.unit || null,
      quantity: Number(edit.quantity) || 0, unit_rate: Number(edit.unit_rate) || 0,
      trade: edit.trade || null, discipline: edit.discipline || null, location: edit.location || null,
      remarks: edit.remarks || null, status: edit.status,
      variation_qty: Number(edit.variation_qty) || 0,
    } }),
    onSuccess: () => { toast.success("Updated"); setEdit(null); qc.invalidateQueries({ queryKey: ["boq-item", id] }); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const archMut = useMutation({
    mutationFn: () => arch({ data: { id } }),
    onSuccess: () => { toast.success("Archived"); onChanged(); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const progMut = useMutation({
    mutationFn: () => prog({ data: {
      id, completed_qty: Number(pf.completed_qty),
      certified_qty: pf.certified_qty !== "" ? Number(pf.certified_qty) : undefined,
      note: pf.note || undefined,
    } }),
    onSuccess: () => { toast.success("Progress saved"); setPrgOpen(false); setPf({ completed_qty: "", certified_qty: "", note: "" }); qc.invalidateQueries({ queryKey: ["boq-item", id] }); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="pr-8">{isLoading ? "Loading…" : item?.description}</SheetTitle>
        </SheetHeader>
        {item && (
          <div className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2 text-xs">
              {item.item_code && <span className="font-mono bg-muted px-2 py-0.5 rounded">{item.item_code}</span>}
              {item.section && <span className="bg-muted px-2 py-0.5 rounded">{item.section}</span>}
              <span className={`px-2 py-0.5 rounded ${STATUS_STYLES[item.status] ?? "bg-zinc-100"}`}>{item.status}</span>
              {item.is_overrun && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">Overrun</span>}
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={() => setPrgOpen(true)} className="bg-accent text-white hover:bg-accent/90"><TrendingUp className="size-4" /> Update Progress</Button>
              <Button size="sm" variant="outline" onClick={() => setEdit({ ...item })}><Pencil className="size-4" /> Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { if (confirm("Archive this item?")) archMut.mutate(); }}><Archive className="size-4" /> Archive</Button>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">History ({history.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Unit" value={item.unit ?? "—"} />
                  <Field label="Contract qty" value={fmt(item.quantity)} />
                  <Field label="Rate" value={fmtMoney(item.unit_rate)} />
                  <Field label="Contract amount" value={fmtMoney(item.amount)} />
                  <Field label="Variation qty" value={fmt(item.variation_qty)} />
                  <Field label="Revised qty" value={fmt(item.revised_qty)} />
                  <Field label="Revised amount" value={fmtMoney(item.revised_amount)} />
                  <Field label="Completed" value={fmt(item.completed_qty)} />
                  <Field label="Certified" value={fmt(item.certified_qty)} />
                  <Field label="Balance" value={fmt(item.balance_qty)} />
                  <Field label="Progress" value={`${item.progress_pct.toFixed(1)}%`} />
                  <Field label="Claimed $" value={fmtMoney(item.claimed_amount)} />
                  <Field label="Certified $" value={fmtMoney(item.certified_amount)} />
                  <Field label="Trade" value={item.trade ?? "—"} />
                  <Field label="Discipline" value={item.discipline ?? "—"} />
                  <Field label="Location" value={item.location ?? "—"} />
                </div>
                {item.remarks && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Remarks</div>
                    <p className="text-sm whitespace-pre-wrap">{item.remarks}</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="history" className="pt-3">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No progress updates yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((h: any) => (
                      <li key={h.id} className="border border-border rounded p-2 text-sm">
                        <div className="flex justify-between items-baseline">
                          <span className="font-mono">{fmt(h.qty)}</span>
                          <span className="text-xs text-muted-foreground">{new Date(h.recorded_at).toLocaleString()}</span>
                        </div>
                        {h.note && <p className="text-xs text-muted-foreground mt-1">{h.note}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {edit && (
          <Dialog open onOpenChange={() => setEdit(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Edit BOQ item</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); editMut.mutate(); }}>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Item No.</Label><Input value={edit.item_number ?? ""} onChange={(e) => setEdit({ ...edit, item_number: e.target.value })} /></div>
                  <div><Label>Code</Label><Input value={edit.item_code ?? ""} onChange={(e) => setEdit({ ...edit, item_code: e.target.value })} /></div>
                  <div><Label>Section</Label><Input value={edit.section ?? ""} onChange={(e) => setEdit({ ...edit, section: e.target.value })} /></div>
                </div>
                <div><Label>Description *</Label><Textarea rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} required /></div>
                <div className="grid grid-cols-4 gap-3">
                  <div><Label>Unit</Label><Input value={edit.unit ?? ""} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></div>
                  <div><Label>Quantity</Label><Input type="number" step="0.001" value={edit.quantity} onChange={(e) => setEdit({ ...edit, quantity: e.target.value })} /></div>
                  <div><Label>Rate</Label><Input type="number" step="0.01" value={edit.unit_rate} onChange={(e) => setEdit({ ...edit, unit_rate: e.target.value })} /></div>
                  <div><Label>Variation qty</Label><Input type="number" step="0.001" value={edit.variation_qty ?? 0} onChange={(e) => setEdit({ ...edit, variation_qty: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Trade</Label><Input value={edit.trade ?? ""} onChange={(e) => setEdit({ ...edit, trade: e.target.value })} /></div>
                  <div><Label>Discipline</Label><Input value={edit.discipline ?? ""} onChange={(e) => setEdit({ ...edit, discipline: e.target.value })} /></div>
                  <div><Label>Location</Label><Input value={edit.location ?? ""} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={edit.status} onValueChange={(v) => setEdit({ ...edit, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On hold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Remarks</Label><Textarea rows={2} value={edit.remarks ?? ""} onChange={(e) => setEdit({ ...edit, remarks: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
                  <Button type="submit" disabled={editMut.isPending} className="bg-accent text-white hover:bg-accent/90">{editMut.isPending ? "Saving…" : "Save"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {prgOpen && item && (
          <Dialog open onOpenChange={setPrgOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update progress</DialogTitle>
                <DialogDescription>Current: {fmt(item.completed_qty)} / {fmt(item.revised_qty)} {item.unit ?? ""}</DialogDescription>
              </DialogHeader>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!pf.completed_qty) return toast.error("Quantity required"); progMut.mutate(); }}>
                <div><Label>Cumulative completed quantity *</Label><Input type="number" step="0.001" value={pf.completed_qty} onChange={(e) => setPf({ ...pf, completed_qty: e.target.value })} required /></div>
                <div><Label>Certified quantity</Label><Input type="number" step="0.001" value={pf.certified_qty} onChange={(e) => setPf({ ...pf, certified_qty: e.target.value })} /></div>
                <div><Label>Note</Label><Textarea rows={2} value={pf.note} onChange={(e) => setPf({ ...pf, note: e.target.value })} /></div>
                {Number(pf.completed_qty) > Number(item.revised_qty) && (
                  <p className="text-xs text-amber-700 flex gap-1 items-center"><AlertTriangle className="size-3" /> Exceeds contract quantity (overrun).</p>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPrgOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={progMut.isPending} className="bg-accent text-white hover:bg-accent/90">{progMut.isPending ? "Saving…" : "Save"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

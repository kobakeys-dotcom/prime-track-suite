import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search, Archive, Pencil, Send, CheckCircle2, X as XIcon, FileText, ShoppingCart, Truck, Download, AlertTriangle } from "lucide-react";

import {
  listMaterialRequests, getMaterialRequest, saveMaterialRequest, setMaterialRequestStatus,
  archiveMaterialRequest, updateMrItemDelivery, convertMrToRfq, convertMrToPo, materialRequestStats,
} from "@/lib/material-requests.functions";
import { ProjectPicker } from "@/components/project-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  revision_requested: "bg-orange-100 text-orange-700",
  procurement_processing: "bg-purple-100 text-purple-700",
  rfq_created: "bg-indigo-100 text-indigo-700",
  po_created: "bg-violet-100 text-violet-700",
  ordered: "bg-cyan-100 text-cyan-700",
  partially_delivered: "bg-teal-100 text-teal-700",
  delivered: "bg-emerald-200 text-emerald-800",
  closed: "bg-zinc-200 text-zinc-600",
  cancelled: "bg-rose-50 text-rose-500",
  archived: "bg-zinc-100 text-zinc-400",
};
const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700", normal: "bg-blue-50 text-blue-700",
  medium: "bg-blue-50 text-blue-700", high: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700", critical: "bg-rose-200 text-rose-800",
};
const UNITS = ["Nos","Set","Pair","Kg","Ton","m","m2","m3","Bags","Liter","Roll","Box","Bundle","Sheet","Length","Lot"];

type Item = {
  id?: string;
  material_name: string; description?: string | null; specification?: string | null;
  unit: string; requested_quantity: number; approved_quantity?: number;
  ordered_quantity?: number; delivered_quantity?: number; balance_quantity?: number;
  estimated_rate: number; estimated_amount?: number; approved_rate?: number; approved_amount?: number;
  supplier_suggestion?: string | null; required_date?: string | null;
  priority?: string; status?: string; remarks?: string | null;
};

function emptyItem(): Item {
  return { material_name: "", unit: "Nos", requested_quantity: 1, estimated_rate: 0, priority: "normal", status: "pending" };
}

function csvDownload(rows: any[]) {
  const headers = ["Request No.","Project","Title","Required","Priority","Status","Procurement","Delivery","Items","Estimated"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([r.request_number, r.project_id, r.request_title ?? "", r.required_date ?? "", r.priority, r.status, r.procurement_status, r.delivery_status, "", ""].map((v) => `"${String(v ?? "").replace(/"/g,'""')}"`).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `material-requests-${Date.now()}.csv`;
  a.click();
}

export function MaterialRequestRegister({ projectId, variant = "full" }: { projectId?: string; variant?: "full" | "compact" }) {
  const [filterProject, setFilterProject] = useState<string>(projectId ?? "");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const effectiveProject = projectId ?? filterProject;
  const qc = useQueryClient();
  const fetchList = useServerFn(listMaterialRequests);
  const fetchStats = useServerFn(materialRequestStats);

  const listQ = useQuery({
    queryKey: ["mrs", effectiveProject || "all", statusFilter],
    queryFn: () => fetchList({ data: { projectId: effectiveProject || undefined, status: statusFilter === "all" ? undefined : statusFilter } }),
  });
  const statsQ = useQuery({
    queryKey: ["mrs-stats", effectiveProject || "all"],
    queryFn: () => fetchStats({ data: { projectId: effectiveProject || undefined } }),
  });

  const filtered = useMemo(() => {
    const rows = listQ.data ?? [];
    if (!search) return rows;
    const s = search.toLowerCase();
    return (rows as any[]).filter((r) => [r.request_number, r.request_title, r.material_name, r.site_location, r.reason].some((v) => String(v ?? "").toLowerCase().includes(s)));
  }, [listQ.data, search]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {variant === "full" && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold">Material Requests</h1>
            <p className="text-sm text-muted-foreground">Site material requisitions, approvals, procurement and delivery tracking.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => csvDownload(filtered)}><Download className="size-4 mr-1" /> CSV</Button>
            <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }} disabled={!effectiveProject}>
              <Plus className="size-4 mr-1" /> New Request
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          ["Total", statsQ.data?.total ?? 0, "bg-zinc-50"],
          ["Pending Approval", statsQ.data?.pending ?? 0, "bg-amber-50"],
          ["Approved", statsQ.data?.approved ?? 0, "bg-emerald-50"],
          ["PO Created", statsQ.data?.po ?? 0, "bg-violet-50"],
          ["Delivered", statsQ.data?.delivered ?? 0, "bg-teal-50"],
          ["Overdue", statsQ.data?.overdue ?? 0, "bg-rose-50"],
        ].map(([label, val, bg]) => (
          <Card key={label as string} className={bg as string}>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
              <div className="text-2xl font-display font-bold">{val as number}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {variant === "full" && !projectId && (
          <div className="w-56"><ProjectPicker value={filterProject} onChange={setFilterProject} placeholder="All projects" /></div>
        )}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.keys(STATUS_STYLE).map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search number, material, location…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {variant === "compact" && (
          <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }} disabled={!effectiveProject}>
            <Plus className="size-4 mr-1" /> New
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {listQ.isLoading ? (
          <div className="p-6 space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <FileText className="size-8 mx-auto mb-2 opacity-40" />
            No material requests yet. {effectiveProject ? "Click New Request to add one." : "Select a project to create one."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Number</th>
                  <th className="text-left px-3 py-2">Title</th>
                  <th className="text-left px-3 py-2">Required</th>
                  <th className="text-left px-3 py-2">Priority</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Procurement</th>
                  <th className="text-left px-3 py-2">Delivery</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(filtered as any[]).map((r) => {
                  const overdue = r.required_date && r.required_date < today && !["delivered","closed","rejected","cancelled","archived"].includes(r.status);
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => setDetailId(r.id)}>
                      <td className="px-3 py-2 font-mono text-xs">{r.request_number}</td>
                      <td className="px-3 py-2">{r.request_title || r.material_name || "—"}</td>
                      <td className={`px-3 py-2 text-xs ${overdue ? "text-rose-600 font-semibold" : ""}`}>
                        {r.required_date ?? "—"}{overdue && <AlertTriangle className="size-3 inline ml-1" />}
                      </td>
                      <td className="px-3 py-2"><Badge className={PRIORITY_STYLE[r.priority] ?? ""}>{r.priority}</Badge></td>
                      <td className="px-3 py-2"><Badge className={STATUS_STYLE[r.status] ?? ""}>{r.status.replace(/_/g," ")}</Badge></td>
                      <td className="px-3 py-2 text-xs">{(r.procurement_status ?? "—").replace(/_/g," ")}</td>
                      <td className="px-3 py-2 text-xs">{(r.delivery_status ?? "—").replace(/_/g," ")}</td>
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(r); setOpenForm(true); }}><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(r.id)}><Archive className="size-3.5" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MaterialRequestForm
        open={openForm} onOpenChange={setOpenForm}
        initial={editing} projectId={projectId ?? filterProject}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["mrs"] }); qc.invalidateQueries({ queryKey: ["mrs-stats"] }); }}
      />
      <DetailSheet id={detailId} onClose={() => setDetailId(null)} />

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive material request?</AlertDialogTitle>
            <AlertDialogDescription>This hides the request from active lists. It can be restored later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <ArchiveBtn id={confirmArchive} onDone={() => { setConfirmArchive(null); qc.invalidateQueries({ queryKey: ["mrs"] }); }} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ArchiveBtn({ id, onDone }: { id: string | null; onDone: () => void }) {
  const fn = useServerFn(archiveMaterialRequest);
  const m = useMutation({ mutationFn: () => fn({ data: { id: id! } }), onSuccess: () => { toast.success("Archived"); onDone(); }, onError: (e: any) => toast.error(e?.message ?? "Failed") });
  return <AlertDialogAction onClick={() => m.mutate()}>Archive</AlertDialogAction>;
}

function MaterialRequestForm({
  open, onOpenChange, initial, projectId, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; initial: any | null; projectId: string; onSaved: () => void }) {
  const fn = useServerFn(saveMaterialRequest);
  const submitFn = useServerFn(setMaterialRequestStatus);
  const fetchOne = useServerFn(getMaterialRequest);

  const detailQ = useQuery({
    queryKey: ["mr-detail-edit", initial?.id],
    queryFn: () => fetchOne({ data: { id: initial.id } }),
    enabled: open && !!initial?.id,
  });

  const base = initial?.id ? (detailQ.data ?? initial) : initial;
  const [form, setForm] = useState<any>({});
  const [items, setItems] = useState<Item[]>([]);

  // sync when opening
  useMemo(() => {
    if (!open) return;
    if (base) {
      setForm({
        request_title: base.request_title ?? "",
        department: base.department ?? "",
        site_location: base.site_location ?? "",
        required_date: base.required_date ?? "",
        priority: base.priority ?? "normal",
        reason: base.reason ?? "",
        remarks: base.remarks ?? "",
      });
      setItems(base.items?.length ? base.items : [emptyItem()]);
    } else {
      setForm({ priority: "normal" });
      setItems([emptyItem()]);
    }
  }, [open, base?.id, detailQ.dataUpdatedAt]);

  const total = items.reduce((s, i) => s + Number(i.requested_quantity || 0) * Number(i.estimated_rate || 0), 0);

  const save = useMutation({
    mutationFn: async (status?: string) => {
      if (!projectId) throw new Error("Select a project first");
      if (!items.length || !items.some((i) => i.material_name && i.requested_quantity > 0)) throw new Error("Add at least one item");
      const payload: any = {
        id: initial?.id,
        project_id: projectId,
        ...form,
        required_date: form.required_date || null,
        items: items.filter((i) => i.material_name),
      };
      const res = await fn({ data: payload });
      if (status === "submitted") await submitFn({ data: { id: res.id!, status: "submitted" } });
      return res;
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); onOpenChange(false); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Material Request" : "New Material Request"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Title</Label><Input value={form.request_title ?? ""} onChange={(e) => setForm({ ...form, request_title: e.target.value })} placeholder="e.g. Rebar for foundation works" /></div>
          <div><Label>Department</Label><Input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
          <div><Label>Site location</Label><Input value={form.site_location ?? ""} onChange={(e) => setForm({ ...form, site_location: e.target.value })} /></div>
          <div><Label>Required date</Label><Input type="date" value={form.required_date ?? ""} onChange={(e) => setForm({ ...form, required_date: e.target.value })} /></div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority ?? "normal"} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["low","normal","medium","high","urgent","critical"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Reason</Label><Textarea rows={2} value={form.reason ?? ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          <div className="col-span-2"><Label>Remarks</Label><Textarea rows={2} value={form.remarks ?? ""} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Items</h3>
            <Button size="sm" variant="outline" onClick={() => setItems([...items, emptyItem()])}><Plus className="size-3.5 mr-1" />Add item</Button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded p-2 bg-muted/30">
                <div className="col-span-4"><Label className="text-[10px]">Material</Label><Input value={it.material_name} onChange={(e) => { const c=[...items]; c[idx]={...it,material_name:e.target.value}; setItems(c); }} /></div>
                <div className="col-span-2"><Label className="text-[10px]">Spec</Label><Input value={it.specification ?? ""} onChange={(e) => { const c=[...items]; c[idx]={...it,specification:e.target.value}; setItems(c); }} /></div>
                <div className="col-span-1">
                  <Label className="text-[10px]">Unit</Label>
                  <Select value={it.unit} onValueChange={(v) => { const c=[...items]; c[idx]={...it,unit:v}; setItems(c); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-1"><Label className="text-[10px]">Qty</Label><Input type="number" value={it.requested_quantity} onChange={(e) => { const c=[...items]; c[idx]={...it,requested_quantity:Number(e.target.value)}; setItems(c); }} /></div>
                <div className="col-span-1"><Label className="text-[10px]">Rate</Label><Input type="number" value={it.estimated_rate} onChange={(e) => { const c=[...items]; c[idx]={...it,estimated_rate:Number(e.target.value)}; setItems(c); }} /></div>
                <div className="col-span-2 text-xs"><Label className="text-[10px]">Amount</Label><div className="h-9 flex items-center font-mono">{(Number(it.requested_quantity)*Number(it.estimated_rate)).toFixed(2)}</div></div>
                <div className="col-span-1 flex justify-end"><Button variant="ghost" size="sm" onClick={() => setItems(items.filter((_,i)=>i!==idx))}><XIcon className="size-3.5" /></Button></div>
              </div>
            ))}
          </div>
          <div className="text-right mt-2 text-sm font-semibold">Estimated total: {total.toFixed(2)}</div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={() => save.mutate(undefined)} disabled={save.isPending}>Save Draft</Button>
          <Button onClick={() => save.mutate("submitted")} disabled={save.isPending}><Send className="size-4 mr-1" />Save & Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const fetchOne = useServerFn(getMaterialRequest);
  const setStatus = useServerFn(setMaterialRequestStatus);
  const updateDel = useServerFn(updateMrItemDelivery);
  const toRfq = useServerFn(convertMrToRfq);
  const toPo = useServerFn(convertMrToPo);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["mr-detail", id], queryFn: () => fetchOne({ data: { id: id! } }), enabled: !!id });
  const mr: any = q.data;

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reason, setReason] = useState("");

  const refresh = () => { qc.invalidateQueries({ queryKey: ["mr-detail", id] }); qc.invalidateQueries({ queryKey: ["mrs"] }); qc.invalidateQueries({ queryKey: ["mrs-stats"] }); };

  const act = (status: string, extra: any = {}) =>
    setStatus({ data: { id: id!, status: status as any, ...extra } }).then(() => { toast.success(`Set to ${status.replace(/_/g," ")}`); refresh(); }).catch((e: any) => toast.error(e?.message ?? "Failed"));

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader><SheetTitle>{mr?.request_number ?? "Material Request"}</SheetTitle></SheetHeader>
        {q.isLoading || !mr ? <div className="p-8"><Skeleton className="h-40 w-full" /></div> : (
          <div className="space-y-4 mt-3">
            <div className="flex flex-wrap gap-2">
              <Badge className={STATUS_STYLE[mr.status]}>{mr.status.replace(/_/g," ")}</Badge>
              <Badge className={PRIORITY_STYLE[mr.priority]}>{mr.priority}</Badge>
              <Badge variant="outline">Procurement: {mr.procurement_status?.replace(/_/g," ")}</Badge>
              <Badge variant="outline">Delivery: {mr.delivery_status?.replace(/_/g," ")}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Title" v={mr.request_title} />
              <Field label="Department" v={mr.department} />
              <Field label="Site location" v={mr.site_location} />
              <Field label="Required" v={mr.required_date} />
              <Field label="Reason" v={mr.reason} />
              <Field label="Remarks" v={mr.remarks} />
              {mr.rejection_reason && <Field label="Rejection reason" v={mr.rejection_reason} />}
              {mr.revision_notes && <Field label="Revision notes" v={mr.revision_notes} />}
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Items</h3>
              <div className="border rounded overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-2 py-1.5">Material</th>
                      <th className="text-left px-2 py-1.5">Unit</th>
                      <th className="text-right px-2 py-1.5">Req</th>
                      <th className="text-right px-2 py-1.5">App</th>
                      <th className="text-right px-2 py-1.5">Ord</th>
                      <th className="text-right px-2 py-1.5">Del</th>
                      <th className="text-right px-2 py-1.5">Bal</th>
                      <th className="text-right px-2 py-1.5">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(mr.items ?? []).map((it: any) => (
                      <tr key={it.id} className="border-t">
                        <td className="px-2 py-1.5">{it.material_name}{it.specification && <div className="text-[10px] text-muted-foreground">{it.specification}</div>}</td>
                        <td className="px-2 py-1.5">{it.unit}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{Number(it.requested_quantity).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{Number(it.approved_quantity).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right">
                          <Input className="h-7 w-20 ml-auto text-right" type="number" defaultValue={it.ordered_quantity}
                            onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(it.ordered_quantity)) updateDel({ data: { id: it.id, ordered_quantity: v } }).then(refresh); }} />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <Input className="h-7 w-20 ml-auto text-right" type="number" defaultValue={it.delivered_quantity}
                            onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(it.delivered_quantity)) updateDel({ data: { id: it.id, delivered_quantity: v } }).then(refresh); }} />
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">{Number(it.balance_quantity).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{Number(it.estimated_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workflow actions */}
            <div className="flex flex-wrap gap-2">
              {mr.status === "draft" && <Button size="sm" onClick={() => act("submitted")}><Send className="size-3.5 mr-1" />Submit</Button>}
              {(mr.status === "submitted" || mr.status === "under_review") && (
                <>
                  <Button size="sm" onClick={() => act("approved")}><CheckCircle2 className="size-3.5 mr-1" />Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
                  <Button size="sm" variant="outline" onClick={() => setReviseOpen(true)}>Request revision</Button>
                </>
              )}
              {mr.status === "approved" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => toRfq({ data: { id: mr.id } }).then((r) => { toast.success(`RFQ ${r.rfq_number} created`); refresh(); }).catch((e) => toast.error(e?.message ?? "Failed"))}>
                    <FileText className="size-3.5 mr-1" />Convert to RFQ
                  </Button>
                  <Button size="sm" onClick={() => toPo({ data: { id: mr.id } }).then((r) => { toast.success(`PO ${r.po_number} created`); refresh(); }).catch((e) => toast.error(e?.message ?? "Failed"))}>
                    <ShoppingCart className="size-3.5 mr-1" />Convert to PO
                  </Button>
                </>
              )}
              {mr.purchase_order_id && <Badge variant="outline">PO linked</Badge>}
              {mr.rfq_id && <Badge variant="outline">RFQ linked</Badge>}
            </div>

            {/* History */}
            {mr.history?.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Status history</h3>
                <ul className="space-y-1 text-xs">
                  {mr.history.map((h: any) => (
                    <li key={h.id} className="flex justify-between border-b py-1">
                      <span>{(h.old_status ?? "—")} → <strong>{h.new_status}</strong>{h.remarks ? ` — ${h.remarks}` : ""}</span>
                      <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject request</DialogTitle></DialogHeader>
            <Textarea placeholder="Rejection reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { act("rejected", { rejection_reason: reason }).then(() => { setRejectOpen(false); setReason(""); }); }}>Reject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={reviseOpen} onOpenChange={setReviseOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Request revision</DialogTitle></DialogHeader>
            <Textarea placeholder="Revision notes (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setReviseOpen(false)}>Cancel</Button>
              <Button onClick={() => { act("revision_requested", { revision_notes: reason }).then(() => { setReviseOpen(false); setReason(""); }); }}>Send back</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, v }: { label: string; v: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{v ?? "—"}</div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search, Archive, Pencil, Send, CheckCircle2, X as XIcon, FileText, ShoppingCart, Download, Trash2, Trophy, Star } from "lucide-react";

import {
  listRfqs, getRfq, saveRfq, setRfqStatus, archiveRfq,
  saveSupplierQuotation, deleteSupplierQuotation, selectSupplier, convertRfqToPo,
  listSuppliers, listMaterialRequestsForRfq, rfqStats,
} from "@/lib/rfqs.functions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  issued: "bg-blue-100 text-blue-700",
  quotation_received: "bg-cyan-100 text-cyan-700",
  under_evaluation: "bg-amber-100 text-amber-700",
  supplier_selected: "bg-indigo-100 text-indigo-700",
  award_approved: "bg-emerald-100 text-emerald-700",
  converted_to_po: "bg-violet-100 text-violet-700",
  closed: "bg-zinc-200 text-zinc-600",
  cancelled: "bg-rose-50 text-rose-500",
  expired: "bg-rose-100 text-rose-700",
  rejected: "bg-rose-100 text-rose-700",
  archived: "bg-zinc-100 text-zinc-400",
};
const AWARD_STYLE: Record<string, string> = {
  not_awarded: "bg-zinc-100 text-zinc-700",
  recommended: "bg-indigo-100 text-indigo-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  awarded: "bg-emerald-200 text-emerald-800",
  converted_to_po: "bg-violet-100 text-violet-700",
};
const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700", medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-100 text-amber-700", urgent: "bg-rose-100 text-rose-700", critical: "bg-rose-200 text-rose-800",
};
const UNITS = ["Nos","Set","Pair","Kg","Ton","m","m2","m3","Bags","Liter","Roll","Box","Bundle","Sheet","Length","Lot"];

const fmt = (n?: number | null) => Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function badge(s: string, map: Record<string, string>) {
  const cls = map[s] ?? "bg-zinc-100 text-zinc-700";
  return <Badge className={`${cls} font-medium capitalize`}>{s?.replaceAll("_", " ")}</Badge>;
}

type Props = { projectId?: string };

export function RfqRegister({ projectId: pinnedProject }: Props) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string | undefined>(pinnedProject);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const list = useServerFn(listRfqs);
  const stats = useServerFn(rfqStats);
  const arch = useServerFn(archiveRfq);

  const effectiveProject = pinnedProject ?? projectId;

  const q = useQuery({
    queryKey: ["rfqs", effectiveProject, statusFilter],
    queryFn: () => list({ data: { projectId: effectiveProject, status: statusFilter !== "all" ? statusFilter : undefined } }),
  });
  const sQ = useQuery({
    queryKey: ["rfq-stats", effectiveProject],
    queryFn: () => stats({ data: { projectId: effectiveProject } }),
  });

  const archiveM = useMutation({
    mutationFn: (id: string) => arch({ data: { id } }),
    onSuccess: () => { toast.success("RFQ archived"); qc.invalidateQueries({ queryKey: ["rfqs"] }); qc.invalidateQueries({ queryKey: ["rfq-stats"] }); setArchiveId(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to archive"),
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return q.data ?? [];
    return (q.data ?? []).filter((r: any) =>
      [r.rfq_number, r.rfq_title, r.description, r.delivery_location].some((v: any) => String(v ?? "").toLowerCase().includes(s)),
    );
  }, [q.data, search]);

  function exportCsv() {
    const rows = filtered;
    if (!rows.length) return toast.info("Nothing to export");
    const headers = ["RFQ No.","Title","Deadline","Required Delivery","Priority","Status","Award","Selected Amount","Currency","Converted to PO"];
    const csv = [headers.join(",")].concat(
      rows.map((r: any) => [r.rfq_number,r.rfq_title,r.quotation_deadline,r.required_delivery_date,r.priority,r.status,r.award_status,r.selected_amount,r.currency,r.converted_to_po]
        .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")),
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `rfqs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {!pinnedProject && (
        <div className="flex flex-wrap items-end gap-3">
          <ProjectPicker value={projectId} onChange={setProjectId} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          ["Total", sQ.data?.total ?? 0],
          ["Draft", sQ.data?.draft ?? 0],
          ["Issued", sQ.data?.issued ?? 0],
          ["Received", sQ.data?.received ?? 0],
          ["Evaluation", sQ.data?.under_eval ?? 0],
          ["Approved", sQ.data?.approved ?? 0],
          ["To PO", sQ.data?.converted ?? 0],
          ["Expired", sQ.data?.expired ?? 0],
        ].map(([k, v]) => (
          <Card key={k as string}><CardContent className="p-3">
            <div className="text-xs text-zinc-500">{k}</div>
            <div className="text-xl font-semibold">{v as number}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
          <Input className="pl-8 w-72" placeholder="Search RFQs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.keys(STATUS_STYLE).map((s) => <SelectItem key={s} value={s}>{s.replaceAll("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
        <div className="ml-auto">
          <Button onClick={() => { setEditId(null); setOpenCreate(true); }} disabled={!effectiveProject}>
            <Plus className="h-4 w-4 mr-1" />New RFQ
          </Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        {q.isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          : (filtered.length === 0)
            ? <div className="p-8 text-center text-zinc-500">{effectiveProject ? "No RFQs yet. Click New RFQ to create one." : "Select a project to view RFQs."}</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left">
                    <tr>
                      <th className="p-2">RFQ No.</th><th className="p-2">Title</th><th className="p-2">Deadline</th>
                      <th className="p-2">Priority</th><th className="p-2">Status</th><th className="p-2">Award</th>
                      <th className="p-2 text-right">Selected</th><th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r: any) => (
                      <tr key={r.id} className="border-t hover:bg-zinc-50 cursor-pointer" onClick={() => setDetailId(r.id)}>
                        <td className="p-2 font-medium">{r.rfq_number}</td>
                        <td className="p-2">{r.rfq_title}</td>
                        <td className="p-2">{r.quotation_deadline ?? "—"}</td>
                        <td className="p-2">{badge(r.priority ?? "medium", PRIORITY_STYLE)}</td>
                        <td className="p-2">{badge(r.status ?? "draft", STATUS_STYLE)}</td>
                        <td className="p-2">{badge(r.award_status ?? "not_awarded", AWARD_STYLE)}</td>
                        <td className="p-2 text-right">{r.selected_amount ? `${r.currency} ${fmt(r.selected_amount)}` : "—"}</td>
                        <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => { setEditId(r.id); setOpenCreate(true); }} disabled={r.status !== "draft"}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setArchiveId(r.id)}>
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </CardContent></Card>

      {openCreate && (
        <RfqDialog
          open={openCreate} onOpenChange={setOpenCreate}
          rfqId={editId} projectId={effectiveProject ?? ""}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["rfqs"] }); qc.invalidateQueries({ queryKey: ["rfq-stats"] }); }}
        />
      )}

      {detailId && (
        <RfqDetail
          rfqId={detailId} onClose={() => setDetailId(null)}
          onChanged={() => { qc.invalidateQueries({ queryKey: ["rfqs"] }); qc.invalidateQueries({ queryKey: ["rfq-stats"] }); }}
        />
      )}

      <AlertDialog open={!!archiveId} onOpenChange={() => setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive RFQ?</AlertDialogTitle>
            <AlertDialogDescription>The RFQ will be hidden from the active register.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveId && archiveM.mutate(archiveId)}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Create / Edit Dialog ──────────────────────────────────────────────────
function emptyItem() { return { item_name: "", unit: "Nos", quantity: 1, estimated_rate: 0, description: "", remarks: "" }; }
function emptySupplier() { return { supplier_id: null as string | null, supplier_name: "", supplier_email: "", supplier_phone: "", contact_person: "" }; }

function RfqDialog({ open, onOpenChange, rfqId, projectId, onSaved }:
  { open: boolean; onOpenChange: (v: boolean) => void; rfqId: string | null; projectId: string; onSaved: () => void }) {
  const get = useServerFn(getRfq);
  const save = useServerFn(saveRfq);
  const supList = useServerFn(listSuppliers);
  const mrList = useServerFn(listMaterialRequestsForRfq);

  const [form, setForm] = useState<any>({
    rfq_title: "", rfq_number: "", description: "", quotation_deadline: "", required_delivery_date: "",
    delivery_location: "", priority: "medium", currency: "MVR", terms_and_conditions: "", remarks: "",
    material_request_id: null,
  });
  const [items, setItems] = useState<any[]>([emptyItem()]);
  const [suppliers, setSuppliers] = useState<any[]>([emptySupplier()]);
  const [saving, setSaving] = useState(false);

  const { data: suppliersMaster } = useQuery({ queryKey: ["suppliers-master"], queryFn: () => supList() });
  const { data: mrs } = useQuery({ queryKey: ["mr-for-rfq", projectId], queryFn: () => mrList({ data: { projectId } }) });

  useEffect(() => {
    if (!open) return;
    if (rfqId) {
      get({ data: { id: rfqId } }).then((res: any) => {
        const r = res.rfq;
        setForm({
          rfq_title: r.rfq_title ?? "", rfq_number: r.rfq_number ?? "", description: r.description ?? "",
          quotation_deadline: r.quotation_deadline ?? "", required_delivery_date: r.required_delivery_date ?? "",
          delivery_location: r.delivery_location ?? "", priority: r.priority ?? "medium",
          currency: r.currency ?? "MVR", terms_and_conditions: r.terms_and_conditions ?? "",
          remarks: r.remarks ?? "", material_request_id: r.material_request_id,
        });
        setItems(res.items.length ? res.items : [emptyItem()]);
        setSuppliers(res.suppliers.length ? res.suppliers : [emptySupplier()]);
      });
    } else {
      setForm({ rfq_title: "", rfq_number: "", description: "", quotation_deadline: "", required_delivery_date: "",
        delivery_location: "", priority: "medium", currency: "MVR", terms_and_conditions: "", remarks: "", material_request_id: null });
      setItems([emptyItem()]); setSuppliers([emptySupplier()]);
    }
  }, [open, rfqId]);

  async function submit() {
    if (!form.rfq_title.trim()) return toast.error("RFQ title is required");
    if (!items.some((i) => i.item_name.trim())) return toast.error("Add at least one item");
    setSaving(true);
    try {
      const cleanItems = items.filter((i) => i.item_name.trim()).map((i) => ({
        ...i, quantity: Number(i.quantity ?? 0), estimated_rate: Number(i.estimated_rate ?? 0),
      }));
      const cleanSup = suppliers.filter((s) => s.supplier_id || (s.supplier_name ?? "").trim());
      await save({ data: { id: rfqId ?? undefined, project_id: projectId, ...form, items: cleanItems, suppliers: cleanSup } });
      toast.success(rfqId ? "RFQ updated" : "RFQ created");
      onSaved(); onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{rfqId ? "Edit RFQ" : "New RFQ"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Title *</Label><Input value={form.rfq_title} onChange={(e) => setForm({ ...form, rfq_title: e.target.value })} /></div>
          <div><Label>RFQ Number</Label><Input placeholder="Auto" value={form.rfq_number} onChange={(e) => setForm({ ...form, rfq_number: e.target.value })} /></div>
          <div><Label>Material Request</Label>
            <Select value={form.material_request_id ?? "none"} onValueChange={(v) => setForm({ ...form, material_request_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(mrs ?? []).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.request_number} — {m.request_title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Quotation Deadline</Label><Input type="date" value={form.quotation_deadline ?? ""} onChange={(e) => setForm({ ...form, quotation_deadline: e.target.value })} /></div>
          <div><Label>Required Delivery</Label><Input type="date" value={form.required_delivery_date ?? ""} onChange={(e) => setForm({ ...form, required_delivery_date: e.target.value })} /></div>
          <div><Label>Delivery Location</Label><Input value={form.delivery_location} onChange={(e) => setForm({ ...form, delivery_location: e.target.value })} /></div>
          <div><Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["low","medium","high","urgent","critical"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["MVR","USD","EUR","GBP","AED","LKR","INR","CNY"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2"><Label className="text-base">Items</Label>
            <Button size="sm" variant="outline" onClick={() => setItems([...items, emptyItem()])}><Plus className="h-3.5 w-3.5 mr-1" />Add Item</Button>
          </div>
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50"><tr>
                <th className="p-2 text-left">Item Name</th><th className="p-2 text-left">Description</th>
                <th className="p-2 w-20">Unit</th><th className="p-2 w-24">Qty</th><th className="p-2 w-28">Est. Rate</th>
                <th className="p-2 w-28 text-right">Amount</th><th className="p-2 w-10"></th>
              </tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1"><Input value={it.item_name} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, item_name: e.target.value } : x))} /></td>
                    <td className="p-1"><Input value={it.description ?? ""} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} /></td>
                    <td className="p-1">
                      <Select value={it.unit} onValueChange={(v) => setItems(items.map((x, j) => j === i ? { ...x, unit: v } : x))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-1"><Input type="number" value={it.quantity} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} /></td>
                    <td className="p-1"><Input type="number" value={it.estimated_rate} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, estimated_rate: e.target.value } : x))} /></td>
                    <td className="p-1 text-right">{fmt(Number(it.quantity ?? 0) * Number(it.estimated_rate ?? 0))}</td>
                    <td className="p-1"><Button size="sm" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2"><Label className="text-base">Suppliers</Label>
            <Button size="sm" variant="outline" onClick={() => setSuppliers([...suppliers, emptySupplier()])}><Plus className="h-3.5 w-3.5 mr-1" />Add Supplier</Button>
          </div>
          <div className="space-y-2">
            {suppliers.map((s, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end border rounded p-2">
                <div><Label className="text-xs">From master</Label>
                  <Select value={s.supplier_id ?? "manual"} onValueChange={(v) => {
                    if (v === "manual") setSuppliers(suppliers.map((x, j) => j === i ? { ...x, supplier_id: null } : x));
                    else {
                      const m = (suppliersMaster ?? []).find((sm: any) => sm.id === v);
                      setSuppliers(suppliers.map((x, j) => j === i ? { ...x, supplier_id: v, supplier_name: m?.name, supplier_email: m?.email, supplier_phone: m?.phone, contact_person: m?.contact_person } : x));
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual entry</SelectItem>
                      {(suppliersMaster ?? []).map((sm: any) => <SelectItem key={sm.id} value={sm.id}>{sm.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Name</Label><Input value={s.supplier_name ?? ""} onChange={(e) => setSuppliers(suppliers.map((x, j) => j === i ? { ...x, supplier_name: e.target.value } : x))} /></div>
                <div><Label className="text-xs">Email</Label><Input value={s.supplier_email ?? ""} onChange={(e) => setSuppliers(suppliers.map((x, j) => j === i ? { ...x, supplier_email: e.target.value } : x))} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={s.supplier_phone ?? ""} onChange={(e) => setSuppliers(suppliers.map((x, j) => j === i ? { ...x, supplier_phone: e.target.value } : x))} /></div>
                <div className="flex items-end gap-1"><Input className="flex-1" placeholder="Contact person" value={s.contact_person ?? ""} onChange={(e) => setSuppliers(suppliers.map((x, j) => j === i ? { ...x, contact_person: e.target.value } : x))} />
                  <Button size="sm" variant="ghost" onClick={() => setSuppliers(suppliers.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div><Label>Terms & Conditions</Label><Textarea value={form.terms_and_conditions} onChange={(e) => setForm({ ...form, terms_and_conditions: e.target.value })} /></div>
          <div><Label>Remarks</Label><Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail Sheet ──────────────────────────────────────────────────────────
function RfqDetail({ rfqId, onClose, onChanged }: { rfqId: string; onClose: () => void; onChanged: () => void }) {
  const get = useServerFn(getRfq);
  const setStatus = useServerFn(setRfqStatus);
  const select = useServerFn(selectSupplier);
  const convert = useServerFn(convertRfqToPo);
  const delQ = useServerFn(deleteSupplierQuotation);
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteSupplierId, setQuoteSupplierId] = useState<string | null>(null);
  const [editQuoteId, setEditQuoteId] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["rfq", rfqId], queryFn: () => get({ data: { id: rfqId } }) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["rfq", rfqId] }); onChanged(); };

  const issueM = useMutation({ mutationFn: () => setStatus({ data: { id: rfqId, status: "issued" } }),
    onSuccess: () => { toast.success("RFQ issued to suppliers"); refresh(); }, onError: (e: any) => toast.error(e?.message ?? "Failed") });
  const approveM = useMutation({ mutationFn: () => setStatus({ data: { id: rfqId, status: "award_approved" } }),
    onSuccess: () => { toast.success("Award approved"); refresh(); }, onError: (e: any) => toast.error(e?.message ?? "Failed") });
  const rejectM = useMutation({ mutationFn: (reason: string) => setStatus({ data: { id: rfqId, status: "rejected", remarks: reason } }),
    onSuccess: () => { toast.success("Award rejected"); refresh(); }, onError: (e: any) => toast.error(e?.message ?? "Failed") });
  const convertM = useMutation({ mutationFn: () => convert({ data: { id: rfqId } }),
    onSuccess: (r: any) => { toast.success(`PO ${r.po_number} created`); refresh(); }, onError: (e: any) => toast.error(e?.message ?? "Failed") });
  const selectM = useMutation({ mutationFn: (v: { rfq_supplier_id: string; quotation_id: string }) =>
    select({ data: { rfq_id: rfqId, ...v } }),
    onSuccess: () => { toast.success("Supplier selected"); refresh(); }, onError: (e: any) => toast.error(e?.message ?? "Failed") });
  const delQM = useMutation({ mutationFn: (id: string) => delQ({ data: { id } }),
    onSuccess: () => { toast.success("Quotation removed"); refresh(); }, onError: (e: any) => toast.error(e?.message ?? "Failed") });

  if (q.isLoading || !q.data || !q.data.rfq) return (
    <Sheet open onOpenChange={onClose}><SheetContent className="sm:max-w-4xl"><Skeleton className="h-40" /></SheetContent></Sheet>
  );

  const r = q.data.rfq;
  const items = q.data.items;
  const suppliers = q.data.suppliers;
  const quotations = q.data.quotations;
  const qItems = q.data.quotationItems;

  function quotationsBySupplier(sid: string) { return quotations.filter((qq: any) => qq.rfq_supplier_id === sid); }
  function lowestNet() {
    const nets = quotations.map((qq: any) => Number(qq.net_amount));
    return nets.length ? Math.min(...nets) : null;
  }
  const low = lowestNet();

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="sm:max-w-5xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <span>{r.rfq_number} — {r.rfq_title}</span>
            {badge(r.status, STATUS_STYLE)}{badge(r.award_status, AWARD_STYLE)}
            {r.converted_to_po && <Badge className="bg-violet-100 text-violet-700">Converted to PO</Badge>}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 mt-3">
          {r.status === "draft" && <Button size="sm" onClick={() => issueM.mutate()} disabled={issueM.isPending}><Send className="h-3.5 w-3.5 mr-1" />Issue RFQ</Button>}
          {r.status === "supplier_selected" && r.award_status === "recommended" && (
            <>
              <Button size="sm" onClick={() => approveM.mutate()} disabled={approveM.isPending}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve Award</Button>
              <Button size="sm" variant="destructive" onClick={() => {
                const reason = prompt("Rejection reason?"); if (reason) rejectM.mutate(reason);
              }}><XIcon className="h-3.5 w-3.5 mr-1" />Reject Award</Button>
            </>
          )}
          {r.award_status === "approved" && !r.converted_to_po && (
            <Button size="sm" onClick={() => convertM.mutate()} disabled={convertM.isPending}><ShoppingCart className="h-3.5 w-3.5 mr-1" />Convert to PO</Button>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers ({suppliers.length})</TabsTrigger>
            <TabsTrigger value="quotations">Quotations ({quotations.length})</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-zinc-500">Deadline</div>{r.quotation_deadline ?? "—"}</div>
              <div><div className="text-xs text-zinc-500">Required Delivery</div>{r.required_delivery_date ?? "—"}</div>
              <div><div className="text-xs text-zinc-500">Delivery Location</div>{r.delivery_location ?? "—"}</div>
              <div><div className="text-xs text-zinc-500">Priority</div>{badge(r.priority ?? "medium", PRIORITY_STYLE)}</div>
              <div><div className="text-xs text-zinc-500">Currency</div>{r.currency}</div>
              <div><div className="text-xs text-zinc-500">Selected Amount</div>{r.selected_amount ? `${r.currency} ${fmt(r.selected_amount)}` : "—"}</div>
            </div>
            {r.description && <div><div className="text-xs text-zinc-500">Description</div><div className="whitespace-pre-wrap">{r.description}</div></div>}
            {r.terms_and_conditions && <div><div className="text-xs text-zinc-500">Terms</div><div className="whitespace-pre-wrap">{r.terms_and_conditions}</div></div>}
            {r.remarks && <div><div className="text-xs text-zinc-500">Remarks</div><div className="whitespace-pre-wrap">{r.remarks}</div></div>}
            {r.rejection_reason && <div><div className="text-xs text-zinc-500">Rejection</div><div className="text-rose-700">{r.rejection_reason}</div></div>}
          </TabsContent>

          <TabsContent value="items">
            <table className="w-full text-sm border rounded">
              <thead className="bg-zinc-50 text-left"><tr>
                <th className="p-2">Item</th><th className="p-2">Unit</th><th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Est. Rate</th><th className="p-2 text-right">Est. Amount</th>
              </tr></thead>
              <tbody>
                {items.map((it: any) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">{it.item_name}{it.description && <div className="text-xs text-zinc-500">{it.description}</div>}</td>
                    <td className="p-2">{it.unit}</td>
                    <td className="p-2 text-right">{fmt(it.quantity)}</td>
                    <td className="p-2 text-right">{fmt(it.estimated_rate)}</td>
                    <td className="p-2 text-right">{fmt(it.estimated_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="suppliers">
            <table className="w-full text-sm border rounded">
              <thead className="bg-zinc-50 text-left"><tr>
                <th className="p-2">Supplier</th><th className="p-2">Contact</th>
                <th className="p-2">Invitation</th><th className="p-2">Quotation</th>
                <th className="p-2 text-right">Quoted</th><th className="p-2"></th>
              </tr></thead>
              <tbody>
                {suppliers.map((s: any) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{s.supplier_name}</div>
                      <div className="text-xs text-zinc-500">{s.supplier_email}</div>
                    </td>
                    <td className="p-2 text-xs">{s.contact_person}<br/>{s.supplier_phone}</td>
                    <td className="p-2">{badge(s.invitation_status, STATUS_STYLE)}</td>
                    <td className="p-2">{badge(s.quotation_status, STATUS_STYLE)}{s.is_selected && <Badge className="ml-1 bg-emerald-100 text-emerald-700"><Trophy className="h-3 w-3 mr-1" />Selected</Badge>}</td>
                    <td className="p-2 text-right">{s.total_quoted_amount ? `${s.currency} ${fmt(s.total_quoted_amount)}` : "—"}</td>
                    <td className="p-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => { setQuoteSupplierId(s.id); setEditQuoteId(null); setQuoteOpen(true); }}>
                        {s.quotation_status === "received" ? "Add Quote" : "Record Quote"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="quotations" className="space-y-2">
            {quotations.length === 0 && <div className="p-6 text-center text-zinc-500">No quotations recorded yet.</div>}
            {quotations.map((qq: any) => {
              const sup = suppliers.find((s: any) => s.id === qq.rfq_supplier_id);
              const its = qItems.filter((i: any) => i.supplier_quotation_id === qq.id);
              return (
                <Card key={qq.id}><CardContent className="p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-medium">{sup?.supplier_name} — {qq.quotation_number ?? "—"}</div>
                      <div className="text-xs text-zinc-500">Date: {qq.quotation_date ?? "—"} • Valid to: {qq.quotation_valid_until ?? "—"} • Delivery: {qq.delivery_days ?? "—"} days</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{qq.currency} {fmt(qq.net_amount)}</div>
                      <div className="text-xs text-zinc-500">Score: {fmt(qq.evaluation_score)}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setQuoteSupplierId(qq.rfq_supplier_id); setEditQuoteId(qq.id); setQuoteOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => delQM.mutate(qq.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {its.length > 0 && (
                    <table className="w-full text-xs mt-2 border-t">
                      <thead><tr><th className="text-left p-1">Item</th><th className="text-right p-1">Qty</th><th className="text-right p-1">Rate</th><th className="text-right p-1">Amount</th></tr></thead>
                      <tbody>{its.map((i: any) => (
                        <tr key={i.id}><td className="p-1">{i.item_name}</td><td className="p-1 text-right">{fmt(i.quantity)}</td><td className="p-1 text-right">{fmt(i.quoted_rate)}</td><td className="p-1 text-right">{fmt(i.quoted_amount)}</td></tr>
                      ))}</tbody>
                    </table>
                  )}
                </CardContent></Card>
              );
            })}
          </TabsContent>

          <TabsContent value="comparison">
            {quotations.length === 0 ? <div className="p-6 text-center text-zinc-500">No quotations to compare yet.</div> : (
              <div className="overflow-x-auto">
                <table className="text-sm border rounded">
                  <thead className="bg-zinc-50"><tr>
                    <th className="p-2 text-left sticky left-0 bg-zinc-50">Item</th>
                    {quotations.map((qq: any) => {
                      const sup = suppliers.find((s: any) => s.id === qq.rfq_supplier_id);
                      return <th key={qq.id} className="p-2 text-right min-w-[150px]">{sup?.supplier_name}</th>;
                    })}
                  </tr></thead>
                  <tbody>
                    {items.map((it: any) => (
                      <tr key={it.id} className="border-t">
                        <td className="p-2 sticky left-0 bg-white">{it.item_name} <span className="text-xs text-zinc-500">({fmt(it.quantity)} {it.unit})</span></td>
                        {quotations.map((qq: any) => {
                          const qi = qItems.find((x: any) => x.supplier_quotation_id === qq.id && x.rfq_item_id === it.id);
                          return <td key={qq.id} className="p-2 text-right">{qi ? `${qq.currency} ${fmt(qi.quoted_amount)}` : "—"}</td>;
                        })}
                      </tr>
                    ))}
                    <tr className="border-t font-semibold bg-zinc-50">
                      <td className="p-2 sticky left-0 bg-zinc-50">Net Total</td>
                      {quotations.map((qq: any) => (
                        <td key={qq.id} className={`p-2 text-right ${low === Number(qq.net_amount) ? "text-emerald-700" : ""}`}>
                          {qq.currency} {fmt(qq.net_amount)}
                          {low === Number(qq.net_amount) && <Star className="inline h-3 w-3 ml-1" />}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t">
                      <td className="p-2 sticky left-0 bg-white">Delivery (days)</td>
                      {quotations.map((qq: any) => <td key={qq.id} className="p-2 text-right">{qq.delivery_days ?? "—"}</td>)}
                    </tr>
                    <tr className="border-t">
                      <td className="p-2 sticky left-0 bg-white">Payment Terms</td>
                      {quotations.map((qq: any) => <td key={qq.id} className="p-2 text-right text-xs">{qq.payment_terms ?? "—"}</td>)}
                    </tr>
                    <tr className="border-t">
                      <td className="p-2 sticky left-0 bg-white">Score</td>
                      {quotations.map((qq: any) => <td key={qq.id} className="p-2 text-right">{fmt(qq.evaluation_score)}</td>)}
                    </tr>
                    <tr className="border-t">
                      <td className="p-2 sticky left-0 bg-white"></td>
                      {quotations.map((qq: any) => (
                        <td key={qq.id} className="p-2 text-right">
                          {qq.is_selected ? <Badge className="bg-emerald-100 text-emerald-700"><Trophy className="h-3 w-3 mr-1" />Selected</Badge> :
                            <Button size="sm" variant="outline" disabled={["award_approved","converted_to_po"].includes(r.status)}
                              onClick={() => selectM.mutate({ rfq_supplier_id: qq.rfq_supplier_id, quotation_id: qq.id })}>Select</Button>
                          }
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-1 text-sm">
              {q.data.history.length === 0 && <div className="text-zinc-500">No status changes yet.</div>}
              {q.data.history.map((h: any) => (
                <div key={h.id} className="flex items-center gap-2 border-b py-1">
                  <span className="text-xs text-zinc-500">{new Date(h.created_at).toLocaleString()}</span>
                  <span>{h.old_status} → <strong>{h.new_status}</strong></span>
                  {h.remarks && <span className="text-xs text-zinc-500">— {h.remarks}</span>}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {quoteOpen && quoteSupplierId && (
          <QuotationDialog
            rfqId={rfqId}
            rfqSupplierId={quoteSupplierId}
            quotationId={editQuoteId}
            items={items}
            onClose={() => setQuoteOpen(false)}
            onSaved={() => { setQuoteOpen(false); refresh(); }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Quotation Dialog ──────────────────────────────────────────────────────
function QuotationDialog({ rfqId, rfqSupplierId, quotationId, items, onClose, onSaved }:
  { rfqId: string; rfqSupplierId: string; quotationId: string | null; items: any[]; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(saveSupplierQuotation);
  const get = useServerFn(getRfq);
  const [form, setForm] = useState<any>({
    quotation_number: "", quotation_date: new Date().toISOString().slice(0, 10), quotation_valid_until: "",
    currency: "MVR", discount_amount: 0, tax_amount: 0, delivery_days: null, payment_terms: "",
    warranty_terms: "", evaluation_score: 0, evaluation_notes: "",
  });
  const [lines, setLines] = useState<any[]>(items.map((i: any) => ({
    rfq_item_id: i.id, item_name: i.item_name, unit: i.unit, quantity: i.quantity, quoted_rate: 0,
  })));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!quotationId) return;
    get({ data: { id: rfqId } }).then((res: any) => {
      const q = res.quotations.find((x: any) => x.id === quotationId);
      if (q) {
        setForm({
          quotation_number: q.quotation_number ?? "", quotation_date: q.quotation_date ?? "",
          quotation_valid_until: q.quotation_valid_until ?? "", currency: q.currency,
          discount_amount: q.discount_amount, tax_amount: q.tax_amount,
          delivery_days: q.delivery_days, payment_terms: q.payment_terms ?? "",
          warranty_terms: q.warranty_terms ?? "", evaluation_score: q.evaluation_score,
          evaluation_notes: q.evaluation_notes ?? "",
        });
        const qis = res.quotationItems.filter((i: any) => i.supplier_quotation_id === quotationId);
        if (qis.length) setLines(qis.map((i: any) => ({ id: i.id, rfq_item_id: i.rfq_item_id, item_name: i.item_name, unit: i.unit, quantity: i.quantity, quoted_rate: i.quoted_rate })));
      }
    });
  }, [quotationId]);

  const total = lines.reduce((s, l) => s + Number(l.quantity ?? 0) * Number(l.quoted_rate ?? 0), 0);
  const net = total - Number(form.discount_amount ?? 0) + Number(form.tax_amount ?? 0);

  async function submit() {
    setSaving(true);
    try {
      await save({ data: {
        id: quotationId ?? undefined, rfq_id: rfqId, rfq_supplier_id: rfqSupplierId,
        ...form,
        discount_amount: Number(form.discount_amount ?? 0),
        tax_amount: Number(form.tax_amount ?? 0),
        evaluation_score: Number(form.evaluation_score ?? 0),
        delivery_days: form.delivery_days ? Number(form.delivery_days) : null,
        items: lines.map((l) => ({ ...l, quantity: Number(l.quantity ?? 0), quoted_rate: Number(l.quoted_rate ?? 0) })),
      } });
      toast.success("Quotation saved");
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{quotationId ? "Edit Quotation" : "Record Quotation"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div><Label>Quotation #</Label><Input value={form.quotation_number} onChange={(e) => setForm({ ...form, quotation_number: e.target.value })} /></div>
          <div><Label>Date</Label><Input type="date" value={form.quotation_date ?? ""} onChange={(e) => setForm({ ...form, quotation_date: e.target.value })} /></div>
          <div><Label>Valid Until</Label><Input type="date" value={form.quotation_valid_until ?? ""} onChange={(e) => setForm({ ...form, quotation_valid_until: e.target.value })} /></div>
          <div><Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["MVR","USD","EUR","GBP","AED","LKR","INR","CNY"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Delivery (days)</Label><Input type="number" value={form.delivery_days ?? ""} onChange={(e) => setForm({ ...form, delivery_days: e.target.value })} /></div>
          <div><Label>Score</Label><Input type="number" value={form.evaluation_score} onChange={(e) => setForm({ ...form, evaluation_score: e.target.value })} /></div>
          <div className="col-span-2"><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></div>
          <div><Label>Warranty</Label><Input value={form.warranty_terms} onChange={(e) => setForm({ ...form, warranty_terms: e.target.value })} /></div>
        </div>

        <table className="w-full text-sm border rounded mt-3">
          <thead className="bg-zinc-50"><tr>
            <th className="p-1 text-left">Item</th><th className="p-1 w-16">Unit</th><th className="p-1 w-20">Qty</th><th className="p-1 w-24">Rate</th><th className="p-1 w-24 text-right">Amount</th>
          </tr></thead>
          <tbody>{lines.map((l, i) => (
            <tr key={i} className="border-t">
              <td className="p-1">{l.item_name}</td>
              <td className="p-1">{l.unit}</td>
              <td className="p-1"><Input type="number" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} /></td>
              <td className="p-1"><Input type="number" value={l.quoted_rate} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, quoted_rate: e.target.value } : x))} /></td>
              <td className="p-1 text-right">{fmt(Number(l.quantity ?? 0) * Number(l.quoted_rate ?? 0))}</td>
            </tr>
          ))}</tbody>
        </table>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div><Label>Discount</Label><Input type="number" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} /></div>
          <div><Label>Tax</Label><Input type="number" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} /></div>
          <div className="text-right self-end">
            <div className="text-xs text-zinc-500">Subtotal: {fmt(total)}</div>
            <div className="font-semibold">Net: {form.currency} {fmt(net)}</div>
          </div>
        </div>

        <div><Label>Evaluation Notes</Label><Textarea value={form.evaluation_notes} onChange={(e) => setForm({ ...form, evaluation_notes: e.target.value })} /></div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save Quotation"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

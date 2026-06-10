import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Send, CheckCircle2, X as XIcon, Download, Trash2,
  FileText, Printer, Truck, DollarSign, Paperclip,
} from "lucide-react";

import {
  listPurchaseOrders, getPurchaseOrder, savePurchaseOrder, setPurchaseOrderStatus, archivePurchaseOrder,
  updatePoDelivery, updatePoPayment, createPoFromRfq, createPoFromMaterialRequest,
  addPoAttachment, deletePoAttachment,
  listSuppliersForPo, listMaterialRequestsForPo, listRfqsForPo, poStats,
} from "@/lib/purchase-orders.functions";
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
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-cyan-100 text-cyan-700",
  approved: "bg-emerald-100 text-emerald-700",
  issued: "bg-violet-100 text-violet-700",
  partially_delivered: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-200 text-emerald-800",
  closed: "bg-zinc-200 text-zinc-600",
  rejected: "bg-rose-100 text-rose-700",
  revision_requested: "bg-orange-100 text-orange-700",
  cancelled: "bg-rose-50 text-rose-500",
  archived: "bg-zinc-100 text-zinc-400",
};
const DELIVERY_STYLE: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700",
  not_delivered: "bg-zinc-100 text-zinc-700",
  partially_delivered: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-100 text-emerald-700",
  delayed: "bg-rose-100 text-rose-700",
  cancelled: "bg-rose-50 text-rose-500",
};
const PAYMENT_STYLE: Record<string, string> = {
  unpaid: "bg-zinc-100 text-zinc-700",
  partially_paid: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
  cancelled: "bg-rose-50 text-rose-500",
};
const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700",
  critical: "bg-rose-200 text-rose-800",
};
const UNITS = ["Nos","Set","Pair","Kg","Ton","m","m2","m3","Bags","Liter","Roll","Box","Bundle","Sheet","Length","Lot"];
const CURRENCIES = ["MVR","USD","EUR","GBP","AED","LKR","INR","CNY"];

const fmt = (n?: number | null) => Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function badge(s: string | null | undefined, map: Record<string, string>) {
  const k = String(s ?? "");
  const cls = map[k] ?? "bg-zinc-100 text-zinc-700";
  return <Badge className={`${cls} font-medium capitalize`}>{k.replaceAll("_", " ") || "—"}</Badge>;
}

type Props = { projectId?: string };

export function PurchaseOrderRegister({ projectId: pinnedProject }: Props) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string | undefined>(pinnedProject);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const list = useServerFn(listPurchaseOrders);
  const stats = useServerFn(poStats);
  const arch = useServerFn(archivePurchaseOrder);

  const effectiveProject = pinnedProject ?? projectId;

  const q = useQuery({
    queryKey: ["pos", effectiveProject, statusFilter],
    queryFn: () => list({ data: { projectId: effectiveProject, status: statusFilter !== "all" ? statusFilter : undefined } }),
  });
  const sQ = useQuery({
    queryKey: ["po-stats", effectiveProject],
    queryFn: () => stats({ data: { projectId: effectiveProject } }),
  });

  const archiveM = useMutation({
    mutationFn: (id: string) => arch({ data: { id } }),
    onSuccess: () => { toast.success("Purchase order archived"); qc.invalidateQueries({ queryKey: ["pos"] }); qc.invalidateQueries({ queryKey: ["po-stats"] }); setArchiveId(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to archive"),
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const data = q.data ?? [];
    if (!s) return data;
    return data.filter((r: any) =>
      [r.po_number, r.po_title, r.supplier_name, r.notes, r.delivery_location]
        .some((v: any) => String(v ?? "").toLowerCase().includes(s)),
    );
  }, [q.data, search]);

  function exportCsv() {
    if (!filtered.length) return toast.info("Nothing to export");
    const headers = ["PO No.","Title","Supplier","PO Date","Required Delivery","Currency","Subtotal","Tax","Total","Paid","Outstanding","Status","Delivery","Payment"];
    const csv = [headers.join(",")].concat(
      filtered.map((r: any) => [r.po_number,r.po_title,r.supplier_name,r.po_date,r.required_delivery_date,r.currency,r.subtotal_amount,r.tax_amount,r.total_amount,r.paid_amount,r.outstanding_amount,r.status,r.delivery_status,r.payment_status]
        .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")),
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `purchase-orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {!pinnedProject && (
        <div className="flex flex-wrap items-end gap-3">
          <ProjectPicker value={projectId ?? ""} onChange={setProjectId} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          ["Total", sQ.data?.total ?? 0],
          ["Draft", sQ.data?.draft ?? 0],
          ["Pending Approval", sQ.data?.pending_approval ?? 0],
          ["Approved", sQ.data?.approved ?? 0],
          ["Issued", sQ.data?.issued ?? 0],
          ["Partial Delivery", sQ.data?.partial ?? 0],
          ["Delivered", sQ.data?.delivered ?? 0],
          ["Overdue", sQ.data?.overdue_delivery ?? 0],
        ].map(([k, v]) => (
          <Card key={k as string}><CardContent className="p-3">
            <div className="text-xs text-zinc-500">{k}</div>
            <div className="text-xl font-semibold">{v as number}</div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card><CardContent className="p-3"><div className="text-xs text-zinc-500">Total PO Value</div><div className="text-lg font-semibold">{fmt(sQ.data?.total_value)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-zinc-500">Paid</div><div className="text-lg font-semibold text-emerald-600">{fmt(sQ.data?.paid_value)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-zinc-500">Outstanding</div><div className="text-lg font-semibold text-amber-600">{fmt(sQ.data?.outstanding_value)}</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
          <Input className="pl-8 w-72" placeholder="Search POs..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <Plus className="h-4 w-4 mr-1" />New PO
          </Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        {q.isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          : (filtered.length === 0)
            ? <div className="p-8 text-center text-zinc-500">{effectiveProject ? "No purchase orders yet. Click New PO to create one." : "Select a project to view purchase orders."}</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left">
                    <tr>
                      <th className="p-2">PO No.</th><th className="p-2">Supplier</th><th className="p-2">Title</th>
                      <th className="p-2">PO Date</th><th className="p-2">Required</th>
                      <th className="p-2 text-right">Total</th><th className="p-2 text-right">Outstanding</th>
                      <th className="p-2">Status</th><th className="p-2">Delivery</th><th className="p-2">Payment</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r: any) => (
                      <tr key={r.id} className="border-t hover:bg-zinc-50 cursor-pointer" onClick={() => setDetailId(r.id)}>
                        <td className="p-2 font-medium">{r.po_number}</td>
                        <td className="p-2">{r.supplier_name ?? "—"}</td>
                        <td className="p-2">{r.po_title ?? "—"}</td>
                        <td className="p-2">{r.po_date ?? "—"}</td>
                        <td className="p-2">{r.required_delivery_date ?? "—"}</td>
                        <td className="p-2 text-right">{r.currency} {fmt(r.total_amount)}</td>
                        <td className="p-2 text-right">{fmt(r.outstanding_amount)}</td>
                        <td className="p-2">{badge(r.status, STATUS_STYLE)}</td>
                        <td className="p-2">{badge(r.delivery_status, DELIVERY_STYLE)}</td>
                        <td className="p-2">{badge(r.payment_status, PAYMENT_STYLE)}</td>
                        <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => { setEditId(r.id); setOpenCreate(true); }}
                            disabled={!["draft","rejected","revision_requested"].includes(r.status)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setArchiveId(r.id)} disabled={r.is_archived}>
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
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
        <PoFormDialog
          open={openCreate}
          onClose={() => { setOpenCreate(false); setEditId(null); }}
          projectId={effectiveProject!}
          poId={editId}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["pos"] }); qc.invalidateQueries({ queryKey: ["po-stats"] }); setOpenCreate(false); setEditId(null); }}
        />
      )}

      {detailId && (
        <PoDetailSheet
          poId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => { setEditId(detailId); setOpenCreate(true); setDetailId(null); }}
          onChanged={() => { qc.invalidateQueries({ queryKey: ["pos"] }); qc.invalidateQueries({ queryKey: ["po-stats"] }); qc.invalidateQueries({ queryKey: ["po-detail", detailId] }); }}
        />
      )}

      <AlertDialog open={!!archiveId} onOpenChange={(v) => !v && setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive purchase order?</AlertDialogTitle>
            <AlertDialogDescription>This will hide the PO. Approved/issued POs should usually be cancelled instead.</AlertDialogDescription>
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

// =========================================================
// Create / Edit dialog
// =========================================================
function defaultItem() {
  return {
    item_name: "", description: "", unit: "Nos",
    ordered_quantity: 1, unit_rate: 0,
    discount_amount: 0, tax_amount: 0, remarks: "",
  };
}

function PoFormDialog({ open, onClose, projectId, poId, onSaved }: {
  open: boolean; onClose: () => void; projectId: string; poId: string | null; onSaved: () => void;
}) {
  const get = useServerFn(getPurchaseOrder);
  const save = useServerFn(savePurchaseOrder);
  const listSup = useServerFn(listSuppliersForPo);
  const listMr = useServerFn(listMaterialRequestsForPo);
  const listRfq = useServerFn(listRfqsForPo);
  const fromRfq = useServerFn(createPoFromRfq);
  const fromMr = useServerFn(createPoFromMaterialRequest);

  const detail = useQuery({
    queryKey: ["po-form", poId],
    queryFn: () => poId ? get({ data: { id: poId } }) : Promise.resolve(null as any),
    enabled: !!poId,
  });
  const sup = useQuery({ queryKey: ["po-suppliers"], queryFn: () => listSup() });
  const mrs = useQuery({ queryKey: ["po-mrs", projectId], queryFn: () => listMr({ data: { projectId } }) });
  const rfqs = useQuery({ queryKey: ["po-rfqs", projectId], queryFn: () => listRfq({ data: { projectId } }) });

  const [form, setForm] = useState<any>({
    po_title: "", supplier_id: null, supplier_name: "",
    supplier_email: "", supplier_phone: "", contact_person: "",
    po_date: new Date().toISOString().slice(0, 10),
    required_delivery_date: "", expected_delivery_date: "",
    delivery_location: "", currency: "MVR", priority: "medium",
    discount_amount: 0, tax_percentage: 0, shipping_amount: 0, other_charges: 0,
    payment_terms: "", delivery_terms: "", warranty_terms: "", terms_and_conditions: "",
    remarks: "", material_request_id: null, rfq_id: null,
    items: [defaultItem()],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!poId || !detail.data?.po) return;
    const p = detail.data.po;
    setForm({
      ...p,
      items: (detail.data.items ?? []).map((it: any) => ({
        id: it.id, item_name: it.item_name, description: it.description ?? "", specification: it.specification ?? "",
        unit: it.unit, ordered_quantity: Number(it.ordered_quantity ?? 0),
        delivered_quantity: Number(it.delivered_quantity ?? 0),
        unit_rate: Number(it.unit_rate ?? 0),
        discount_amount: Number(it.discount_amount ?? 0),
        tax_amount: Number(it.tax_amount ?? 0),
        boq_item_id: it.boq_item_id, cost_code_id: it.cost_code_id,
        budget_line_id: it.budget_line_id, wbs_id: it.wbs_id, task_id: it.task_id,
        material_request_item_id: it.material_request_item_id, rfq_item_id: it.rfq_item_id,
        supplier_quotation_item_id: it.supplier_quotation_item_id,
        remarks: it.remarks ?? "",
      })),
    });
  }, [poId, detail.data]);

  const totals = useMemo(() => {
    const items = form.items ?? [];
    const subtotal = items.reduce((s: number, it: any) => s + (Number(it.ordered_quantity ?? 0) * Number(it.unit_rate ?? 0)), 0);
    const tax = +(subtotal * Number(form.tax_percentage ?? 0) / 100).toFixed(2);
    const total = +(subtotal - Number(form.discount_amount ?? 0) + tax + Number(form.shipping_amount ?? 0) + Number(form.other_charges ?? 0)).toFixed(2);
    return { subtotal, tax, total };
  }, [form.items, form.discount_amount, form.tax_percentage, form.shipping_amount, form.other_charges]);

  function setField<K extends string>(k: K, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }
  function updateItem(i: number, k: string, v: any) {
    setForm((f: any) => ({ ...f, items: f.items.map((it: any, idx: number) => idx === i ? { ...it, [k]: v } : it) }));
  }
  function addItem() { setForm((f: any) => ({ ...f, items: [...(f.items ?? []), defaultItem()] })); }
  function removeItem(i: number) { setForm((f: any) => ({ ...f, items: f.items.filter((_: any, idx: number) => idx !== i) })); }

  async function importFromMr(id: string) {
    if (!id) return;
    try {
      const r = await fromMr({ data: { material_request_id: id, supplier_id: form.supplier_id, supplier_name: form.supplier_name } });
      toast.success(`PO ${r.po_number} created from MR`);
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function importFromRfq(id: string) {
    if (!id) return;
    try {
      const r = await fromRfq({ data: { rfq_id: id } });
      toast.success(`PO ${r.po_number} created from RFQ`);
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  async function onSave() {
    if (!form.supplier_name && !form.supplier_id) return toast.error("Supplier required");
    if (!form.items?.length) return toast.error("Add at least one item");
    if (form.items.some((it: any) => !it.item_name || Number(it.ordered_quantity) <= 0))
      return toast.error("Each item needs name and quantity > 0");
    setSaving(true);
    try {
      const payload = {
        id: poId ?? undefined, project_id: projectId,
        po_number: form.po_number || undefined,
        po_title: form.po_title || null,
        supplier_id: form.supplier_id || null,
        supplier_name: form.supplier_name || null,
        supplier_email: form.supplier_email || null,
        supplier_phone: form.supplier_phone || null,
        contact_person: form.contact_person || null,
        material_request_id: form.material_request_id || null,
        rfq_id: form.rfq_id || null,
        supplier_quotation_id: form.supplier_quotation_id || null,
        po_date: form.po_date || null,
        required_delivery_date: form.required_delivery_date || null,
        expected_delivery_date: form.expected_delivery_date || null,
        delivery_location: form.delivery_location || null,
        currency: form.currency || "MVR",
        discount_amount: Number(form.discount_amount ?? 0),
        tax_percentage: Number(form.tax_percentage ?? 0),
        shipping_amount: Number(form.shipping_amount ?? 0),
        other_charges: Number(form.other_charges ?? 0),
        payment_terms: form.payment_terms || null,
        delivery_terms: form.delivery_terms || null,
        warranty_terms: form.warranty_terms || null,
        terms_and_conditions: form.terms_and_conditions || null,
        priority: form.priority || "medium",
        remarks: form.remarks || null,
        items: form.items.map((it: any) => ({
          ...it,
          ordered_quantity: Number(it.ordered_quantity ?? 0),
          delivered_quantity: Number(it.delivered_quantity ?? 0),
          received_quantity: Number(it.received_quantity ?? 0),
          unit_rate: Number(it.unit_rate ?? 0),
          discount_amount: Number(it.discount_amount ?? 0),
          tax_amount: Number(it.tax_amount ?? 0),
        })),
      };
      await save({ data: payload });
      toast.success(poId ? "PO updated" : "PO created");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{poId ? "Edit Purchase Order" : "New Purchase Order"}</DialogTitle></DialogHeader>

        {!poId && (
          <Card><CardContent className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Create from Material Request</Label>
              <Select onValueChange={importFromMr}>
                <SelectTrigger><SelectValue placeholder="Select MR..." /></SelectTrigger>
                <SelectContent>
                  {(mrs.data ?? []).map((m: any) => (
                    <SelectItem key={m.id} value={m.id} disabled={m.converted_to_po}>
                      {m.request_number} — {m.request_title} {m.converted_to_po ? "(used)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Create from RFQ (selected supplier)</Label>
              <Select onValueChange={importFromRfq}>
                <SelectTrigger><SelectValue placeholder="Select RFQ..." /></SelectTrigger>
                <SelectContent>
                  {(rfqs.data ?? []).map((r: any) => (
                    <SelectItem key={r.id} value={r.id} disabled={r.converted_to_po || !r.selected_quotation_id}>
                      {r.rfq_number} — {r.rfq_title} {r.converted_to_po ? "(used)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent></Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>PO title</Label>
            <Input value={form.po_title ?? ""} onChange={(e) => setField("po_title", e.target.value)} />
          </div>
          <div>
            <Label>Supplier</Label>
            <Select value={form.supplier_id ?? ""} onValueChange={(v) => {
              const s = (sup.data ?? []).find((x: any) => x.id === v);
              setForm((f: any) => ({ ...f, supplier_id: v, supplier_name: s?.name ?? f.supplier_name, supplier_email: s?.email ?? f.supplier_email, supplier_phone: s?.phone ?? f.supplier_phone, contact_person: s?.contact_person ?? f.contact_person }));
            }}>
              <SelectTrigger><SelectValue placeholder="Choose supplier..." /></SelectTrigger>
              <SelectContent>
                {(sup.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Supplier name (override)</Label>
            <Input value={form.supplier_name ?? ""} onChange={(e) => setField("supplier_name", e.target.value)} />
          </div>
          <div><Label>Contact person</Label><Input value={form.contact_person ?? ""} onChange={(e) => setField("contact_person", e.target.value)} /></div>
          <div><Label>Supplier email</Label><Input type="email" value={form.supplier_email ?? ""} onChange={(e) => setField("supplier_email", e.target.value)} /></div>
          <div><Label>Supplier phone</Label><Input value={form.supplier_phone ?? ""} onChange={(e) => setField("supplier_phone", e.target.value)} /></div>
          <div><Label>PO date</Label><Input type="date" value={form.po_date ?? ""} onChange={(e) => setField("po_date", e.target.value)} /></div>
          <div><Label>Required delivery</Label><Input type="date" value={form.required_delivery_date ?? ""} onChange={(e) => setField("required_delivery_date", e.target.value)} /></div>
          <div><Label>Expected delivery</Label><Input type="date" value={form.expected_delivery_date ?? ""} onChange={(e) => setField("expected_delivery_date", e.target.value)} /></div>
          <div><Label>Delivery location</Label><Input value={form.delivery_location ?? ""} onChange={(e) => setField("delivery_location", e.target.value)} /></div>
          <div>
            <Label>Currency</Label>
            <Select value={form.currency ?? "MVR"} onValueChange={(v) => setField("currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority ?? "medium"} onValueChange={(v) => setField("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["low","medium","high","urgent","critical"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Payment terms</Label><Input value={form.payment_terms ?? ""} onChange={(e) => setField("payment_terms", e.target.value)} /></div>
          <div><Label>Delivery terms</Label><Input value={form.delivery_terms ?? ""} onChange={(e) => setField("delivery_terms", e.target.value)} /></div>
          <div><Label>Warranty terms</Label><Input value={form.warranty_terms ?? ""} onChange={(e) => setField("warranty_terms", e.target.value)} /></div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Items</h3>
            <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" />Add item</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="p-1 text-left">Item</th>
                  <th className="p-1 text-left w-24">Unit</th>
                  <th className="p-1 text-right w-24">Qty</th>
                  <th className="p-1 text-right w-28">Rate</th>
                  <th className="p-1 text-right w-24">Disc</th>
                  <th className="p-1 text-right w-24">Tax</th>
                  <th className="p-1 text-right w-28">Total</th>
                  <th className="p-1"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((it: any, i: number) => {
                  const amt = Number(it.ordered_quantity ?? 0) * Number(it.unit_rate ?? 0);
                  const tot = amt - Number(it.discount_amount ?? 0) + Number(it.tax_amount ?? 0);
                  return (
                    <tr key={i} className="border-t">
                      <td className="p-1">
                        <Input placeholder="Item name" value={it.item_name} onChange={(e) => updateItem(i, "item_name", e.target.value)} />
                        <Input className="mt-1" placeholder="Description" value={it.description ?? ""} onChange={(e) => updateItem(i, "description", e.target.value)} />
                      </td>
                      <td className="p-1">
                        <Select value={it.unit} onValueChange={(v) => updateItem(i, "unit", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="p-1"><Input type="number" min={0} step="0.001" value={it.ordered_quantity} onChange={(e) => updateItem(i, "ordered_quantity", e.target.value)} className="text-right" /></td>
                      <td className="p-1"><Input type="number" min={0} step="0.01" value={it.unit_rate} onChange={(e) => updateItem(i, "unit_rate", e.target.value)} className="text-right" /></td>
                      <td className="p-1"><Input type="number" min={0} step="0.01" value={it.discount_amount} onChange={(e) => updateItem(i, "discount_amount", e.target.value)} className="text-right" /></td>
                      <td className="p-1"><Input type="number" min={0} step="0.01" value={it.tax_amount} onChange={(e) => updateItem(i, "tax_amount", e.target.value)} className="text-right" /></td>
                      <td className="p-1 text-right font-medium">{fmt(tot)}</td>
                      <td className="p-1"><Button size="sm" variant="ghost" onClick={() => removeItem(i)}><XIcon className="h-3.5 w-3.5" /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Header discount</Label><Input type="number" min={0} value={form.discount_amount} onChange={(e) => setField("discount_amount", e.target.value)} /></div>
            <div><Label>Tax %</Label><Input type="number" min={0} max={100} value={form.tax_percentage} onChange={(e) => setField("tax_percentage", e.target.value)} /></div>
            <div><Label>Shipping</Label><Input type="number" min={0} value={form.shipping_amount} onChange={(e) => setField("shipping_amount", e.target.value)} /></div>
            <div><Label>Other charges</Label><Input type="number" min={0} value={form.other_charges} onChange={(e) => setField("other_charges", e.target.value)} /></div>
          </div>
          <Card><CardContent className="p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-medium">{form.currency} {fmt(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-{fmt(form.discount_amount)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{fmt(totals.tax)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{fmt(form.shipping_amount)}</span></div>
            <div className="flex justify-between"><span>Other</span><span>{fmt(form.other_charges)}</span></div>
            <div className="flex justify-between text-base pt-1 border-t font-semibold"><span>Total</span><span>{form.currency} {fmt(totals.total)}</span></div>
          </CardContent></Card>
        </div>

        <div>
          <Label>Terms & Conditions</Label>
          <Textarea rows={3} value={form.terms_and_conditions ?? ""} onChange={(e) => setField("terms_and_conditions", e.target.value)} />
        </div>
        <div>
          <Label>Remarks</Label>
          <Textarea rows={2} value={form.remarks ?? ""} onChange={(e) => setField("remarks", e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : (poId ? "Save Changes" : "Save Draft")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Detail sheet
// =========================================================
function PoDetailSheet({ poId, onClose, onEdit, onChanged }: { poId: string; onClose: () => void; onEdit: () => void; onChanged: () => void; }) {
  const get = useServerFn(getPurchaseOrder);
  const setStatus = useServerFn(setPurchaseOrderStatus);
  const updDel = useServerFn(updatePoDelivery);
  const updPay = useServerFn(updatePoPayment);
  const addAtt = useServerFn(addPoAttachment);
  const delAtt = useServerFn(deletePoAttachment);

  const d = useQuery({ queryKey: ["po-detail", poId], queryFn: () => get({ data: { id: poId } }) });
  const [reasonOpen, setReasonOpen] = useState<null | "rejected" | "revision_requested">(null);
  const [reason, setReason] = useState("");
  const [showPrint, setShowPrint] = useState(false);

  if (d.isLoading || !d.data?.po) {
    return (
      <Sheet open={true} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto"><Skeleton className="h-32" /></SheetContent>
      </Sheet>
    );
  }
  const po = d.data.po as any;
  const items = d.data.items as any[];
  const attachments = d.data.attachments as any[];
  const history = d.data.history as any[];
  const deliveries = d.data.deliveries as any[];

  async function changeStatus(status: string, remarks?: string) {
    try {
      await setStatus({ data: { id: poId, status, remarks } });
      toast.success(`Status: ${status.replaceAll("_", " ")}`);
      onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <Sheet open={true} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {po.po_number} — {po.po_title ?? "Purchase Order"}
            {badge(po.status, STATUS_STYLE)} {badge(po.delivery_status, DELIVERY_STYLE)} {badge(po.payment_status, PAYMENT_STYLE)}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 my-3">
          {["draft","rejected","revision_requested"].includes(po.status) && (
            <Button size="sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
          )}
          {po.status === "draft" && (
            <Button size="sm" onClick={() => changeStatus("submitted")}><Send className="h-3.5 w-3.5 mr-1" />Submit</Button>
          )}
          {po.status === "submitted" && (
            <>
              <Button size="sm" onClick={() => changeStatus("approved")}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => { setReasonOpen("revision_requested"); setReason(""); }}>Request Revision</Button>
              <Button size="sm" variant="destructive" onClick={() => { setReasonOpen("rejected"); setReason(""); }}>Reject</Button>
            </>
          )}
          {po.status === "approved" && (
            <Button size="sm" onClick={() => changeStatus("issued")}><Send className="h-3.5 w-3.5 mr-1" />Issue PO</Button>
          )}
          {["issued","partially_delivered","delivered"].includes(po.status) && (
            <Button size="sm" variant="outline" onClick={() => changeStatus("closed")}>Close PO</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowPrint(true)}><Printer className="h-3.5 w-3.5 mr-1" />Preview / Print</Button>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="attachments">Files ({attachments.length})</TabsTrigger>
            <TabsTrigger value="history">History ({history.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label="Supplier" value={po.supplier_name} />
              <Field label="Contact" value={po.contact_person} />
              <Field label="Email" value={po.supplier_email} />
              <Field label="Phone" value={po.supplier_phone} />
              <Field label="PO Date" value={po.po_date} />
              <Field label="Required Delivery" value={po.required_delivery_date} />
              <Field label="Expected Delivery" value={po.expected_delivery_date} />
              <Field label="Delivery Location" value={po.delivery_location} />
              <Field label="Currency" value={po.currency} />
              <Field label="Priority" value={po.priority} />
              <Field label="Subtotal" value={fmt(po.subtotal_amount)} />
              <Field label="Tax" value={fmt(po.tax_amount)} />
              <Field label="Discount" value={fmt(po.discount_amount)} />
              <Field label="Shipping" value={fmt(po.shipping_amount)} />
              <Field label="Other" value={fmt(po.other_charges)} />
              <Field label="Total" value={`${po.currency} ${fmt(po.total_amount)}`} />
              <Field label="Invoiced" value={fmt(po.invoiced_amount)} />
              <Field label="Paid" value={fmt(po.paid_amount)} />
              <Field label="Outstanding" value={fmt(po.outstanding_amount)} />
              <Field label="Payment Terms" value={po.payment_terms} />
              <Field label="Delivery Terms" value={po.delivery_terms} />
              <Field label="Warranty" value={po.warranty_terms} />
            </div>
            {po.rejection_reason && <div className="mt-3 p-2 rounded bg-rose-50 text-rose-700 text-sm"><b>Rejection:</b> {po.rejection_reason}</div>}
            {po.revision_notes && <div className="mt-3 p-2 rounded bg-orange-50 text-orange-700 text-sm"><b>Revision notes:</b> {po.revision_notes}</div>}
            {po.terms_and_conditions && <div className="mt-3"><div className="font-medium text-sm mb-1">Terms & Conditions</div><div className="text-sm whitespace-pre-wrap">{po.terms_and_conditions}</div></div>}
            {po.remarks && <div className="mt-3"><div className="font-medium text-sm mb-1">Remarks</div><div className="text-sm whitespace-pre-wrap">{po.remarks}</div></div>}
          </TabsContent>

          <TabsContent value="items" className="pt-3">
            <ItemsTable items={items} currency={po.currency} />
          </TabsContent>

          <TabsContent value="delivery" className="pt-3">
            <DeliveryEditor poId={poId} items={items} onSaved={onChanged} />
            {deliveries.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">Linked Deliveries</h4>
                <table className="w-full text-sm border">
                  <thead className="bg-zinc-50"><tr><th className="p-2 text-left">Reference</th><th className="p-2">Date</th><th className="p-2">Status</th></tr></thead>
                  <tbody>{deliveries.map((dv: any) => (
                    <tr key={dv.id} className="border-t"><td className="p-2">{dv.delivery_number ?? dv.id.slice(0,8)}</td><td className="p-2">{dv.delivery_date}</td><td className="p-2">{dv.status}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payment" className="pt-3">
            <PaymentEditor po={po} onSaved={onChanged} updPay={updPay} />
          </TabsContent>

          <TabsContent value="attachments" className="pt-3">
            <AttachmentsPanel poId={poId} attachments={attachments} addAtt={addAtt} delAtt={delAtt} onChanged={onChanged} />
          </TabsContent>

          <TabsContent value="history" className="pt-3">
            {history.length === 0 ? <div className="text-sm text-zinc-500">No history yet.</div> : (
              <div className="space-y-2">{history.map((h: any) => (
                <div key={h.id} className="text-sm border rounded p-2">
                  <div><b>{(h.old_status ?? "—")} → {h.new_status}</b> <span className="text-zinc-500">· {new Date(h.created_at).toLocaleString()}</span></div>
                  {h.remarks && <div className="text-zinc-700 mt-1">{h.remarks}</div>}
                </div>
              ))}</div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!reasonOpen} onOpenChange={(v) => !v && setReasonOpen(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{reasonOpen === "rejected" ? "Reject PO" : "Request Revision"}</DialogTitle></DialogHeader>
            <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason / notes..." />
            <DialogFooter>
              <Button variant="outline" onClick={() => setReasonOpen(null)}>Cancel</Button>
              <Button onClick={async () => {
                if (!reason.trim()) return toast.error("Reason required");
                await changeStatus(reasonOpen!, reason);
                setReasonOpen(null);
              }}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {showPrint && <PoPrintDialog po={po} items={items} onClose={() => setShowPrint(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );
}

function ItemsTable({ items, currency }: { items: any[]; currency: string }) {
  if (!items.length) return <div className="text-sm text-zinc-500">No items.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border">
        <thead className="bg-zinc-50"><tr>
          <th className="p-2 text-left">Item</th><th className="p-2">Unit</th>
          <th className="p-2 text-right">Ordered</th><th className="p-2 text-right">Delivered</th>
          <th className="p-2 text-right">Balance</th><th className="p-2 text-right">Rate</th>
          <th className="p-2 text-right">Total</th><th className="p-2">Delivery</th>
        </tr></thead>
        <tbody>{items.map((it) => (
          <tr key={it.id} className="border-t">
            <td className="p-2"><div className="font-medium">{it.item_name}</div><div className="text-xs text-zinc-500">{it.description ?? ""}</div></td>
            <td className="p-2">{it.unit}</td>
            <td className="p-2 text-right">{fmt(it.ordered_quantity)}</td>
            <td className="p-2 text-right">{fmt(it.delivered_quantity)}</td>
            <td className="p-2 text-right">{fmt(it.balance_quantity)}</td>
            <td className="p-2 text-right">{fmt(it.unit_rate)}</td>
            <td className="p-2 text-right">{currency} {fmt(it.total_amount)}</td>
            <td className="p-2">{badge(it.delivery_status, DELIVERY_STYLE)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function DeliveryEditor({ poId, items, onSaved }: { poId: string; items: any[]; onSaved: () => void }) {
  const upd = useServerFn(updatePoDelivery);
  const [rows, setRows] = useState(() => items.map((it) => ({
    id: it.id, item_name: it.item_name, unit: it.unit,
    ordered: Number(it.ordered_quantity ?? 0),
    delivered: Number(it.delivered_quantity ?? 0),
    received: Number(it.received_quantity ?? 0),
    remarks: it.remarks ?? "",
  })));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setRows(items.map((it) => ({
    id: it.id, item_name: it.item_name, unit: it.unit,
    ordered: Number(it.ordered_quantity ?? 0),
    delivered: Number(it.delivered_quantity ?? 0),
    received: Number(it.received_quantity ?? 0),
    remarks: it.remarks ?? "",
  }))); }, [items]);
  if (!items.length) return <div className="text-sm text-zinc-500">No items.</div>;
  async function save() {
    setSaving(true);
    try {
      await upd({ data: { purchase_order_id: poId, items: rows.map((r) => ({ id: r.id, delivered_quantity: r.delivered, received_quantity: r.received, remarks: r.remarks })) } });
      toast.success("Delivery updated");
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); } finally { setSaving(false); }
  }
  return (
    <div className="space-y-2">
      <table className="w-full text-sm border">
        <thead className="bg-zinc-50"><tr>
          <th className="p-2 text-left">Item</th><th className="p-2">Unit</th>
          <th className="p-2 text-right">Ordered</th><th className="p-2 text-right">Delivered</th>
          <th className="p-2 text-right">Received</th><th className="p-2 text-right">Balance</th>
        </tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.id} className="border-t">
            <td className="p-2">{r.item_name}</td><td className="p-2">{r.unit}</td>
            <td className="p-2 text-right">{fmt(r.ordered)}</td>
            <td className="p-2"><Input type="number" min={0} step="0.001" value={r.delivered} onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, delivered: Number(e.target.value) } : x))} className="text-right" /></td>
            <td className="p-2"><Input type="number" min={0} step="0.001" value={r.received} onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, received: Number(e.target.value) } : x))} className="text-right" /></td>
            <td className="p-2 text-right">{fmt(Math.max(0, r.ordered - r.delivered))}</td>
          </tr>
        ))}</tbody>
      </table>
      <Button size="sm" onClick={save} disabled={saving}><Truck className="h-3.5 w-3.5 mr-1" />{saving ? "Saving..." : "Save delivery"}</Button>
    </div>
  );
}

function PaymentEditor({ po, onSaved, updPay }: { po: any; onSaved: () => void; updPay: any }) {
  const [invoiced, setInvoiced] = useState<number>(Number(po.invoiced_amount ?? 0));
  const [paid, setPaid] = useState<number>(Number(po.paid_amount ?? 0));
  const [ref, setRef] = useState<string>(po.payment_reference ?? "");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await updPay({ data: { id: po.id, invoiced_amount: invoiced, paid_amount: paid, payment_reference: ref } });
      toast.success("Payment updated"); onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); } finally { setSaving(false); }
  }
  const outstanding = Math.max(0, Number(po.total_amount ?? 0) - paid);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
      <div><Label>Total</Label><Input readOnly value={fmt(po.total_amount)} /></div>
      <div><Label>Invoiced amount</Label><Input type="number" min={0} value={invoiced} onChange={(e) => setInvoiced(Number(e.target.value))} /></div>
      <div><Label>Paid amount</Label><Input type="number" min={0} value={paid} onChange={(e) => setPaid(Number(e.target.value))} /></div>
      <div><Label>Outstanding</Label><Input readOnly value={fmt(outstanding)} /></div>
      <div className="md:col-span-2"><Label>Payment reference</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} /></div>
      <div><Button onClick={save} disabled={saving}><DollarSign className="h-3.5 w-3.5 mr-1" />{saving ? "Saving..." : "Save payment"}</Button></div>
    </div>
  );
}

function AttachmentsPanel({ poId, attachments, addAtt, delAtt, onChanged }: any) {
  const [name, setName] = useState(""); const [url, setUrl] = useState(""); const [type, setType] = useState("po_document"); const [desc, setDesc] = useState("");
  async function add() {
    if (!name || !url) return toast.error("Name and URL required");
    try { await addAtt({ data: { purchase_order_id: poId, file_name: name, file_url: url, attachment_type: type, description: desc } });
      toast.success("Attachment added"); setName(""); setUrl(""); setDesc(""); onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function del(id: string) {
    try { await delAtt({ data: { id } }); toast.success("Removed"); onChanged(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  return (
    <div className="space-y-3">
      <Card><CardContent className="p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
        <Input placeholder="File name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{["po_document","supplier_quotation","rfq_comparison","material_request","technical_specification","drawing","approval_document","delivery_note","invoice","payment_proof","supporting_document"].map((t) => <SelectItem key={t} value={t}>{t.replaceAll("_"," ")}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={add}><Paperclip className="h-3.5 w-3.5 mr-1" />Add</Button>
        <Input className="md:col-span-4" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </CardContent></Card>
      {attachments.length === 0 ? <div className="text-sm text-zinc-500">No attachments.</div> :
        <ul className="text-sm divide-y border rounded">{attachments.map((a: any) => (
          <li key={a.id} className="flex items-center justify-between p-2">
            <div><a href={a.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline"><FileText className="h-3.5 w-3.5 inline mr-1" />{a.file_name}</a> <span className="text-xs text-zinc-500">· {a.attachment_type}</span>{a.description && <div className="text-xs text-zinc-500">{a.description}</div>}</div>
            <Button size="sm" variant="ghost" onClick={() => del(a.id)}><Trash2 className="h-3.5 w-3.5 text-rose-600" /></Button>
          </li>
        ))}</ul>}
    </div>
  );
}

function PoPrintDialog({ po, items, onClose }: { po: any; items: any[]; onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Purchase Order Preview</DialogTitle></DialogHeader>
        <div id="po-print" className="bg-white p-6 text-sm">
          <div className="flex justify-between items-start border-b pb-3 mb-3">
            <div><div className="text-xl font-bold">PURCHASE ORDER</div><div>{po.po_number}</div></div>
            <div className="text-right"><div>Date: {po.po_date}</div><div>Required: {po.required_delivery_date ?? "—"}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><div className="font-semibold">Supplier</div><div>{po.supplier_name}</div><div>{po.contact_person}</div><div>{po.supplier_email}</div><div>{po.supplier_phone}</div></div>
            <div><div className="font-semibold">Deliver to</div><div>{po.delivery_location ?? "—"}</div></div>
          </div>
          <table className="w-full border text-sm">
            <thead className="bg-zinc-100"><tr><th className="p-1 text-left">Item</th><th className="p-1">Unit</th><th className="p-1 text-right">Qty</th><th className="p-1 text-right">Rate</th><th className="p-1 text-right">Amount</th></tr></thead>
            <tbody>{items.map((it) => (
              <tr key={it.id} className="border-t"><td className="p-1"><div className="font-medium">{it.item_name}</div><div className="text-xs">{it.description ?? ""}</div></td><td className="p-1 text-center">{it.unit}</td><td className="p-1 text-right">{fmt(it.ordered_quantity)}</td><td className="p-1 text-right">{fmt(it.unit_rate)}</td><td className="p-1 text-right">{fmt(it.total_amount)}</td></tr>
            ))}</tbody>
          </table>
          <div className="flex justify-end mt-3">
            <div className="w-72 space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmt(po.subtotal_amount)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-{fmt(po.discount_amount)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{fmt(po.tax_amount)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{fmt(po.shipping_amount)}</span></div>
              <div className="flex justify-between"><span>Other</span><span>{fmt(po.other_charges)}</span></div>
              <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{po.currency} {fmt(po.total_amount)}</span></div>
            </div>
          </div>
          {po.payment_terms && <div className="mt-3"><b>Payment terms:</b> {po.payment_terms}</div>}
          {po.delivery_terms && <div><b>Delivery terms:</b> {po.delivery_terms}</div>}
          {po.warranty_terms && <div><b>Warranty:</b> {po.warranty_terms}</div>}
          {po.terms_and_conditions && <div className="mt-3 whitespace-pre-wrap text-xs">{po.terms_and_conditions}</div>}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t">
            <div><div className="border-t pt-1 text-xs">Prepared by</div></div>
            <div><div className="border-t pt-1 text-xs">Approved by</div></div>
            <div><div className="border-t pt-1 text-xs">Issued by</div></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()}><Printer className="h-3.5 w-3.5 mr-1" />Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

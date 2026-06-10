import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Search, Archive, Pencil, CheckCircle2, X as XIcon, FileText, Truck, Download,
  ShieldCheck, ClipboardCheck, AlertTriangle, Printer, Paperclip, Trash2,
} from "lucide-react";

import {
  listDeliveries, getDelivery, saveDelivery, setDeliveryStatus, archiveDelivery,
  inspectDeliveryItems, addDeliveryAttachment, deleteDeliveryAttachment,
  createDeliveryFromPo, deliveryStats, listSuppliersLite, listPosForDelivery,
} from "@/lib/deliveries.functions";
import { ProjectPicker } from "@/components/project-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  received: "bg-blue-100 text-blue-700",
  inspected: "bg-indigo-100 text-indigo-700",
  accepted: "bg-emerald-100 text-emerald-700",
  partially_accepted: "bg-teal-100 text-teal-700",
  rejected: "bg-rose-100 text-rose-700",
  partially_rejected: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-200 text-emerald-800",
  closed: "bg-zinc-200 text-zinc-600",
  cancelled: "bg-rose-50 text-rose-500",
  archived: "bg-zinc-100 text-zinc-400",
};
const INSP_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  not_required: "bg-zinc-100 text-zinc-600",
  in_progress: "bg-blue-100 text-blue-700",
  passed: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  partially_passed: "bg-orange-100 text-orange-700",
};
const UNITS = ["Nos","Set","Pair","Kg","Ton","m","m2","m3","Bags","Liter","Roll","Box","Bundle","Sheet","Length","Lot"];
const CONDITIONS = ["good","damaged","partially_damaged","short_delivered","excess_delivered","wrong_item","pending_inspection"];

type Item = {
  id?: string;
  purchase_order_item_id?: string | null;
  item_code?: string | null;
  item_name: string;
  description?: string | null;
  unit: string;
  ordered_quantity: number;
  previously_delivered_quantity?: number;
  delivered_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  damaged_quantity: number;
  balance_quantity?: number;
  unit_rate: number;
  delivered_amount?: number;
  batch_number?: string | null;
  serial_number?: string | null;
  expiry_date?: string | null;
  condition?: string;
  inspection_result?: string;
  storage_location?: string | null;
  remarks?: string | null;
};

function emptyItem(): Item {
  return {
    item_name: "", unit: "Nos", ordered_quantity: 0,
    delivered_quantity: 0, accepted_quantity: 0, rejected_quantity: 0, damaged_quantity: 0,
    unit_rate: 0, condition: "good", inspection_result: "pending",
  };
}

function csvDownload(rows: any[]) {
  const headers = ["Delivery No.","Project","Supplier","PO","Delivery Note","Invoice","Delivery Date","Status","Inspection","Condition","Value"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.delivery_number, r.project_id, r.supplier_name ?? "", r.purchase_order_id ?? "",
      r.delivery_note_number ?? "", r.invoice_number ?? "", r.delivery_date ?? "",
      r.status, r.inspection_status, r.delivery_condition, r.total_amount ?? 0,
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `deliveries-${Date.now()}.csv`;
  a.click();
}

export function DeliveryRegister({ projectId, variant = "full" }: { projectId?: string; variant?: "full" | "compact" }) {
  const [filterProject, setFilterProject] = useState<string>(projectId ?? "");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [openFromPo, setOpenFromPo] = useState(false);

  const effectiveProject = projectId ?? filterProject;
  const qc = useQueryClient();
  const fetchList = useServerFn(listDeliveries);
  const fetchStats = useServerFn(deliveryStats);
  const archiveFn = useServerFn(archiveDelivery);

  const listQ = useQuery({
    queryKey: ["deliveries", effectiveProject || "all", statusFilter],
    queryFn: () => fetchList({ data: { projectId: effectiveProject || undefined, status: statusFilter === "all" ? undefined : statusFilter } }),
  });
  const statsQ = useQuery({
    queryKey: ["deliveries-stats", effectiveProject || "all"],
    queryFn: () => fetchStats({ data: { projectId: effectiveProject || undefined } }),
  });

  const filtered = useMemo(() => {
    const rows = (listQ.data ?? []) as any[];
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      [r.delivery_number, r.delivery_title, r.supplier_name, r.delivery_note_number, r.invoice_number, r.vehicle_number, r.driver_name]
        .some((v) => String(v ?? "").toLowerCase().includes(s))
    );
  }, [listQ.data, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["deliveries"] });
    qc.invalidateQueries({ queryKey: ["deliveries-stats"] });
    qc.invalidateQueries({ queryKey: ["delivery"] });
  };

  return (
    <div className="space-y-6">
      {variant === "full" && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold">Deliveries / Goods Receipt</h1>
            <p className="text-sm text-muted-foreground">Receive, inspect, accept, and track material deliveries against purchase orders.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => csvDownload(filtered)}><Download className="size-4 mr-1" /> CSV</Button>
            <Button variant="outline" size="sm" onClick={() => setOpenFromPo(true)} disabled={!effectiveProject}>
              <Truck className="size-4 mr-1" /> From PO
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }} disabled={!effectiveProject}>
              <Plus className="size-4 mr-1" /> New Delivery
            </Button>
          </div>
        </div>
      )}

      {variant === "full" && (
        <Card><CardContent className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Total" value={statsQ.data?.total ?? 0} />
          <Stat label="Draft" value={statsQ.data?.draft ?? 0} />
          <Stat label="Received" value={statsQ.data?.received ?? 0} />
          <Stat label="Pending Inspection" value={statsQ.data?.pending_inspection ?? 0} />
          <Stat label="Accepted" value={statsQ.data?.accepted ?? 0} />
          <Stat label="Rejected" value={statsQ.data?.rejected ?? 0} />
          <Stat label="Approved" value={statsQ.data?.approved ?? 0} />
          <Stat label="This Week" value={statsQ.data?.this_week ?? 0} />
          <Stat label="Damaged" value={statsQ.data?.damaged ?? 0} />
          <Stat label="Value" value={(statsQ.data?.value ?? 0).toLocaleString()} />
        </CardContent></Card>
      )}

      <Card><CardContent className="p-4 flex flex-wrap gap-2 items-center">
        {!projectId && (
          <div className="min-w-[220px]">
            <ProjectPicker value={filterProject} onChange={setFilterProject} placeholder="All projects" />
          </div>
        )}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(STATUS_STYLE).map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search delivery, supplier, note, invoice, vehicle…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        {listQ.isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Truck className="size-10 mx-auto mb-3 opacity-50" />
            No deliveries yet. {effectiveProject ? "Create your first delivery." : "Pick a project to start."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Delivery #</th>
                  <th className="text-left p-3">Supplier</th>
                  <th className="text-left p-3">Note #</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Inspection</th>
                  <th className="text-right p-3">Value</th>
                  <th className="text-right p-3 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/40 cursor-pointer" onClick={() => setDetailId(r.id)}>
                    <td className="p-3 font-mono text-xs">{r.delivery_number}</td>
                    <td className="p-3">{r.supplier_name ?? "—"}</td>
                    <td className="p-3 text-xs">{r.delivery_note_number ?? "—"}</td>
                    <td className="p-3">{r.delivery_date}</td>
                    <td className="p-3"><Badge className={STATUS_STYLE[r.status] ?? ""} variant="secondary">{String(r.status).replace(/_/g," ")}</Badge></td>
                    <td className="p-3"><Badge className={INSP_STYLE[r.inspection_status] ?? ""} variant="secondary">{String(r.inspection_status).replace(/_/g," ")}</Badge></td>
                    <td className="p-3 text-right tabular-nums">{Number(r.total_amount ?? 0).toLocaleString()}</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpenForm(true); }} disabled={!["draft","received"].includes(r.status)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmArchive(r.id)}>
                        <Archive className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>

      {openForm && (
        <DeliveryFormDialog
          open={openForm}
          onClose={() => { setOpenForm(false); setEditing(null); }}
          projectId={effectiveProject}
          editing={editing}
          onSaved={() => { invalidate(); setOpenForm(false); setEditing(null); }}
        />
      )}

      {openFromPo && (
        <FromPoDialog
          open={openFromPo}
          onClose={() => setOpenFromPo(false)}
          projectId={effectiveProject}
          onCreated={(id) => { invalidate(); setOpenFromPo(false); setDetailId(id); }}
        />
      )}

      {detailId && (
        <DeliveryDetailSheet id={detailId} onClose={() => setDetailId(null)} onChanged={invalidate} />
      )}

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive delivery?</AlertDialogTitle>
            <AlertDialogDescription>
              The delivery will be hidden. Linked PO / Material Request quantity rollups are not reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!confirmArchive) return;
              try {
                await (archiveFn as any)({ data: { id: confirmArchive } });
                toast.success("Delivery archived");
                invalidate();
              } catch (e: any) {
                toast.error(e?.message ?? "Failed to archive");
              } finally { setConfirmArchive(null); }
            }}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border rounded-sm p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/* ------------------------- Form Dialog ------------------------- */

function DeliveryFormDialog({ open, onClose, projectId, editing, onSaved }: {
  open: boolean; onClose: () => void; projectId: string; editing: any | null; onSaved: () => void;
}) {
  const save = useServerFn(saveDelivery);
  const fetchSuppliers = useServerFn(listSuppliersLite);
  const suppliers = useQuery({ queryKey: ["suppliers-lite"], queryFn: () => fetchSuppliers() });

  const init = editing ?? {};
  const [form, setForm] = useState<any>({
    id: init.id,
    project_id: projectId,
    delivery_number: init.delivery_number ?? "",
    delivery_title: init.delivery_title ?? "",
    supplier_id: init.supplier_id ?? null,
    supplier_name: init.supplier_name ?? "",
    supplier_contact: init.supplier_contact ?? "",
    delivery_note_number: init.delivery_note_number ?? "",
    invoice_number: init.invoice_number ?? "",
    vehicle_number: init.vehicle_number ?? "",
    driver_name: init.driver_name ?? "",
    driver_phone: init.driver_phone ?? "",
    delivery_date: init.delivery_date ?? new Date().toISOString().slice(0, 10),
    delivery_time: init.delivery_time ?? "",
    delivery_location: init.delivery_location ?? "",
    storage_location: init.storage_location ?? "",
    delivery_condition: init.delivery_condition ?? "good",
    status: init.status ?? "draft",
    remarks: init.remarks ?? "",
  });
  const [items, setItems] = useState<Item[]>(editing?.items?.length ? editing.items : [emptyItem()]);

  const updateItem = (i: number, patch: Partial<Item>) => {
    setItems((xs) => xs.map((it, idx) => {
      if (idx !== i) return it;
      const merged = { ...it, ...patch } as Item;
      const ord = Number(merged.ordered_quantity ?? 0);
      const prev = Number(merged.previously_delivered_quantity ?? 0);
      const acc = Number(merged.accepted_quantity ?? 0);
      merged.balance_quantity = Math.max(0, +(ord - prev - acc).toFixed(3));
      merged.delivered_amount = +(acc * Number(merged.unit_rate ?? 0)).toFixed(2);
      return merged;
    }));
  };

  const totalValue = useMemo(
    () => items.reduce((s, it) => s + Number(it.accepted_quantity ?? 0) * Number(it.unit_rate ?? 0), 0),
    [items]
  );

  const onSubmit = async () => {
    if (!form.project_id) return toast.error("Project is required");
    if (!form.delivery_date) return toast.error("Delivery date is required");
    if (!items.length || !items[0].item_name) return toast.error("Add at least one item");
    try {
      await (save as any)({ data: { ...form, supplier_id: form.supplier_id || null, items } });
      toast.success(editing ? "Delivery updated" : "Delivery created");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Delivery" : "New Delivery"}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Delivery No.">
            <Input value={form.delivery_number} onChange={(e) => setForm({ ...form, delivery_number: e.target.value })} placeholder="Auto-generated" />
          </Field>
          <Field label="Delivery Title">
            <Input value={form.delivery_title} onChange={(e) => setForm({ ...form, delivery_title: e.target.value })} />
          </Field>
          <Field label="Delivery Date *">
            <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
          </Field>
          <Field label="Delivery Time">
            <Input type="time" value={form.delivery_time ?? ""} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} />
          </Field>
          <Field label="Supplier">
            <Select value={form.supplier_id ?? "none"} onValueChange={(v) => {
              if (v === "none") return setForm({ ...form, supplier_id: null });
              const s = (suppliers.data ?? []).find((x: any) => x.id === v);
              setForm({ ...form, supplier_id: v, supplier_name: s?.name ?? form.supplier_name, supplier_contact: s?.phone ?? form.supplier_contact });
            }}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {(suppliers.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Supplier Name">
            <Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
          </Field>
          <Field label="Supplier Contact">
            <Input value={form.supplier_contact} onChange={(e) => setForm({ ...form, supplier_contact: e.target.value })} />
          </Field>
          <Field label="Delivery Note #">
            <Input value={form.delivery_note_number} onChange={(e) => setForm({ ...form, delivery_note_number: e.target.value })} />
          </Field>
          <Field label="Invoice #">
            <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
          </Field>
          <Field label="Vehicle #">
            <Input value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} />
          </Field>
          <Field label="Driver Name">
            <Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} />
          </Field>
          <Field label="Driver Phone">
            <Input value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} />
          </Field>
          <Field label="Delivery Location">
            <Input value={form.delivery_location} onChange={(e) => setForm({ ...form, delivery_location: e.target.value })} />
          </Field>
          <Field label="Storage Location">
            <Input value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} />
          </Field>
          <Field label="Delivery Condition">
            <Select value={form.delivery_condition} onValueChange={(v) => setForm({ ...form, delivery_condition: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g," ")}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="md:col-span-3">
            <Field label="Remarks">
              <Textarea rows={2} value={form.remarks ?? ""} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm">Delivery Items</h3>
            <Button size="sm" variant="outline" onClick={() => setItems((xs) => [...xs, emptyItem()])}>
              <Plus className="size-3 mr-1" /> Add item
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Item *</th>
                  <th className="p-2">Unit</th>
                  <th className="p-2">Ordered</th>
                  <th className="p-2">Prev. Del</th>
                  <th className="p-2">Delivered *</th>
                  <th className="p-2">Accepted</th>
                  <th className="p-2">Rejected</th>
                  <th className="p-2">Damaged</th>
                  <th className="p-2">Balance</th>
                  <th className="p-2">Rate</th>
                  <th className="p-2">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1"><Input className="h-8" value={it.item_name} onChange={(e) => updateItem(i, { item_name: e.target.value })} /></td>
                    <td className="p-1">
                      <Select value={it.unit} onValueChange={(v) => updateItem(i, { unit: v })}>
                        <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-1"><Input type="number" className="h-8 w-20" value={it.ordered_quantity} onChange={(e) => updateItem(i, { ordered_quantity: Number(e.target.value) })} /></td>
                    <td className="p-1"><Input type="number" className="h-8 w-20" value={it.previously_delivered_quantity ?? 0} onChange={(e) => updateItem(i, { previously_delivered_quantity: Number(e.target.value) })} /></td>
                    <td className="p-1"><Input type="number" className="h-8 w-20" value={it.delivered_quantity} onChange={(e) => updateItem(i, { delivered_quantity: Number(e.target.value) })} /></td>
                    <td className="p-1"><Input type="number" className="h-8 w-20" value={it.accepted_quantity} onChange={(e) => updateItem(i, { accepted_quantity: Number(e.target.value) })} /></td>
                    <td className="p-1"><Input type="number" className="h-8 w-20" value={it.rejected_quantity} onChange={(e) => updateItem(i, { rejected_quantity: Number(e.target.value) })} /></td>
                    <td className="p-1"><Input type="number" className="h-8 w-20" value={it.damaged_quantity} onChange={(e) => updateItem(i, { damaged_quantity: Number(e.target.value) })} /></td>
                    <td className="p-1 tabular-nums text-right">{it.balance_quantity ?? 0}</td>
                    <td className="p-1"><Input type="number" className="h-8 w-24" value={it.unit_rate} onChange={(e) => updateItem(i, { unit_rate: Number(e.target.value) })} /></td>
                    <td className="p-1 tabular-nums text-right">{(it.delivered_amount ?? 0).toLocaleString()}</td>
                    <td className="p-1">
                      <Button size="icon" variant="ghost" onClick={() => setItems((xs) => xs.filter((_, idx) => idx !== i))}>
                        <XIcon className="size-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td colSpan={10} className="p-2 text-right">Total Value</td>
                  <td className="p-2 text-right tabular-nums">{totalValue.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit}>{editing ? "Save" : "Create Delivery"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

/* ------------------------- From PO Dialog ------------------------- */

function FromPoDialog({ open, onClose, projectId, onCreated }: {
  open: boolean; onClose: () => void; projectId: string; onCreated: (id: string) => void;
}) {
  const fetchPos = useServerFn(listPosForDelivery);
  const create = useServerFn(createDeliveryFromPo);
  const posQ = useQuery({ queryKey: ["pos-for-delivery", projectId], queryFn: () => fetchPos({ data: { projectId: projectId || undefined } }) });
  const [poId, setPoId] = useState<string>("");

  const onSubmit = async () => {
    if (!poId) return toast.error("Pick a purchase order");
    try {
      const r = await (create as any)({ data: { purchase_order_id: poId } });
      toast.success(`Delivery ${r.delivery_number} created`);
      onCreated(r.id);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Delivery from Purchase Order</DialogTitle></DialogHeader>
        <Field label="Purchase Order">
          <Select value={poId} onValueChange={setPoId}>
            <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
            <SelectContent>
              {(posQ.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.po_number} — {p.supplier_name ?? "—"} ({p.status})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <p className="text-xs text-muted-foreground">Lines from the PO will be pre-filled with remaining quantities.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- Detail Sheet ------------------------- */

function DeliveryDetailSheet({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const fetchOne = useServerFn(getDelivery);
  const setStatus = useServerFn(setDeliveryStatus);
  const inspect = useServerFn(inspectDeliveryItems);
  const addAtt = useServerFn(addDeliveryAttachment);
  const delAtt = useServerFn(deleteDeliveryAttachment);
  const q = useQuery({ queryKey: ["delivery", id], queryFn: () => fetchOne({ data: { id } }) });
  const d: any = q.data;
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const doStatus = async (status: string, reason?: string) => {
    try {
      await (setStatus as any)({ data: { id, status, rejection_reason: reason } });
      toast.success(`Status updated to ${status.replace(/_/g," ")}`);
      q.refetch(); onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const printGrn = () => {
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w || !d) return;
    const itemRows = (d.items ?? []).map((it: any) => `
      <tr><td>${it.item_code ?? ""}</td><td>${it.item_name}</td><td>${it.unit}</td>
      <td style="text-align:right">${it.ordered_quantity ?? 0}</td>
      <td style="text-align:right">${it.delivered_quantity ?? 0}</td>
      <td style="text-align:right">${it.accepted_quantity ?? 0}</td>
      <td style="text-align:right">${it.rejected_quantity ?? 0}</td>
      <td style="text-align:right">${it.damaged_quantity ?? 0}</td>
      <td>${it.condition ?? ""}</td></tr>`).join("");
    w.document.write(`
      <html><head><title>GRN ${d.delivery_number}</title>
      <style>body{font-family:system-ui;padding:24px;color:#111}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:6px;font-size:12px;text-align:left}th{background:#f5f5f5}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:12px;margin-top:12px}.sig{margin-top:48px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;font-size:12px}.sig div{border-top:1px solid #333;padding-top:4px}</style>
      </head><body>
      <h1>Goods Received Note</h1>
      <div style="color:#666;font-size:12px">${d.delivery_number}</div>
      <div class="grid">
        <div><b>Date:</b> ${d.delivery_date}</div><div><b>Supplier:</b> ${d.supplier_name ?? "—"}</div>
        <div><b>Delivery Note:</b> ${d.delivery_note_number ?? "—"}</div><div><b>Invoice:</b> ${d.invoice_number ?? "—"}</div>
        <div><b>Vehicle:</b> ${d.vehicle_number ?? "—"}</div><div><b>Driver:</b> ${d.driver_name ?? "—"}</div>
        <div><b>Location:</b> ${d.delivery_location ?? "—"}</div><div><b>Storage:</b> ${d.storage_location ?? "—"}</div>
      </div>
      <table><thead><tr><th>Code</th><th>Item</th><th>Unit</th><th>Ordered</th><th>Delivered</th><th>Accepted</th><th>Rejected</th><th>Damaged</th><th>Condition</th></tr></thead><tbody>${itemRows}</tbody></table>
      <div class="sig"><div>Received By</div><div>Inspected By</div><div>Approved By</div></div>
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-4xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Truck className="size-5" />
            {d?.delivery_number ?? "Delivery"}
            {d && <Badge className={STATUS_STYLE[d.status]} variant="secondary">{String(d.status).replace(/_/g," ")}</Badge>}
          </SheetTitle>
        </SheetHeader>

        {q.isLoading ? <Skeleton className="h-40 mt-4" /> : !d ? <p className="p-4 text-sm">Not found.</p> : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {d.status === "draft" && <Button size="sm" onClick={() => doStatus("received")}><Truck className="size-4 mr-1" /> Mark Received</Button>}
              {["received","inspected"].includes(d.status) && <Button size="sm" variant="outline" onClick={() => doStatus("inspected")}><ShieldCheck className="size-4 mr-1" /> Mark Inspected</Button>}
              {["received","inspected","partially_accepted"].includes(d.status) && <Button size="sm" onClick={() => doStatus("accepted")}><CheckCircle2 className="size-4 mr-1" /> Accept</Button>}
              {["accepted","partially_accepted"].includes(d.status) && <Button size="sm" variant="outline" onClick={() => doStatus("approved")}><ClipboardCheck className="size-4 mr-1" /> Approve</Button>}
              {!["rejected","closed","archived","approved"].includes(d.status) && (
                <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}><AlertTriangle className="size-4 mr-1" /> Reject</Button>
              )}
              <Button size="sm" variant="outline" onClick={printGrn}><Printer className="size-4 mr-1" /> Print GRN</Button>
            </div>

            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="items">Items ({d.items?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="inspection">Inspection</TabsTrigger>
                <TabsTrigger value="attachments">Files ({d.attachments?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <Info label="Supplier" value={d.supplier_name} />
                  <Info label="Delivery Note" value={d.delivery_note_number} />
                  <Info label="Invoice" value={d.invoice_number} />
                  <Info label="Date / Time" value={`${d.delivery_date}${d.delivery_time ? " " + d.delivery_time : ""}`} />
                  <Info label="Vehicle" value={d.vehicle_number} />
                  <Info label="Driver" value={`${d.driver_name ?? "—"}${d.driver_phone ? " · " + d.driver_phone : ""}`} />
                  <Info label="Location" value={d.delivery_location} />
                  <Info label="Storage" value={d.storage_location} />
                  <Info label="Condition" value={d.delivery_condition} />
                  <Info label="Inspection" value={d.inspection_status} />
                  <Info label="Total Value" value={Number(d.total_amount ?? 0).toLocaleString()} />
                  <Info label="PO Linked" value={d.purchase_order_id ? "Yes" : "—"} />
                </div>
                {d.remarks && <div className="text-sm border-l-2 border-muted pl-3 italic">{d.remarks}</div>}
                {d.rejection_reason && <div className="text-sm border-l-2 border-rose-400 pl-3 text-rose-700">Rejection: {d.rejection_reason}</div>}
              </TabsContent>

              <TabsContent value="items" className="pt-3">
                <ItemsTable items={d.items ?? []} />
              </TabsContent>

              <TabsContent value="inspection" className="pt-3">
                <InspectionPanel items={d.items ?? []} onInspect={async (rows) => {
                  try {
                    await (inspect as any)({ data: { delivery_id: id, items: rows } });
                    toast.success("Inspection saved");
                    q.refetch(); onChanged();
                  } catch (e: any) { toast.error(e?.message ?? "Failed"); }
                }} />
              </TabsContent>

              <TabsContent value="attachments" className="pt-3 space-y-3">
                <AttachmentSection
                  attachments={d.attachments ?? []}
                  onAdd={async (att) => { await (addAtt as any)({ data: { delivery_id: id, ...att } }); q.refetch(); }}
                  onDelete={async (aid) => { await (delAtt as any)({ data: { id: aid } }); q.refetch(); }}
                />
              </TabsContent>

              <TabsContent value="history" className="pt-3">
                <ul className="space-y-2 text-sm">
                  {(d.history ?? []).map((h: any) => (
                    <li key={h.id} className="border-l-2 pl-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={STATUS_STYLE[h.new_status] ?? ""}>{String(h.new_status).replace(/_/g," ")}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      {h.remarks && <p className="text-xs mt-1">{h.remarks}</p>}
                    </li>
                  ))}
                  {!(d.history ?? []).length && <p className="text-xs text-muted-foreground">No history yet.</p>}
                </ul>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject delivery</DialogTitle></DialogHeader>
            <Field label="Reason *">
              <Textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            </Field>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={async () => {
                if (!rejectReason) return toast.error("Reason required");
                await doStatus("rejected", rejectReason);
                setRejectOpen(false); setRejectReason("");
              }}>Reject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value?: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );
}

function ItemsTable({ items }: { items: any[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No items.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted">
          <tr>
            <th className="p-2 text-left">Item</th><th className="p-2">Unit</th>
            <th className="p-2">Ord</th><th className="p-2">Del</th><th className="p-2">Acc</th>
            <th className="p-2">Rej</th><th className="p-2">Dmg</th><th className="p-2">Bal</th>
            <th className="p-2">Rate</th><th className="p-2">Amount</th><th className="p-2">Condition</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t">
              <td className="p-2">{it.item_name} <div className="text-[10px] text-muted-foreground">{it.item_code}</div></td>
              <td className="p-2">{it.unit}</td>
              <td className="p-2 text-right">{it.ordered_quantity}</td>
              <td className="p-2 text-right">{it.delivered_quantity}</td>
              <td className="p-2 text-right">{it.accepted_quantity}</td>
              <td className="p-2 text-right">{it.rejected_quantity}</td>
              <td className="p-2 text-right">{it.damaged_quantity}</td>
              <td className="p-2 text-right">{it.balance_quantity}</td>
              <td className="p-2 text-right">{Number(it.unit_rate ?? 0).toLocaleString()}</td>
              <td className="p-2 text-right">{Number(it.delivered_amount ?? 0).toLocaleString()}</td>
              <td className="p-2">{it.condition}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InspectionPanel({ items, onInspect }: { items: any[]; onInspect: (rows: any[]) => void }) {
  const [rows, setRows] = useState(items.map((it) => ({
    id: it.id, accepted_quantity: Number(it.accepted_quantity ?? it.delivered_quantity ?? 0),
    rejected_quantity: Number(it.rejected_quantity ?? 0), damaged_quantity: Number(it.damaged_quantity ?? 0),
    inspection_result: it.inspection_result ?? "pending", condition: it.condition ?? "good", remarks: it.remarks ?? "",
    item_name: it.item_name, delivered_quantity: Number(it.delivered_quantity ?? 0), unit: it.unit,
  })));
  const update = (i: number, p: any) => setRows((xs) => xs.map((r, idx) => idx === i ? { ...r, ...p } : r));
  if (!items.length) return <p className="text-sm text-muted-foreground">No items to inspect.</p>;
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Item</th><th className="p-2">Delivered</th>
              <th className="p-2">Accepted</th><th className="p-2">Rejected</th><th className="p-2">Damaged</th>
              <th className="p-2">Result</th><th className="p-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.item_name} <span className="text-muted-foreground">({r.unit})</span></td>
                <td className="p-2 text-right tabular-nums">{r.delivered_quantity}</td>
                <td className="p-1"><Input type="number" className="h-8 w-20" value={r.accepted_quantity} onChange={(e) => update(i, { accepted_quantity: Number(e.target.value) })} /></td>
                <td className="p-1"><Input type="number" className="h-8 w-20" value={r.rejected_quantity} onChange={(e) => update(i, { rejected_quantity: Number(e.target.value) })} /></td>
                <td className="p-1"><Input type="number" className="h-8 w-20" value={r.damaged_quantity} onChange={(e) => update(i, { damaged_quantity: Number(e.target.value) })} /></td>
                <td className="p-1">
                  <Select value={r.inspection_result} onValueChange={(v) => update(i, { inspection_result: v })}>
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["pending","passed","failed","partially_passed","not_required"].map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1"><Input className="h-8" value={r.remarks ?? ""} onChange={(e) => update(i, { remarks: e.target.value })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => onInspect(rows.map(({ item_name, delivered_quantity, unit, ...r }) => r))}>
          <ShieldCheck className="size-4 mr-1" /> Save Inspection
        </Button>
      </div>
    </div>
  );
}

function AttachmentSection({ attachments, onAdd, onDelete }: {
  attachments: any[]; onAdd: (a: any) => Promise<void>; onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ file_name: "", file_url: "", attachment_type: "Delivery Document", description: "" });
  const submit = async () => {
    if (!form.file_name || !form.file_url) return toast.error("Name and URL required");
    try { await onAdd(form); toast.success("Attachment added"); setForm({ file_name: "", file_url: "", attachment_type: "Delivery Document", description: "" }); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  return (
    <div className="space-y-3">
      <Card><CardContent className="p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
        <Input placeholder="File name" value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} />
        <Input placeholder="https://… file URL" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} />
        <Select value={form.attachment_type} onValueChange={(v) => setForm({ ...form, attachment_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["Delivery Note","Supplier Invoice","Goods Received Note","Material Photo","Damage Photo","Vehicle Photo","Inspection Report","Test Certificate","Warranty Document","Supporting Document"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={submit}><Paperclip className="size-4 mr-1" /> Add</Button>
      </CardContent></Card>
      <ul className="space-y-1">
        {attachments.map((a) => (
          <li key={a.id} className="flex items-center justify-between border rounded-sm p-2 text-sm">
            <a className="flex items-center gap-2 underline" href={a.file_url} target="_blank" rel="noreferrer">
              <FileText className="size-4" /> {a.file_name} <span className="text-xs text-muted-foreground">({a.attachment_type})</span>
            </a>
            <Button size="icon" variant="ghost" onClick={() => onDelete(a.id)}><Trash2 className="size-4" /></Button>
          </li>
        ))}
        {!attachments.length && <p className="text-xs text-muted-foreground">No attachments. Paste a file URL (e.g. from Drive, Dropbox).</p>}
      </ul>
    </div>
  );
}

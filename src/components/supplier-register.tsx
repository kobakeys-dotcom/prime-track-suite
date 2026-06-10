import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search, Archive, Pencil, Star, ShieldCheck, Ban, Download, Trash2, FileText, MessageSquare, ExternalLink } from "lucide-react";

import {
  listSuppliers, getSupplier, saveSupplier, archiveSupplier, setSupplierFlags,
  saveSupplierContact, deleteSupplierContact,
  saveSupplierDocument, deleteSupplierDocument,
  addSupplierReview, addSupplierAttachment, deleteSupplierAttachment, addSupplierComment,
} from "@/lib/suppliers.functions";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SUPPLIER_TYPES = [
  "Material Supplier","Subcontractor","Equipment Supplier","Equipment Rental","Service Provider",
  "Consultant","Transport Provider","Labour Supplier","Manufacturer","Distributor","General Vendor",
];
const CATEGORIES = [
  "General","Civil Materials","Structural Materials","Steel","Concrete","Cement","Sand / Aggregate","Roofing",
  "Electrical","Plumbing","HVAC","Fire System","Elevator","Finishing Materials","Paint","Doors and Windows",
  "Safety / PPE","Tools","Equipment","Fuel","Transport","Office Supplies","IT / Software","Professional Services",
];
const DISCIPLINES = ["Civil","Structural","Architectural","MEP","Electrical","Plumbing","HVAC","Fire","Elevator","Finishing","External Works","General"];
const STATUSES = ["Active","Inactive","Pending Approval","Prequalified","Preferred","Suspended","Blacklisted"];
const DOCUMENT_TYPES = [
  "Business Registration","Tax Certificate","Trade License","Insurance","Safety Certificate",
  "Quality Certificate","Product Certificate","Bank Details","Company Profile","Authorization Letter","Warranty Document","Other",
];

const STATUS_STYLE: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Inactive: "bg-zinc-100 text-zinc-700",
  "Pending Approval": "bg-amber-100 text-amber-700",
  Prequalified: "bg-blue-100 text-blue-700",
  Preferred: "bg-violet-100 text-violet-700",
  Suspended: "bg-orange-100 text-orange-700",
  Blacklisted: "bg-rose-100 text-rose-700",
};

const emptyForm = () => ({
  id: undefined as string | undefined,
  supplier_code: "",
  supplier_name: "",
  legal_name: "",
  supplier_type: "Material Supplier",
  category: "General",
  trade: "",
  discipline: "",
  country: "",
  city: "",
  address: "",
  email: "",
  phone: "",
  website: "",
  tax_number: "",
  registration_number: "",
  contact_person: "",
  contact_designation: "",
  contact_email: "",
  contact_phone: "",
  payment_terms: "",
  delivery_terms: "",
  currency: "MVR",
  credit_limit: 0,
  status: "Active",
  remarks: "",
});

function csvEscape(v: any) {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return /[,"\n]/.test(s) ? `"${s}"` : s;
}

export function SupplierRegister({ embedded = false }: { embedded?: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listSuppliers);
  const getFn = useServerFn(getSupplier);
  const saveFn = useServerFn(saveSupplier);
  const archiveFn = useServerFn(archiveSupplier);
  const flagsFn = useServerFn(setSupplierFlags);
  const saveContactFn = useServerFn(saveSupplierContact);
  const delContactFn = useServerFn(deleteSupplierContact);
  const saveDocFn = useServerFn(saveSupplierDocument);
  const delDocFn = useServerFn(deleteSupplierDocument);
  const addReviewFn = useServerFn(addSupplierReview);
  const addAttFn = useServerFn(addSupplierAttachment);
  const delAttFn = useServerFn(deleteSupplierAttachment);
  const addCommentFn = useServerFn(addSupplierComment);

  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState<string>("all");
  const [catF, setCatF] = useState<string>("all");
  const [statusF, setStatusF] = useState<string>("all");
  const [flagF, setFlagF] = useState<string>("all");

  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [blOpen, setBlOpen] = useState<string | null>(null);
  const [blReason, setBlReason] = useState("");

  const list = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => listFn({ data: {} }),
  });

  const detail = useQuery({
    queryKey: ["supplier", detailId],
    queryFn: () => getFn({ data: { id: detailId! } }),
    enabled: !!detailId,
  });

  const suppliers: any[] = list.data?.suppliers ?? [];

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return suppliers.filter((x) => {
      if (typeF !== "all" && x.supplier_type !== typeF) return false;
      if (catF !== "all" && x.category !== catF) return false;
      if (statusF !== "all" && x.status !== statusF) return false;
      if (flagF === "preferred" && !x.is_preferred) return false;
      if (flagF === "prequalified" && !x.is_prequalified) return false;
      if (flagF === "blacklisted" && !x.is_blacklisted) return false;
      if (!s) return true;
      return [
        x.supplier_code, x.supplier_name, x.name, x.legal_name, x.contact_person, x.email, x.phone,
        x.category, x.trade, x.city, x.country, x.tax_number, x.registration_number,
      ].some((v: any) => v && String(v).toLowerCase().includes(s));
    });
  }, [suppliers, search, typeF, catF, statusF, flagF]);

  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.status === "Active").length;
    const preferred = suppliers.filter((s) => s.is_preferred).length;
    const prequalified = suppliers.filter((s) => s.is_prequalified).length;
    const blacklisted = suppliers.filter((s) => s.is_blacklisted).length;
    const avgRating = total ? +(suppliers.reduce((a, s) => a + Number(s.rating || 0), 0) / total).toFixed(2) : 0;
    return { total, active, preferred, prequalified, blacklisted, avgRating };
  }, [suppliers]);

  const saveMut = useMutation({
    mutationFn: (data: any) => saveFn({ data }),
    onSuccess: () => { toast.success("Supplier saved"); setOpenForm(false); qc.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  const archMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => { toast.success("Archived"); setConfirmArchive(null); setDetailId(null); qc.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e: any) => toast.error(e?.message || "Archive failed"),
  });

  const flagsMut = useMutation({
    mutationFn: (vars: any) => flagsFn({ data: vars }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      if (detailId) qc.invalidateQueries({ queryKey: ["supplier", detailId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  function openCreate() { setForm(emptyForm()); setOpenForm(true); }
  function openEdit(s: any) {
    setForm({ ...emptyForm(), ...s, supplier_name: s.supplier_name || s.name || "" });
    setOpenForm(true);
  }

  function exportCsv() {
    const headers = ["Code","Name","Type","Category","Trade","Country","City","Contact","Email","Phone","Rating","Score","Status","Preferred","Prequalified","Blacklisted"];
    const rows = filtered.map((s) => [
      s.supplier_code, s.supplier_name || s.name, s.supplier_type, s.category, s.trade, s.country, s.city,
      s.contact_person, s.email, s.phone, s.rating, s.performance_score, s.status,
      s.is_preferred ? "Yes" : "No", s.is_prequalified ? "Yes" : "No", s.is_blacklisted ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `suppliers-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className={embedded ? "" : "p-4 md:p-6 space-y-4"}>
      {!embedded && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Suppliers</h1>
            <p className="text-sm text-muted-foreground">Vendor register, contacts, documents, and performance.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />New Supplier</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Preferred" value={stats.preferred} accent="text-violet-600" />
        <StatCard label="Prequalified" value={stats.prequalified} accent="text-blue-600" />
        <StatCard label="Blacklisted" value={stats.blacklisted} accent="text-rose-600" />
        <StatCard label="Avg Rating" value={stats.avgRating} />
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={typeF} onValueChange={setTypeF}><SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Types</SelectItem>{SUPPLIER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={catF} onValueChange={setCatF}><SelectTrigger className="w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Categories</SelectItem>{CATEGORIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={statusF} onValueChange={setStatusF}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Status</SelectItem>{STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={flagF} onValueChange={setFlagF}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Flag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="preferred">Preferred</SelectItem>
              <SelectItem value="prequalified">Prequalified</SelectItem>
              <SelectItem value="blacklisted">Blacklisted</SelectItem>
            </SelectContent>
          </Select>
          {embedded && (
            <>
              <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />New</Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              No suppliers yet. Click <span className="font-medium">New Supplier</span> to add one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Rating</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDetailId(s.id)}>
                      <td className="px-3 py-2 font-mono text-xs">{s.supplier_code || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium flex items-center gap-1.5">
                          {s.supplier_name || s.name}
                          {s.is_preferred && <Star className="h-3.5 w-3.5 text-violet-600 fill-violet-600" />}
                          {s.is_prequalified && <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />}
                          {s.is_blacklisted && <Ban className="h-3.5 w-3.5 text-rose-600" />}
                        </div>
                        {s.city && <div className="text-xs text-muted-foreground">{[s.city, s.country].filter(Boolean).join(", ")}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs">{s.supplier_type}</td>
                      <td className="px-3 py-2 text-xs">{s.category}</td>
                      <td className="px-3 py-2 text-xs">{s.contact_person || "—"}</td>
                      <td className="px-3 py-2 text-xs">{s.phone || "—"}</td>
                      <td className="px-3 py-2 text-xs">{Number(s.rating || 0).toFixed(1)}</td>
                      <td className="px-3 py-2"><Badge className={STATUS_STYLE[s.status] || "bg-zinc-100 text-zinc-700"}>{s.status}</Badge></td>
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setConfirmArchive(s.id)}><Archive className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit Supplier" : "New Supplier"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Supplier Code"><Input value={form.supplier_code} onChange={(e) => setForm({ ...form, supplier_code: e.target.value })} placeholder="Auto-generate if empty" /></Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Supplier Name *" full><Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} /></Field>
            <Field label="Legal Name" full><Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} /></Field>
            <Field label="Type">
              <Select value={form.supplier_type} onValueChange={(v) => setForm({ ...form, supplier_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUPPLIER_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Trade"><Input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} /></Field>
            <Field label="Discipline">
              <Select value={form.discipline || "none"} onValueChange={(v) => setForm({ ...form, discipline: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {DISCIPLINES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
            <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Address" full><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Website"><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
            <Field label="Tax Number"><Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} /></Field>
            <Field label="Registration Number"><Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} /></Field>
            <Field label="Contact Person"><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></Field>
            <Field label="Contact Designation"><Input value={form.contact_designation} onChange={(e) => setForm({ ...form, contact_designation: e.target.value })} /></Field>
            <Field label="Contact Email"><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
            <Field label="Contact Phone"><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></Field>
            <Field label="Payment Terms"><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} placeholder="e.g. 30 days net" /></Field>
            <Field label="Delivery Terms"><Input value={form.delivery_terms} onChange={(e) => setForm({ ...form, delivery_terms: e.target.value })} /></Field>
            <Field label="Currency"><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Field>
            <Field label="Credit Limit"><Input type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })} /></Field>
            <Field label="Remarks" full><Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancel</Button>
            <Button
              disabled={saveMut.isPending || !form.supplier_name.trim()}
              onClick={() => {
                const { id, ...rest } = form;
                saveMut.mutate({ ...(id ? { id } : {}), ...rest });
              }}
            >{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail.data?.supplier?.supplier_name || "Supplier"}</SheetTitle>
          </SheetHeader>
          {detail.isLoading || !detail.data ? (
            <div className="space-y-2 mt-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : detail.data.supplier && (
            <SupplierDetail
              data={detail.data}
              onEdit={() => openEdit(detail.data!.supplier)}
              onTogglePreferred={(v) => flagsMut.mutate({ id: detailId!, is_preferred: v })}
              onTogglePrequalified={(v) => flagsMut.mutate({ id: detailId!, is_prequalified: v })}
              onBlacklist={() => { setBlReason(""); setBlOpen(detailId); }}
              onUnblacklist={() => flagsMut.mutate({ id: detailId!, is_blacklisted: false })}
              onArchive={() => setConfirmArchive(detailId)}
              onRefresh={() => qc.invalidateQueries({ queryKey: ["supplier", detailId] })}
              saveContact={(c) => saveContactFn({ data: c }).then(() => qc.invalidateQueries({ queryKey: ["supplier", detailId] }))}
              delContact={(id) => delContactFn({ data: { id } }).then(() => qc.invalidateQueries({ queryKey: ["supplier", detailId] }))}
              saveDoc={(d) => saveDocFn({ data: d }).then(() => qc.invalidateQueries({ queryKey: ["supplier", detailId] }))}
              delDoc={(id) => delDocFn({ data: { id } }).then(() => qc.invalidateQueries({ queryKey: ["supplier", detailId] }))}
              addReview={(r) => addReviewFn({ data: r }).then(() => { qc.invalidateQueries({ queryKey: ["supplier", detailId] }); qc.invalidateQueries({ queryKey: ["suppliers"] }); })}
              addAtt={(a) => addAttFn({ data: a }).then(() => qc.invalidateQueries({ queryKey: ["supplier", detailId] }))}
              delAtt={(id) => delAttFn({ data: { id } }).then(() => qc.invalidateQueries({ queryKey: ["supplier", detailId] }))}
              addComment={(c) => addCommentFn({ data: c }).then(() => qc.invalidateQueries({ queryKey: ["supplier", detailId] }))}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm archive */}
      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive supplier?</AlertDialogTitle>
            <AlertDialogDescription>The supplier will be hidden from active lists. Linked records remain intact.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmArchive && archMut.mutate(confirmArchive)}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blacklist dialog */}
      <Dialog open={!!blOpen} onOpenChange={(o) => !o && setBlOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Blacklist supplier</DialogTitle></DialogHeader>
          <Label>Reason *</Label>
          <Textarea rows={4} value={blReason} onChange={(e) => setBlReason(e.target.value)} placeholder="Reason for blacklisting" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlOpen(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!blReason.trim()}
              onClick={() => { flagsMut.mutate({ id: blOpen!, is_blacklisted: true, blacklist_reason: blReason.trim() }); setBlOpen(null); }}
            >Blacklist</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold ${accent || ""}`}>{value}</div>
    </CardContent></Card>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2 space-y-1" : "space-y-1"}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function SupplierDetail({
  data, onEdit, onTogglePreferred, onTogglePrequalified, onBlacklist, onUnblacklist, onArchive,
  saveContact, delContact, saveDoc, delDoc, addReview, addAtt, delAtt, addComment,
}: any) {
  const s = data.supplier;
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-3 mt-3">
      <div className="flex flex-wrap gap-1.5">
        <Badge className={STATUS_STYLE[s.status] || "bg-zinc-100"}>{s.status}</Badge>
        {s.is_preferred && <Badge className="bg-violet-100 text-violet-700"><Star className="h-3 w-3 mr-1" />Preferred</Badge>}
        {s.is_prequalified && <Badge className="bg-blue-100 text-blue-700"><ShieldCheck className="h-3 w-3 mr-1" />Prequalified</Badge>}
        {s.is_blacklisted && <Badge className="bg-rose-100 text-rose-700"><Ban className="h-3 w-3 mr-1" />Blacklisted</Badge>}
        <Badge variant="outline">{s.supplier_type}</Badge>
        <Badge variant="outline">{s.category}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
        <Button size="sm" variant="outline" onClick={() => onTogglePreferred(!s.is_preferred)}><Star className="h-3.5 w-3.5 mr-1" />{s.is_preferred ? "Unpreferred" : "Mark Preferred"}</Button>
        <Button size="sm" variant="outline" onClick={() => onTogglePrequalified(!s.is_prequalified)}><ShieldCheck className="h-3.5 w-3.5 mr-1" />{s.is_prequalified ? "Remove Prequal" : "Prequalify"}</Button>
        {s.is_blacklisted ? (
          <Button size="sm" variant="outline" onClick={onUnblacklist}>Reactivate</Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={onBlacklist}><Ban className="h-3.5 w-3.5 mr-1" />Blacklist</Button>
        )}
        <Button size="sm" variant="ghost" onClick={onArchive}><Archive className="h-3.5 w-3.5 mr-1" />Archive</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({data.contacts.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({data.documents.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="orders">POs ({data.purchase_orders.length})</TabsTrigger>
          <TabsTrigger value="rfqs">RFQs ({data.rfqs.length})</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="attachments">Files</TabsTrigger>
          <TabsTrigger value="comments">Notes</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-2">
          <Row label="Code" value={s.supplier_code} />
          <Row label="Legal Name" value={s.legal_name} />
          <Row label="Trade" value={s.trade} />
          <Row label="Discipline" value={s.discipline} />
          <Row label="Location" value={[s.city, s.country].filter(Boolean).join(", ")} />
          <Row label="Address" value={s.address} />
          <Row label="Email" value={s.email} />
          <Row label="Phone" value={s.phone} />
          <Row label="Website" value={s.website} />
          <Row label="Tax #" value={s.tax_number} />
          <Row label="Reg #" value={s.registration_number} />
          <Row label="Contact" value={[s.contact_person, s.contact_designation].filter(Boolean).join(" — ")} />
          <Row label="Contact Email" value={s.contact_email} />
          <Row label="Contact Phone" value={s.contact_phone} />
          <Row label="Payment Terms" value={s.payment_terms} />
          <Row label="Delivery Terms" value={s.delivery_terms} />
          <Row label="Currency" value={s.currency} />
          <Row label="Credit Limit" value={s.credit_limit} />
          <Row label="Rating" value={`${Number(s.rating || 0).toFixed(1)} / 5`} />
          <Row label="Performance" value={`${Number(s.performance_score || 0).toFixed(2)} / 5`} />
          {s.is_blacklisted && <Row label="Blacklist Reason" value={s.blacklist_reason} />}
          <Row label="Remarks" value={s.remarks} />
        </TabsContent>

        <TabsContent value="contacts"><ContactsTab supplierId={s.id} contacts={data.contacts} saveContact={saveContact} delContact={delContact} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab supplierId={s.id} docs={data.documents} saveDoc={saveDoc} delDoc={delDoc} /></TabsContent>
        <TabsContent value="performance"><PerformanceTab supplier={s} reviews={data.reviews} addReview={addReview} /></TabsContent>

        <TabsContent value="orders">
          {data.purchase_orders.length === 0 ? <EmptyTab text="No purchase orders" /> :
            <div className="space-y-1">{data.purchase_orders.map((p: any) => (
              <div key={p.id} className="text-sm flex items-center justify-between border rounded p-2">
                <div><div className="font-medium">{p.po_number}</div><div className="text-xs text-muted-foreground">{p.po_title}</div></div>
                <div className="text-right"><div className="text-xs">{p.currency} {Number(p.total_amount || 0).toLocaleString()}</div><Badge variant="outline" className="text-xs">{p.status}</Badge></div>
              </div>))}</div>}
        </TabsContent>
        <TabsContent value="rfqs">
          {data.rfqs.length === 0 ? <EmptyTab text="No RFQs" /> :
            <div className="space-y-1">{data.rfqs.map((r: any) => (
              <div key={r.id} className="text-sm flex items-center justify-between border rounded p-2">
                <div><div className="text-xs text-muted-foreground">Invited: {r.invited_at?.slice(0,10) || "—"}</div><Badge variant="outline" className="text-xs">{r.invitation_status}</Badge></div>
                <div className="text-right"><div className="text-xs">{r.currency} {Number(r.total_quoted_amount || 0).toLocaleString()}</div><Badge variant="outline" className="text-xs">{r.quotation_status}</Badge></div>
              </div>))}</div>}
        </TabsContent>
        <TabsContent value="deliveries">
          {data.deliveries.length === 0 ? <EmptyTab text="No deliveries" /> :
            <div className="space-y-1">{data.deliveries.map((d: any) => (
              <div key={d.id} className="text-sm flex items-center justify-between border rounded p-2">
                <div><div className="text-xs">{d.delivery_date}</div></div>
                <Badge variant="outline" className="text-xs">{d.status}</Badge>
              </div>))}</div>}
        </TabsContent>

        <TabsContent value="attachments"><AttachmentsTab supplierId={s.id} atts={data.attachments} addAtt={addAtt} delAtt={delAtt} /></TabsContent>
        <TabsContent value="comments"><CommentsTab supplierId={s.id} comments={data.comments} addComment={addComment} /></TabsContent>
        <TabsContent value="history">
          {data.history.length === 0 ? <EmptyTab text="No status changes" /> :
            <div className="space-y-1">{data.history.map((h: any) => (
              <div key={h.id} className="text-xs border rounded p-2">
                <div>{h.old_status || "—"} → <span className="font-medium">{h.new_status}</span></div>
                <div className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
              </div>))}</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  return <div className="text-sm grid grid-cols-3 gap-2"><div className="text-muted-foreground">{label}</div><div className="col-span-2">{value}</div></div>;
}
function EmptyTab({ text }: { text: string }) { return <div className="text-sm text-muted-foreground text-center py-6">{text}</div>; }

function ContactsTab({ supplierId, contacts, saveContact, delContact }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ supplier_id: supplierId, contact_name: "", is_primary: false });
  const submit = async () => {
    if (!form.contact_name.trim()) { toast.error("Name required"); return; }
    try { await saveContact(form); toast.success("Saved"); setOpen(false); setForm({ supplier_id: supplierId, contact_name: "", is_primary: false }); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="space-y-2">
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Contact</Button>
      {contacts.length === 0 ? <EmptyTab text="No contacts" /> :
        contacts.map((c: any) => (
          <div key={c.id} className="border rounded p-2 text-sm flex justify-between items-start">
            <div>
              <div className="font-medium">{c.contact_name} {c.is_primary && <Badge className="ml-1 bg-blue-100 text-blue-700">Primary</Badge>}</div>
              <div className="text-xs text-muted-foreground">{[c.designation, c.department].filter(Boolean).join(" · ")}</div>
              <div className="text-xs">{[c.email, c.phone, c.mobile].filter(Boolean).join(" · ")}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => delContact(c.id).then(() => toast.success("Removed"))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Name *" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            <Input placeholder="Designation" value={form.designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            <Input placeholder="Department" value={form.department || ""} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Input placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Mobile" value={form.mobile || ""} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_primary} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} />Primary contact</label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentsTab({ supplierId, docs, saveDoc, delDoc }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ supplier_id: supplierId, document_name: "", document_type: "General" });
  const submit = async () => {
    if (!form.document_name.trim()) { toast.error("Name required"); return; }
    try { await saveDoc(form); toast.success("Saved"); setOpen(false); setForm({ supplier_id: supplierId, document_name: "", document_type: "General" }); }
    catch (e: any) { toast.error(e.message); }
  };
  const statusBadge = (st: string) => {
    const map: Record<string, string> = { Valid: "bg-emerald-100 text-emerald-700", "Expiring Soon": "bg-amber-100 text-amber-700", Expired: "bg-rose-100 text-rose-700", Missing: "bg-zinc-100 text-zinc-700" };
    return <Badge className={map[st] || "bg-zinc-100"}>{st}</Badge>;
  };
  return (
    <div className="space-y-2">
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Document</Button>
      {docs.length === 0 ? <EmptyTab text="No documents" /> :
        docs.map((d: any) => (
          <div key={d.id} className="border rounded p-2 text-sm flex justify-between items-start">
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2"><FileText className="h-4 w-4" />{d.document_name}</div>
              <div className="text-xs text-muted-foreground">{d.document_type} {d.document_number && `· ${d.document_number}`}</div>
              <div className="text-xs">Expiry: {d.expiry_date || "—"} {statusBadge(d.status)}</div>
              {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />Open file</a>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => delDoc(d.id).then(() => toast.success("Removed"))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Document name *" value={form.document_name} onChange={(e) => setForm({ ...form, document_name: e.target.value })} />
            <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Document number" value={form.document_number || ""} onChange={(e) => setForm({ ...form, document_number: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Issue Date</Label><Input type="date" value={form.issue_date || ""} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
              <div><Label className="text-xs">Expiry Date</Label><Input type="date" value={form.expiry_date || ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            </div>
            <Input placeholder="File URL (optional)" value={form.file_url || ""} onChange={(e) => setForm({ ...form, file_url: e.target.value })} />
            <Input placeholder="File name" value={form.file_name || ""} onChange={(e) => setForm({ ...form, file_name: e.target.value })} />
            <Textarea rows={2} placeholder="Remarks" value={form.remarks || ""} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PerformanceTab({ supplier, reviews, addReview }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ supplier_id: supplier.id, quality_score: 4, delivery_score: 4, price_score: 4, response_score: 4 });
  const submit = async () => {
    try { await addReview(form); toast.success("Review added"); setOpen(false); setForm({ supplier_id: supplier.id, quality_score: 4, delivery_score: 4, price_score: 4, response_score: 4 }); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ["Quality", supplier.quality_score], ["Delivery", supplier.delivery_score],
          ["Price", supplier.price_score], ["Response", supplier.response_score],
        ].map(([k, v]) => (
          <Card key={k as string}><CardContent className="p-2"><div className="text-xs text-muted-foreground">{k}</div><div className="text-lg font-semibold">{Number(v || 0).toFixed(2)}</div></CardContent></Card>
        ))}
      </div>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Review</Button>
      {reviews.length === 0 ? <EmptyTab text="No reviews" /> :
        reviews.map((r: any) => (
          <div key={r.id} className="border rounded p-2 text-sm">
            <div className="flex justify-between"><div className="font-medium">{r.review_date}</div><div className="text-xs">Overall: <span className="font-semibold">{Number(r.overall_score).toFixed(2)}</span></div></div>
            <div className="text-xs text-muted-foreground">Q:{r.quality_score} · D:{r.delivery_score} · P:{r.price_score} · R:{r.response_score}</div>
            {r.comments && <div className="text-xs mt-1">{r.comments}</div>}
          </div>
        ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Performance Review (0-5)</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {(["quality_score","delivery_score","price_score","response_score"] as const).map((k) => (
              <div key={k}><Label className="text-xs capitalize">{k.replace("_score","")}</Label>
                <Input type="number" min={0} max={5} step={0.5} value={form[k]} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <Textarea rows={3} placeholder="Comments" value={form.comments || ""} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
          <Input placeholder="Recommendation" value={form.recommendation || ""} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} />
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttachmentsTab({ supplierId, atts, addAtt, delAtt }: any) {
  const [url, setUrl] = useState(""); const [name, setName] = useState(""); const [type, setType] = useState("Supplier File");
  const submit = async () => {
    if (!url.trim()) { toast.error("URL required"); return; }
    try { await addAtt({ supplier_id: supplierId, file_url: url, file_name: name, attachment_type: type }); toast.success("Added"); setUrl(""); setName(""); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <Input placeholder="File URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Input placeholder="File name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Type" value={type} onChange={(e) => setType(e.target.value)} />
      </div>
      <Button size="sm" onClick={submit}><Plus className="h-3.5 w-3.5 mr-1" />Add Attachment</Button>
      {atts.length === 0 ? <EmptyTab text="No attachments" /> :
        atts.map((a: any) => (
          <div key={a.id} className="border rounded p-2 text-sm flex justify-between items-center">
            <div><div className="font-medium">{a.file_name || a.file_url}</div><div className="text-xs text-muted-foreground">{a.attachment_type}</div></div>
            <div className="flex gap-1"><a href={a.file_url} target="_blank" rel="noreferrer"><Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button></a>
              <Button variant="ghost" size="icon" onClick={() => delAtt(a.id).then(() => toast.success("Removed"))}><Trash2 className="h-4 w-4" /></Button></div>
          </div>
        ))}
    </div>
  );
}

function CommentsTab({ supplierId, comments, addComment }: any) {
  const [text, setText] = useState("");
  const submit = async () => {
    if (!text.trim()) return;
    try { await addComment({ supplier_id: supplierId, comment: text.trim() }); setText(""); toast.success("Added"); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="space-y-2">
      <Textarea rows={2} placeholder="Add internal note..." value={text} onChange={(e) => setText(e.target.value)} />
      <Button size="sm" onClick={submit}><MessageSquare className="h-3.5 w-3.5 mr-1" />Post</Button>
      {comments.length === 0 ? <EmptyTab text="No notes" /> :
        comments.map((c: any) => (
          <div key={c.id} className="border rounded p-2 text-sm">
            <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
            <div>{c.comment}</div>
          </div>
        ))}
    </div>
  );
}

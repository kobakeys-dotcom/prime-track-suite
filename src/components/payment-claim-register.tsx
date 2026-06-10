import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Pencil, Archive, Search, Trash2, FileText, Download,
  CheckCircle2, X, DollarSign, Paperclip, Send, FileSignature, Printer, Eye,
} from "lucide-react";

import {
  listPaymentClaims, getPaymentClaim, upsertPaymentClaim, submitPaymentClaim,
  setPaymentClaimStatus, archivePaymentClaim,
  listPaymentClaimItems, upsertPaymentClaimItem, deletePaymentClaimItem, pullBoqIntoClaim,
  listPaymentClaimVariations, listAvailableVariations, addPaymentClaimVariation,
  updatePaymentClaimVariation, removePaymentClaimVariation,
  listPaymentClaimAttachments, addPaymentClaimAttachment, deletePaymentClaimAttachment,
  listPaymentClaimStatusHistory,
} from "@/lib/payment-claims.functions";
import { ProjectPicker } from "@/components/project-picker";
import { CommentsThread } from "@/components/comments-thread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  approved: "Approved", client_approved: "Client Approved",
  certified: "Certified", paid: "Paid", partially_paid: "Partially Paid",
  rejected: "Rejected", revision_requested: "Revision Requested",
  closed: "Closed", cancelled: "Cancelled",
};
const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  client_approved: "bg-teal-100 text-teal-700",
  certified: "bg-indigo-100 text-indigo-700",
  paid: "bg-emerald-200 text-emerald-800",
  partially_paid: "bg-amber-100 text-amber-800",
  rejected: "bg-rose-100 text-rose-700",
  revision_requested: "bg-orange-100 text-orange-700",
  closed: "bg-zinc-200 text-zinc-600",
  cancelled: "bg-zinc-100 text-zinc-400",
};
const CLAIM_TYPES = [
  "Interim Payment Claim", "Interim Payment Certificate", "Advance Payment Claim",
  "Material at Site Claim", "Variation Claim", "Final Payment Claim",
  "Retention Release Claim", "Final Account Claim",
];
const ATTACH_TYPES = [
  "BOQ Backup", "Measurement Sheet", "Site Photos", "Variation Backup",
  "Material at Site Evidence", "Delivery Notes", "Consultant Approval",
  "Client Approval", "Tax Invoice", "Payment Certificate", "Supporting Document",
];

function fmt(n: any) {
  const v = Number(n ?? 0);
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Variant = "compact" | "full";

export function PaymentClaimRegister({ projectId: fixedProjectId, variant = "full" }: { projectId?: string; variant?: Variant }) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string | undefined>(fixedProjectId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const listFn = useServerFn(listPaymentClaims);
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["payment-claims", projectId ?? "all"],
    queryFn: () => listFn({ data: { projectId } }),
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (claims as any[]).filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.claim_type !== typeFilter) return false;
      if (!s) return true;
      return [c.claim_number, c.project_name, c.claim_type, c.payment_reference]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(s));
    });
  }, [claims, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const arr = claims as any[];
    return {
      total: arr.length,
      submitted: arr.reduce((s, c) => s + Number(c.submitted_amount ?? 0), 0),
      certified: arr.reduce((s, c) => s + Number(c.certified_amount ?? 0), 0),
      paid: arr.reduce((s, c) => s + Number(c.paid_amount ?? 0), 0),
      outstanding: arr.reduce((s, c) => s + Number(c.outstanding_amount ?? 0), 0),
      pendingApproval: arr.filter((c) => ["submitted", "under_review"].includes(c.status)).length,
    };
  }, [claims]);

  const archiveFn = useServerFn(archivePaymentClaim);
  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => { toast.success("Claim archived"); qc.invalidateQueries({ queryKey: ["payment-claims"] }); setArchiveId(null); },
    onError: (e: any) => toast.error(e.message ?? "Failed to archive"),
  });

  function exportCSV() {
    const cols = ["claim_number", "project_name", "claim_type", "period_start", "period_end", "gross_claim", "net_claim", "certified_amount", "paid_amount", "outstanding_amount", "status"];
    const header = cols.join(",");
    const rows = filtered.map((r: any) => cols.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payment-claims-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      {variant === "full" && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold">Payment Claims / IPC</h1>
            <p className="text-sm text-muted-foreground">Prepare, certify and track interim payment certificates.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />Export</Button>
            <Button size="sm" onClick={() => { setEditId(null); setOpenForm(true); }}><Plus className="w-4 h-4 mr-1" />New Claim</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Claims" value={stats.total} />
        <StatCard label="Pending Approval" value={stats.pendingApproval} />
        <StatCard label="Submitted" value={fmt(stats.submitted)} />
        <StatCard label="Certified" value={fmt(stats.certified)} />
        <StatCard label="Paid" value={fmt(stats.paid)} />
        <StatCard label="Outstanding" value={fmt(stats.outstanding)} tone={stats.outstanding > 0 ? "warn" : "ok"} />
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          {!fixedProjectId && (
            <div className="min-w-[220px]"><ProjectPicker value={projectId ?? ""} onChange={setProjectId} /></div>
          )}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search claim no, project, reference…" className="pl-8" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {CLAIM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {variant === "compact" && (
            <Button size="sm" onClick={() => { setEditId(null); setOpenForm(true); }}><Plus className="w-4 h-4 mr-1" />New</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No payment claims yet. Create your first IPC to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Claim #</th>
                  {!fixedProjectId && <th className="text-left px-3 py-2">Project</th>}
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Period</th>
                  <th className="text-right px-3 py-2">Gross</th>
                  <th className="text-right px-3 py-2">Net</th>
                  <th className="text-right px-3 py-2">Certified</th>
                  <th className="text-right px-3 py-2">Paid</th>
                  <th className="text-right px-3 py-2">Outstanding</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => setDetailId(c.id)}>
                    <td className="px-3 py-2 font-mono text-xs font-medium">{c.claim_number}</td>
                    {!fixedProjectId && <td className="px-3 py-2 text-xs">{c.project_name ?? "—"}</td>}
                    <td className="px-3 py-2 text-xs">{c.claim_type}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{c.period_start ?? "—"} → {c.period_end ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-xs">{fmt(c.gross_claim)}</td>
                    <td className="px-3 py-2 text-right text-xs font-medium">{fmt(c.net_claim)}</td>
                    <td className="px-3 py-2 text-right text-xs">{fmt(c.certified_amount)}</td>
                    <td className="px-3 py-2 text-right text-xs">{fmt(c.paid_amount)}</td>
                    <td className={`px-3 py-2 text-right text-xs ${Number(c.outstanding_amount) > 0 ? "text-amber-700 font-semibold" : ""}`}>{fmt(c.outstanding_amount)}</td>
                    <td className="px-3 py-2"><Badge className={STATUS_STYLE[c.status] ?? ""}>{STATUS_LABEL[c.status] ?? c.status}</Badge></td>
                    <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailId(c.id)}><Eye className="w-3.5 h-3.5 mr-2" />View</DropdownMenuItem>
                          {c.status === "draft" && (
                            <>
                              <DropdownMenuItem onClick={() => { setEditId(c.id); setOpenForm(true); }}><Pencil className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-rose-600" onClick={() => setArchiveId(c.id)}><Archive className="w-3.5 h-3.5 mr-2" />Archive</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {openForm && (
        <ClaimForm
          editId={editId}
          defaultProjectId={projectId ?? fixedProjectId}
          onClose={() => setOpenForm(false)}
          onSaved={(id) => { setOpenForm(false); setDetailId(id); qc.invalidateQueries({ queryKey: ["payment-claims"] }); }}
        />
      )}

      {detailId && (
        <ClaimDetail id={detailId} onClose={() => setDetailId(null)} onEdit={(id) => { setDetailId(null); setEditId(id); setOpenForm(true); }} />
      )}

      <AlertDialog open={!!archiveId} onOpenChange={(o) => !o && setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive payment claim?</AlertDialogTitle>
            <AlertDialogDescription>This will hide the claim from the register. Only draft claims can be archived.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveId && archiveMut.mutate(archiveId)}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: any; tone?: "ok" | "warn" }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={`text-lg font-display font-bold ${tone === "warn" ? "text-amber-700" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ============= FORM =============
function ClaimForm({ editId, defaultProjectId, onClose, onSaved }: {
  editId: string | null; defaultProjectId?: string;
  onClose: () => void; onSaved: (id: string) => void;
}) {
  const getFn = useServerFn(getPaymentClaim);
  const upsertFn = useServerFn(upsertPaymentClaim);
  const { data: existing } = useQuery({
    queryKey: ["payment-claim", editId], enabled: !!editId,
    queryFn: () => getFn({ data: { id: editId! } }),
  });

  const [form, setForm] = useState<any>({
    project_id: defaultProjectId ?? "",
    claim_type: "Interim Payment Claim",
    claim_date: new Date().toISOString().slice(0, 10),
    currency: "MVR",
    retention_percentage: 10,
    is_client_visible: true,
  });

  useMemo(() => { if (existing) setForm({ ...existing }); }, [existing]);

  const mut = useMutation({
    mutationFn: (vals: any) => upsertFn({ data: vals }),
    onSuccess: (r: any) => { toast.success(editId ? "Claim updated" : "Claim created"); onSaved(r.id); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  function submit() {
    if (!form.project_id) { toast.error("Project is required"); return; }
    const payload: any = {
      id: editId ?? undefined,
      project_id: form.project_id,
      claim_number: form.claim_number || null,
      claim_type: form.claim_type,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      claim_date: form.claim_date || null,
      due_date: form.due_date || null,
      currency: form.currency,
      previous_certified_amount: Number(form.previous_certified_amount ?? 0),
      work_done_value: Number(form.work_done_value ?? 0),
      variation_value: Number(form.variation_value ?? 0),
      material_at_site_value: Number(form.material_at_site_value ?? 0),
      other_claim_value: Number(form.other_claim_value ?? 0),
      retention_percentage: Number(form.retention_percentage ?? 0),
      advance_recovery: Number(form.advance_recovery ?? 0),
      deductions: Number(form.deductions ?? 0),
      tax_amount: Number(form.tax_amount ?? 0),
      notes: form.notes || null,
      is_client_visible: !!form.is_client_visible,
    };
    mut.mutate(payload);
  }

  const work = Number(form.work_done_value ?? 0);
  const vari = Number(form.variation_value ?? 0);
  const mat = Number(form.material_at_site_value ?? 0);
  const other = Number(form.other_claim_value ?? 0);
  const gross = work + vari + mat + other;
  const retention = gross * (Number(form.retention_percentage ?? 0) / 100);
  const net = gross - retention - Number(form.advance_recovery ?? 0) - Number(form.deductions ?? 0) - Number(form.tax_amount ?? 0);
  const current = net - Number(form.previous_certified_amount ?? 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editId ? "Edit Payment Claim" : "New Payment Claim"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Project *</Label><ProjectPicker value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} /></div>
          <div><Label>Claim Type</Label>
            <Select value={form.claim_type} onValueChange={(v) => setForm({ ...form, claim_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CLAIM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Claim Number (auto if blank)</Label><Input value={form.claim_number ?? ""} onChange={(e) => setForm({ ...form, claim_number: e.target.value })} /></div>
          <div><Label>Period Start</Label><Input type="date" value={form.period_start ?? ""} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
          <div><Label>Period End</Label><Input type="date" value={form.period_end ?? ""} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
          <div><Label>Claim Date</Label><Input type="date" value={form.claim_date ?? ""} onChange={(e) => setForm({ ...form, claim_date: e.target.value })} /></div>
          <div><Label>Due Date</Label><Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          <div><Label>Currency</Label><Input value={form.currency ?? "MVR"} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
          <div><Label>Previous Certified</Label><Input type="number" value={form.previous_certified_amount ?? 0} onChange={(e) => setForm({ ...form, previous_certified_amount: e.target.value })} /></div>

          <div className="col-span-2 pt-2 text-xs uppercase tracking-widest text-muted-foreground">Claim composition</div>
          <div><Label>Work Done Value</Label><Input type="number" value={form.work_done_value ?? 0} onChange={(e) => setForm({ ...form, work_done_value: e.target.value })} /></div>
          <div><Label>Variation Value</Label><Input type="number" value={form.variation_value ?? 0} onChange={(e) => setForm({ ...form, variation_value: e.target.value })} /></div>
          <div><Label>Material at Site</Label><Input type="number" value={form.material_at_site_value ?? 0} onChange={(e) => setForm({ ...form, material_at_site_value: e.target.value })} /></div>
          <div><Label>Other Claim Value</Label><Input type="number" value={form.other_claim_value ?? 0} onChange={(e) => setForm({ ...form, other_claim_value: e.target.value })} /></div>
          <div><Label>Retention %</Label><Input type="number" min={0} max={100} value={form.retention_percentage ?? 0} onChange={(e) => setForm({ ...form, retention_percentage: e.target.value })} /></div>
          <div><Label>Advance Recovery</Label><Input type="number" value={form.advance_recovery ?? 0} onChange={(e) => setForm({ ...form, advance_recovery: e.target.value })} /></div>
          <div><Label>Deductions</Label><Input type="number" value={form.deductions ?? 0} onChange={(e) => setForm({ ...form, deductions: e.target.value })} /></div>
          <div><Label>Tax</Label><Input type="number" value={form.tax_amount ?? 0} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} /></div>

          <div className="col-span-2 grid grid-cols-4 gap-2 bg-muted/40 p-3 rounded">
            <Calc label="Gross" value={gross} />
            <Calc label="Retention" value={retention} />
            <Calc label="Net Claim" value={net} highlight />
            <Calc label="Current" value={current} highlight />
          </div>

          <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="col-span-2 flex items-center gap-2">
            <Checkbox checked={!!form.is_client_visible} onCheckedChange={(v) => setForm({ ...form, is_client_visible: !!v })} />
            <Label>Visible to client portal</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Calc({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${highlight ? "text-emerald-700" : ""}`}>{fmt(value)}</p>
    </div>
  );
}

// ============= DETAIL =============
function ClaimDetail({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: (id: string) => void }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getPaymentClaim);
  const { data: claim } = useQuery({ queryKey: ["payment-claim", id], queryFn: () => getFn({ data: { id } }) });

  const itemsFn = useServerFn(listPaymentClaimItems);
  const { data: items = [] } = useQuery({ queryKey: ["pc-items", id], queryFn: () => itemsFn({ data: { payment_claim_id: id } }) });

  const varsFn = useServerFn(listPaymentClaimVariations);
  const { data: pcVars = [] } = useQuery({ queryKey: ["pc-vars", id], queryFn: () => varsFn({ data: { payment_claim_id: id } }) });

  const attFn = useServerFn(listPaymentClaimAttachments);
  const { data: atts = [] } = useQuery({ queryKey: ["pc-att", id], queryFn: () => attFn({ data: { payment_claim_id: id } }) });

  const historyFn = useServerFn(listPaymentClaimStatusHistory);
  const { data: history = [] } = useQuery({ queryKey: ["pc-hist", id], queryFn: () => historyFn({ data: { payment_claim_id: id } }) });

  const [showPreview, setShowPreview] = useState(false);
  const [actionDlg, setActionDlg] = useState<null | { kind: string }>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionCertified, setActionCertified] = useState<number | "">("");
  const [actionPaid, setActionPaid] = useState<number | "">("");
  const [actionRef, setActionRef] = useState("");

  const submitFn = useServerFn(submitPaymentClaim);
  const statusFn = useServerFn(setPaymentClaimStatus);
  const pullFn = useServerFn(pullBoqIntoClaim);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["payment-claim", id] });
    qc.invalidateQueries({ queryKey: ["payment-claims"] });
    qc.invalidateQueries({ queryKey: ["pc-items", id] });
    qc.invalidateQueries({ queryKey: ["pc-vars", id] });
    qc.invalidateQueries({ queryKey: ["pc-hist", id] });
  };

  const submitMut = useMutation({
    mutationFn: () => submitFn({ data: { id } }),
    onSuccess: () => { toast.success("Submitted for approval"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const statusMut = useMutation({
    mutationFn: (payload: any) => statusFn({ data: payload }),
    onSuccess: () => { toast.success("Status updated"); invalidate(); setActionDlg(null); setActionNote(""); setActionCertified(""); setActionPaid(""); setActionRef(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const pullMut = useMutation({
    mutationFn: () => pullFn({ data: { payment_claim_id: id, project_id: claim?.project_id } }),
    onSuccess: (r: any) => { toast.success(`Pulled ${r.inserted} BOQ rows`); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!claim) return <Sheet open onOpenChange={onClose}><SheetContent className="w-full sm:max-w-4xl"><Skeleton className="h-96 w-full" /></SheetContent></Sheet>;

  function runAction() {
    if (!actionDlg) return;
    const payload: any = { id, status: actionDlg.kind, note: actionNote || undefined };
    if (actionDlg.kind === "certified") payload.certified_amount = Number(actionCertified || claim.net_claim);
    if (actionDlg.kind === "paid" || actionDlg.kind === "partially_paid") {
      payload.paid_amount = Number(actionPaid);
      payload.payment_reference = actionRef || undefined;
    }
    statusMut.mutate(payload);
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-5xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono">{claim.claim_number}</span>
            <Badge className={STATUS_STYLE[claim.status] ?? ""}>{STATUS_LABEL[claim.status] ?? claim.status}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 my-3">
          <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}><FileSignature className="w-4 h-4 mr-1" />IPC Preview</Button>
          {claim.status === "draft" && (
            <>
              <Button size="sm" onClick={() => onEdit(id)}><Pencil className="w-4 h-4 mr-1" />Edit</Button>
              <Button size="sm" variant="outline" onClick={() => pullMut.mutate()}><DollarSign className="w-4 h-4 mr-1" />Pull BOQ</Button>
              <Button size="sm" onClick={() => submitMut.mutate()}><Send className="w-4 h-4 mr-1" />Submit</Button>
            </>
          )}
          {["submitted", "under_review"].includes(claim.status) && (
            <>
              <Button size="sm" onClick={() => setActionDlg({ kind: "approved" })}><CheckCircle2 className="w-4 h-4 mr-1" />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => setActionDlg({ kind: "revision_requested" })}>Request Revision</Button>
              <Button size="sm" variant="destructive" onClick={() => setActionDlg({ kind: "rejected" })}><X className="w-4 h-4 mr-1" />Reject</Button>
            </>
          )}
          {["approved", "client_approved"].includes(claim.status) && (
            <Button size="sm" onClick={() => setActionDlg({ kind: "certified" })}><FileSignature className="w-4 h-4 mr-1" />Certify</Button>
          )}
          {["certified", "partially_paid"].includes(claim.status) && (
            <Button size="sm" onClick={() => setActionDlg({ kind: "paid" })}><DollarSign className="w-4 h-4 mr-1" />Record Payment</Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <StatCard label="Gross" value={fmt(claim.gross_claim)} />
          <StatCard label="Net" value={fmt(claim.net_claim)} />
          <StatCard label="Certified" value={fmt(claim.certified_amount)} />
          <StatCard label="Outstanding" value={fmt(claim.outstanding_amount)} tone={Number(claim.outstanding_amount) > 0 ? "warn" : "ok"} />
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">BOQ Items ({(items as any[]).length})</TabsTrigger>
            <TabsTrigger value="variations">Variations ({(pcVars as any[]).length})</TabsTrigger>
            <TabsTrigger value="attachments">Files ({(atts as any[]).length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Info label="Project" value={(claim as any).project_name ?? claim.project_id} />
              <Info label="Type" value={claim.claim_type} />
              <Info label="Period" value={`${claim.period_start ?? "—"} → ${claim.period_end ?? "—"}`} />
              <Info label="Claim Date" value={claim.claim_date} />
              <Info label="Due Date" value={claim.due_date ?? "—"} />
              <Info label="Currency" value={claim.currency} />
              <Info label="Previous Certified" value={fmt(claim.previous_certified_amount)} />
              <Info label="Work Done" value={fmt(claim.work_done_value)} />
              <Info label="Variations" value={fmt(claim.variation_value)} />
              <Info label="Material at Site" value={fmt(claim.material_at_site_value)} />
              <Info label="Other" value={fmt(claim.other_claim_value)} />
              <Info label="Retention" value={`${fmt(claim.retention)} (${claim.retention_percentage}%)`} />
              <Info label="Advance Rec." value={fmt(claim.advance_recovery)} />
              <Info label="Deductions" value={fmt(claim.deductions)} />
              <Info label="Tax" value={fmt(claim.tax_amount)} />
              <Info label="Submitted Amount" value={fmt(claim.submitted_amount)} />
              <Info label="Paid Amount" value={fmt(claim.paid_amount)} />
              <Info label="Payment Ref." value={claim.payment_reference ?? "—"} />
            </div>
            {claim.rejection_reason && <p className="text-sm text-rose-700"><strong>Rejection:</strong> {claim.rejection_reason}</p>}
            {claim.revision_notes && <p className="text-sm text-orange-700"><strong>Revision notes:</strong> {claim.revision_notes}</p>}
            {claim.certification_comments && <p className="text-sm text-indigo-700"><strong>Certification:</strong> {claim.certification_comments}</p>}
          </TabsContent>
          <TabsContent value="items"><ItemsTab claimId={id} projectId={claim.project_id} status={claim.status} /></TabsContent>
          <TabsContent value="variations"><VariationsTab claimId={id} projectId={claim.project_id} status={claim.status} /></TabsContent>
          <TabsContent value="attachments"><AttachmentsTab claimId={id} projectId={claim.project_id} /></TabsContent>
          <TabsContent value="history">
            {(history as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground">No status changes yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(history as any[]).map((h) => (
                  <li key={h.id} className="border-l-2 border-muted pl-3 py-1">
                    <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                    <div><Badge className={STATUS_STYLE[h.old_status ?? ""] ?? ""}>{STATUS_LABEL[h.old_status ?? ""] ?? h.old_status ?? "—"}</Badge> → <Badge className={STATUS_STYLE[h.new_status ?? ""] ?? ""}>{STATUS_LABEL[h.new_status ?? ""] ?? h.new_status}</Badge></div>
                    {h.remarks && <div className="text-xs">{h.remarks}</div>}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="comments"><CommentsThread entityType="payment_claims" entityId={id} /></TabsContent>
        </Tabs>

        {/* Preview */}
        {showPreview && <IpcPreview claim={claim} items={items as any[]} variations={pcVars as any[]} onClose={() => setShowPreview(false)} />}

        {/* Action dialog */}
        <Dialog open={!!actionDlg} onOpenChange={(o) => !o && setActionDlg(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{actionDlg && STATUS_LABEL[actionDlg.kind]}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {actionDlg?.kind === "certified" && (
                <div><Label>Certified Amount</Label><Input type="number" value={actionCertified} onChange={(e) => setActionCertified(e.target.value === "" ? "" : Number(e.target.value))} placeholder={String(claim.net_claim)} /></div>
              )}
              {(actionDlg?.kind === "paid" || actionDlg?.kind === "partially_paid") && (
                <>
                  <div><Label>Paid Amount (this transaction)</Label><Input type="number" value={actionPaid} onChange={(e) => setActionPaid(e.target.value === "" ? "" : Number(e.target.value))} /></div>
                  <div><Label>Payment Reference</Label><Input value={actionRef} onChange={(e) => setActionRef(e.target.value)} /></div>
                </>
              )}
              <div><Label>{actionDlg?.kind === "rejected" ? "Reason *" : actionDlg?.kind === "revision_requested" ? "Revision notes *" : "Note"}</Label>
                <Textarea value={actionNote} onChange={(e) => setActionNote(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDlg(null)}>Cancel</Button>
              <Button onClick={runAction} disabled={statusMut.isPending}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="font-medium">{value ?? "—"}</div></div>;
}

// ============= ITEMS TAB =============
function ItemsTab({ claimId, projectId, status }: { claimId: string; projectId: string; status: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listPaymentClaimItems);
  const upsertFn = useServerFn(upsertPaymentClaimItem);
  const delFn = useServerFn(deletePaymentClaimItem);
  const { data: items = [] } = useQuery({ queryKey: ["pc-items", claimId], queryFn: () => listFn({ data: { payment_claim_id: claimId } }) });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<any>({ description: "", unit: "", contract_quantity: 0, rate: 0, previous_quantity: 0, current_quantity: 0 });
  const readOnly = !["draft", "revision_requested", "rejected"].includes(status);

  const upMut = useMutation({
    mutationFn: (v: any) => upsertFn({ data: { ...v, payment_claim_id: claimId, project_id: projectId } }),
    onSuccess: () => { toast.success("Item saved"); setAdding(false); setForm({ description: "", unit: "", contract_quantity: 0, rate: 0, previous_quantity: 0, current_quantity: 0 }); qc.invalidateQueries({ queryKey: ["pc-items", claimId] }); qc.invalidateQueries({ queryKey: ["payment-claim", claimId] }); qc.invalidateQueries({ queryKey: ["payment-claims"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id, payment_claim_id: claimId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pc-items", claimId] }); qc.invalidateQueries({ queryKey: ["payment-claim", claimId] }); qc.invalidateQueries({ queryKey: ["payment-claims"] }); },
  });

  return (
    <div className="space-y-3">
      {!readOnly && !adding && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-1" />Add item</Button>}
      {adding && (
        <Card><CardContent className="p-3 grid grid-cols-2 md:grid-cols-6 gap-2">
          <div className="col-span-2"><Label className="text-xs">Description *</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label className="text-xs">Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
          <div><Label className="text-xs">Contract Qty</Label><Input type="number" value={form.contract_quantity} onChange={(e) => setForm({ ...form, contract_quantity: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">Rate</Label><Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">Previous Qty</Label><Input type="number" value={form.previous_quantity} onChange={(e) => setForm({ ...form, previous_quantity: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">Current Qty</Label><Input type="number" value={form.current_quantity} onChange={(e) => setForm({ ...form, current_quantity: Number(e.target.value) })} /></div>
          <div className="col-span-2 md:col-span-6 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={() => upMut.mutate(form)} disabled={!form.description}>Save</Button>
          </div>
        </CardContent></Card>
      )}
      {(items as any[]).length === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet. Use "Pull BOQ" or add items manually.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr><th className="text-left p-2">Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Prev</th><th>Current</th><th>Cumul.</th><th>%</th><th>Cumul. Amt</th><th></th></tr>
            </thead>
            <tbody>
              {(items as any[]).map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="p-2">{i.description}</td>
                  <td className="text-center">{i.unit ?? "—"}</td>
                  <td className="text-right">{i.contract_quantity}</td>
                  <td className="text-right">{fmt(i.rate)}</td>
                  <td className="text-right">{i.previous_quantity}</td>
                  <td className="text-right font-medium">{i.current_quantity}</td>
                  <td className="text-right">{i.cumulative_quantity}</td>
                  <td className="text-right">{i.progress_percentage}%</td>
                  <td className="text-right font-medium">{fmt(i.cumulative_amount)}</td>
                  <td className="text-right">{!readOnly && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => delMut.mutate(i.id)}><Trash2 className="w-3 h-3" /></Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============= VARIATIONS TAB =============
function VariationsTab({ claimId, projectId, status }: { claimId: string; projectId: string; status: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listPaymentClaimVariations);
  const availFn = useServerFn(listAvailableVariations);
  const addFn = useServerFn(addPaymentClaimVariation);
  const remFn = useServerFn(removePaymentClaimVariation);
  const { data: rows = [] } = useQuery({ queryKey: ["pc-vars", claimId], queryFn: () => listFn({ data: { payment_claim_id: claimId } }) });
  const { data: avail = [] } = useQuery({ queryKey: ["pc-vars-avail", projectId], queryFn: () => availFn({ data: { project_id: projectId } }) });
  const readOnly = !["draft", "revision_requested", "rejected"].includes(status);
  const usedIds = new Set((rows as any[]).map((r) => r.variation_id));
  const free = (avail as any[]).filter((v) => !usedIds.has(v.id));

  const addMut = useMutation({
    mutationFn: (v: any) => addFn({ data: { payment_claim_id: claimId, project_id: projectId, variation_id: v.id, claimed_amount: Number(v.approved_amount ?? 0) } }),
    onSuccess: () => { toast.success("Variation added"); qc.invalidateQueries({ queryKey: ["pc-vars", claimId] }); qc.invalidateQueries({ queryKey: ["payment-claim", claimId] }); qc.invalidateQueries({ queryKey: ["payment-claims"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const remMut = useMutation({
    mutationFn: (id: string) => remFn({ data: { id, payment_claim_id: claimId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pc-vars", claimId] }); qc.invalidateQueries({ queryKey: ["payment-claim", claimId] }); qc.invalidateQueries({ queryKey: ["payment-claims"] }); },
  });

  return (
    <div className="space-y-3">
      {!readOnly && free.length > 0 && (
        <Card><CardContent className="p-3">
          <Label className="text-xs">Add approved variation</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {free.map((v: any) => (
              <Button key={v.id} size="sm" variant="outline" onClick={() => addMut.mutate(v)}>
                <Plus className="w-3 h-3 mr-1" />{v.variation_number} — {fmt(v.approved_amount)}
              </Button>
            ))}
          </div>
        </CardContent></Card>
      )}
      {(rows as any[]).length === 0 ? (
        <p className="text-sm text-muted-foreground">No variations included in this claim yet.</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="bg-muted/40"><tr><th className="text-left p-2">VO #</th><th className="text-left p-2">Description</th><th>Approved</th><th>Claimed</th><th>Certified</th><th></th></tr></thead>
          <tbody>
            {(rows as any[]).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2 font-mono">{r.variation_number}</td>
                <td className="p-2">{r.description}</td>
                <td className="text-right p-2">{fmt(r.approved_amount)}</td>
                <td className="text-right p-2 font-medium">{fmt(r.claimed_amount)}</td>
                <td className="text-right p-2">{fmt(r.certified_amount)}</td>
                <td className="text-right p-2">{!readOnly && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remMut.mutate(r.id)}><Trash2 className="w-3 h-3" /></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ============= ATTACHMENTS TAB =============
function AttachmentsTab({ claimId, projectId }: { claimId: string; projectId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listPaymentClaimAttachments);
  const addFn = useServerFn(addPaymentClaimAttachment);
  const delFn = useServerFn(deletePaymentClaimAttachment);
  const { data: rows = [] } = useQuery({ queryKey: ["pc-att", claimId], queryFn: () => listFn({ data: { payment_claim_id: claimId } }) });
  const [form, setForm] = useState({ file_name: "", file_url: "", attachment_type: "Supporting Document", description: "", is_client_visible: true });

  const addMut = useMutation({
    mutationFn: () => addFn({ data: { payment_claim_id: claimId, project_id: projectId, ...form } as any }),
    onSuccess: () => { toast.success("Attached"); setForm({ file_name: "", file_url: "", attachment_type: "Supporting Document", description: "", is_client_visible: true }); qc.invalidateQueries({ queryKey: ["pc-att", claimId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <div><Label className="text-xs">File name *</Label><Input value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} /></div>
        <div className="md:col-span-2"><Label className="text-xs">File URL *</Label><Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://…" /></div>
        <div><Label className="text-xs">Type</Label>
          <Select value={form.attachment_type} onValueChange={(v) => setForm({ ...form, attachment_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ATTACH_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3"><Label className="text-xs">Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="flex items-end"><Button size="sm" onClick={() => addMut.mutate()} disabled={!form.file_name || !form.file_url}>Add</Button></div>
      </CardContent></Card>
      {(rows as any[]).length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments.</p>
      ) : (
        <ul className="text-sm space-y-1">
          {(rows as any[]).map((a) => (
            <li key={a.id} className="flex items-center justify-between border-b py-1">
              <a href={a.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><Paperclip className="w-3 h-3" />{a.file_name}</a>
              <span className="text-xs text-muted-foreground">{a.attachment_type}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => delFn({ data: { id: a.id } }).then(() => qc.invalidateQueries({ queryKey: ["pc-att", claimId] }))}><Trash2 className="w-3 h-3" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============= IPC PREVIEW =============
function IpcPreview({ claim, items, variations, onClose }: { claim: any; items: any[]; variations: any[]; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between">
            <span>Interim Payment Certificate</span>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" />Print</Button>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <header className="text-center border-b pb-3">
            <h2 className="text-xl font-bold">INTERIM PAYMENT CERTIFICATE</h2>
            <p className="text-xs text-muted-foreground">{claim.claim_type}</p>
          </header>
          <div className="grid grid-cols-2 gap-2">
            <div><strong>Claim No:</strong> {claim.claim_number}</div>
            <div><strong>Date:</strong> {claim.claim_date}</div>
            <div><strong>Period:</strong> {claim.period_start} → {claim.period_end}</div>
            <div><strong>Currency:</strong> {claim.currency}</div>
            <div><strong>Status:</strong> {STATUS_LABEL[claim.status]}</div>
            <div><strong>Payment Ref:</strong> {claim.payment_reference ?? "—"}</div>
          </div>

          <table className="w-full text-xs border">
            <tbody>
              <tr><td className="p-2 border">Work Done Value</td><td className="p-2 border text-right">{fmt(claim.work_done_value)}</td></tr>
              <tr><td className="p-2 border">Approved Variations</td><td className="p-2 border text-right">{fmt(claim.variation_value)}</td></tr>
              <tr><td className="p-2 border">Material at Site</td><td className="p-2 border text-right">{fmt(claim.material_at_site_value)}</td></tr>
              <tr><td className="p-2 border">Other</td><td className="p-2 border text-right">{fmt(claim.other_claim_value)}</td></tr>
              <tr className="font-bold"><td className="p-2 border">Gross Claim</td><td className="p-2 border text-right">{fmt(claim.gross_claim)}</td></tr>
              <tr><td className="p-2 border">Less: Retention ({claim.retention_percentage}%)</td><td className="p-2 border text-right">({fmt(claim.retention)})</td></tr>
              <tr><td className="p-2 border">Less: Advance Recovery</td><td className="p-2 border text-right">({fmt(claim.advance_recovery)})</td></tr>
              <tr><td className="p-2 border">Less: Deductions</td><td className="p-2 border text-right">({fmt(claim.deductions)})</td></tr>
              <tr><td className="p-2 border">Less: Tax</td><td className="p-2 border text-right">({fmt(claim.tax_amount)})</td></tr>
              <tr className="font-bold bg-muted/40"><td className="p-2 border">Net Claim This Period</td><td className="p-2 border text-right">{fmt(claim.net_claim)}</td></tr>
              <tr><td className="p-2 border">Less: Previously Certified</td><td className="p-2 border text-right">({fmt(claim.previous_certified_amount)})</td></tr>
              <tr className="font-bold bg-emerald-50"><td className="p-2 border">Current Claim Amount</td><td className="p-2 border text-right">{fmt(claim.current_claim_amount)}</td></tr>
              <tr><td className="p-2 border">Certified</td><td className="p-2 border text-right">{fmt(claim.certified_amount)}</td></tr>
              <tr><td className="p-2 border">Paid</td><td className="p-2 border text-right">{fmt(claim.paid_amount)}</td></tr>
              <tr className="font-bold"><td className="p-2 border">Outstanding</td><td className="p-2 border text-right">{fmt(claim.outstanding_amount)}</td></tr>
            </tbody>
          </table>

          {items.length > 0 && (
            <>
              <h3 className="font-bold">BOQ Items</h3>
              <table className="w-full text-xs border">
                <thead className="bg-muted/40"><tr><th className="p-1 border">Description</th><th className="p-1 border">Unit</th><th className="p-1 border">Contract</th><th className="p-1 border">Prev</th><th className="p-1 border">Current</th><th className="p-1 border">Cumul.</th><th className="p-1 border">Rate</th><th className="p-1 border">Cumul. Amt</th></tr></thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className="p-1 border">{i.description}</td>
                      <td className="p-1 border text-center">{i.unit ?? "—"}</td>
                      <td className="p-1 border text-right">{i.contract_quantity}</td>
                      <td className="p-1 border text-right">{i.previous_quantity}</td>
                      <td className="p-1 border text-right">{i.current_quantity}</td>
                      <td className="p-1 border text-right">{i.cumulative_quantity}</td>
                      <td className="p-1 border text-right">{fmt(i.rate)}</td>
                      <td className="p-1 border text-right">{fmt(i.cumulative_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {variations.length > 0 && (
            <>
              <h3 className="font-bold">Variations</h3>
              <table className="w-full text-xs border">
                <thead className="bg-muted/40"><tr><th className="p-1 border">VO #</th><th className="p-1 border">Description</th><th className="p-1 border">Approved</th><th className="p-1 border">Claimed</th><th className="p-1 border">Certified</th></tr></thead>
                <tbody>
                  {variations.map((v) => (
                    <tr key={v.id}>
                      <td className="p-1 border font-mono">{v.variation_number}</td>
                      <td className="p-1 border">{v.description}</td>
                      <td className="p-1 border text-right">{fmt(v.approved_amount)}</td>
                      <td className="p-1 border text-right">{fmt(v.claimed_amount)}</td>
                      <td className="p-1 border text-right">{fmt(v.certified_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="grid grid-cols-3 gap-4 pt-8 text-xs">
            <div className="border-t pt-2 text-center">Prepared By<br /><span className="text-muted-foreground">{(claim as any).created_name ?? "—"}</span></div>
            <div className="border-t pt-2 text-center">Approved By<br /><span className="text-muted-foreground">{(claim as any).approved_name ?? "—"}</span></div>
            <div className="border-t pt-2 text-center">Certified By<br /><span className="text-muted-foreground">{(claim as any).certified_name ?? "—"}</span></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Pencil, Archive, Search, AlertTriangle, CheckCircle2, Clock,
  MoreVertical, Paperclip, X, FileSignature, Trash2, DollarSign,
} from "lucide-react";

import {
  listVariationsFull, upsertVariation, archiveVariation, setVariationStatus,
  submitVariation,
  listVariationLineItems, upsertVariationLineItem, deleteVariationLineItem,
  listVariationAttachments, addVariationAttachment, deleteVariationAttachment,
} from "@/lib/variations.functions";
import { listMembers } from "@/lib/admin.functions";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUSES = [
  "draft", "submitted", "under_review", "approved", "client_approved",
  "rejected", "revise_resubmit", "included_in_claim", "closed", "cancelled",
] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  approved: "Approved", client_approved: "Client Approved",
  rejected: "Rejected", revise_resubmit: "Revise & Resubmit",
  included_in_claim: "In Payment Claim", closed: "Closed", cancelled: "Cancelled",
};
const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  client_approved: "bg-teal-100 text-teal-700",
  rejected: "bg-rose-100 text-rose-700",
  revise_resubmit: "bg-orange-100 text-orange-700",
  included_in_claim: "bg-indigo-100 text-indigo-700",
  closed: "bg-zinc-200 text-zinc-600",
  cancelled: "bg-zinc-100 text-zinc-400",
};
const PRIO_STYLE: Record<string, string> = {
  Low: "bg-zinc-100 text-zinc-700", Medium: "bg-blue-100 text-blue-700",
  High: "bg-amber-100 text-amber-700", Critical: "bg-rose-100 text-rose-700",
};
const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
const TYPES = [
  "Addition", "Omission", "Scope Change", "Design Change", "Quantity Change",
  "Rate Change", "Site Instruction", "Client Instruction", "Consultant Instruction",
  "Specification Change", "Material Change", "Time Extension", "Cost Claim",
  "Provisional Sum Adjustment", "General",
] as const;
const CATEGORIES = [
  "Civil", "Structural", "Architectural", "MEP", "Electrical", "Plumbing",
  "HVAC", "Fire System", "Elevator", "Finishing", "External Works",
  "Procurement", "Labour", "Equipment", "Subcontractor", "Delay",
  "Contractual", "Handover",
] as const;
const LINE_TYPES = ["Addition", "Omission", "Rate Change", "Quantity Change", "Provisional", "Adjustment"] as const;

type Variation = {
  id: string; project_id: string; project_name?: string | null; project_code?: string | null;
  variation_number: string | null; title: string; description: string | null;
  variation_type: string | null; category: string | null; reason: string | null;
  instruction_reference: string | null; priority: string | null; status: Status;
  submitted_by: string | null; reviewed_by: string | null; approved_by: string | null;
  client_approved_by: string | null; assigned_to: string | null; created_by: string | null;
  assigned_name?: string | null; submitted_name?: string | null; approved_name?: string | null;
  reviewed_name?: string | null; client_approved_name?: string | null;
  due_date: string | null; submitted_at: string | null; reviewed_at: string | null;
  approved_at: string | null; rejected_at: string | null; client_approved_at: string | null;
  submitted_amount: number | null; approved_amount: number | null;
  rejected_amount: number | null; pending_amount: number | null;
  submitted_days: number | null; approved_days: number | null; time_impact_days: number | null;
  cost_impact_description: string | null; time_impact_description: string | null;
  rejection_reason: string | null; revision_notes: string | null;
  review_comments: string | null; approval_comments: string | null;
  linked_rfi_id: string | null; linked_drawing_id: string | null;
  linked_document_id: string | null; linked_task_id: string | null;
  linked_wbs_id: string | null; linked_boq_item_id: string | null;
  payment_claim_id: string | null; included_in_payment_claim: boolean;
  is_client_visible: boolean; is_archived: boolean;
  created_at: string; updated_at: string;
};

type LineItem = {
  id: string; variation_id: string; project_id: string;
  description: string; unit: string | null;
  quantity: number; rate: number; amount: number;
  approved_quantity: number; approved_rate: number; approved_amount: number;
  item_type: string | null; remarks: string | null;
};

const CLOSED_STATUSES = ["approved", "client_approved", "closed", "cancelled", "rejected", "included_in_claim"];

function isOverdue(r: Variation) {
  if (!r.due_date) return false;
  if (CLOSED_STATUSES.includes(r.status)) return false;
  return new Date(r.due_date) < new Date(new Date().toDateString());
}
function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtMoney(n: number | null | undefined) {
  return (Number(n ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function VariationRegister({
  projectId: fixedProjectId, variant = "full",
}: { projectId?: string; variant?: "full" | "compact" }) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const effectiveProjectId = fixedProjectId ?? projectId;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);

  const [dialog, setDialog] = useState<{ row?: Variation } | null>(null);
  const [detail, setDetail] = useState<Variation | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Variation | null>(null);

  const listFn = useServerFn(listVariationsFull);
  const membersFn = useServerFn(listMembers);

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["variations-full", effectiveProjectId || "all"],
    queryFn: () => listFn({ data: { projectId: effectiveProjectId || undefined } }) as Promise<Variation[]>,
  });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => membersFn() });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (rows as Variation[]).filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      if (typeFilter !== "all" && r.variation_type !== typeFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (overdueOnly && !isOverdue(r)) return false;
      if (openOnly && CLOSED_STATUSES.includes(r.status)) return false;
      if (!s) return true;
      return [r.variation_number, r.title, r.description, r.reason, r.instruction_reference,
              r.assigned_name, r.submitted_name, r.project_name, r.variation_type, r.category]
        .filter(Boolean).some((v) => (v as string).toLowerCase().includes(s));
    });
  }, [rows, search, statusFilter, priorityFilter, typeFilter, categoryFilter, overdueOnly, openOnly]);

  const stats = useMemo(() => {
    const arr = rows as Variation[];
    return {
      total: arr.length,
      pending: arr.filter((r) => ["submitted", "under_review"].includes(r.status)).length,
      approved: arr.filter((r) => ["approved", "client_approved"].includes(r.status)).length,
      rejected: arr.filter((r) => r.status === "rejected").length,
      overdue: arr.filter(isOverdue).length,
      submittedAmt: arr.reduce((s, r) => s + Number(r.submitted_amount ?? 0), 0),
      approvedAmt: arr.reduce((s, r) => s + Number(r.approved_amount ?? 0), 0),
      pendingAmt: arr.reduce((s, r) => s + Number(r.pending_amount ?? 0), 0),
      approvedDays: arr.reduce((s, r) => s + Number(r.approved_days ?? 0), 0),
      notClaimed: arr.filter((r) => ["approved", "client_approved"].includes(r.status) && !r.included_in_payment_claim).length,
    };
  }, [rows]);

  const archiveFn = useServerFn(archiveVariation);
  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Variation archived");
      qc.invalidateQueries({ queryKey: ["variations-full"] });
      setConfirmArchive(null); setDetail(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to archive"),
  });

  function exportCsv() {
    const headers = ["No", "Title", "Project", "Type", "Category", "Priority", "Status",
      "Submitted Amount", "Approved Amount", "Pending Amount", "Time Impact Days", "Approved Days",
      "Assigned", "Due Date", "In Claim"];
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      const row = [r.variation_number, r.title, r.project_name, r.variation_type, r.category, r.priority,
        STATUS_LABEL[r.status], r.submitted_amount, r.approved_amount, r.pending_amount,
        r.time_impact_days, r.approved_days, r.assigned_name, r.due_date, r.included_in_payment_claim ? "Yes" : "No"];
      lines.push(row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "variations.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const compact = variant === "compact";

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-end gap-3 justify-between">
        {!compact && (
          <div>
            <h1 className="text-2xl font-semibold">Variations</h1>
            <p className="text-sm text-muted-foreground">Variation orders, change requests, and cost/time impact tracking.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {!fixedProjectId && (
            <div className="w-56"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
          )}
          <Button size={compact ? "sm" : "default"} variant="outline" onClick={exportCsv}>Export CSV</Button>
          <Button size={compact ? "sm" : "default"} onClick={() => setDialog({})} disabled={!effectiveProjectId}>
            <Plus className="h-4 w-4 mr-1" /> New Variation
          </Button>
        </div>
      </div>

      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pending Review" value={stats.pending} icon={<Clock className="h-4 w-4 text-amber-500" />} />
          <StatCard label="Approved" value={stats.approved} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
          <StatCard label="Overdue" value={stats.overdue} highlight={stats.overdue > 0} icon={<AlertTriangle className="h-4 w-4 text-rose-500" />} />
          <StatCard label="Approved Days" value={stats.approvedDays} />
          <StatCard label="Not Claimed" value={stats.notClaimed} icon={<DollarSign className="h-4 w-4 text-indigo-500" />} />
        </div>
      )}

      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <AmountCard label="Submitted Value" value={stats.submittedAmt} tone="blue" />
          <AmountCard label="Approved Value" value={stats.approvedAmt} tone="emerald" />
          <AmountCard label="Pending Value" value={stats.pendingAmt} tone="amber" />
        </div>
      )}

      <Card><CardContent className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search VO #, title, reason…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priority</SelectItem>
            {PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={overdueOnly} onCheckedChange={(v) => setOverdueOnly(!!v)} />Overdue</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={openOnly} onCheckedChange={(v) => setOpenOnly(!!v)} />Open</label>
      </CardContent></Card>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : isError ? (
        <Card><CardContent className="p-6 text-rose-600">Failed to load variations.</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No variations found.</p>
          {effectiveProjectId
            ? <Button className="mt-3" onClick={() => setDialog({})}><Plus className="h-4 w-4 mr-1" /> Create Variation</Button>
            : <p className="text-xs mt-2">Select a project to create a variation.</p>}
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-2">VO #</th><th className="p-2">Title</th>
                {!fixedProjectId && <th className="p-2">Project</th>}
                <th className="p-2">Type</th>
                <th className="p-2 text-right">Submitted</th>
                <th className="p-2 text-right">Approved</th>
                <th className="p-2 text-right">Days</th>
                <th className="p-2">Assigned</th>
                <th className="p-2">Due</th>
                <th className="p-2">Status</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const overdue = isOverdue(r);
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(r)}>
                    <td className="p-2 font-mono text-xs">{r.variation_number ?? "—"}</td>
                    <td className="p-2">
                      <div className="font-medium flex items-center gap-1">
                        {r.title}
                        {r.is_client_visible && <Badge className="bg-sky-100 text-sky-700 text-[10px]">Client</Badge>}
                        {r.included_in_payment_claim && <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">In Claim</Badge>}
                      </div>
                      {overdue && <span className="text-xs text-rose-600">Overdue</span>}
                    </td>
                    {!fixedProjectId && <td className="p-2 text-muted-foreground">{r.project_name ?? "—"}</td>}
                    <td className="p-2 text-xs">{r.variation_type ?? "—"}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(r.submitted_amount)}</td>
                    <td className="p-2 text-right font-mono text-emerald-700">{fmtMoney(r.approved_amount)}</td>
                    <td className="p-2 text-right">{r.approved_days ?? r.time_impact_days ?? 0}</td>
                    <td className="p-2">{r.assigned_name ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className={`p-2 ${overdue ? "text-rose-600 font-medium" : ""}`}>{fmt(r.due_date)}</td>
                    <td className="p-2"><Badge className={STATUS_STYLE[r.status] ?? ""}>{STATUS_LABEL[r.status] ?? r.status}</Badge></td>
                    <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetail(r)}>View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDialog({ row: r })}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600" onClick={() => setConfirmArchive(r)}><Archive className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {dialog && (
        <VarDialog
          row={dialog.row}
          defaultProjectId={effectiveProjectId}
          members={members as any[]}
          onClose={() => setDialog(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["variations-full"] }); setDialog(null); }}
        />
      )}

      {detail && (
        <VarDetail
          v={detail}
          members={members as any[]}
          onClose={() => setDetail(null)}
          onEdit={() => { setDialog({ row: detail }); setDetail(null); }}
          onArchive={() => setConfirmArchive(detail)}
          onChanged={() => qc.invalidateQueries({ queryKey: ["variations-full"] })}
        />
      )}

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this variation?</AlertDialogTitle>
            <AlertDialogDescription>It will be hidden from lists. An admin can restore it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmArchive && archiveMut.mutate(confirmArchive.id)}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: number; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-rose-300" : ""}>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground flex items-center justify-between">{label}{icon}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
function AmountCard({ label, value, tone }: { label: string; value: number; tone: "blue" | "emerald" | "amber" }) {
  const toneClass = tone === "blue" ? "text-blue-700" : tone === "emerald" ? "text-emerald-700" : "text-amber-700";
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-xl font-semibold font-mono ${toneClass}`}>{fmtMoney(value)}</div>
      </CardContent>
    </Card>
  );
}

function VarDialog({
  row, defaultProjectId, members, onClose, onSaved,
}: {
  row?: Variation; defaultProjectId: string; members: any[];
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    project_id: row?.project_id ?? defaultProjectId ?? "",
    variation_number: row?.variation_number ?? "",
    title: row?.title ?? "",
    description: row?.description ?? "",
    variation_type: row?.variation_type ?? "General",
    category: row?.category ?? "",
    reason: row?.reason ?? "",
    instruction_reference: row?.instruction_reference ?? "",
    priority: row?.priority ?? "Medium",
    status: (row?.status as Status) ?? "draft",
    assigned_to: row?.assigned_to ?? "",
    due_date: row?.due_date ?? "",
    time_impact_days: row?.time_impact_days ?? 0,
    cost_impact_description: row?.cost_impact_description ?? "",
    time_impact_description: row?.time_impact_description ?? "",
    is_client_visible: row?.is_client_visible ?? true,
  });

  const upsertFn = useServerFn(upsertVariation);
  const saveMut = useMutation({
    mutationFn: () => {
      if (!form.project_id) throw new Error("Project is required");
      if (!form.title.trim()) throw new Error("Title is required");
      const payload: any = {
        ...form,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
        category: form.category || null,
        time_impact_days: Number(form.time_impact_days) || 0,
      };
      if (row?.id) payload.id = row.id;
      return upsertFn({ data: payload });
    },
    onSuccess: () => { toast.success(row ? "Variation updated" : "Variation created"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? "Edit Variation" : "New Variation"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Project *</Label>
            <ProjectPicker value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} />
          </div>
          <div><Label>VO #</Label><Input value={form.variation_number} onChange={(e) => setForm({ ...form, variation_number: e.target.value })} placeholder="auto" /></div>
          <div><Label>Instruction Reference</Label><Input value={form.instruction_reference} onChange={(e) => setForm({ ...form, instruction_reference: e.target.value })} placeholder="SI #, CI #, RFI #" /></div>
          <div className="md:col-span-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Reason</Label><Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>

          <div>
            <Label>Type</Label>
            <Select value={form.variation_type} onValueChange={(v) => setForm({ ...form, variation_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category || "_"} onValueChange={(v) => setForm({ ...form, category: v === "_" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: Status) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          <div><Label>Time Impact (days)</Label><Input type="number" value={form.time_impact_days} onChange={(e) => setForm({ ...form, time_impact_days: Number(e.target.value) })} /></div>

          <div className="md:col-span-2">
            <Label>Assigned reviewer / approver</Label>
            <Select value={form.assigned_to || "_"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "_" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Unassigned</SelectItem>
                {members.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2"><Label>Cost impact notes</Label><Textarea rows={2} value={form.cost_impact_description} onChange={(e) => setForm({ ...form, cost_impact_description: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Time impact notes</Label><Textarea rows={2} value={form.time_impact_description} onChange={(e) => setForm({ ...form, time_impact_description: e.target.value })} /></div>

          <label className="md:col-span-2 flex items-center gap-2 text-sm">
            <Checkbox checked={form.is_client_visible} onCheckedChange={(v) => setForm({ ...form, is_client_visible: !!v })} />
            Visible to client
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : row ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VarDetail({ v, members, onClose, onEdit, onArchive, onChanged }: {
  v: Variation; members: any[]; onClose: () => void; onEdit: () => void; onArchive: () => void; onChanged: () => void;
}) {
  const qc = useQueryClient();
  const overdue = isOverdue(v);
  const statusFn = useServerFn(setVariationStatus);
  const submitFn = useServerFn(submitVariation);
  const listItemsFn = useServerFn(listVariationLineItems);
  const upsertItemFn = useServerFn(upsertVariationLineItem);
  const delItemFn = useServerFn(deleteVariationLineItem);
  const listAttFn = useServerFn(listVariationAttachments);
  const addAttFn = useServerFn(addVariationAttachment);
  const delAttFn = useServerFn(deleteVariationAttachment);

  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ["var-items", v.id],
    queryFn: () => listItemsFn({ data: { variation_id: v.id } }) as Promise<LineItem[]>,
  });
  const { data: attachments = [] } = useQuery({
    queryKey: ["var-att", v.id],
    queryFn: () => listAttFn({ data: { variation_id: v.id } }),
  });

  const [note, setNote] = useState("");
  const [approveAmt, setApproveAmt] = useState<number>(Number(v.submitted_amount ?? 0));
  const [approveDays, setApproveDays] = useState<number>(Number(v.time_impact_days ?? 0));
  const [att, setAtt] = useState({ file_name: "", file_url: "", description: "", attachment_type: "Supporting Document", is_client_visible: true });

  const statusMut = useMutation({
    mutationFn: (s: Status) => {
      if (s === "rejected" && !note.trim()) throw new Error("Rejection reason is required");
      if (s === "revise_resubmit" && !note.trim()) throw new Error("Revision notes are required");
      const payload: any = { id: v.id, status: s, note: note || undefined };
      if (s === "approved") { payload.approved_amount = approveAmt; payload.approved_days = approveDays; }
      return statusFn({ data: payload });
    },
    onSuccess: () => { toast.success("Status updated"); setNote(""); onChanged(); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const submitMut = useMutation({
    mutationFn: () => submitFn({ data: { id: v.id } }),
    onSuccess: () => { toast.success("Variation submitted"); onChanged(); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const addAttMut = useMutation({
    mutationFn: () => {
      if (!att.file_name || !att.file_url) throw new Error("File name and URL required");
      return addAttFn({ data: { variation_id: v.id, project_id: v.project_id, ...att } });
    },
    onSuccess: () => {
      toast.success("Attachment added");
      setAtt({ file_name: "", file_url: "", description: "", attachment_type: "Supporting Document", is_client_visible: true });
      qc.invalidateQueries({ queryKey: ["var-att", v.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const delAttMut = useMutation({
    mutationFn: (id: string) => delAttFn({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["var-att", v.id] }); },
  });

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="text-base">{v.title}</SheetTitle>
              <div className="text-xs text-muted-foreground mt-1 font-mono">
                {v.variation_number ?? "—"} · {v.project_name ?? "—"}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={onArchive}><Archive className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={STATUS_STYLE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
            <Badge className={PRIO_STYLE[v.priority ?? "Medium"]}>{v.priority ?? "—"}</Badge>
            {v.variation_type && <Badge variant="outline">{v.variation_type}</Badge>}
            {v.category && <Badge variant="outline">{v.category}</Badge>}
            {v.is_client_visible && <Badge className="bg-sky-100 text-sky-700">Client visible</Badge>}
            {v.included_in_payment_claim && <Badge className="bg-indigo-100 text-indigo-700">In Payment Claim</Badge>}
            {overdue && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Submitted" value={fmtMoney(v.submitted_amount)} mono />
            <Field label="Approved" value={fmtMoney(v.approved_amount)} mono />
            <Field label="Pending" value={fmtMoney(v.pending_amount)} mono />
            <Field label="Rejected" value={fmtMoney(v.rejected_amount)} mono />
            <Field label="Time impact (days)" value={String(v.time_impact_days ?? 0)} />
            <Field label="Approved days" value={String(v.approved_days ?? 0)} />
            <Field label="Submitted by" value={v.submitted_name ?? "—"} />
            <Field label="Assigned" value={v.assigned_name ?? "Unassigned"} />
            <Field label="Approved by" value={v.approved_name ?? "—"} />
            <Field label="Client approved by" value={v.client_approved_name ?? "—"} />
            <Field label="Due date" value={fmt(v.due_date)} />
            <Field label="Submitted on" value={fmt(v.submitted_at)} />
            <Field label="Approved on" value={fmt(v.approved_at)} />
            <Field label="Client approved" value={fmt(v.client_approved_at)} />
            <Field label="Instruction ref" value={v.instruction_reference ?? "—"} />
            <Field label="Reason" value={v.reason ?? "—"} />
          </div>

          {v.description && <Section label="Description"><p className="whitespace-pre-wrap text-sm">{v.description}</p></Section>}
          {v.cost_impact_description && <Section label="Cost impact"><p className="whitespace-pre-wrap text-sm">{v.cost_impact_description}</p></Section>}
          {v.time_impact_description && <Section label="Time impact"><p className="whitespace-pre-wrap text-sm">{v.time_impact_description}</p></Section>}
          {v.approval_comments && <Section label="Approval comments"><p className="whitespace-pre-wrap text-sm bg-emerald-50 border border-emerald-200 p-2 rounded">{v.approval_comments}</p></Section>}
          {v.rejection_reason && <Section label="Rejection reason"><p className="whitespace-pre-wrap text-sm bg-rose-50 border border-rose-200 p-2 rounded">{v.rejection_reason}</p></Section>}
          {v.revision_notes && <Section label="Revision notes"><p className="whitespace-pre-wrap text-sm bg-orange-50 border border-orange-200 p-2 rounded">{v.revision_notes}</p></Section>}

          <Section label={`Cost Breakdown (${items.length})`}>
            <LineItemEditor
              items={items as LineItem[]}
              variationId={v.id}
              projectId={v.project_id}
              onSave={async (row) => {
                await upsertItemFn({ data: row });
                await refetchItems();
                onChanged();
              }}
              onDelete={async (id) => {
                await delItemFn({ data: { id, variation_id: v.id } });
                await refetchItems();
                onChanged();
              }}
            />
          </Section>

          <Section label="Workflow">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Notes (required for reject / revise & resubmit)" className="mb-2" />
            {!CLOSED_STATUSES.includes(v.status) && v.status !== "draft" && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div><Label className="text-xs">Approved amount</Label><Input type="number" value={approveAmt} onChange={(e) => setApproveAmt(Number(e.target.value))} /></div>
                <div><Label className="text-xs">Approved days</Label><Input type="number" value={approveDays} onChange={(e) => setApproveDays(Number(e.target.value))} /></div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {v.status === "draft" && <Button size="sm" variant="outline" onClick={() => submitMut.mutate()}>Submit</Button>}
              {["submitted", "draft"].includes(v.status) &&
                <Button size="sm" variant="outline" onClick={() => statusMut.mutate("under_review")}>Under Review</Button>}
              {!CLOSED_STATUSES.includes(v.status) &&
                <Button size="sm" variant="outline" className="text-emerald-700" onClick={() => statusMut.mutate("approved")}>Approve</Button>}
              {v.status === "approved" &&
                <Button size="sm" variant="outline" className="text-teal-700" onClick={() => statusMut.mutate("client_approved")}>Client Approved</Button>}
              {!CLOSED_STATUSES.includes(v.status) &&
                <Button size="sm" variant="outline" className="text-orange-700" onClick={() => statusMut.mutate("revise_resubmit")}>Revise</Button>}
              {!CLOSED_STATUSES.includes(v.status) &&
                <Button size="sm" variant="outline" className="text-rose-700" onClick={() => statusMut.mutate("rejected")}>Reject</Button>}
              {(v.status === "approved" || v.status === "client_approved") &&
                <Button size="sm" variant="outline" onClick={() => statusMut.mutate("closed")}>Close</Button>}
              {["closed", "cancelled", "rejected"].includes(v.status) &&
                <Button size="sm" variant="outline" onClick={() => statusMut.mutate("draft")}>Reopen</Button>}
            </div>
          </Section>

          <Section label={`Attachments (${(attachments as any[]).length})`}>
            <div className="space-y-2">
              {(attachments as any[]).map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm border rounded-sm p-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <a href={a.file_url} target="_blank" rel="noreferrer" className="flex-1 truncate text-blue-600 hover:underline">{a.file_name}</a>
                  {a.attachment_type && <Badge variant="outline" className="text-[10px]">{a.attachment_type}</Badge>}
                  {a.is_client_visible && <Badge className="bg-sky-100 text-sky-700 text-[10px]">Client</Badge>}
                  <Button size="icon" variant="ghost" onClick={() => delAttMut.mutate(a.id)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <Input placeholder="File name" value={att.file_name} onChange={(e) => setAtt({ ...att, file_name: e.target.value })} />
                <Input placeholder="https://… file URL" value={att.file_url} onChange={(e) => setAtt({ ...att, file_url: e.target.value })} />
                <Input placeholder="Description" value={att.description} onChange={(e) => setAtt({ ...att, description: e.target.value })} />
                <Select value={att.attachment_type} onValueChange={(v) => setAtt({ ...att, attachment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Site Instruction","Client Instruction","Consultant Instruction","Drawing","Photo Evidence","BOQ Backup","Rate Analysis","Quotation","Email/Letter","RFI","Supporting Document"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <Checkbox checked={att.is_client_visible} onCheckedChange={(v) => setAtt({ ...att, is_client_visible: !!v })} /> Client visible
                </label>
                <Button className="col-span-2" size="sm" onClick={() => addAttMut.mutate()} disabled={addAttMut.isPending}>Add attachment</Button>
              </div>
            </div>
          </Section>

          <Section label="Comments">
            <CommentsThread entityType="variations" entityId={v.id} />
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LineItemEditor({
  items, variationId, projectId, onSave, onDelete,
}: {
  items: LineItem[]; variationId: string; projectId: string;
  onSave: (row: any) => Promise<void>; onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    description: "", unit: "", quantity: 0, rate: 0,
    item_type: "Addition", remarks: "",
  });
  const submittedTotal = items.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const approvedTotal = items.reduce((s, r) => s + Number(r.approved_amount ?? 0), 0);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border rounded-sm">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr><th className="p-2 text-left">Description</th><th className="p-2">Type</th><th className="p-2">Unit</th>
              <th className="p-2 text-right">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Amount</th>
              <th className="p-2 text-right">Appr Qty</th><th className="p-2 text-right">Appr Rate</th><th className="p-2 text-right">Appr Amt</th>
              <th></th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <EditableRow key={r.id} row={r} onSave={onSave} onDelete={() => onDelete(r.id)} />
            ))}
            {items.length === 0 && <tr><td colSpan={10} className="p-4 text-center text-muted-foreground">No line items yet.</td></tr>}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-muted/30 font-medium">
              <tr><td colSpan={5} className="p-2 text-right">Total</td>
                <td className="p-2 text-right font-mono">{fmtMoney(submittedTotal)}</td>
                <td colSpan={2}></td>
                <td className="p-2 text-right font-mono text-emerald-700">{fmtMoney(approvedTotal)}</td>
                <td></td></tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2 border-t">
        <Input className="md:col-span-2" placeholder="New line description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <Select value={draft.item_type} onValueChange={(v) => setDraft({ ...draft, item_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{LINE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Unit" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
        <Input type="number" placeholder="Qty" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} />
        <Input type="number" placeholder="Rate" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: Number(e.target.value) })} />
        <Button className="md:col-span-6" size="sm" onClick={async () => {
          if (!draft.description.trim()) { toast.error("Description required"); return; }
          await onSave({ variation_id: variationId, project_id: projectId, ...draft });
          setDraft({ description: "", unit: "", quantity: 0, rate: 0, item_type: "Addition", remarks: "" });
        }}><Plus className="h-3 w-3 mr-1" /> Add line item</Button>
      </div>
    </div>
  );
}

function EditableRow({ row, onSave, onDelete }: { row: LineItem; onSave: (r: any) => Promise<void>; onDelete: () => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [r, setR] = useState(row);
  if (!edit) {
    return (
      <tr className="border-t hover:bg-muted/20">
        <td className="p-2">{row.description}</td>
        <td className="p-2">{row.item_type ?? "—"}</td>
        <td className="p-2">{row.unit ?? "—"}</td>
        <td className="p-2 text-right">{row.quantity}</td>
        <td className="p-2 text-right">{fmtMoney(row.rate)}</td>
        <td className="p-2 text-right font-mono">{fmtMoney(row.amount)}</td>
        <td className="p-2 text-right">{row.approved_quantity}</td>
        <td className="p-2 text-right">{fmtMoney(row.approved_rate)}</td>
        <td className="p-2 text-right font-mono text-emerald-700">{fmtMoney(row.approved_amount)}</td>
        <td className="p-2 text-right">
          <Button size="icon" variant="ghost" onClick={() => setEdit(true)}><Pencil className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-3 w-3 text-rose-600" /></Button>
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-t bg-muted/20">
      <td className="p-1"><Input value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></td>
      <td className="p-1">
        <Select value={r.item_type ?? "Addition"} onValueChange={(v) => setR({ ...r, item_type: v })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{LINE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-1"><Input value={r.unit ?? ""} onChange={(e) => setR({ ...r, unit: e.target.value })} /></td>
      <td className="p-1"><Input type="number" value={r.quantity} onChange={(e) => setR({ ...r, quantity: Number(e.target.value) })} /></td>
      <td className="p-1"><Input type="number" value={r.rate} onChange={(e) => setR({ ...r, rate: Number(e.target.value) })} /></td>
      <td className="p-2 text-right font-mono">{fmtMoney(Number(r.quantity) * Number(r.rate))}</td>
      <td className="p-1"><Input type="number" value={r.approved_quantity} onChange={(e) => setR({ ...r, approved_quantity: Number(e.target.value) })} /></td>
      <td className="p-1"><Input type="number" value={r.approved_rate} onChange={(e) => setR({ ...r, approved_rate: Number(e.target.value) })} /></td>
      <td className="p-2 text-right font-mono text-emerald-700">{fmtMoney(Number(r.approved_quantity) * Number(r.approved_rate))}</td>
      <td className="p-2 text-right">
        <Button size="sm" onClick={async () => {
          await onSave({
            id: r.id, variation_id: r.variation_id, project_id: r.project_id,
            description: r.description, unit: r.unit, quantity: Number(r.quantity), rate: Number(r.rate),
            approved_quantity: Number(r.approved_quantity), approved_rate: Number(r.approved_rate),
            item_type: r.item_type, remarks: r.remarks,
          });
          setEdit(false);
        }}>Save</Button>
      </td>
    </tr>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      {children}
    </div>
  );
}

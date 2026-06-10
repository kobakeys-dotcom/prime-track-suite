import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Pencil, Archive, Search, AlertTriangle, CheckCircle2, Clock,
  MoreVertical, Paperclip, X, FileCheck2, GitBranch,
} from "lucide-react";

import {
  listSubmittalsFull, upsertSubmittal, archiveSubmittal, setSubmittalStatus,
  submitSubmittal, assignSubmittal, createSubmittalRevision,
  listSubmittalAttachments, addSubmittalAttachment, deleteSubmittalAttachment,
} from "@/lib/submittals.functions";
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
  "draft", "submitted", "under_review", "approved", "approved_with_comments",
  "rejected", "revise_resubmit", "superseded", "closed", "reopened", "cancelled",
] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  approved: "Approved", approved_with_comments: "Approved w/ Comments",
  rejected: "Rejected", revise_resubmit: "Revise & Resubmit",
  superseded: "Superseded", closed: "Closed", reopened: "Reopened", cancelled: "Cancelled",
};
const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  approved_with_comments: "bg-teal-100 text-teal-700",
  rejected: "bg-rose-100 text-rose-700",
  revise_resubmit: "bg-orange-100 text-orange-700",
  superseded: "bg-zinc-200 text-zinc-500",
  closed: "bg-zinc-200 text-zinc-600",
  reopened: "bg-purple-100 text-purple-700",
  cancelled: "bg-zinc-100 text-zinc-400",
};
const PRIO_STYLE: Record<string, string> = {
  Low: "bg-zinc-100 text-zinc-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-amber-100 text-amber-700",
  Critical: "bg-rose-100 text-rose-700",
};
const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
const TYPES = [
  "Material Submittal", "Shop Drawing", "Method Statement", "Technical Datasheet",
  "Sample Approval", "Inspection Document", "Test Report", "Certificate", "Warranty",
  "O&M Manual", "As-Built Drawing", "Handover Document", "Safety Document",
  "Quality Document", "General",
] as const;
const CATEGORIES = [
  "General", "Civil", "Structural", "Architectural", "MEP", "Electrical", "Plumbing",
  "HVAC", "Fire System", "Elevator", "Finishing", "External Works", "Handover", "Compliance",
] as const;
const DISCIPLINES = [
  "Civil", "Structural", "Architectural", "MEP", "Electrical", "Plumbing", "HVAC",
  "Fire", "Elevator", "Finishing", "External Works", "General",
] as const;

type Sub = {
  id: string; project_id: string; project_name?: string | null; project_code?: string | null;
  number: string | null; title: string;
  description: string | null; submittal_type: string | null; discipline: string | null;
  category: string | null; revision: string | null;
  status: Status; priority: string | null; spec_section: string | null;
  submitted_by: string | null; assigned_to: string | null; reviewer_id: string | null;
  approved_by: string | null;
  assigned_name?: string | null; reviewer_name?: string | null;
  submitted_name?: string | null; approved_name?: string | null;
  due_date: string | null; submitted_at: string | null; reviewed_at: string | null;
  approved_at: string | null; rejected_at: string | null; closed_at: string | null;
  review_comments: string | null; rejection_reason: string | null; revision_notes: string | null;
  previous_revision_id: string | null; superseded_by: string | null;
  is_current_revision: boolean; is_client_visible: boolean; is_archived: boolean;
  created_at: string; updated_at: string;
};

const CLOSED_STATUSES = ["approved", "approved_with_comments", "closed", "cancelled", "rejected", "superseded"];

function isOverdue(r: Sub) {
  if (!r.due_date) return false;
  if (CLOSED_STATUSES.includes(r.status)) return false;
  return new Date(r.due_date) < new Date(new Date().toDateString());
}
function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function SubmittalRegister({
  projectId: fixedProjectId, variant = "full",
}: { projectId?: string; variant?: "full" | "compact" }) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const effectiveProjectId = fixedProjectId ?? projectId;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [disciplineFilter, setDisciplineFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [currentOnly, setCurrentOnly] = useState(true);

  const [dialog, setDialog] = useState<{ row?: Sub } | null>(null);
  const [detail, setDetail] = useState<Sub | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Sub | null>(null);

  const listFn = useServerFn(listSubmittalsFull);
  const membersFn = useServerFn(listMembers);

  const { data: subs = [], isLoading, isError } = useQuery({
    queryKey: ["submittals-full", effectiveProjectId || "all"],
    queryFn: () => listFn({ data: { projectId: effectiveProjectId || undefined } }) as Promise<Sub[]>,
  });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => membersFn() });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (subs as Sub[]).filter((r) => {
      if (currentOnly && !r.is_current_revision) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      if (disciplineFilter !== "all" && r.discipline !== disciplineFilter) return false;
      if (typeFilter !== "all" && r.submittal_type !== typeFilter) return false;
      if (overdueOnly && !isOverdue(r)) return false;
      if (openOnly && CLOSED_STATUSES.includes(r.status)) return false;
      if (!s) return true;
      return [r.number, r.title, r.description, r.spec_section, r.discipline,
              r.assigned_name, r.reviewer_name, r.submitted_name, r.project_name, r.submittal_type]
        .filter(Boolean).some((v) => (v as string).toLowerCase().includes(s));
    });
  }, [subs, search, statusFilter, priorityFilter, disciplineFilter, typeFilter, overdueOnly, openOnly, currentOnly]);

  const stats = useMemo(() => {
    const arr = (subs as Sub[]).filter((r) => r.is_current_revision);
    return {
      total: arr.length,
      draft: arr.filter((r) => r.status === "draft").length,
      submitted: arr.filter((r) => r.status === "submitted").length,
      under_review: arr.filter((r) => r.status === "under_review").length,
      approved: arr.filter((r) => r.status === "approved" || r.status === "approved_with_comments").length,
      revise: arr.filter((r) => r.status === "revise_resubmit").length,
      rejected: arr.filter((r) => r.status === "rejected").length,
      overdue: arr.filter(isOverdue).length,
      critical: arr.filter((r) => r.priority === "Critical").length,
    };
  }, [subs]);

  const archiveFn = useServerFn(archiveSubmittal);
  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Submittal archived");
      qc.invalidateQueries({ queryKey: ["submittals-full"] });
      setConfirmArchive(null); setDetail(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to archive"),
  });

  const compact = variant === "compact";

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-end gap-3 justify-between">
        {!compact && (
          <div>
            <h1 className="text-2xl font-semibold">Submittals</h1>
            <p className="text-sm text-muted-foreground">Material, shop-drawing, method-statement and approval submittals.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {!fixedProjectId && (
            <div className="w-56"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
          )}
          <Button size={compact ? "sm" : "default"} onClick={() => setDialog({})} disabled={!effectiveProjectId}>
            <Plus className="h-4 w-4 mr-1" /> New Submittal
          </Button>
        </div>
      </div>

      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Draft" value={stats.draft} />
          <StatCard label="Submitted" value={stats.submitted} icon={<Clock className="h-4 w-4 text-blue-500" />} />
          <StatCard label="Under Review" value={stats.under_review} icon={<Clock className="h-4 w-4 text-amber-500" />} />
          <StatCard label="Approved" value={stats.approved} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
          <StatCard label="Revise" value={stats.revise} icon={<GitBranch className="h-4 w-4 text-orange-500" />} />
          <StatCard label="Rejected" value={stats.rejected} icon={<X className="h-4 w-4 text-rose-500" />} />
          <StatCard label="Overdue" value={stats.overdue} highlight={stats.overdue > 0} icon={<AlertTriangle className="h-4 w-4 text-rose-500" />} />
        </div>
      )}

      <Card><CardContent className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search number, title, spec…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
        <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All disciplines</SelectItem>
            {DISCIPLINES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={currentOnly} onCheckedChange={(v) => setCurrentOnly(!!v)} />Current rev only</label>
      </CardContent></Card>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : isError ? (
        <Card><CardContent className="p-6 text-rose-600">Failed to load submittals.</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <FileCheck2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No submittals found.</p>
          {effectiveProjectId
            ? <Button className="mt-3" onClick={() => setDialog({})}><Plus className="h-4 w-4 mr-1" /> Create Submittal</Button>
            : <p className="text-xs mt-2">Select a project to create a submittal.</p>}
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-2">No.</th><th className="p-2">Title</th>
                {!fixedProjectId && <th className="p-2">Project</th>}
                <th className="p-2">Type</th><th className="p-2">Disc.</th>
                <th className="p-2">Rev</th><th className="p-2">Priority</th>
                <th className="p-2">Reviewer</th><th className="p-2">Due</th>
                <th className="p-2">Status</th><th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const overdue = isOverdue(r);
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(r)}>
                    <td className="p-2 font-mono text-xs">{r.number ?? "—"}</td>
                    <td className="p-2">
                      <div className="font-medium flex items-center gap-1">
                        {r.title}
                        {r.is_client_visible && <Badge className="bg-sky-100 text-sky-700 text-[10px]">Client</Badge>}
                        {!r.is_current_revision && <Badge className="bg-zinc-200 text-zinc-500 text-[10px]">Superseded</Badge>}
                      </div>
                      {overdue && <span className="text-xs text-rose-600">Overdue</span>}
                    </td>
                    {!fixedProjectId && <td className="p-2 text-muted-foreground">{r.project_name ?? "—"}</td>}
                    <td className="p-2 text-xs">{r.submittal_type ?? "—"}</td>
                    <td className="p-2">{r.discipline ?? "—"}</td>
                    <td className="p-2 font-mono text-xs">{r.revision ?? "—"}</td>
                    <td className="p-2"><Badge className={PRIO_STYLE[r.priority ?? "Medium"] ?? ""}>{r.priority ?? "—"}</Badge></td>
                    <td className="p-2">{r.reviewer_name ?? r.assigned_name ?? <span className="text-muted-foreground">—</span>}</td>
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
        <SubDialog
          row={dialog.row}
          defaultProjectId={effectiveProjectId}
          members={members as any[]}
          onClose={() => setDialog(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["submittals-full"] }); setDialog(null); }}
        />
      )}

      {detail && (
        <SubDetail
          sub={detail}
          members={members as any[]}
          onClose={() => setDetail(null)}
          onEdit={() => { setDialog({ row: detail }); setDetail(null); }}
          onArchive={() => setConfirmArchive(detail)}
          onChanged={() => qc.invalidateQueries({ queryKey: ["submittals-full"] })}
        />
      )}

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this submittal?</AlertDialogTitle>
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

function SubDialog({
  row, defaultProjectId, members, onClose, onSaved,
}: {
  row?: Sub; defaultProjectId: string; members: any[];
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    project_id: row?.project_id ?? defaultProjectId ?? "",
    number: row?.number ?? "",
    title: row?.title ?? "",
    description: row?.description ?? "",
    submittal_type: row?.submittal_type ?? "General",
    discipline: row?.discipline ?? "",
    category: row?.category ?? "General",
    revision: row?.revision ?? "Rev 0",
    status: (row?.status as Status) ?? "draft",
    priority: row?.priority ?? "Medium",
    spec_section: row?.spec_section ?? "",
    assigned_to: row?.assigned_to ?? "",
    reviewer_id: row?.reviewer_id ?? "",
    due_date: row?.due_date ?? "",
    is_client_visible: row?.is_client_visible ?? false,
  });

  const upsertFn = useServerFn(upsertSubmittal);
  const saveMut = useMutation({
    mutationFn: () => {
      if (!form.project_id) throw new Error("Project is required");
      if (!form.title.trim()) throw new Error("Title is required");
      const payload: any = {
        ...form,
        assigned_to: form.assigned_to || null,
        reviewer_id: form.reviewer_id || null,
        due_date: form.due_date || null,
        discipline: form.discipline || null,
      };
      if (row?.id) payload.id = row.id;
      return upsertFn({ data: payload });
    },
    onSuccess: () => { toast.success(row ? "Submittal updated" : "Submittal created"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? "Edit Submittal" : "New Submittal"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Project *</Label>
            <ProjectPicker value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} />
          </div>
          <div><Label>Submittal #</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="auto" /></div>
          <div><Label>Revision</Label><Input value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} placeholder="Rev 0" /></div>
          <div className="md:col-span-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          <div>
            <Label>Type</Label>
            <Select value={form.submittal_type} onValueChange={(v) => setForm({ ...form, submittal_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Discipline</Label>
            <Select value={form.discipline || "_"} onValueChange={(v) => setForm({ ...form, discipline: v === "_" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {DISCIPLINES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
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
          <div className="md:col-span-2"><Label>Specification reference</Label><Input value={form.spec_section} onChange={(e) => setForm({ ...form, spec_section: e.target.value })} placeholder="e.g. 03 30 00" /></div>

          <div>
            <Label>Assigned to</Label>
            <Select value={form.assigned_to || "_"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "_" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Unassigned</SelectItem>
                {members.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reviewer / Approver</Label>
            <Select value={form.reviewer_id || "_"} onValueChange={(v) => setForm({ ...form, reviewer_id: v === "_" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {members.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

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

function SubDetail({ sub, members, onClose, onEdit, onArchive, onChanged }: {
  sub: Sub; members: any[]; onClose: () => void; onEdit: () => void; onArchive: () => void; onChanged: () => void;
}) {
  const qc = useQueryClient();
  const overdue = isOverdue(sub);
  const statusFn = useServerFn(setSubmittalStatus);
  const submitFn = useServerFn(submitSubmittal);
  const assignFn = useServerFn(assignSubmittal);
  const reviseFn = useServerFn(createSubmittalRevision);
  const listAtt = useServerFn(listSubmittalAttachments);
  const addAtt = useServerFn(addSubmittalAttachment);
  const delAtt = useServerFn(deleteSubmittalAttachment);

  const { data: attachments = [] } = useQuery({
    queryKey: ["sub-att", sub.id],
    queryFn: () => listAtt({ data: { submittal_id: sub.id } }),
  });

  const [note, setNote] = useState("");
  const [att, setAtt] = useState({ file_name: "", file_url: "", description: "", is_client_visible: false });
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseForm, setReviseForm] = useState({ revision: "", revision_notes: "" });

  const statusMut = useMutation({
    mutationFn: (s: Status) => {
      if (s === "rejected" && !note.trim()) throw new Error("Rejection reason is required");
      if (s === "revise_resubmit" && !note.trim()) throw new Error("Revision notes are required");
      if (s === "approved_with_comments" && !note.trim()) throw new Error("Comments are required");
      return statusFn({ data: { id: sub.id, status: s, note: note || undefined } });
    },
    onSuccess: () => { toast.success("Status updated"); setNote(""); onChanged(); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const submitMut = useMutation({
    mutationFn: () => submitFn({ data: { id: sub.id } }),
    onSuccess: () => { toast.success("Submittal submitted"); onChanged(); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const assignMut = useMutation({
    mutationFn: (uid: string | null) => assignFn({ data: { id: sub.id, assigned_to: uid } }),
    onSuccess: () => { toast.success("Assigned"); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const reviseMut = useMutation({
    mutationFn: () => {
      if (!reviseForm.revision.trim()) throw new Error("New revision label is required");
      return reviseFn({ data: { id: sub.id, revision: reviseForm.revision, revision_notes: reviseForm.revision_notes || undefined } });
    },
    onSuccess: () => {
      toast.success("New revision created");
      qc.invalidateQueries({ queryKey: ["submittals-full"] });
      setReviseOpen(false); setReviseForm({ revision: "", revision_notes: "" }); onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const addAttMut = useMutation({
    mutationFn: () => {
      if (!att.file_name || !att.file_url) throw new Error("File name and URL required");
      return addAtt({ data: { submittal_id: sub.id, project_id: sub.project_id, ...att } });
    },
    onSuccess: () => {
      toast.success("Attachment added");
      setAtt({ file_name: "", file_url: "", description: "", is_client_visible: false });
      qc.invalidateQueries({ queryKey: ["sub-att", sub.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const delAttMut = useMutation({
    mutationFn: (id: string) => delAtt({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["sub-att", sub.id] }); },
  });

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="text-base">{sub.title}</SheetTitle>
              <div className="text-xs text-muted-foreground mt-1 font-mono">
                {sub.number ?? "—"} · {sub.revision ?? "—"} · {sub.project_name ?? "—"}
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
            <Badge className={STATUS_STYLE[sub.status]}>{STATUS_LABEL[sub.status]}</Badge>
            <Badge className={PRIO_STYLE[sub.priority ?? "Medium"]}>{sub.priority ?? "—"}</Badge>
            {sub.submittal_type && <Badge variant="outline">{sub.submittal_type}</Badge>}
            {sub.discipline && <Badge variant="outline">{sub.discipline}</Badge>}
            {sub.category && <Badge variant="outline">{sub.category}</Badge>}
            {sub.is_client_visible && <Badge className="bg-sky-100 text-sky-700">Client visible</Badge>}
            {!sub.is_current_revision && <Badge className="bg-zinc-200 text-zinc-600">Superseded</Badge>}
            {overdue && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Submitted by" value={sub.submitted_name ?? "—"} />
            <Field label="Assigned" value={sub.assigned_name ?? "Unassigned"} />
            <Field label="Reviewer" value={sub.reviewer_name ?? "—"} />
            <Field label="Approved by" value={sub.approved_name ?? "—"} />
            <Field label="Due date" value={fmt(sub.due_date)} />
            <Field label="Submitted" value={fmt(sub.submitted_at)} />
            <Field label="Reviewed" value={fmt(sub.reviewed_at)} />
            <Field label="Approved" value={fmt(sub.approved_at)} />
            <Field label="Rejected" value={fmt(sub.rejected_at)} />
            <Field label="Closed" value={fmt(sub.closed_at)} />
            <Field label="Spec ref" value={sub.spec_section ?? "—"} />
            <Field label="Revision" value={sub.revision ?? "—"} />
          </div>

          {sub.description && <Section label="Description"><p className="whitespace-pre-wrap text-sm">{sub.description}</p></Section>}
          {sub.review_comments && <Section label="Review comments"><p className="whitespace-pre-wrap text-sm bg-emerald-50 border border-emerald-200 p-2 rounded">{sub.review_comments}</p></Section>}
          {sub.rejection_reason && <Section label="Rejection reason"><p className="whitespace-pre-wrap text-sm bg-rose-50 border border-rose-200 p-2 rounded">{sub.rejection_reason}</p></Section>}
          {sub.revision_notes && <Section label="Revision notes"><p className="whitespace-pre-wrap text-sm bg-orange-50 border border-orange-200 p-2 rounded">{sub.revision_notes}</p></Section>}

          <Section label="Assignment">
            <Select value={sub.assigned_to ?? "_"} onValueChange={(v) => assignMut.mutate(v === "_" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Unassigned</SelectItem>
                {members.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </Section>

          <Section label="Workflow">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Notes (required for reject / revise & resubmit / approve w/ comments)" className="mb-2" />
            <div className="flex flex-wrap gap-2">
              {sub.status === "draft" && <Button size="sm" variant="outline" onClick={() => submitMut.mutate()}>Submit</Button>}
              {["submitted", "draft"].includes(sub.status) &&
                <Button size="sm" variant="outline" onClick={() => statusMut.mutate("under_review")}>Mark Under Review</Button>}
              {!CLOSED_STATUSES.includes(sub.status) &&
                <Button size="sm" variant="outline" className="text-emerald-700" onClick={() => statusMut.mutate("approved")}>Approve</Button>}
              {!CLOSED_STATUSES.includes(sub.status) &&
                <Button size="sm" variant="outline" className="text-teal-700" onClick={() => statusMut.mutate("approved_with_comments")}>Approve w/ Comments</Button>}
              {!CLOSED_STATUSES.includes(sub.status) &&
                <Button size="sm" variant="outline" className="text-orange-700" onClick={() => statusMut.mutate("revise_resubmit")}>Revise & Resubmit</Button>}
              {!CLOSED_STATUSES.includes(sub.status) &&
                <Button size="sm" variant="outline" className="text-rose-700" onClick={() => statusMut.mutate("rejected")}>Reject</Button>}
              {(sub.status === "approved" || sub.status === "approved_with_comments") &&
                <Button size="sm" variant="outline" onClick={() => statusMut.mutate("closed")}>Close</Button>}
              {["closed", "cancelled", "rejected"].includes(sub.status) &&
                <Button size="sm" variant="outline" onClick={() => statusMut.mutate("reopened")}>Reopen</Button>}
              {sub.is_current_revision && ["rejected", "revise_resubmit", "approved", "approved_with_comments"].includes(sub.status) &&
                <Button size="sm" variant="outline" onClick={() => setReviseOpen(true)}>
                  <GitBranch className="h-4 w-4 mr-1" /> New revision
                </Button>}
            </div>
          </Section>

          <Section label={`Attachments (${(attachments as any[]).length})`}>
            <div className="space-y-2">
              {(attachments as any[]).map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm border rounded-sm p-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <a href={a.file_url} target="_blank" rel="noreferrer" className="flex-1 truncate text-blue-600 hover:underline">{a.file_name}</a>
                  {a.is_client_visible && <Badge className="bg-sky-100 text-sky-700 text-[10px]">Client</Badge>}
                  <Button size="icon" variant="ghost" onClick={() => delAttMut.mutate(a.id)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="File name" value={att.file_name} onChange={(e) => setAtt({ ...att, file_name: e.target.value })} />
                <Input placeholder="https://… URL" value={att.file_url} onChange={(e) => setAtt({ ...att, file_url: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Input placeholder="Description" value={att.description} onChange={(e) => setAtt({ ...att, description: e.target.value })} className="flex-1" />
                <label className="flex items-center gap-1 text-xs"><Checkbox checked={att.is_client_visible} onCheckedChange={(v) => setAtt({ ...att, is_client_visible: !!v })} />Client</label>
                <Button size="sm" onClick={() => addAttMut.mutate()} disabled={addAttMut.isPending}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </Section>

          <Section label="Comments">
            <CommentsThread entityType="submittals" entityId={sub.id} />
          </Section>
        </div>

        <Dialog open={reviseOpen} onOpenChange={setReviseOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create new revision</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Current revision will be marked Superseded. A new Draft will be created with the same details.</p>
              <div><Label>New revision label *</Label><Input placeholder="e.g. Rev 1" value={reviseForm.revision} onChange={(e) => setReviseForm({ ...reviseForm, revision: e.target.value })} /></div>
              <div><Label>Revision notes</Label><Textarea rows={3} value={reviseForm.revision_notes} onChange={(e) => setReviseForm({ ...reviseForm, revision_notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviseOpen(false)}>Cancel</Button>
              <Button onClick={() => reviseMut.mutate()} disabled={reviseMut.isPending}>{reviseMut.isPending ? "Creating…" : "Create revision"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
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

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Pencil, Archive, Search, AlertTriangle, CheckCircle2, Clock,
  Flag, MoreVertical, Paperclip, Send, X, DollarSign, CalendarClock, FileText,
} from "lucide-react";

import {
  listRfisFull, upsertRfi, archiveRfi, setRfiStatus, respondRfi, assignRfi,
  listRfiAttachments, addRfiAttachment, deleteRfiAttachment,
} from "@/lib/rfis.functions";
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

const STATUSES = ["draft","submitted","under_review","approved","rejected","revise_resubmit","closed","reopened","cancelled"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  approved: "Answered", rejected: "Rejected", revise_resubmit: "Revise & Resubmit",
  closed: "Closed", reopened: "Reopened", cancelled: "Cancelled",
};
const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  revise_resubmit: "bg-orange-100 text-orange-700",
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
const PRIORITIES = ["Low","Medium","High","Critical"] as const;
const CATEGORIES = ["General","Technical Clarification","Design Clarification","Drawing Conflict","Specification Clarification","Site Condition","Material Clarification","Method Statement","Quality","Safety","Variation Related","Time Impact","Cost Impact","Consultant Instruction","Client Clarification"] as const;
const DISCIPLINES = ["Civil","Structural","Architectural","MEP","Electrical","Plumbing","HVAC","Fire","Elevator","Finishing","External Works","General"] as const;

type RFI = {
  id: string; project_id: string; project_name?: string | null; project_code?: string | null;
  rfi_number: string | null; subject: string;
  description: string | null; question: string | null; response: string | null;
  status: Status; priority: string | null; category: string | null; discipline: string | null;
  location: string | null; due_date: string | null;
  assigned_to: string | null; reviewer_id: string | null; raised_by: string | null; responded_by: string | null;
  assigned_name?: string | null; reviewer_name?: string | null; raised_name?: string | null; responded_name?: string | null;
  submitted_at: string | null; responded_at: string | null; closed_at: string | null;
  cost_impact: boolean; cost_impact_description: string | null;
  time_impact: boolean; time_impact_days: number; time_impact_description: string | null;
  reference_drawing: string | null;
  linked_drawing_id: string | null; linked_task_id: string | null; linked_document_id: string | null;
  linked_submittal_id: string | null; linked_issue_id: string | null;
  is_client_visible: boolean; is_archived: boolean;
  created_at: string; updated_at: string;
};

function isOverdue(r: RFI) {
  if (!r.due_date) return false;
  if (["approved", "closed", "cancelled", "rejected"].includes(r.status)) return false;
  return new Date(r.due_date) < new Date(new Date().toDateString());
}
function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function RfiRegister({ projectId: fixedProjectId, variant = "full" }: { projectId?: string; variant?: "full" | "compact" }) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const effectiveProjectId = fixedProjectId ?? projectId;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [disciplineFilter, setDisciplineFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);

  const [dialog, setDialog] = useState<{ row?: RFI } | null>(null);
  const [detail, setDetail] = useState<RFI | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<RFI | null>(null);

  const listFn = useServerFn(listRfisFull);
  const membersFn = useServerFn(listMembers);

  const { data: rfis = [], isLoading, isError } = useQuery({
    queryKey: ["rfis-full", effectiveProjectId || "all"],
    queryFn: () => listFn({ data: { projectId: effectiveProjectId || undefined } }) as Promise<RFI[]>,
  });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => membersFn() });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (rfis as RFI[]).filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      if (disciplineFilter !== "all" && r.discipline !== disciplineFilter) return false;
      if (overdueOnly && !isOverdue(r)) return false;
      if (openOnly && ["approved","closed","cancelled","rejected"].includes(r.status)) return false;
      if (!s) return true;
      return [r.rfi_number, r.subject, r.description, r.question, r.response, r.location, r.discipline, r.assigned_name, r.reviewer_name, r.project_name, r.reference_drawing]
        .filter(Boolean).some((v) => (v as string).toLowerCase().includes(s));
    });
  }, [rfis, search, statusFilter, priorityFilter, disciplineFilter, overdueOnly, openOnly]);

  const stats = useMemo(() => {
    const arr = rfis as RFI[];
    return {
      total: arr.length,
      draft: arr.filter((r) => r.status === "draft").length,
      submitted: arr.filter((r) => r.status === "submitted").length,
      under_review: arr.filter((r) => r.status === "under_review").length,
      answered: arr.filter((r) => r.status === "approved").length,
      closed: arr.filter((r) => r.status === "closed").length,
      overdue: arr.filter(isOverdue).length,
      critical: arr.filter((r) => r.priority === "Critical").length,
      cost_impact: arr.filter((r) => r.cost_impact).length,
      time_impact: arr.filter((r) => r.time_impact).length,
    };
  }, [rfis]);

  const archiveFn = useServerFn(archiveRfi);
  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => { toast.success("RFI archived"); qc.invalidateQueries({ queryKey: ["rfis-full"] }); setConfirmArchive(null); setDetail(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to archive"),
  });

  const compact = variant === "compact";

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-end gap-3 justify-between">
        {!compact && (
          <div>
            <h1 className="text-2xl font-semibold">RFIs</h1>
            <p className="text-sm text-muted-foreground">Requests for information — create, route, answer, and close.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {!fixedProjectId && (
            <div className="w-56"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
          )}
          <Button size={compact ? "sm" : "default"} onClick={() => setDialog({})} disabled={!effectiveProjectId}>
            <Plus className="h-4 w-4 mr-1" /> New RFI
          </Button>
        </div>
      </div>

      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Draft" value={stats.draft} />
          <StatCard label="Submitted" value={stats.submitted} icon={<Clock className="h-4 w-4 text-blue-500" />} />
          <StatCard label="Under Review" value={stats.under_review} icon={<Clock className="h-4 w-4 text-amber-500" />} />
          <StatCard label="Answered" value={stats.answered} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
          <StatCard label="Overdue" value={stats.overdue} highlight={stats.overdue > 0} icon={<AlertTriangle className="h-4 w-4 text-rose-500" />} />
          <StatCard label="Cost impact" value={stats.cost_impact} icon={<DollarSign className="h-4 w-4 text-amber-500" />} />
          <StatCard label="Time impact" value={stats.time_impact} icon={<CalendarClock className="h-4 w-4 text-amber-500" />} />
        </div>
      )}

      <Card><CardContent className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search subject, number, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priority</SelectItem>
            {PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All disciplines</SelectItem>
            {DISCIPLINES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={overdueOnly} onCheckedChange={(v) => setOverdueOnly(!!v)} />Overdue</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={openOnly} onCheckedChange={(v) => setOpenOnly(!!v)} />Open only</label>
      </CardContent></Card>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : isError ? (
        <Card><CardContent className="p-6 text-rose-600">Failed to load RFIs.</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No RFIs found.</p>
          {effectiveProjectId
            ? <Button className="mt-3" onClick={() => setDialog({})}><Plus className="h-4 w-4 mr-1" /> Create RFI</Button>
            : <p className="text-xs mt-2">Select a project to create an RFI.</p>}
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-2">No.</th><th className="p-2">Subject</th>
                {!fixedProjectId && <th className="p-2">Project</th>}
                <th className="p-2">Discipline</th><th className="p-2">Priority</th>
                <th className="p-2">Assignee</th><th className="p-2">Due</th>
                <th className="p-2">Impact</th><th className="p-2">Status</th><th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const overdue = isOverdue(r);
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(r)}>
                    <td className="p-2 font-mono text-xs">{r.rfi_number ?? "—"}</td>
                    <td className="p-2">
                      <div className="font-medium flex items-center gap-1">
                        {r.subject}
                        {r.is_client_visible && <Badge className="bg-sky-100 text-sky-700 text-[10px]">Client</Badge>}
                      </div>
                      {overdue && <span className="text-xs text-rose-600">Overdue</span>}
                    </td>
                    {!fixedProjectId && <td className="p-2 text-muted-foreground">{r.project_name ?? "—"}</td>}
                    <td className="p-2">{r.discipline ?? "—"}</td>
                    <td className="p-2"><Badge className={PRIO_STYLE[r.priority ?? "Medium"] ?? ""}>{r.priority ?? "—"}</Badge></td>
                    <td className="p-2">{r.assigned_name ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                    <td className={`p-2 ${overdue ? "text-rose-600 font-medium" : ""}`}>{fmt(r.due_date)}</td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        {r.cost_impact && <Badge className="bg-amber-100 text-amber-700 text-[10px]"><DollarSign className="h-3 w-3" /></Badge>}
                        {r.time_impact && <Badge className="bg-amber-100 text-amber-700 text-[10px]"><CalendarClock className="h-3 w-3" />{r.time_impact_days ? ` ${r.time_impact_days}d` : ""}</Badge>}
                      </div>
                    </td>
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
        <RfiDialog
          row={dialog.row}
          defaultProjectId={effectiveProjectId}
          members={members as any[]}
          onClose={() => setDialog(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["rfis-full"] }); setDialog(null); }}
        />
      )}

      {detail && (
        <RfiDetail
          rfi={detail}
          members={members as any[]}
          onClose={() => setDetail(null)}
          onEdit={() => { setDialog({ row: detail }); setDetail(null); }}
          onArchive={() => setConfirmArchive(detail)}
          onChanged={() => qc.invalidateQueries({ queryKey: ["rfis-full"] })}
        />
      )}

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this RFI?</AlertDialogTitle>
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

function RfiDialog({
  row, defaultProjectId, members, onClose, onSaved,
}: {
  row?: RFI; defaultProjectId: string; members: any[];
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    project_id: row?.project_id ?? defaultProjectId ?? "",
    rfi_number: row?.rfi_number ?? "",
    subject: row?.subject ?? "",
    description: row?.description ?? "",
    question: row?.question ?? "",
    status: (row?.status as Status) ?? "draft",
    priority: row?.priority ?? "Medium",
    category: row?.category ?? "General",
    discipline: row?.discipline ?? "",
    location: row?.location ?? "",
    due_date: row?.due_date ?? "",
    assigned_to: row?.assigned_to ?? "",
    reviewer_id: row?.reviewer_id ?? "",
    reference_drawing: row?.reference_drawing ?? "",
    cost_impact: row?.cost_impact ?? false,
    cost_impact_description: row?.cost_impact_description ?? "",
    time_impact: row?.time_impact ?? false,
    time_impact_days: row?.time_impact_days ?? 0,
    time_impact_description: row?.time_impact_description ?? "",
    is_client_visible: row?.is_client_visible ?? false,
  });

  const upsertFn = useServerFn(upsertRfi);
  const saveMut = useMutation({
    mutationFn: () => {
      if (!form.project_id) throw new Error("Project is required");
      if (!form.subject.trim()) throw new Error("Subject is required");
      if (!form.question.trim() && !form.description.trim()) throw new Error("Question or description is required");
      const payload: any = {
        ...form,
        assigned_to: form.assigned_to || null,
        reviewer_id: form.reviewer_id || null,
        due_date: form.due_date || null,
        discipline: form.discipline || null,
        time_impact_days: Number(form.time_impact_days) || 0,
      };
      if (row?.id) payload.id = row.id;
      return upsertFn({ data: payload });
    },
    onSuccess: () => { toast.success(row ? "RFI updated" : "RFI created"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? "Edit RFI" : "New RFI"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Project *</Label>
            <ProjectPicker value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} />
          </div>
          <div><Label>RFI number</Label><Input value={form.rfi_number} onChange={(e) => setForm({ ...form, rfi_number: e.target.value })} placeholder="auto" /></div>
          <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Subject *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Question *</Label><Textarea rows={4} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Description / background</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

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
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div><Label>Reference drawing</Label><Input value={form.reference_drawing} onChange={(e) => setForm({ ...form, reference_drawing: e.target.value })} placeholder="e.g. A-101 Rev 2" /></div>

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
            <Label>Reviewer</Label>
            <Select value={form.reviewer_id || "_"} onValueChange={(v) => setForm({ ...form, reviewer_id: v === "_" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {members.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-md p-3">
            <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={form.cost_impact} onCheckedChange={(v) => setForm({ ...form, cost_impact: !!v })} />Cost impact</label>
            <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={form.time_impact} onCheckedChange={(v) => setForm({ ...form, time_impact: !!v })} />Time impact</label>
            {form.cost_impact && (
              <div className="md:col-span-2"><Label>Cost impact description</Label><Textarea rows={2} value={form.cost_impact_description} onChange={(e) => setForm({ ...form, cost_impact_description: e.target.value })} /></div>
            )}
            {form.time_impact && (
              <>
                <div><Label>Time impact (days)</Label><Input type="number" min="0" value={form.time_impact_days} onChange={(e) => setForm({ ...form, time_impact_days: Number(e.target.value) })} /></div>
                <div><Label>Time impact description</Label><Input value={form.time_impact_description} onChange={(e) => setForm({ ...form, time_impact_description: e.target.value })} /></div>
              </>
            )}
          </div>

          <label className="md:col-span-2 flex items-center gap-2 text-sm"><Checkbox checked={form.is_client_visible} onCheckedChange={(v) => setForm({ ...form, is_client_visible: !!v })} />Visible to client</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : row ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RfiDetail({ rfi, members, onClose, onEdit, onArchive, onChanged }: {
  rfi: RFI; members: any[]; onClose: () => void; onEdit: () => void; onArchive: () => void; onChanged: () => void;
}) {
  const qc = useQueryClient();
  const overdue = isOverdue(rfi);
  const statusFn = useServerFn(setRfiStatus);
  const respondFn = useServerFn(respondRfi);
  const assignFn = useServerFn(assignRfi);
  const listAtt = useServerFn(listRfiAttachments);
  const addAtt = useServerFn(addRfiAttachment);
  const delAtt = useServerFn(deleteRfiAttachment);

  const { data: attachments = [] } = useQuery({
    queryKey: ["rfi-att", rfi.id],
    queryFn: () => listAtt({ data: { rfi_id: rfi.id } }),
  });

  const [response, setResponse] = useState(rfi.response ?? "");
  const [note, setNote] = useState("");
  const [att, setAtt] = useState({ file_name: "", file_url: "", description: "", is_client_visible: false });

  const respondMut = useMutation({
    mutationFn: () => {
      if (!response.trim()) throw new Error("Response is required");
      return respondFn({ data: { id: rfi.id, response } });
    },
    onSuccess: () => { toast.success("Response submitted — RFI answered"); onChanged(); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const statusMut = useMutation({
    mutationFn: (s: Status) => {
      if ((s === "rejected" || s === "revise_resubmit" || s === "reopened") && !note.trim()) {
        throw new Error("Please provide a reason/notes");
      }
      return statusFn({ data: { id: rfi.id, status: s, note: note || undefined } });
    },
    onSuccess: () => { toast.success("Status updated"); setNote(""); onChanged(); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const assignMut = useMutation({
    mutationFn: (uid: string | null) => assignFn({ data: { id: rfi.id, assigned_to: uid } }),
    onSuccess: () => { toast.success("Assigned"); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const addAttMut = useMutation({
    mutationFn: () => {
      if (!att.file_name || !att.file_url) throw new Error("File name and URL required");
      return addAtt({ data: { rfi_id: rfi.id, project_id: rfi.project_id, ...att } });
    },
    onSuccess: () => { toast.success("Attachment added"); setAtt({ file_name: "", file_url: "", description: "", is_client_visible: false }); qc.invalidateQueries({ queryKey: ["rfi-att", rfi.id] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const delAttMut = useMutation({
    mutationFn: (id: string) => delAtt({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["rfi-att", rfi.id] }); },
  });

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="text-base">{rfi.subject}</SheetTitle>
              <div className="text-xs text-muted-foreground mt-1 font-mono">{rfi.rfi_number ?? "—"} · {rfi.project_name ?? "—"}</div>
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
            <Badge className={STATUS_STYLE[rfi.status]}>{STATUS_LABEL[rfi.status]}</Badge>
            <Badge className={PRIO_STYLE[rfi.priority ?? "Medium"]}>{rfi.priority ?? "—"}</Badge>
            {rfi.discipline && <Badge variant="outline">{rfi.discipline}</Badge>}
            {rfi.category && <Badge variant="outline">{rfi.category}</Badge>}
            {rfi.is_client_visible && <Badge className="bg-sky-100 text-sky-700">Client visible</Badge>}
            {overdue && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
            {rfi.cost_impact && <Badge className="bg-amber-100 text-amber-700"><DollarSign className="h-3 w-3 mr-1" />Cost</Badge>}
            {rfi.time_impact && <Badge className="bg-amber-100 text-amber-700"><CalendarClock className="h-3 w-3 mr-1" />{rfi.time_impact_days || 0}d</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Raised by" value={rfi.raised_name ?? "—"} />
            <Field label="Assigned" value={rfi.assigned_name ?? "Unassigned"} />
            <Field label="Reviewer" value={rfi.reviewer_name ?? "—"} />
            <Field label="Responded by" value={rfi.responded_name ?? "—"} />
            <Field label="Due date" value={fmt(rfi.due_date)} />
            <Field label="Submitted" value={fmt(rfi.submitted_at)} />
            <Field label="Responded" value={fmt(rfi.responded_at)} />
            <Field label="Closed" value={fmt(rfi.closed_at)} />
            <Field label="Location" value={rfi.location ?? "—"} />
            <Field label="Reference drawing" value={rfi.reference_drawing ?? "—"} />
          </div>

          {rfi.question && <Section label="Question"><p className="whitespace-pre-wrap text-sm">{rfi.question}</p></Section>}
          {rfi.description && <Section label="Description"><p className="whitespace-pre-wrap text-sm">{rfi.description}</p></Section>}
          {rfi.response && <Section label="Response"><p className="whitespace-pre-wrap text-sm bg-emerald-50 border border-emerald-200 p-2 rounded">{rfi.response}</p></Section>}
          {rfi.cost_impact && rfi.cost_impact_description && <Section label="Cost impact"><p className="text-sm">{rfi.cost_impact_description}</p></Section>}
          {rfi.time_impact && rfi.time_impact_description && <Section label="Time impact"><p className="text-sm">{rfi.time_impact_description}</p></Section>}

          {/* Quick assign */}
          <Section label="Assignment">
            <Select value={rfi.assigned_to ?? "_"} onValueChange={(v) => assignMut.mutate(v === "_" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Unassigned</SelectItem>
                {members.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </Section>

          {/* Response */}
          {!["closed","cancelled"].includes(rfi.status) && (
            <Section label="Add response">
              <Textarea rows={3} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Type the response/answer…" />
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={() => respondMut.mutate()} disabled={respondMut.isPending}>
                  <Send className="h-4 w-4 mr-1" /> Submit response
                </Button>
              </div>
            </Section>
          )}

          {/* Workflow actions */}
          <Section label="Workflow">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (required for reject/revise/reopen)" className="mb-2" />
            <div className="flex flex-wrap gap-2">
              {rfi.status === "draft" && <Button size="sm" variant="outline" onClick={() => statusMut.mutate("submitted")}>Submit</Button>}
              {["submitted","draft"].includes(rfi.status) && <Button size="sm" variant="outline" onClick={() => statusMut.mutate("under_review")}>Under review</Button>}
              {!["closed","cancelled"].includes(rfi.status) && <Button size="sm" variant="outline" onClick={() => statusMut.mutate("revise_resubmit")}>Revise & resubmit</Button>}
              {!["closed","cancelled"].includes(rfi.status) && <Button size="sm" variant="outline" onClick={() => statusMut.mutate("rejected")}>Reject</Button>}
              {rfi.status === "approved" && <Button size="sm" variant="outline" onClick={() => statusMut.mutate("closed")}>Close</Button>}
              {["closed","cancelled","rejected"].includes(rfi.status) && <Button size="sm" variant="outline" onClick={() => statusMut.mutate("reopened")}>Reopen</Button>}
              {rfi.status !== "cancelled" && rfi.status !== "closed" && <Button size="sm" variant="outline" onClick={() => statusMut.mutate("cancelled")}>Cancel</Button>}
            </div>
          </Section>

          {/* Attachments */}
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

          {/* Comments */}
          <Section label="Comments">
            <CommentsThread entityType="rfis" entityId={rfi.id} />
          </Section>
        </div>
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

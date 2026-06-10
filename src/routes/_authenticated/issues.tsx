import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Pencil, Archive, Search, AlertTriangle, CheckCircle2, Clock,
  Flag, MoreVertical, Image as ImageIcon, MessageSquare, X, ArrowUpCircle,
} from "lucide-react";

import {
  listIssues, upsertIssue, archiveIssue, updateIssueStatus,
  assignIssue, escalateIssue, addIssuePhoto, removeIssuePhoto,
} from "@/lib/issues.functions";
import { listMembers } from "@/lib/admin.functions";
import { listComments, addComment } from "@/lib/comments.functions";
import { ProjectPicker } from "@/components/project-picker";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUSES = ["Open","Assigned","In Progress","On Hold","Pending Review","Resolved","Closed","Reopened","Escalated","Cancelled"] as const;
const PRIORITIES = ["Low","Medium","High","Critical"] as const;
const SEVERITIES = ["Low","Medium","High","Critical"] as const;
const TYPES = ["General","Technical","Site","Design","Procurement","Material","Quality","Safety","Client","Consultant","Subcontractor","Finance","Schedule","Document","Handover"] as const;

const STATUS_STYLE: Record<string, string> = {
  Open: "bg-zinc-100 text-zinc-700",
  Assigned: "bg-indigo-100 text-indigo-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "On Hold": "bg-amber-100 text-amber-700",
  "Pending Review": "bg-purple-100 text-purple-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  Closed: "bg-zinc-200 text-zinc-600",
  Reopened: "bg-orange-100 text-orange-700",
  Escalated: "bg-rose-100 text-rose-700",
  Cancelled: "bg-zinc-100 text-zinc-400",
};
const PRIO_STYLE: Record<string, string> = {
  Low: "bg-zinc-100 text-zinc-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-amber-100 text-amber-700",
  Critical: "bg-rose-100 text-rose-700",
};

type Issue = {
  id: string; project_id: string; project_name?: string | null;
  issue_number: string | null; title: string; description: string | null;
  issue_type: string | null; category: string | null;
  priority: string; severity: string; status: string;
  location: string | null; discipline: string | null;
  assigned_to: string | null; assigned_name?: string | null;
  due_date: string | null; target_resolution_date: string | null; resolved_date: string | null;
  root_cause: string | null; corrective_action: string | null; resolution_notes: string | null;
  escalation_level: number; is_escalated: boolean; is_client_visible: boolean;
  is_archived: boolean;
  linked_task_id: string | null; linked_daily_report_id: string | null; linked_risk_id: string | null;
  photos: Array<{ url: string; caption?: string | null }> | null;
  created_by: string | null; created_at: string; updated_at: string;
};

function isOverdue(i: Issue) {
  if (!i.due_date) return false;
  if (["Resolved","Closed","Cancelled"].includes(i.status)) return false;
  return new Date(i.due_date) < new Date(new Date().toDateString());
}
function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export const Route = createFileRoute("/_authenticated/issues")({
  head: () => ({ meta: [{ title: "Issues — ProjectCore" }] }),
  component: IssuesPage,
});

function IssuesPage() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [dialog, setDialog] = useState<{ row?: Issue } | null>(null);
  const [detail, setDetail] = useState<Issue | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Issue | null>(null);

  const listFn = useServerFn(listIssues);
  const membersFn = useServerFn(listMembers);

  const { data: issues = [], isLoading, isError } = useQuery({
    queryKey: ["issues", projectId || "all"],
    queryFn: () => listFn({ data: { projectId: projectId || undefined } }) as Promise<Issue[]>,
  });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => membersFn() });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (issues as Issue[]).filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (priorityFilter !== "all" && i.priority !== priorityFilter) return false;
      if (overdueOnly && !isOverdue(i)) return false;
      if (criticalOnly && i.priority !== "Critical" && i.severity !== "Critical") return false;
      if (!s) return true;
      return [i.title, i.issue_number, i.description, i.location, i.discipline, i.assigned_name, i.project_name]
        .filter(Boolean).some((v) => (v as string).toLowerCase().includes(s));
    });
  }, [issues, search, statusFilter, priorityFilter, overdueOnly, criticalOnly]);

  const stats = useMemo(() => {
    const arr = issues as Issue[];
    return {
      total: arr.length,
      open: arr.filter((i) => i.status === "Open" || i.status === "Assigned").length,
      inProgress: arr.filter((i) => i.status === "In Progress").length,
      overdue: arr.filter(isOverdue).length,
      critical: arr.filter((i) => i.priority === "Critical" || i.severity === "Critical").length,
      resolved: arr.filter((i) => i.status === "Resolved").length,
      closed: arr.filter((i) => i.status === "Closed").length,
      escalated: arr.filter((i) => i.is_escalated).length,
    };
  }, [issues]);

  const archiveFn = useServerFn(archiveIssue);
  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => { toast.success("Issue archived"); qc.invalidateQueries({ queryKey: ["issues"] }); setConfirmArchive(null); setDetail(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to archive"),
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Issues</h1>
          <p className="text-sm text-muted-foreground">Track, assign, escalate and resolve project issues.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-56"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
          <Button onClick={() => setDialog({})} disabled={!projectId}>
            <Plus className="h-4 w-4 mr-1" /> New Issue
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Open" value={stats.open} icon={<Clock className="h-4 w-4 text-zinc-500" />} />
        <StatCard label="In Progress" value={stats.inProgress} icon={<Clock className="h-4 w-4 text-blue-500" />} />
        <StatCard label="Overdue" value={stats.overdue} icon={<AlertTriangle className="h-4 w-4 text-rose-500" />} highlight={stats.overdue > 0} />
        <StatCard label="Critical" value={stats.critical} icon={<Flag className="h-4 w-4 text-rose-500" />} />
        <StatCard label="Escalated" value={stats.escalated} icon={<ArrowUpCircle className="h-4 w-4 text-rose-500" />} />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <StatCard label="Closed" value={stats.closed} />
      </div>

      <Card><CardContent className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search title, number, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={overdueOnly} onCheckedChange={(v) => setOverdueOnly(!!v)} />Overdue</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={criticalOnly} onCheckedChange={(v) => setCriticalOnly(!!v)} />Critical</label>
      </CardContent></Card>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : isError ? (
        <Card><CardContent className="p-6 text-rose-600">Failed to load issues.</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No issues found.</p>
          {projectId ? <Button className="mt-3" onClick={() => setDialog({})}><Plus className="h-4 w-4 mr-1" /> Create issue</Button>
            : <p className="text-xs mt-2">Select a project to create an issue.</p>}
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-2">No.</th><th className="p-2">Title</th><th className="p-2">Project</th>
                <th className="p-2">Type</th><th className="p-2">Priority</th><th className="p-2">Severity</th>
                <th className="p-2">Assignee</th><th className="p-2">Due</th><th className="p-2">Status</th><th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const overdue = isOverdue(i);
                return (
                  <tr key={i.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(i)}>
                    <td className="p-2 font-mono text-xs">{i.issue_number ?? "—"}</td>
                    <td className="p-2">
                      <div className="font-medium flex items-center gap-1">
                        {i.title}
                        {i.is_escalated && <Badge className="bg-rose-100 text-rose-700 text-[10px]">ESC L{i.escalation_level}</Badge>}
                      </div>
                      {overdue && <span className="text-xs text-rose-600">Overdue</span>}
                    </td>
                    <td className="p-2 text-muted-foreground">{i.project_name ?? "—"}</td>
                    <td className="p-2">{i.issue_type ?? "—"}</td>
                    <td className="p-2"><Badge className={PRIO_STYLE[i.priority] ?? ""}>{i.priority}</Badge></td>
                    <td className="p-2"><Badge className={PRIO_STYLE[i.severity] ?? ""}>{i.severity}</Badge></td>
                    <td className="p-2">{i.assigned_name ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                    <td className={`p-2 ${overdue ? "text-rose-600 font-medium" : ""}`}>{fmt(i.due_date)}</td>
                    <td className="p-2"><Badge className={STATUS_STYLE[i.status] ?? ""}>{i.status}</Badge></td>
                    <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetail(i)}>View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDialog({ row: i })}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-rose-600" onClick={() => setConfirmArchive(i)}><Archive className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>
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
        <IssueDialog
          row={dialog.row}
          defaultProjectId={projectId}
          members={members as any[]}
          onClose={() => setDialog(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["issues"] }); setDialog(null); }}
        />
      )}

      {detail && (
        <IssueDetail
          issue={detail}
          members={members as any[]}
          onClose={() => setDetail(null)}
          onEdit={() => { setDialog({ row: detail }); setDetail(null); }}
          onArchive={() => setConfirmArchive(detail)}
          onChanged={() => qc.invalidateQueries({ queryKey: ["issues"] })}
        />
      )}

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this issue?</AlertDialogTitle>
            <AlertDialogDescription>The issue will be hidden from lists. This is reversible by an admin.</AlertDialogDescription>
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

function IssueDialog({
  row, defaultProjectId, members, onClose, onSaved,
}: {
  row?: Issue; defaultProjectId: string; members: any[];
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    project_id: row?.project_id ?? defaultProjectId ?? "",
    issue_number: row?.issue_number ?? "",
    title: row?.title ?? "",
    description: row?.description ?? "",
    issue_type: row?.issue_type ?? "General",
    category: row?.category ?? "",
    priority: row?.priority ?? "Medium",
    severity: row?.severity ?? "Medium",
    status: row?.status ?? "Open",
    location: row?.location ?? "",
    discipline: row?.discipline ?? "",
    assigned_to: row?.assigned_to ?? "",
    due_date: row?.due_date ?? "",
    target_resolution_date: row?.target_resolution_date ?? "",
    root_cause: row?.root_cause ?? "",
    corrective_action: row?.corrective_action ?? "",
    resolution_notes: row?.resolution_notes ?? "",
    is_client_visible: row?.is_client_visible ?? false,
  });

  const upsertFn = useServerFn(upsertIssue);
  const saveMut = useMutation({
    mutationFn: () => {
      if (!form.project_id) throw new Error("Project is required");
      if (!form.title.trim()) throw new Error("Title is required");
      if (form.status === "Resolved" && !form.resolution_notes.trim()) throw new Error("Resolution notes required when marking Resolved");
      const payload: any = {
        ...form,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
        target_resolution_date: form.target_resolution_date || null,
      };
      if (row?.id) payload.id = row.id;
      return upsertFn({ data: payload });
    },
    onSuccess: () => { toast.success(row ? "Issue updated" : "Issue created"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? "Edit Issue" : "New Issue"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Project *</Label>
            <ProjectPicker value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} />
          </div>
          <div className="md:col-span-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Field label="Issue No."><Input value={form.issue_number} placeholder="auto" onChange={(e) => setForm({ ...form, issue_number: e.target.value })} /></Field>
          <Field label="Type">
            <SelectBox value={form.issue_type} onChange={(v) => setForm({ ...form, issue_type: v })} options={TYPES as any} />
          </Field>
          <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Discipline"><Input value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} /></Field>
          <Field label="Priority"><SelectBox value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={PRIORITIES as any} /></Field>
          <Field label="Severity"><SelectBox value={form.severity} onChange={(v) => setForm({ ...form, severity: v })} options={SEVERITIES as any} /></Field>
          <Field label="Status"><SelectBox value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUSES as any} /></Field>
          <Field label="Assigned to">
            <Select value={form.assigned_to || "_none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "_none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Unassigned</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Due date"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          <Field label="Target resolution"><Input type="date" value={form.target_resolution_date} onChange={(e) => setForm({ ...form, target_resolution_date: e.target.value })} /></Field>
          <div className="md:col-span-2"><Label>Root cause</Label><Textarea rows={2} value={form.root_cause} onChange={(e) => setForm({ ...form, root_cause: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Corrective action</Label><Textarea rows={2} value={form.corrective_action} onChange={(e) => setForm({ ...form, corrective_action: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Resolution notes</Label><Textarea rows={2} value={form.resolution_notes} onChange={(e) => setForm({ ...form, resolution_notes: e.target.value })} /></div>
          <label className="md:col-span-2 flex items-center gap-2 text-sm">
            <Checkbox checked={form.is_client_visible} onCheckedChange={(v) => setForm({ ...form, is_client_visible: !!v })} />
            Visible to client
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
function SelectBox({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function IssueDetail({
  issue, members, onClose, onEdit, onArchive, onChanged,
}: {
  issue: Issue; members: any[];
  onClose: () => void; onEdit: () => void; onArchive: () => void; onChanged: () => void;
}) {
  const qc = useQueryClient();
  const statusFn = useServerFn(updateIssueStatus);
  const assignFn = useServerFn(assignIssue);
  const escFn = useServerFn(escalateIssue);
  const addPhotoFn = useServerFn(addIssuePhoto);
  const removePhotoFn = useServerFn(removeIssuePhoto);
  const listCommentsFn = useServerFn(listComments);
  const addCommentFn = useServerFn(addComment);

  const { data: comments = [] } = useQuery({
    queryKey: ["issue-comments", issue.id],
    queryFn: () => listCommentsFn({ data: { entity_type: "issues", entity_id: issue.id } }),
  });

  const [status, setStatus] = useState(issue.status);
  const [resolutionNotes, setResolutionNotes] = useState(issue.resolution_notes ?? "");
  const [comment, setComment] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCap, setPhotoCap] = useState("");
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escRemarks, setEscRemarks] = useState("");

  const refresh = () => { qc.invalidateQueries({ queryKey: ["issues"] }); qc.invalidateQueries({ queryKey: ["issue-comments", issue.id] }); onChanged(); };

  const statusMut = useMutation({
    mutationFn: () => {
      if (status === "Resolved" && !resolutionNotes.trim()) throw new Error("Resolution notes required");
      return statusFn({ data: { id: issue.id, status, resolution_notes: resolutionNotes || undefined } });
    },
    onSuccess: () => { toast.success("Status updated"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const assignMut = useMutation({
    mutationFn: (uid: string | null) => assignFn({ data: { id: issue.id, assigned_to: uid } }),
    onSuccess: () => { toast.success("Assigned"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const escMut = useMutation({
    mutationFn: () => escFn({ data: { id: issue.id, remarks: escRemarks || undefined } }),
    onSuccess: (r: any) => { toast.success(`Escalated to L${r?.level ?? "?"}`); setEscalateOpen(false); setEscRemarks(""); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const commentMut = useMutation({
    mutationFn: () => addCommentFn({ data: { entity_type: "issues", entity_id: issue.id, body: comment } }),
    onSuccess: () => { toast.success("Comment added"); setComment(""); qc.invalidateQueries({ queryKey: ["issue-comments", issue.id] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const photoMut = useMutation({
    mutationFn: () => addPhotoFn({ data: { id: issue.id, url: photoUrl, caption: photoCap || undefined } }),
    onSuccess: () => { toast.success("Photo added"); setPhotoUrl(""); setPhotoCap(""); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const delPhotoMut = useMutation({
    mutationFn: (index: number) => removePhotoFn({ data: { id: issue.id, index } }),
    onSuccess: () => { toast.success("Photo removed"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const overdue = isOverdue(issue);
  const photos = Array.isArray(issue.photos) ? issue.photos : [];

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-start justify-between gap-2 pr-6">
            <div>
              <div className="text-xs font-mono text-muted-foreground">{issue.issue_number ?? "—"}</div>
              <div>{issue.title}</div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={onArchive}><Archive className="h-4 w-4" /></Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={STATUS_STYLE[issue.status] ?? ""}>{issue.status}</Badge>
            <Badge className={PRIO_STYLE[issue.priority] ?? ""}>P: {issue.priority}</Badge>
            <Badge className={PRIO_STYLE[issue.severity] ?? ""}>S: {issue.severity}</Badge>
            {overdue && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
            {issue.is_escalated && <Badge className="bg-rose-100 text-rose-700">Escalated L{issue.escalation_level}</Badge>}
            {issue.is_client_visible && <Badge className="bg-emerald-100 text-emerald-700">Client visible</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Project" value={issue.project_name ?? "—"} />
            <Info label="Type" value={issue.issue_type ?? "—"} />
            <Info label="Category" value={issue.category ?? "—"} />
            <Info label="Discipline" value={issue.discipline ?? "—"} />
            <Info label="Location" value={issue.location ?? "—"} />
            <Info label="Assigned" value={issue.assigned_name ?? "Unassigned"} />
            <Info label="Due" value={fmt(issue.due_date)} />
            <Info label="Target resolution" value={fmt(issue.target_resolution_date)} />
            <Info label="Resolved" value={fmt(issue.resolved_date)} />
            <Info label="Created" value={fmt(issue.created_at)} />
          </div>

          {issue.description && <Block title="Description">{issue.description}</Block>}
          {issue.root_cause && <Block title="Root cause">{issue.root_cause}</Block>}
          {issue.corrective_action && <Block title="Corrective action">{issue.corrective_action}</Block>}
          {issue.resolution_notes && <Block title="Resolution notes">{issue.resolution_notes}</Block>}

          <Card><CardContent className="p-3 space-y-2">
            <div className="font-medium text-sm">Quick actions</div>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[160px]">
                <Label>Status</Label>
                <SelectBox value={status} onChange={setStatus} options={STATUSES as any} />
              </div>
              {status === "Resolved" && (
                <div className="w-full"><Label>Resolution notes</Label>
                  <Textarea rows={2} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
                </div>
              )}
              <Button onClick={() => statusMut.mutate()} disabled={statusMut.isPending}>Update</Button>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label>Assign to</Label>
                <Select value={issue.assigned_to ?? "_none"} onValueChange={(v) => assignMut.mutate(v === "_none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => setEscalateOpen(true)}>
                <ArrowUpCircle className="h-4 w-4 mr-1" /> Escalate
              </Button>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-3 space-y-2">
            <div className="font-medium text-sm flex items-center gap-2"><ImageIcon className="h-4 w-4" />Photos</div>
            {photos.length === 0 ? <div className="text-xs text-muted-foreground">No photos yet.</div> : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative group border rounded overflow-hidden">
                    <img src={p.url} alt={p.caption ?? ""} className="w-full h-28 object-cover" />
                    {p.caption && <div className="p-1 text-[11px] truncate">{p.caption}</div>}
                    <button onClick={() => delPhotoMut.mutate(idx)} className="absolute top-1 right-1 bg-black/60 text-white rounded p-1 opacity-0 group-hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div className="md:col-span-2"><Label>Photo URL</Label>
                <Input placeholder="https://…" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
              </div>
              <div><Label>Caption</Label>
                <Input value={photoCap} onChange={(e) => setPhotoCap(e.target.value)} />
              </div>
              <Button onClick={() => photoMut.mutate()} disabled={!photoUrl || photoMut.isPending}>Add photo</Button>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-3 space-y-2">
            <div className="font-medium text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" />Comments</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(comments as any[]).length === 0 ? <div className="text-xs text-muted-foreground">No comments.</div>
                : (comments as any[]).map((c) => (
                  <div key={c.id} className="border rounded p-2 text-sm">
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>{c.author_name ?? "Member"}</span><span>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{c.body}</div>
                  </div>
                ))}
            </div>
            <div className="flex gap-2">
              <Textarea rows={2} placeholder="Add a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <Button onClick={() => commentMut.mutate()} disabled={!comment.trim() || commentMut.isPending}>Send</Button>
            </div>
          </CardContent></Card>
        </div>

        <AlertDialog open={escalateOpen} onOpenChange={setEscalateOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Escalate this issue?</AlertDialogTitle>
              <AlertDialogDescription>Increases escalation level and marks the issue as Escalated.</AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea placeholder="Reason / remarks (optional)" value={escRemarks} onChange={(e) => setEscRemarks(e.target.value)} />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => escMut.mutate()}>Escalate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div>{value}</div></div>;
}
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground mb-1">{title}</div><div className="text-sm whitespace-pre-wrap">{children}</div></CardContent></Card>;
}

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ListTodo, ArrowRight, Loader2, Plus, Search, Pencil, Trash2, AlertTriangle,
  CheckCircle2, Clock, User as UserIcon, X,
} from "lucide-react";
import {
  listActionItems, upsertActionItem, archiveActionItem,
  updateActionStatus, promoteActionItemToTask,
} from "@/lib/meetings.functions";
import { listMembers } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProjectPicker } from "@/components/project-picker";
import { CommentsThread } from "@/components/comments-thread";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/action-items")({
  head: () => ({ meta: [{ title: "Action Items — ProjectCore" }] }),
  component: ActionItemsPage,
});

const ACTION_STATUSES = ["Open","Assigned","In Progress","Completed","On Hold","Deferred","Cancelled","Reopened"] as const;
const PRIORITIES = ["Low","Medium","High","Critical"] as const;

const STATUS_STYLE: Record<string, string> = {
  Open: "bg-zinc-100 text-zinc-700", Assigned: "bg-indigo-100 text-indigo-700",
  "In Progress": "bg-blue-100 text-blue-700", Completed: "bg-emerald-100 text-emerald-700",
  "On Hold": "bg-orange-100 text-orange-700", Deferred: "bg-amber-100 text-amber-700",
  Cancelled: "bg-zinc-100 text-zinc-400", Reopened: "bg-purple-100 text-purple-700",
};
const PRIO_STYLE: Record<string, string> = {
  Low: "bg-zinc-100 text-zinc-700", Medium: "bg-blue-100 text-blue-700",
  High: "bg-amber-100 text-amber-700", Critical: "bg-rose-100 text-rose-700",
};

type ActionItem = {
  id: string; meeting_id: string; project_id: string;
  action_number: string | null; title: string | null; description: string | null;
  responsible_person: string | null; assignee_name?: string | null;
  due_date: string | null; priority: string; status: string;
  progress_percentage: number; completed_date: string | null; completion_notes: string | null;
  linked_task_id: string | null; is_archived: boolean;
  meeting_title?: string | null; meeting_date?: string | null;
  created_at: string;
};

function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"; }
function isOverdue(a: ActionItem) {
  if (!a.due_date || ["Completed","Cancelled"].includes(a.status)) return false;
  return new Date(a.due_date) < new Date(new Date().toDateString());
}
function isDueToday(a: ActionItem) {
  if (!a.due_date || ["Completed","Cancelled"].includes(a.status)) return false;
  const due = new Date(a.due_date).toDateString();
  return due === new Date().toDateString();
}
function isDueThisWeek(a: ActionItem) {
  if (!a.due_date || ["Completed","Cancelled"].includes(a.status)) return false;
  const due = new Date(a.due_date);
  const now = new Date(); const week = new Date(); week.setDate(now.getDate() + 7);
  return due >= new Date(now.toDateString()) && due <= week;
}

function ActionItemsPage() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [priorityF, setPriorityF] = useState("all");
  const [assigneeF, setAssigneeF] = useState("all");
  const [view, setView] = useState<"all" | "mine" | "overdue">("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ActionItem | null>(null);
  const [detail, setDetail] = useState<ActionItem | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<ActionItem | null>(null);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);

  const listFn = useServerFn(listActionItems);
  const archFn = useServerFn(archiveActionItem);
  const promoteFn = useServerFn(promoteActionItemToTask);
  const membersFn = useServerFn(listMembers);

  const { data: itemsRaw = [], isLoading } = useQuery({
    queryKey: ["action-items", projectId],
    queryFn: () => listFn({ data: { projectId: projectId || undefined } }) as Promise<ActionItem[]>,
  });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => membersFn() as Promise<any[]> });

  const items = useMemo(() => {
    let arr = itemsRaw;
    if (view === "mine" && me) arr = arr.filter((a) => a.responsible_person === me);
    if (view === "overdue") arr = arr.filter(isOverdue);
    if (statusF !== "all") arr = arr.filter((a) => a.status === statusF);
    if (priorityF !== "all") arr = arr.filter((a) => a.priority === priorityF);
    if (assigneeF !== "all") arr = arr.filter((a) => a.responsible_person === assigneeF);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((a) =>
        (a.action_number ?? "").toLowerCase().includes(q) ||
        (a.title ?? "").toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        (a.assignee_name ?? "").toLowerCase().includes(q) ||
        (a.meeting_title ?? "").toLowerCase().includes(q) ||
        (a.completion_notes ?? "").toLowerCase().includes(q),
      );
    }
    return arr;
  }, [itemsRaw, view, me, statusF, priorityF, assigneeF, search]);

  const stats = useMemo(() => {
    const all = itemsRaw;
    return {
      total: all.length,
      mine: me ? all.filter((a) => a.responsible_person === me).length : 0,
      open: all.filter((a) => a.status === "Open" || a.status === "Assigned").length,
      inProgress: all.filter((a) => a.status === "In Progress").length,
      completed: all.filter((a) => a.status === "Completed").length,
      overdue: all.filter(isOverdue).length,
      critical: all.filter((a) => a.priority === "Critical" && !["Completed","Cancelled"].includes(a.status)).length,
      dueToday: all.filter(isDueToday).length,
      dueWeek: all.filter(isDueThisWeek).length,
    };
  }, [itemsRaw, me]);

  const archMut = useMutation({
    mutationFn: (id: string) => archFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["action-items"] }); toast.success("Archived"); setConfirmArchive(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const promoteMut = useMutation({
    mutationFn: (id: string) => promoteFn({ data: { id } }),
    onSuccess: () => { toast.success("Promoted to task"); qc.invalidateQueries({ queryKey: ["action-items"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ListTodo className="size-6 text-accent" /> Meeting Action Items
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track, assign, and close out follow-ups from meeting minutes across your projects.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-56"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
          <Button onClick={() => setAdding(true)} disabled={!projectId}>
            <Plus className="size-4 mr-1" /> New Action
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="My Actions" value={stats.mine} accent="text-indigo-600" />
        <StatCard label="Open" value={stats.open} />
        <StatCard label="In Progress" value={stats.inProgress} accent="text-blue-600" />
        <StatCard label="Completed" value={stats.completed} accent="text-emerald-600" />
        <StatCard label="Overdue" value={stats.overdue} accent="text-rose-600" icon={<AlertTriangle className="size-3" />} />
        <StatCard label="Critical" value={stats.critical} accent="text-rose-700" />
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="size-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search action, meeting, assignee…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={view} onValueChange={(v) => setView(v as any)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="mine">My actions</SelectItem>
                <SelectItem value="overdue">Overdue only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                {ACTION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityF} onValueChange={setPriorityF}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priority</SelectItem>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={assigneeF} onValueChange={setAssigneeF}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Assignee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                {(members as any[]).map((m) => (
                  <SelectItem key={m.user_id ?? m.id} value={m.user_id ?? m.id}>{m.full_name ?? m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <ListTodo className="size-10 mx-auto mb-2 opacity-40" />
            No action items match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">No.</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Meeting</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Assignee</th>
                  <th className="text-left px-4 py-3">Due</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Priority</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Progress</th>
                  <th className="w-32" />
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const od = isOverdue(r);
                  return (
                    <tr key={r.id} className={cn("border-t border-border hover:bg-muted/30", od && "bg-rose-50/40")}>
                      <td className="px-4 py-3 font-mono text-xs">{r.action_number ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button className="text-left hover:underline" onClick={() => setDetail(r)}>
                          <div className="font-medium">{r.title ?? r.description}</div>
                          {r.linked_task_id && <div className="text-[10px] text-emerald-700 mt-0.5">Linked to task</div>}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs hidden md:table-cell">{r.meeting_title ?? "—"}</td>
                      <td className="px-4 py-3 text-xs hidden lg:table-cell">{r.assignee_name ?? "—"}</td>
                      <td className={cn("px-4 py-3 text-xs", od && "text-rose-600 font-semibold")}>
                        {od && <AlertTriangle className="inline size-3 mr-1" />}
                        {fmtDate(r.due_date)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="secondary" className={cn("text-[10px]", PRIO_STYLE[r.priority])}>{r.priority}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn("text-[10px]", STATUS_STYLE[r.status])}>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${r.progress_percentage}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{r.progress_percentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="Edit" onClick={() => setEditing(r)}><Pencil className="size-3" /></Button>
                          <Button size="icon" variant="ghost" title="Promote to task" disabled={!!r.linked_task_id || promoteMut.isPending} onClick={() => promoteMut.mutate(r.id)}>
                            {promoteMut.isPending ? <Loader2 className="size-3 animate-spin" /> : <ArrowRight className="size-3" />}
                          </Button>
                          <Button size="icon" variant="ghost" title="Archive" onClick={() => setConfirmArchive(r)}><Trash2 className="size-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(adding || editing) && (
        <ActionDialog
          row={editing ?? undefined}
          projectId={editing?.project_id ?? projectId}
          members={members as any[]}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ["action-items"] }); }}
        />
      )}

      {detail && (
        <ActionDetailSheet
          item={detail}
          me={me}
          onClose={() => setDetail(null)}
          onEdit={(it) => { setDetail(null); setEditing(it); }}
        />
      )}

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive action item?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmArchive?.action_number} — {confirmArchive?.title}. This can be restored from archived items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmArchive && archMut.mutate(confirmArchive.id)}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, accent, icon }: { label: string; value: number; accent?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">{icon}{label}</div>
        <div className={cn("text-2xl font-bold mt-1", accent)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ActionDialog({
  row, projectId, members, onClose, onSaved,
}: {
  row?: ActionItem; projectId: string; members: any[];
  onClose: () => void; onSaved: () => void;
}) {
  const saveFn = useServerFn(upsertActionItem);
  const [form, setForm] = useState<any>({
    id: row?.id,
    meeting_id: row?.meeting_id ?? "",
    project_id: row?.project_id ?? projectId,
    action_number: row?.action_number ?? "",
    title: row?.title ?? row?.description ?? "",
    description: row?.description ?? "",
    responsible_person: row?.responsible_person ?? "",
    due_date: row?.due_date ?? "",
    priority: row?.priority ?? "Medium",
    status: row?.status ?? "Open",
    progress_percentage: row?.progress_percentage ?? 0,
    completion_notes: row?.completion_notes ?? "",
  });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => {
      if (!form.title.trim()) throw new Error("Title is required");
      if (!form.project_id) throw new Error("Project is required");
      if (!form.meeting_id) throw new Error("Meeting is required (create the action from a meeting, or pick one)");
      return saveFn({ data: {
        ...form,
        responsible_person: form.responsible_person || null,
        due_date: form.due_date || null,
        progress_percentage: Number(form.progress_percentage) || 0,
      } });
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  // Load meetings for project when creating standalone
  const [meetings, setMeetings] = useState<any[]>([]);
  useEffect(() => {
    if (!form.project_id) return;
    supabase.from("meetings").select("id, title, meeting_number, meeting_date")
      .eq("project_id", form.project_id).eq("is_archived", false)
      .order("meeting_date", { ascending: false })
      .then(({ data }) => setMeetings(data ?? []));
  }, [form.project_id]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{form.id ? "Edit Action Item" : "New Action Item"}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <Field label="Meeting *">
            <Select value={form.meeting_id || ""} onValueChange={(v) => set("meeting_id", v)} disabled={!!row}>
              <SelectTrigger><SelectValue placeholder="Select meeting" /></SelectTrigger>
              <SelectContent>
                {meetings.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.meeting_number ? `${m.meeting_number} — ` : ""}{m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Action title *"><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee">
              <Select value={form.responsible_person || "__none"} onValueChange={(v) => set("responsible_person", v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Unassigned —</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id ?? m.id} value={m.user_id ?? m.id}>{m.full_name ?? m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Due date"><Input type="date" value={form.due_date ?? ""} onChange={(e) => set("due_date", e.target.value)} /></Field>
            <Field label="Priority">
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Progress %"><Input type="number" min={0} max={100} value={form.progress_percentage} onChange={(e) => set("progress_percentage", e.target.value)} /></Field>
            <Field label="Action number"><Input value={form.action_number ?? ""} placeholder="Auto-generated" onChange={(e) => set("action_number", e.target.value)} /></Field>
          </div>
          {(form.status === "Completed" || Number(form.progress_percentage) >= 100) && (
            <Field label="Completion notes"><Textarea rows={2} value={form.completion_notes ?? ""} onChange={(e) => set("completion_notes", e.target.value)} /></Field>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? <><Loader2 className="size-3 mr-1 animate-spin" /> Saving…</> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionDetailSheet({
  item, me, onClose, onEdit,
}: { item: ActionItem; me: string | null; onClose: () => void; onEdit: (it: ActionItem) => void }) {
  const qc = useQueryClient();
  const statusFn = useServerFn(updateActionStatus);
  const [status, setStatus] = useState(item.status);
  const [progress, setProgress] = useState(item.progress_percentage);
  const [notes, setNotes] = useState(item.completion_notes ?? "");

  const canUpdate = me && (item.responsible_person === me || true); // RLS enforces real perms

  const mut = useMutation({
    mutationFn: () => statusFn({ data: { id: item.id, status, progress_percentage: Number(progress) || 0, completion_notes: notes || null } }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["action-items"] }); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const od = isOverdue(item);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{item.action_number}</span>
            <span>{item.title ?? item.description}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className={cn("text-[10px]", STATUS_STYLE[item.status])}>{item.status}</Badge>
            <Badge variant="secondary" className={cn("text-[10px]", PRIO_STYLE[item.priority])}>{item.priority}</Badge>
            {od && <Badge variant="secondary" className="text-[10px] bg-rose-100 text-rose-700"><AlertTriangle className="size-3 mr-1" /> Overdue</Badge>}
            {item.linked_task_id && <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">Linked task</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Meeting">{item.meeting_title ?? "—"}</Info>
            <Info label="Meeting date">{fmtDate(item.meeting_date ?? null)}</Info>
            <Info label="Assignee"><span className="flex items-center gap-1"><UserIcon className="size-3" />{item.assignee_name ?? "Unassigned"}</span></Info>
            <Info label="Due date">{fmtDate(item.due_date)}</Info>
            <Info label="Completed">{fmtDate(item.completed_date)}</Info>
            <Info label="Progress">{item.progress_percentage}%</Info>
          </div>

          {item.description && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Description</div>
              <p className="text-sm whitespace-pre-wrap">{item.description}</p>
            </div>
          )}

          {canUpdate && (
            <div className="border border-border rounded-sm p-3 space-y-3 bg-muted/20">
              <div className="text-xs font-semibold uppercase tracking-widest">Update progress</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ACTION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Progress %">
                  <Input type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
                </Field>
              </div>
              {(status === "Completed" || Number(progress) >= 100) && (
                <Field label="Completion notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
              )}
              <div className="flex justify-end gap-2">
                {item.status === "Completed" && (
                  <Button variant="outline" size="sm" onClick={() => { setStatus("Reopened"); setProgress(50); }}>
                    <Clock className="size-3 mr-1" /> Reopen
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => onEdit(item)}><Pencil className="size-3 mr-1" /> Edit details</Button>
                <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
                  {mut.isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3 mr-1" />} Save
                </Button>
              </div>
            </div>
          )}

          {item.completion_notes && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Completion notes</div>
              <p className="text-sm whitespace-pre-wrap">{item.completion_notes}</p>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2">Comments</div>
            <CommentsThread entityType="meeting_action_item" entityId={item.id} projectId={item.project_id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}
function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="text-sm">{children}</div></div>;
}

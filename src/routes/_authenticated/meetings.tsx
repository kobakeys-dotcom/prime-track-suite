import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Pencil, Archive, Search, Calendar as CalendarIcon, Users, ClipboardList,
  CheckCircle2, AlertTriangle, Clock, Printer, X, ListChecks, Trash2,
} from "lucide-react";

import {
  listMeetings, getMeeting, upsertMeeting, archiveMeeting, updateMeetingStatus,
  listActionItems, upsertActionItem, archiveActionItem, updateActionStatus,
} from "@/lib/meetings.functions";
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

const STATUSES = ["Draft","Scheduled","Completed","Minutes Prepared","Minutes Approved","Cancelled"] as const;
const TYPES = ["Project Meeting","Site Meeting","Progress Meeting","Coordination Meeting","Technical Meeting","Safety Meeting","Quality Meeting","Client Meeting","Consultant Meeting","Procurement Meeting","Handover Meeting","Internal Meeting"] as const;
const MODES = ["In Person","Online","Hybrid"] as const;
const ACTION_STATUSES = ["Open","Assigned","In Progress","Completed","Deferred","Cancelled"] as const;
const PRIORITIES = ["Low","Medium","High","Critical"] as const;
const ATT_STATUSES = ["Invited","Attended","Absent","Apology"] as const;

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-zinc-100 text-zinc-700", Scheduled: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700", "Minutes Prepared": "bg-purple-100 text-purple-700",
  "Minutes Approved": "bg-teal-100 text-teal-700", Cancelled: "bg-zinc-100 text-zinc-400",
};
const ACTION_STATUS_STYLE: Record<string, string> = {
  Open: "bg-zinc-100 text-zinc-700", Assigned: "bg-indigo-100 text-indigo-700",
  "In Progress": "bg-blue-100 text-blue-700", Completed: "bg-emerald-100 text-emerald-700",
  Deferred: "bg-amber-100 text-amber-700", Cancelled: "bg-zinc-100 text-zinc-400",
};
const PRIO_STYLE: Record<string, string> = {
  Low: "bg-zinc-100 text-zinc-700", Medium: "bg-blue-100 text-blue-700",
  High: "bg-amber-100 text-amber-700", Critical: "bg-rose-100 text-rose-700",
};

type Attendee = { user_id?: string | null; name: string; email?: string | null; organization?: string | null; role?: string | null; status?: string | null };
type Attachment = { file_name: string; file_url: string; description?: string | null; is_client_visible?: boolean };

type Meeting = {
  id: string; project_id: string; project_name?: string | null;
  meeting_number: string | null; title: string;
  meeting_type: string | null; meeting_date: string; end_time: string | null;
  status: string; location: string | null; meeting_mode: string | null; meeting_link: string | null;
  chairperson_id: string | null; chairperson_name?: string | null;
  prepared_by: string | null; prepared_by_name?: string | null;
  summary: string | null; agenda: string | null; discussion_points: string | null; decisions: string | null;
  next_meeting_date: string | null; is_client_visible: boolean; is_archived: boolean;
  attendees: Attendee[] | null; attachments: Attachment[] | null;
  created_by: string | null; created_at: string; updated_at: string;
  action_stats: { open: number; overdue: number; total: number };
};

type ActionItem = {
  id: string; meeting_id: string; project_id: string;
  action_number: string | null; title: string | null; description: string | null;
  responsible_person: string | null; assignee_name?: string | null;
  due_date: string | null; priority: string; status: string;
  progress_percentage: number; completed_date: string | null; completion_notes: string | null;
  linked_task_id: string | null; is_archived: boolean;
  meeting_title?: string | null; meeting_date?: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function isOverdue(a: ActionItem) {
  if (!a.due_date) return false;
  if (["Completed","Cancelled"].includes(a.status)) return false;
  return new Date(a.due_date) < new Date(new Date().toDateString());
}
function toInputDateTime(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  const off = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - off).toISOString().slice(0, 16);
}

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({ meta: [{ title: "Meetings — ProjectCore" }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [dialog, setDialog] = useState<{ row?: Meeting } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [confirmArch, setConfirmArch] = useState<Meeting | null>(null);

  const listFn = useServerFn(listMeetings);
  const membersFn = useServerFn(listMembers);
  const archFn = useServerFn(archiveMeeting);

  const { data: meetings = [], isLoading, isError } = useQuery({
    queryKey: ["meetings", projectId || "all"],
    queryFn: () => listFn({ data: { projectId: projectId || undefined } }) as Promise<Meeting[]>,
  });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => membersFn() });

  const archMut = useMutation({
    mutationFn: (id: string) => archFn({ data: { id } }),
    onSuccess: () => { toast.success("Archived"); qc.invalidateQueries({ queryKey: ["meetings"] }); setConfirmArch(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const today = new Date(new Date().toDateString());
    return (meetings as Meeting[]).filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (typeFilter !== "all" && m.meeting_type !== typeFilter) return false;
      if (upcomingOnly && new Date(m.meeting_date) < today) return false;
      if (!s) return true;
      return [m.title, m.meeting_number, m.location, m.chairperson_name, m.prepared_by_name, m.project_name]
        .some((v) => v && String(v).toLowerCase().includes(s));
    });
  }, [meetings, search, statusFilter, typeFilter, upcomingOnly]);

  const stats = useMemo(() => {
    const today = new Date(new Date().toDateString());
    const list = meetings as Meeting[];
    return {
      total: list.length,
      upcoming: list.filter((m) => new Date(m.meeting_date) >= today && !["Cancelled"].includes(m.status)).length,
      completed: list.filter((m) => ["Completed","Minutes Prepared","Minutes Approved"].includes(m.status)).length,
      minutesPending: list.filter((m) => m.status === "Scheduled" && new Date(m.meeting_date) < today).length,
      openActions: list.reduce((s, m) => s + (m.action_stats?.open ?? 0), 0),
      overdueActions: list.reduce((s, m) => s + (m.action_stats?.overdue ?? 0), 0),
    };
  }, [meetings]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="size-6 text-accent" /> Meetings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule meetings, record minutes, track decisions & action items.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-56"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
          <Button onClick={() => setDialog({})}><Plus className="size-4 mr-1" /> New Meeting</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, icon: CalendarIcon, color: "text-zinc-600" },
          { label: "Upcoming", value: stats.upcoming, icon: Clock, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Minutes Pending", value: stats.minutesPending, icon: ClipboardList, color: "text-amber-600" },
          { label: "Open Actions", value: stats.openActions, icon: ListChecks, color: "text-indigo-600" },
          { label: "Overdue Actions", value: stats.overdueActions, icon: AlertTriangle, color: "text-rose-600" },
        ].map((s) => (
          <Card key={s.label} className="rounded-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold">{s.value}</div>
              </div>
              <s.icon className={`size-5 ${s.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search meeting…" className="pl-7 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={upcomingOnly} onCheckedChange={(v) => setUpcomingOnly(!!v)} /> Upcoming only
        </label>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <div className="p-12 text-center text-sm text-rose-600">Failed to load meetings.</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No meetings found. <button className="text-accent underline" onClick={() => setDialog({})}>Create one</button>.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">No.</th>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">Project</th>
                <th className="text-left px-3 py-2 hidden lg:table-cell">Type</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2 hidden lg:table-cell">Chair</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Actions</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(m.id)}>
                  <td className="px-3 py-2 font-mono text-xs">{m.meeting_number ?? "—"}</td>
                  <td className="px-3 py-2 font-medium">{m.title}</td>
                  <td className="px-3 py-2 hidden md:table-cell text-xs text-muted-foreground">{m.project_name ?? "—"}</td>
                  <td className="px-3 py-2 hidden lg:table-cell text-xs">{m.meeting_type ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{fmtDateTime(m.meeting_date)}</td>
                  <td className="px-3 py-2 hidden lg:table-cell text-xs">{m.chairperson_name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge className={STATUS_STYLE[m.status] ?? "bg-zinc-100 text-zinc-700"} variant="secondary">{m.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {m.action_stats?.open ?? 0} open
                    {m.action_stats?.overdue ? <span className="text-rose-600 font-semibold"> · {m.action_stats.overdue} overdue</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" onClick={() => setDialog({ row: m })}><Pencil className="size-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmArch(m)}><Archive className="size-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialog && (
        <MeetingDialog
          open
          row={dialog.row}
          members={members as any[]}
          defaultProjectId={projectId}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); qc.invalidateQueries({ queryKey: ["meetings"] }); }}
        />
      )}

      {detail && (
        <MeetingDetail id={detail} members={members as any[]} onClose={() => setDetail(null)} />
      )}

      <AlertDialog open={!!confirmArch} onOpenChange={(o) => !o && setConfirmArch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive meeting?</AlertDialogTitle>
            <AlertDialogDescription>It will be hidden from the list. You can restore from the database if needed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmArch && archMut.mutate(confirmArch.id)}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============== Meeting Dialog (create/edit) ==============

function MeetingDialog({
  open, row, members, defaultProjectId, onClose, onSaved,
}: {
  open: boolean; row?: Meeting; members: any[]; defaultProjectId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const saveFn = useServerFn(upsertMeeting);
  const [form, setForm] = useState<any>(() => ({
    id: row?.id,
    project_id: row?.project_id ?? defaultProjectId,
    title: row?.title ?? "",
    meeting_number: row?.meeting_number ?? "",
    meeting_type: row?.meeting_type ?? "Project Meeting",
    meeting_date: toInputDateTime(row?.meeting_date ?? new Date().toISOString()),
    end_time: toInputDateTime(row?.end_time ?? null),
    status: row?.status ?? "Scheduled",
    location: row?.location ?? "",
    meeting_mode: row?.meeting_mode ?? "In Person",
    meeting_link: row?.meeting_link ?? "",
    chairperson_id: row?.chairperson_id ?? "",
    prepared_by: row?.prepared_by ?? "",
    summary: row?.summary ?? "",
    agenda: row?.agenda ?? "",
    discussion_points: row?.discussion_points ?? "",
    decisions: row?.decisions ?? "",
    next_meeting_date: row?.next_meeting_date ?? "",
    is_client_visible: row?.is_client_visible ?? false,
    attendees: row?.attendees ?? [],
    attachments: row?.attachments ?? [],
  }));

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => {
      if (!form.project_id) throw new Error("Project is required");
      if (!form.title.trim()) throw new Error("Title is required");
      if (!form.meeting_date) throw new Error("Meeting date is required");
      if (form.end_time && new Date(form.end_time) < new Date(form.meeting_date)) {
        throw new Error("End time cannot be before start time");
      }
      return saveFn({ data: {
        ...form,
        meeting_date: new Date(form.meeting_date).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        chairperson_id: form.chairperson_id || null,
        prepared_by: form.prepared_by || null,
        next_meeting_date: form.next_meeting_date || null,
      } });
    },
    onSuccess: () => { toast.success(form.id ? "Updated" : "Created"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Edit Meeting" : "New Meeting"}</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Project *"><ProjectPicker value={form.project_id} onChange={(v) => set("project_id", v)} /></Field>
          <Field label="Meeting Number"><Input value={form.meeting_number} onChange={(e) => set("meeting_number", e.target.value)} placeholder="auto" /></Field>
          <Field label="Title *" className="md:col-span-2"><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Type"><Sel value={form.meeting_type} onChange={(v) => set("meeting_type", v)} options={TYPES as any} /></Field>
          <Field label="Status"><Sel value={form.status} onChange={(v) => set("status", v)} options={STATUSES as any} /></Field>
          <Field label="Start *"><Input type="datetime-local" value={form.meeting_date} onChange={(e) => set("meeting_date", e.target.value)} /></Field>
          <Field label="End"><Input type="datetime-local" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} /></Field>
          <Field label="Mode"><Sel value={form.meeting_mode} onChange={(v) => set("meeting_mode", v)} options={MODES as any} /></Field>
          <Field label="Location"><Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Site office / address" /></Field>
          <Field label="Meeting Link" className="md:col-span-2"><Input value={form.meeting_link} onChange={(e) => set("meeting_link", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Chairperson"><UserSel value={form.chairperson_id} onChange={(v) => set("chairperson_id", v)} members={members} /></Field>
          <Field label="Prepared By"><UserSel value={form.prepared_by} onChange={(v) => set("prepared_by", v)} members={members} /></Field>
          <Field label="Next Meeting Date"><Input type="date" value={form.next_meeting_date ?? ""} onChange={(e) => set("next_meeting_date", e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-xs mt-6">
            <Checkbox checked={form.is_client_visible} onCheckedChange={(v) => set("is_client_visible", !!v)} /> Visible to client
          </label>
          <Field label="Agenda" className="md:col-span-2"><Textarea rows={3} value={form.agenda} onChange={(e) => set("agenda", e.target.value)} /></Field>
          <Field label="Discussion Points" className="md:col-span-2"><Textarea rows={4} value={form.discussion_points} onChange={(e) => set("discussion_points", e.target.value)} /></Field>
          <Field label="Decisions" className="md:col-span-2"><Textarea rows={3} value={form.decisions} onChange={(e) => set("decisions", e.target.value)} /></Field>
          <Field label="Summary" className="md:col-span-2"><Textarea rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} /></Field>

          <div className="md:col-span-2 border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Users className="size-3" /> Attendees</div>
              <Button size="sm" variant="outline" onClick={() => set("attendees", [...form.attendees, { name: "", status: "Invited" }])}>
                <Plus className="size-3 mr-1" /> Add
              </Button>
            </div>
            {form.attendees.map((a: Attendee, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <div className="col-span-3"><UserSel value={a.user_id ?? ""} onChange={(v) => {
                  const arr = [...form.attendees];
                  const m = members.find((mm: any) => (mm.user_id ?? mm.id) === v);
                  arr[i] = { ...arr[i], user_id: v || null, name: m?.full_name ?? arr[i].name, email: m?.email ?? arr[i].email };
                  set("attendees", arr);
                }} members={members} placeholder="Team member" /></div>
                <Input className="col-span-3" placeholder="Name" value={a.name} onChange={(e) => { const arr=[...form.attendees]; arr[i]={...arr[i],name:e.target.value}; set("attendees",arr); }} />
                <Input className="col-span-2" placeholder="Org" value={a.organization ?? ""} onChange={(e) => { const arr=[...form.attendees]; arr[i]={...arr[i],organization:e.target.value}; set("attendees",arr); }} />
                <Input className="col-span-2" placeholder="Role" value={a.role ?? ""} onChange={(e) => { const arr=[...form.attendees]; arr[i]={...arr[i],role:e.target.value}; set("attendees",arr); }} />
                <Select value={a.status ?? "Invited"} onValueChange={(v) => { const arr=[...form.attendees]; arr[i]={...arr[i],status:v}; set("attendees",arr); }}>
                  <SelectTrigger className="col-span-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{ATT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="col-span-1" onClick={() => set("attendees", form.attendees.filter((_: any, j: number) => j !== i))}><X className="size-3.5" /></Button>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Attachments</div>
              <Button size="sm" variant="outline" onClick={() => set("attachments", [...form.attachments, { file_name: "", file_url: "" }])}>
                <Plus className="size-3 mr-1" /> Add link
              </Button>
            </div>
            {form.attachments.map((a: Attachment, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-3" placeholder="File name" value={a.file_name} onChange={(e) => { const arr=[...form.attachments]; arr[i]={...arr[i],file_name:e.target.value}; set("attachments",arr); }} />
                <Input className="col-span-6" placeholder="https://…" value={a.file_url} onChange={(e) => { const arr=[...form.attachments]; arr[i]={...arr[i],file_url:e.target.value}; set("attachments",arr); }} />
                <Input className="col-span-2" placeholder="Note" value={a.description ?? ""} onChange={(e) => { const arr=[...form.attachments]; arr[i]={...arr[i],description:e.target.value}; set("attachments",arr); }} />
                <Button size="icon" variant="ghost" className="col-span-1" onClick={() => set("attachments", form.attachments.filter((_: any, j: number) => j !== i))}><X className="size-3.5" /></Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== Meeting Detail Sheet ==============

function MeetingDetail({ id, members, onClose }: { id: string; members: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getMeeting);
  const statusFn = useServerFn(updateMeetingStatus);
  const { data: m, isLoading } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => getFn({ data: { id } }) as Promise<Meeting | null>,
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => statusFn({ data: { id, status } }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["meeting", id] }); qc.invalidateQueries({ queryKey: ["meetings"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-2">
            <span>{m?.title ?? "Meeting"}</span>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-3.5 mr-1" /> Print</Button>
          </SheetTitle>
        </SheetHeader>
        {isLoading || !m ? (
          <div className="p-6"><Skeleton className="h-40 w-full" /></div>
        ) : (
          <div className="space-y-5 mt-4 print:p-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Meeting No.">{m.meeting_number ?? "—"}</Info>
              <Info label="Status">
                <Select value={m.status} onValueChange={(v) => statusMut.mutate(v)}>
                  <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Info>
              <Info label="Type">{m.meeting_type ?? "—"}</Info>
              <Info label="Mode">{m.meeting_mode ?? "—"}</Info>
              <Info label="Start">{fmtDateTime(m.meeting_date)}</Info>
              <Info label="End">{fmtDateTime(m.end_time)}</Info>
              <Info label="Location">{m.location ?? "—"}</Info>
              <Info label="Link">{m.meeting_link ? <a href={m.meeting_link} className="text-accent underline" target="_blank" rel="noreferrer">{m.meeting_link}</a> : "—"}</Info>
              <Info label="Next Meeting">{fmtDate(m.next_meeting_date)}</Info>
              <Info label="Client Visible">{m.is_client_visible ? "Yes" : "No"}</Info>
            </div>

            <Section title="Attendees">
              {(m.attendees ?? []).length === 0 ? <Empty>No attendees.</Empty> : (
                <ul className="text-sm space-y-1">
                  {(m.attendees ?? []).map((a, i) => (
                    <li key={i} className="flex items-center justify-between border-b border-border py-1">
                      <span>{a.name} {a.role ? <span className="text-muted-foreground">· {a.role}</span> : null} {a.organization ? <span className="text-muted-foreground">· {a.organization}</span> : null}</span>
                      <Badge variant="secondary" className="text-[10px]">{a.status ?? "Invited"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {m.agenda && <Section title="Agenda"><p className="whitespace-pre-wrap text-sm">{m.agenda}</p></Section>}
            {m.discussion_points && <Section title="Discussion Points"><p className="whitespace-pre-wrap text-sm">{m.discussion_points}</p></Section>}
            {m.decisions && <Section title="Decisions"><p className="whitespace-pre-wrap text-sm">{m.decisions}</p></Section>}
            {m.summary && <Section title="Summary"><p className="whitespace-pre-wrap text-sm">{m.summary}</p></Section>}

            <ActionItemsPanel meetingId={id} projectId={m.project_id} members={members} />

            <Section title="Attachments">
              {(m.attachments ?? []).length === 0 ? <Empty>No attachments.</Empty> : (
                <ul className="space-y-1 text-sm">
                  {(m.attachments ?? []).map((a, i) => (
                    <li key={i}><a href={a.file_url} target="_blank" rel="noreferrer" className="text-accent underline">{a.file_name || a.file_url}</a> {a.description ? <span className="text-muted-foreground">— {a.description}</span> : null}</li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Comments">
              <CommentsThread entityType="meetings" entityId={id} />
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ============== Action Items Panel ==============

function ActionItemsPanel({ meetingId, projectId, members }: { meetingId: string; projectId: string; members: any[] }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listActionItems);
  const saveFn = useServerFn(upsertActionItem);
  const archFn = useServerFn(archiveActionItem);
  const statusFn = useServerFn(updateActionStatus);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ActionItem | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["action-items", meetingId],
    queryFn: () => listFn({ data: { meetingId } }) as Promise<ActionItem[]>,
  });

  const archMut = useMutation({
    mutationFn: (id: string) => archFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["action-items", meetingId] }); toast.success("Removed"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const quickStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => statusFn({ data: { id, status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["action-items", meetingId] }),
  });

  return (
    <Section title={`Action Items (${items.length})`} right={<Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="size-3 mr-1" /> Add</Button>}>
      {items.length === 0 ? <Empty>No action items.</Empty> : (
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr><th className="text-left py-1">No.</th><th className="text-left">Action</th><th className="text-left">Assignee</th><th className="text-left">Due</th><th className="text-left">Priority</th><th className="text-left">Status</th><th /></tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className={`border-t border-border ${isOverdue(a) ? "bg-rose-50/50" : ""}`}>
                <td className="py-1 font-mono">{a.action_number ?? "—"}</td>
                <td><button className="text-left underline-offset-2 hover:underline" onClick={() => setEditing(a)}>{a.title ?? a.description}</button></td>
                <td>{a.assignee_name ?? "—"}</td>
                <td className={isOverdue(a) ? "text-rose-600 font-semibold" : ""}>{fmtDate(a.due_date)}</td>
                <td><Badge variant="secondary" className={`text-[10px] ${PRIO_STYLE[a.priority] ?? ""}`}>{a.priority}</Badge></td>
                <td>
                  <Select value={a.status} onValueChange={(v) => quickStatus.mutate({ id: a.id, status: v })}>
                    <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ACTION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="text-right"><Button size="icon" variant="ghost" onClick={() => archMut.mutate(a.id)}><Trash2 className="size-3" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(adding || editing) && (
        <ActionDialog
          meetingId={meetingId}
          projectId={projectId}
          row={editing ?? undefined}
          members={members}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ["action-items", meetingId] }); }}
        />
      )}
    </Section>
  );
}

function ActionDialog({
  meetingId, projectId, row, members, onClose, onSaved,
}: {
  meetingId: string; projectId: string; row?: ActionItem; members: any[];
  onClose: () => void; onSaved: () => void;
}) {
  const saveFn = useServerFn(upsertActionItem);
  const [form, setForm] = useState<any>({
    id: row?.id,
    meeting_id: meetingId,
    project_id: projectId,
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
      if (!form.title.trim()) throw new Error("Title required");
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

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{form.id ? "Edit Action" : "New Action"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Title *"><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee"><UserSel value={form.responsible_person} onChange={(v) => set("responsible_person", v)} members={members} /></Field>
            <Field label="Due date"><Input type="date" value={form.due_date ?? ""} onChange={(e) => set("due_date", e.target.value)} /></Field>
            <Field label="Priority"><Sel value={form.priority} onChange={(v) => set("priority", v)} options={PRIORITIES as any} /></Field>
            <Field label="Status"><Sel value={form.status} onChange={(v) => set("status", v)} options={ACTION_STATUSES as any} /></Field>
            <Field label="Progress %"><Input type="number" min={0} max={100} value={form.progress_percentage} onChange={(e) => set("progress_percentage", e.target.value)} /></Field>
          </div>
          {(form.status === "Completed" || Number(form.progress_percentage) >= 100) && (
            <Field label="Completion notes"><Textarea rows={2} value={form.completion_notes ?? ""} onChange={(e) => set("completion_notes", e.target.value)} /></Field>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== Helpers ==============

function Field({ label, className = "", children }: any) {
  return <div className={className}><Label className="text-xs">{label}</Label>{children}</div>;
}
function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}
function UserSel({ value, onChange, members, placeholder = "Select user" }: { value: string; onChange: (v: string) => void; members: any[]; placeholder?: string }) {
  return (
    <Select value={value || "__none"} onValueChange={(v) => onChange(v === "__none" ? "" : v)}>
      <SelectTrigger className="h-9"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">— None —</SelectItem>
        {members.map((m: any) => (
          <SelectItem key={m.user_id ?? m.id} value={m.user_id ?? m.id}>{m.full_name ?? m.email}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Info({ label, children }: any) {
  return <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="text-sm">{children}</div></div>;
}
function Section({ title, right, children }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b border-border pb-1">
        <h3 className="font-semibold text-sm">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}
function Empty({ children }: any) {
  return <div className="text-xs text-muted-foreground italic">{children}</div>;
}

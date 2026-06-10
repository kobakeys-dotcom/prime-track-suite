import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listTasks, createTask, updateTask, updateTaskStatus, updateTaskProgress,
  archiveTask, listProjectMembers, TASK_STATUSES, TASK_PRIORITIES,
} from "@/lib/tasks.functions";
import { ProjectPicker } from "@/components/project-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Archive, Pencil, AlertTriangle, ListChecks } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — ProjectCore" }] }),
  component: TasksPage,
});

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do", in_progress: "In Progress", blocked: "Blocked",
  done: "Done", cancelled: "Cancelled",
};
const STATUS_BG: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-rose-100 text-rose-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-zinc-100 text-zinc-500",
};
const STATUS_BAR: Record<string, string> = {
  todo: "bg-slate-400", in_progress: "bg-blue-500",
  blocked: "bg-rose-500", done: "bg-emerald-500", cancelled: "bg-zinc-400",
};
const PRIORITY_BG: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

function isOverdue(t: any) {
  if (!t.due_date) return false;
  if (t.status === "done" || t.status === "cancelled") return false;
  return new Date(t.due_date) < new Date(new Date().toDateString());
}

function TasksPage() {
  const [projectId, setProjectId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const fetcher = useServerFn(listTasks);
  const fetchMembers = useServerFn(listProjectMembers);
  const archive = useServerFn(archiveTask);
  const updateStatus = useServerFn(updateTaskStatus);
  const qc = useQueryClient();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["tasks-all", projectId],
    queryFn: () => fetcher({ data: projectId ? { projectId } : {} }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["project-members"],
    queryFn: () => fetchMembers({ data: {} }),
  });
  const memberMap = useMemo(() => Object.fromEntries((members as any[]).map((m) => [m.id, m.full_name || m.email])), [members]);

  const filtered = useMemo(() => {
    return (tasks as any[]).filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (overdueOnly && !isOverdue(t)) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${t.title} ${t.description ?? ""} ${t.location ?? ""} ${t.discipline ?? ""} ${memberMap[t.assignee_id] ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, overdueOnly, search, memberMap]);

  const stats = useMemo(() => {
    const all = tasks as any[];
    return {
      total: all.length,
      open: all.filter((t) => t.status !== "done" && t.status !== "cancelled").length,
      done: all.filter((t) => t.status === "done").length,
      overdue: all.filter(isOverdue).length,
    };
  }, [tasks]);

  const archiveMut = useMutation({
    mutationFn: (id: string) => archive({ data: { id, archived: true } }),
    onSuccess: () => { toast.success("Task archived"); qc.invalidateQueries({ queryKey: ["tasks-all"] }); qc.invalidateQueries({ queryKey: ["tasks"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: string }) => updateStatus({ data: v as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks-all"] }); qc.invalidateQueries({ queryKey: ["tasks"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Tasks & Planning</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tasks across List, Kanban, Calendar and Gantt views.</p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={!projectId} className="bg-accent text-white hover:bg-accent/90">
          <Plus className="size-4 mr-1" /> New task
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Open" value={stats.open} />
        <StatCard label="Completed" value={stats.done} accent="text-emerald-600" />
        <StatCard label="Overdue" value={stats.overdue} accent="text-rose-600" />
      </div>

      <Card>
        <CardContent className="pt-4 flex flex-wrap items-center gap-3">
          <div className="w-56"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={overdueOnly ? "default" : "outline"} size="sm" onClick={() => setOverdueOnly((v) => !v)}>
            <AlertTriangle className="size-4 mr-1" /> Overdue only
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <TaskListView
            isLoading={isLoading} error={error} tasks={filtered}
            memberMap={memberMap}
            onEdit={setEditing}
            onArchive={(id: string) => archiveMut.mutate(id)}
            onStatus={(id: string, s: string) => statusMut.mutate({ id, status: s })}
          />
        </TabsContent>
        <TabsContent value="kanban" className="mt-4">
          <KanbanView tasks={filtered} onCardClick={setEditing} onStatus={(id: string, s: string) => statusMut.mutate({ id, status: s })} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <CalendarView tasks={filtered} onClick={setEditing} />
        </TabsContent>
        <TabsContent value="gantt" className="mt-4">
          <GanttView tasks={filtered} />
        </TabsContent>
      </Tabs>

      {creating && projectId && (
        <TaskDialog
          mode="create"
          projectId={projectId}
          members={members as any[]}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); qc.invalidateQueries({ queryKey: ["tasks-all"] }); }}
        />
      )}
      {editing && (
        <TaskDialog
          mode="edit"
          task={editing}
          projectId={editing.project_id}
          members={members as any[]}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["tasks-all"] }); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card><CardContent className="pt-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? ""}`}>{value}</p>
    </CardContent></Card>
  );
}

function TaskListView({ isLoading, error, tasks, memberMap, onEdit, onArchive, onStatus }: any) {
  if (isLoading) return <p className="text-sm text-muted-foreground p-6 text-center">Loading tasks…</p>;
  if (error) return <p className="text-sm text-rose-600 p-6 text-center">Failed to load tasks.</p>;
  if (!tasks.length) return (
    <div className="bg-card border rounded-md p-12 text-center">
      <ListChecks className="size-10 mx-auto text-muted-foreground mb-2" />
      <p className="font-medium">No tasks match your filters</p>
      <p className="text-sm text-muted-foreground">Try adjusting filters or create a new task.</p>
    </div>
  );
  return (
    <div className="bg-card border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2">Task</th>
            <th className="text-left px-4 py-2">Project</th>
            <th className="text-left px-4 py-2">Assignee</th>
            <th className="text-left px-4 py-2">Start</th>
            <th className="text-left px-4 py-2">Due</th>
            <th className="text-left px-4 py-2">Priority</th>
            <th className="text-left px-4 py-2 w-36">Status</th>
            <th className="text-left px-4 py-2 w-32">Progress</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((t: any) => (
            <tr key={t.id} className={`border-t hover:bg-muted/30 ${isOverdue(t) ? "bg-rose-50/40" : ""}`}>
              <td className="px-4 py-2">
                <button className="font-medium text-left hover:underline" onClick={() => onEdit(t)}>{t.title}</button>
                {isOverdue(t) && <span className="ml-2 text-[10px] text-rose-600 font-semibold">OVERDUE</span>}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{t.project_name}</td>
              <td className="px-4 py-2 text-xs">{memberMap[t.assignee_id] ?? "—"}</td>
              <td className="px-4 py-2 text-xs">{t.start_date ?? "—"}</td>
              <td className="px-4 py-2 text-xs">{t.due_date ?? "—"}</td>
              <td className="px-4 py-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${PRIORITY_BG[t.priority]}`}>{t.priority}</span>
              </td>
              <td className="px-4 py-2">
                <Select value={t.status} onValueChange={(v) => onStatus(t.id, v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </td>
              <td className="px-4 py-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${t.progress ?? 0}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{t.progress ?? 0}%</span>
              </td>
              <td className="px-4 py-2 text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(t)}><Pencil className="size-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Archive this task?")) onArchive(t.id); }}><Archive className="size-3.5" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KanbanView({ tasks, onCardClick, onStatus }: any) {
  const cols = TASK_STATUSES;
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {cols.map((c) => {
        const items = (tasks as any[]).filter((t) => t.status === c);
        return (
          <div key={c} className="bg-muted/30 rounded-md p-2 min-h-[300px]">
            <div className="flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{STATUS_LABEL[c]}</span><span>{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((t) => (
                <div key={t.id} className="bg-card border rounded-md p-3 shadow-sm hover:shadow cursor-pointer" onClick={() => onCardClick(t)}>
                  <div className="font-medium text-sm">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t.project_name}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIORITY_BG[t.priority]}`}>{t.priority}</span>
                    <span className="text-[10px] text-muted-foreground">{t.due_date ?? "—"}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2"><div className="h-full bg-primary" style={{ width: `${t.progress ?? 0}%` }} /></div>
                  <Select value={t.status} onValueChange={(v) => { onStatus(t.id, v); }}>
                    <SelectTrigger className="h-7 text-[11px] mt-2" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
              {!items.length && <p className="text-[11px] text-muted-foreground px-2 py-4 text-center">Empty</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({ tasks, onClick }: any) {
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const byDate = useMemo(() => {
    const m: Record<string, any[]> = {};
    (tasks as any[]).forEach((t) => {
      const k = t.due_date ?? t.start_date;
      if (!k) return;
      (m[k] = m[k] ?? []).push(t);
    });
    return m;
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Today</Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month + 1, 1))}>›</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="px-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            const k = c ? `${c.getFullYear()}-${String(c.getMonth()+1).padStart(2,"0")}-${String(c.getDate()).padStart(2,"0")}` : "";
            const items = c ? (byDate[k] ?? []) : [];
            return (
              <div key={i} className={`min-h-[80px] border rounded p-1 text-xs ${c ? "bg-card" : "bg-muted/20"}`}>
                {c && <div className="text-[10px] font-semibold text-muted-foreground">{c.getDate()}</div>}
                <div className="space-y-1 mt-1">
                  {items.slice(0, 3).map((t) => (
                    <button key={t.id} onClick={() => onClick(t)} className={`block w-full text-left truncate px-1 py-0.5 rounded text-[10px] ${STATUS_BG[t.status]}`}>{t.title}</button>
                  ))}
                  {items.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{items.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function GanttView({ tasks }: any) {
  const rows = useMemo(() => {
    return (tasks as any[])
      .filter((t) => t.start_date || t.due_date)
      .map((t) => ({ ...t, _start: new Date(t.start_date ?? t.due_date), _end: new Date(t.due_date ?? t.start_date) }));
  }, [tasks]);

  if (!rows.length) return <p className="text-sm text-muted-foreground p-6 text-center">No tasks with dates to chart.</p>;

  const min = new Date(Math.min(...rows.map((r) => r._start.getTime())));
  const max = new Date(Math.max(...rows.map((r) => r._end.getTime())));
  const totalDays = Math.max(1, Math.ceil((max.getTime() - min.getTime()) / 86400000) + 1);
  const months: { label: string; pct: number }[] = [];
  const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
  while (cursor <= max) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const vs = cursor < min ? min : cursor;
    const ve = monthEnd > max ? max : monthEnd;
    const days = Math.max(1, Math.ceil((ve.getTime() - vs.getTime()) / 86400000) + 1);
    months.push({ label: cursor.toLocaleString(undefined, { month: "short", year: "2-digit" }), pct: (days / totalDays) * 100 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <Card><CardContent className="pt-4 overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="flex border-b text-xs text-muted-foreground">
          <div className="w-64 shrink-0 px-2 py-1 font-medium">Task</div>
          <div className="flex-1 flex">
            {months.map((m, i) => <div key={i} className="border-l px-2 py-1" style={{ width: `${m.pct}%` }}>{m.label}</div>)}
          </div>
        </div>
        {rows.map((t) => {
          const offset = ((t._start.getTime() - min.getTime()) / 86400000 / totalDays) * 100;
          const width = Math.max(1, ((t._end.getTime() - t._start.getTime()) / 86400000 + 1) / totalDays * 100);
          return (
            <div key={t.id} className="flex items-center border-b last:border-b-0 hover:bg-muted/30">
              <div className="w-64 shrink-0 px-2 py-2 text-sm">
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground truncate">{t.project_name}</div>
              </div>
              <div className="flex-1 relative h-10">
                <div className={`absolute top-2 h-6 rounded ${STATUS_BAR[t.status]} ${isOverdue(t) ? "ring-2 ring-rose-500" : ""}`}
                  style={{ left: `${offset}%`, width: `${width}%` }}
                  title={`${t.title} • ${t._start.toLocaleDateString()} → ${t._end.toLocaleDateString()}`}>
                  <div className="h-full bg-foreground/20 rounded" style={{ width: `${t.progress ?? 0}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CardContent></Card>
  );
}

function TaskDialog({ mode, task, projectId, members, onClose, onSaved }: any) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState<any>(() => isEdit ? {
    title: task.title ?? "", description: task.description ?? "",
    priority: task.priority ?? "medium", status: task.status ?? "todo",
    start_date: task.start_date ?? "", due_date: task.due_date ?? "",
    assignee_id: task.assignee_id ?? "", progress: task.progress ?? 0,
    discipline: task.discipline ?? "", location: task.location ?? "", remarks: task.remarks ?? "",
  } : {
    title: "", description: "", priority: "medium", status: "todo",
    start_date: "", due_date: "", assignee_id: "", progress: 0,
    discipline: "", location: "", remarks: "",
  });

  const create = useServerFn(createTask);
  const update = useServerFn(updateTask);
  const mut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        status: form.status,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        assignee_id: form.assignee_id || null,
        progress: Number(form.progress) || 0,
        discipline: form.discipline || null,
        location: form.location || null,
        remarks: form.remarks || null,
      };
      if (isEdit) return (await update({ data: { id: task.id, ...payload } })) as any;
      return (await create({ data: { project_id: projectId, ...payload } })) as any;
    },
    onSuccess: () => { toast.success(isEdit ? "Task updated" : "Task created"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!form.title) return toast.error("Title is required"); if (form.start_date && form.due_date && form.due_date < form.start_date) return toast.error("Due date cannot be before start date"); mut.mutate(); }}>
          <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Progress %</Label><Input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div><Label>Assignee</Label>
            <Select value={form.assignee_id || "_none"} onValueChange={(v) => setForm({ ...form, assignee_id: v === "_none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Unassigned</SelectItem>
                {members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Discipline</Label><Input value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          </div>
          <div><Label>Remarks</Label><Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">{mut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

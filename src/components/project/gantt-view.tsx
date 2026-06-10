import { useMemo, useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listTasks, listMilestones, listWbs, updateTask,
  TASK_STATUSES, TASK_PRIORITIES,
} from "@/lib/tasks.functions";
import { ProjectPicker } from "@/components/project-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, RefreshCw, Printer, Calendar as CalendarIcon, AlertTriangle, Diamond } from "lucide-react";

type Zoom = "day" | "week" | "month";

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do", in_progress: "In Progress", blocked: "Blocked",
  done: "Done", cancelled: "Cancelled",
};
const STATUS_BAR: Record<string, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  blocked: "bg-rose-500",
  done: "bg-emerald-500",
  cancelled: "bg-zinc-300",
};
const STATUS_BG: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-rose-100 text-rose-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-zinc-100 text-zinc-500",
};
const PRIORITY_BG: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

const DAY = 86400000;
const PX_PER_DAY: Record<Zoom, number> = { day: 36, week: 14, month: 6 };

function isOverdue(t: any) {
  if (!t.due_date) return false;
  if (t.status === "done" || t.status === "cancelled") return false;
  return new Date(t.due_date) < new Date(new Date().toDateString());
}
function toDate(s: string | null | undefined) { return s ? new Date(s) : null; }
function fmt(d: Date) { return d.toISOString().slice(0, 10); }
function diffDays(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / DAY); }

export function GanttView({ projectId: fixedProjectId, hideProjectPicker }: { projectId?: string; hideProjectPicker?: boolean }) {
  const [projectId, setProjectId] = useState<string>(fixedProjectId ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [zoom, setZoom] = useState<Zoom>("week");
  const [groupByWbs, setGroupByWbs] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [milestoneOpen, setMilestoneOpen] = useState<any | null>(null);

  useEffect(() => { if (fixedProjectId) setProjectId(fixedProjectId); }, [fixedProjectId]);

  const fetchTasks = useServerFn(listTasks);
  const fetchMs = useServerFn(listMilestones);
  const fetchWbs = useServerFn(listWbs);
  const qc = useQueryClient();
  const args = projectId ? { projectId } : {};

  const tasksQ = useQuery({ queryKey: ["gantt-tasks", projectId], queryFn: () => fetchTasks({ data: args }) });
  const msQ = useQuery({ queryKey: ["gantt-ms", projectId], queryFn: () => fetchMs({ data: args }) });
  const wbsQ = useQuery({ queryKey: ["gantt-wbs", projectId], queryFn: () => fetchWbs({ data: args }) });

  const tasks = (tasksQ.data ?? []) as any[];
  const milestones = (msQ.data ?? []) as any[];
  const wbsItems = (wbsQ.data ?? []) as any[];

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (overdueOnly && !isOverdue(t)) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${t.title} ${t.description ?? ""} ${t.location ?? ""} ${t.discipline ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return t.start_date || t.due_date;
    });
  }, [tasks, statusFilter, priorityFilter, overdueOnly, search]);

  const { min, max, totalDays } = useMemo(() => {
    const dates: Date[] = [];
    filteredTasks.forEach((t) => {
      const s = toDate(t.start_date) ?? toDate(t.due_date);
      const e = toDate(t.due_date) ?? toDate(t.start_date);
      if (s) dates.push(s);
      if (e) dates.push(e);
    });
    milestones.forEach((m) => { const d = toDate(m.due_date) ?? toDate(m.completed_at); if (d) dates.push(d); });
    if (!dates.length) {
      const now = new Date();
      return { min: new Date(now.getTime() - 7 * DAY), max: new Date(now.getTime() + 30 * DAY), totalDays: 38 };
    }
    let mn = new Date(Math.min(...dates.map((d) => d.getTime())));
    let mx = new Date(Math.max(...dates.map((d) => d.getTime())));
    mn = new Date(mn.getTime() - 7 * DAY);
    mx = new Date(mx.getTime() + 14 * DAY);
    return { min: mn, max: mx, totalDays: Math.max(1, diffDays(mn, mx) + 1) };
  }, [filteredTasks, milestones]);

  const pxPerDay = PX_PER_DAY[zoom];
  const totalWidth = totalDays * pxPerDay;

  // Header cells
  const headerCells = useMemo(() => {
    const cells: { label: string; sub?: string; offsetPx: number; widthPx: number; major?: boolean }[] = [];
    if (zoom === "day") {
      const cursor = new Date(min);
      for (let i = 0; i < totalDays; i++) {
        cells.push({
          label: String(cursor.getDate()),
          sub: cursor.toLocaleString(undefined, { month: "short" }),
          offsetPx: i * pxPerDay,
          widthPx: pxPerDay,
          major: cursor.getDate() === 1,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (zoom === "week") {
      const cursor = new Date(min);
      const day = cursor.getDay();
      cursor.setDate(cursor.getDate() - day);
      while (cursor <= max) {
        const off = Math.max(0, diffDays(min, cursor));
        cells.push({
          label: `W${getWeek(cursor)}`,
          sub: cursor.toLocaleString(undefined, { month: "short", day: "numeric" }),
          offsetPx: off * pxPerDay,
          widthPx: 7 * pxPerDay,
        });
        cursor.setDate(cursor.getDate() + 7);
      }
    } else {
      const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
      while (cursor <= max) {
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const vs = cursor < min ? min : cursor;
        const ve = monthEnd > max ? max : monthEnd;
        const off = diffDays(min, vs);
        const width = (diffDays(vs, ve) + 1) * pxPerDay;
        cells.push({
          label: cursor.toLocaleString(undefined, { month: "short" }),
          sub: String(cursor.getFullYear()),
          offsetPx: off * pxPerDay,
          widthPx: width,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }
    return cells;
  }, [min, max, totalDays, zoom, pxPerDay]);

  const todayOffset = useMemo(() => {
    const today = new Date(new Date().toDateString());
    if (today < min || today > max) return null;
    return diffDays(min, today) * pxPerDay;
  }, [min, max, pxPerDay]);

  // Group by WBS
  const groups = useMemo(() => {
    if (!groupByWbs || !wbsItems.length) {
      return [{ id: "_all", title: "Tasks", tasks: filteredTasks, wbs: null as any }];
    }
    const byWbs = new Map<string, any[]>();
    const unassigned: any[] = [];
    filteredTasks.forEach((t) => {
      if (t.wbs_id) {
        const arr = byWbs.get(t.wbs_id) ?? [];
        arr.push(t); byWbs.set(t.wbs_id, arr);
      } else unassigned.push(t);
    });
    const out = wbsItems
      .filter((w) => byWbs.has(w.id))
      .map((w) => ({ id: w.id, title: `${w.wbs_code ? w.wbs_code + " · " : ""}${w.title}`, tasks: byWbs.get(w.id)!, wbs: w }));
    if (unassigned.length) out.push({ id: "_unassigned", title: "Unassigned", tasks: unassigned, wbs: null });
    return out;
  }, [filteredTasks, wbsItems, groupByWbs]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToToday = () => {
    if (todayOffset == null || !scrollRef.current) return;
    scrollRef.current.scrollTo({ left: Math.max(0, todayOffset - 200), behavior: "smooth" });
  };

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["gantt-tasks"] });
    qc.invalidateQueries({ queryKey: ["gantt-ms"] });
    qc.invalidateQueries({ queryKey: ["gantt-wbs"] });
  };

  const visibleCount = filteredTasks.length;
  const overdueCount = tasks.filter(isOverdue).length;
  const loading = tasksQ.isLoading || msQ.isLoading || wbsQ.isLoading;
  const err = tasksQ.error || msQ.error || wbsQ.error;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 flex flex-wrap items-center gap-3">
          {!hideProjectPicker && (
            <div className="w-56"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
          )}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={overdueOnly ? "default" : "outline"} size="sm" onClick={() => setOverdueOnly((v) => !v)}>
            <AlertTriangle className="size-4 mr-1" /> Overdue
          </Button>
          <Button variant={groupByWbs ? "default" : "outline"} size="sm" onClick={() => setGroupByWbs((v) => !v)}>WBS</Button>
          <div className="flex border rounded-md overflow-hidden">
            {(["day","week","month"] as Zoom[]).map((z) => (
              <button key={z}
                className={`px-2.5 py-1.5 text-xs capitalize ${zoom === z ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
                onClick={() => setZoom(z)}>{z}</button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={scrollToToday}><CalendarIcon className="size-4 mr-1" /> Today</Button>
          <Button size="sm" variant="outline" onClick={refreshAll}><RefreshCw className="size-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" /></Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{visibleCount} task{visibleCount === 1 ? "" : "s"} · {milestones.length} milestone{milestones.length === 1 ? "" : "s"} · {overdueCount} overdue</span>
        <span>{fmt(min)} → {fmt(max)}</span>
      </div>

      {loading ? (
        <div className="bg-card border rounded-md p-12 text-center text-sm text-muted-foreground">Loading timeline…</div>
      ) : err ? (
        <div className="bg-card border rounded-md p-12 text-center">
          <p className="text-sm text-rose-600 mb-3">Failed to load Gantt data.</p>
          <Button size="sm" onClick={refreshAll}>Retry</Button>
        </div>
      ) : !projectId && !filteredTasks.length && !hideProjectPicker ? (
        <div className="bg-card border rounded-md p-12 text-center text-sm text-muted-foreground">
          Select a project to view its Gantt timeline.
        </div>
      ) : !filteredTasks.length ? (
        <div className="bg-card border rounded-md p-12 text-center">
          <CalendarIcon className="size-10 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium">No tasks with dates available</p>
          <p className="text-sm text-muted-foreground">Add start and due dates to tasks to display them in the Gantt chart.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex">
            {/* Left table */}
            <div className="w-[360px] shrink-0 border-r bg-card">
              <div className="h-14 border-b bg-muted/50 px-3 flex items-end pb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                Task / WBS
              </div>
              <div>
                {groups.map((g) => {
                  const isOpen = !collapsed[g.id];
                  return (
                    <div key={g.id}>
                      {g.id !== "_all" && (
                        <button onClick={() => setCollapsed((c) => ({ ...c, [g.id]: isOpen }))}
                          className="w-full text-left px-3 py-2 text-xs font-semibold bg-muted/30 hover:bg-muted/50 border-b flex items-center gap-2">
                          <span>{isOpen ? "▾" : "▸"}</span>
                          <span className="truncate flex-1">{g.title}</span>
                          <span className="text-[10px] text-muted-foreground">{g.tasks.length}</span>
                        </button>
                      )}
                      {isOpen && g.tasks.map((t) => (
                        <div key={t.id} className={`h-10 border-b px-3 flex items-center justify-between text-sm hover:bg-muted/30 cursor-pointer ${isOverdue(t) ? "bg-rose-50/40" : ""}`}
                          onClick={() => setEditing(t)}>
                          <div className="truncate">
                            <div className="truncate font-medium" title={t.title}>{t.title}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{t.start_date ?? "—"} → {t.due_date ?? "—"} · {t.progress ?? 0}%</div>
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIORITY_BG[t.priority]}`}>{t.priority?.[0]}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right timeline */}
            <div className="flex-1 overflow-x-auto" ref={scrollRef}>
              <div style={{ width: totalWidth, minWidth: "100%" }} className="relative">
                {/* Header */}
                <div className="h-14 border-b bg-muted/50 relative">
                  {headerCells.map((c, i) => (
                    <div key={i} className={`absolute top-0 bottom-0 border-l text-[10px] px-1 py-1 ${c.major ? "border-foreground/20" : "border-border"}`}
                      style={{ left: c.offsetPx, width: c.widthPx }}>
                      <div className="font-semibold">{c.label}</div>
                      {c.sub && <div className="text-muted-foreground">{c.sub}</div>}
                    </div>
                  ))}
                </div>

                {/* Body */}
                <div className="relative">
                  {/* Today line */}
                  {todayOffset != null && (
                    <div className="absolute top-0 bottom-0 w-px bg-rose-500/70 z-10 pointer-events-none" style={{ left: todayOffset }}>
                      <div className="absolute -top-0 -translate-x-1/2 bg-rose-500 text-white text-[9px] px-1 rounded">Today</div>
                    </div>
                  )}
                  {/* Milestone markers row */}
                  {milestones.length > 0 && (
                    <div className="h-8 border-b bg-muted/20 relative">
                      {milestones.map((m) => {
                        const d = toDate(m.due_date); if (!d || d < min || d > max) return null;
                        const left = diffDays(min, d) * pxPerDay;
                        return (
                          <button key={m.id} onClick={() => setMilestoneOpen(m)}
                            className="absolute top-1 -translate-x-1/2 text-amber-600 hover:scale-110 transition" style={{ left }}
                            title={`${m.name} · ${m.due_date ?? ""}`}>
                            <Diamond className="size-5 fill-amber-400" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {groups.map((g) => {
                    const isOpen = !collapsed[g.id];
                    return (
                      <div key={g.id}>
                        {g.id !== "_all" && <div className="h-8 border-b bg-muted/30" />}
                        {isOpen && g.tasks.map((t) => {
                          const s = toDate(t.start_date) ?? toDate(t.due_date)!;
                          const e = toDate(t.due_date) ?? toDate(t.start_date)!;
                          const left = Math.max(0, diffDays(min, s) * pxPerDay);
                          const width = Math.max(pxPerDay, (diffDays(s, e) + 1) * pxPerDay);
                          return (
                            <div key={t.id} className="h-10 border-b relative hover:bg-muted/20">
                              <button
                                onClick={() => setEditing(t)}
                                className={`absolute top-2 h-6 rounded ${STATUS_BAR[t.status] ?? "bg-primary"} ${isOverdue(t) ? "ring-2 ring-rose-500" : ""} overflow-hidden shadow-sm hover:shadow-md transition`}
                                style={{ left, width }}
                                title={`${t.title}\n${t.start_date ?? "—"} → ${t.due_date ?? "—"}\n${t.progress ?? 0}% · ${STATUS_LABEL[t.status] ?? t.status}`}>
                                <div className="h-full bg-foreground/25" style={{ width: `${t.progress ?? 0}%` }} />
                                <span className="absolute inset-0 px-1.5 text-[10px] text-white font-medium flex items-center truncate">{t.title}</span>
                              </button>
                              {/* Actual bar overlay */}
                              {t.actual_start && t.actual_finish && (() => {
                                const as = new Date(t.actual_start); const af = new Date(t.actual_finish);
                                if (af < min || as > max) return null;
                                const al = Math.max(0, diffDays(min, as) * pxPerDay);
                                const aw = Math.max(pxPerDay, (diffDays(as, af) + 1) * pxPerDay);
                                return <div className="absolute bottom-1 h-1.5 bg-foreground/60 rounded" style={{ left: al, width: aw }} title={`Actual: ${t.actual_start} → ${t.actual_finish}`} />;
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground px-1">
        {Object.entries(STATUS_BAR).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1"><span className={`inline-block w-3 h-3 rounded ${c}`} />{STATUS_LABEL[k]}</span>
        ))}
        <span className="flex items-center gap-1"><Diamond className="size-3 fill-amber-400 text-amber-600" /> Milestone</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded ring-2 ring-rose-500 bg-slate-400" /> Overdue</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded bg-foreground/60" /> Actual</span>
      </div>

      {editing && <TaskDrawer task={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refreshAll(); }} />}
      {milestoneOpen && <MilestoneDialog ms={milestoneOpen} onClose={() => setMilestoneOpen(null)} />}
    </div>
  );
}

function getWeek(d: Date) {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / DAY + onejan.getDay() + 1) / 7);
}

function TaskDrawer({ task, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    status: task.status, progress: task.progress ?? 0,
    start_date: task.start_date ?? "", due_date: task.due_date ?? "",
  });
  const update = useServerFn(updateTask);
  const mut = useMutation({
    mutationFn: async () => (await update({ data: {
      id: task.id, status: form.status, progress: Number(form.progress) || 0,
      start_date: form.start_date || null, due_date: form.due_date || null,
    } as any })) as any,
    onSuccess: () => { toast.success("Task updated"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const duration = form.start_date && form.due_date
    ? diffDays(new Date(form.start_date), new Date(form.due_date)) + 1 : null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{task.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Project:</span> {task.project_name ?? "—"}</div>
            <div><span className="text-muted-foreground">Priority:</span> <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${PRIORITY_BG[task.priority]}`}>{task.priority}</span></div>
            <div><span className="text-muted-foreground">Actual start:</span> {task.actual_start ?? "—"}</div>
            <div><span className="text-muted-foreground">Actual finish:</span> {task.actual_finish ?? "—"}</div>
            {duration != null && <div><span className="text-muted-foreground">Duration:</span> {duration} day{duration === 1 ? "" : "s"}</div>}
            {isOverdue(task) && <div className="text-rose-600 font-semibold text-xs">⚠ OVERDUE</div>}
          </div>
          {task.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 pl-3">{task.description}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Progress %</Label><Input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value as any })} /></div>
          </div>
          <span className={`text-[10px] inline-block px-2 py-0.5 rounded ${STATUS_BG[form.status]}`}>{STATUS_LABEL[form.status]}</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { if (form.start_date && form.due_date && form.due_date < form.start_date) return toast.error("Due date cannot be before start date"); mut.mutate(); }} disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">{mut.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MilestoneDialog({ ms, onClose }: any) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Diamond className="size-4 fill-amber-400 text-amber-600" /> {ms.name}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Project:</span> {ms.project_name ?? "—"}</div>
          <div><span className="text-muted-foreground">Planned date:</span> {ms.due_date ?? "—"}</div>
          <div><span className="text-muted-foreground">Completed:</span> {ms.completed_at ? new Date(ms.completed_at).toLocaleDateString() : "—"}</div>
          <div><span className="text-muted-foreground">Status:</span> {ms.status ?? "—"}</div>
          <div><span className="text-muted-foreground">Progress:</span> {ms.progress ?? 0}%</div>
          {ms.description && <p className="text-muted-foreground whitespace-pre-wrap border-l-2 pl-3">{ms.description}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Pencil, Archive, Search, Flag, CheckCircle2, AlertTriangle, Clock,
  LayoutGrid, List, GanttChart,
} from "lucide-react";

import {
  listMilestones, createMilestone, updateMilestone, archiveMilestone, listTasks,
} from "@/lib/tasks.functions";
import { ProjectPicker } from "@/components/project-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUSES = ["not_started", "in_progress", "completed", "delayed", "on_hold", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLE: Record<string, string> = {
  not_started: "bg-zinc-100 text-zinc-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  delayed: "bg-rose-100 text-rose-700",
  on_hold: "bg-amber-100 text-amber-700",
  cancelled: "bg-zinc-200 text-zinc-500",
};

type Milestone = {
  id: string; project_id: string; name: string; description: string | null;
  due_date: string | null; status: string; progress: number;
  completed_at: string | null; is_archived: boolean; project_name?: string;
};

function isDelayed(m: Milestone) {
  if (!m.due_date) return false;
  if (["completed", "cancelled"].includes(m.status)) return false;
  return new Date(m.due_date) < new Date(new Date().toDateString());
}
function isUpcoming(m: Milestone) {
  if (!m.due_date || m.status === "completed" || m.status === "cancelled") return false;
  const d = new Date(m.due_date).getTime();
  const now = Date.now();
  return d >= now && d - now <= 14 * 86400_000;
}
function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export const Route = createFileRoute("/_authenticated/milestones")({
  head: () => ({ meta: [{ title: "Milestones — ProjectCore" }] }),
  component: MilestonesPage,
});

function MilestonesPage() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"timeline" | "cards" | "table">("timeline");
  const [dialog, setDialog] = useState<{ row?: Milestone } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Milestone | null>(null);

  const listFn = useServerFn(listMilestones);
  const listTasksFn = useServerFn(listTasks);
  const createFn = useServerFn(createMilestone);
  const updateFn = useServerFn(updateMilestone);
  const archiveFn = useServerFn(archiveMilestone);

  const { data: milestones = [], isLoading } = useQuery<Milestone[]>({
    queryKey: ["milestones", projectId],
    queryFn: () => listFn({ data: { projectId: projectId || undefined } }) as any,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["ms-tasks", projectId],
    queryFn: () => listTasksFn({ data: { projectId: projectId || undefined } }) as any,
  });

  const tasksByMilestone = useMemo(() => {
    const m = new Map<string, { id: string; title: string; status: string; progress: number }[]>();
    for (const t of tasks as any[]) {
      if (!t.milestone_id) continue;
      if (!m.has(t.milestone_id)) m.set(t.milestone_id, []);
      m.get(t.milestone_id)!.push({ id: t.id, title: t.title, status: t.status, progress: t.progress ?? 0 });
    }
    return m;
  }, [tasks]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return milestones.filter((m) => {
      if (term && !(m.name.toLowerCase().includes(term) || (m.description ?? "").toLowerCase().includes(term))) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "delayed") return isDelayed(m);
      if (statusFilter === "upcoming") return isUpcoming(m);
      return m.status === statusFilter;
    });
  }, [milestones, search, statusFilter]);

  const stats = useMemo(() => {
    const total = milestones.length;
    const completed = milestones.filter((m) => m.status === "completed").length;
    const delayed = milestones.filter(isDelayed).length;
    const upcoming = milestones.filter(isUpcoming).length;
    const next = milestones
      .filter((m) => m.due_date && m.status !== "completed" && m.status !== "cancelled")
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0];
    return { total, completed, delayed, upcoming, next };
  }, [milestones]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["milestones"] });

  const createMut = useMutation({
    mutationFn: (vars: any) => createFn({ data: vars }),
    onSuccess: () => { toast.success("Milestone created"); invalidate(); setDialog(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create"),
  });
  const updateMut = useMutation({
    mutationFn: (vars: any) => updateFn({ data: vars }),
    onSuccess: () => { toast.success("Milestone updated"); invalidate(); setDialog(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });
  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => { toast.success("Milestone archived"); invalidate(); setConfirmArchive(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to archive"),
  });

  const markComplete = (m: Milestone) => updateMut.mutate({ id: m.id, status: "completed", progress: 100 });
  const setStatus = (m: Milestone, status: Status) => updateMut.mutate({ id: m.id, status });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Flag className="h-6 w-6" /> Milestones</h1>
          <p className="text-sm text-muted-foreground">Track key delivery dates across your projects.</p>
        </div>
        <Button size="sm" disabled={!projectId} onClick={() => setDialog({})}>
          <Plus className="h-4 w-4 mr-1" />New Milestone
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} tone="emerald" />
        <StatCard label="Delayed" value={stats.delayed} tone="rose" />
        <StatCard label="Upcoming (14d)" value={stats.upcoming} tone="blue" />
        <Card className="col-span-2 md:col-span-1"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Next Milestone</div>
          <div className="text-sm font-medium truncate">{stats.next?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{fmt(stats.next?.due_date ?? null)}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <div>
            <Label className="text-xs">Project</Label>
            <ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" />
          </div>
          <div>
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or description" className="pl-8" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">View</Label>
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="timeline"><GanttChart className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="cards"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="table"><List className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          <Flag className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {milestones.length === 0
            ? (projectId ? "No milestones yet. Click New Milestone to start." : "Select a project, then add milestones.")
            : "No milestones match your filters."}
        </CardContent></Card>
      ) : view === "timeline" ? (
        <TimelineView items={filtered} tasksByMilestone={tasksByMilestone}
          onEdit={(m: Milestone) => setDialog({ row: m })} onComplete={markComplete} onArchive={(m: Milestone) => setConfirmArchive(m)} />
      ) : view === "cards" ? (
        <CardsView items={filtered} tasksByMilestone={tasksByMilestone}
          onEdit={(m: Milestone) => setDialog({ row: m })} onComplete={markComplete} onArchive={(m: Milestone) => setConfirmArchive(m)}
          onSetStatus={setStatus} />
      ) : (
        <TableView items={filtered} tasksByMilestone={tasksByMilestone}
          onEdit={(m: Milestone) => setDialog({ row: m })} onComplete={markComplete} onArchive={(m: Milestone) => setConfirmArchive(m)} />
      )}

      {dialog && (
        <MilestoneDialog
          open onClose={() => setDialog(null)}
          row={dialog.row}
          onSubmit={(vals) => {
            if (dialog.row) updateMut.mutate({ id: dialog.row.id, ...vals });
            else createMut.mutate({ ...vals, project_id: projectId });
          }}
          busy={createMut.isPending || updateMut.isPending}
        />
      )}

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmArchive && (tasksByMilestone.get(confirmArchive.id)?.length ?? 0) > 0
                ? "This milestone has linked tasks. Archiving will hide it but tasks remain."
                : "This milestone will be hidden from the active list."}
            </AlertDialogDescription>
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

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: "emerald" | "rose" | "blue" }) {
  const t = tone === "emerald" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : tone === "blue" ? "text-blue-600" : "";
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${t}`}>{value}</div>
    </CardContent></Card>
  );
}

function Indicator({ m }: { m: Milestone }) {
  if (m.status === "completed") return <Badge className="bg-emerald-100 text-emerald-700 gap-1"><CheckCircle2 className="h-3 w-3" /> Done</Badge>;
  if (isDelayed(m)) return <Badge className="bg-rose-100 text-rose-700 gap-1"><AlertTriangle className="h-3 w-3" /> Delayed</Badge>;
  if (isUpcoming(m)) return <Badge className="bg-blue-100 text-blue-700 gap-1"><Clock className="h-3 w-3" /> Upcoming</Badge>;
  return null;
}

function ActionMenu({ m, onEdit, onComplete, onArchive, onSetStatus }: {
  m: Milestone; onEdit: (m: Milestone) => void; onComplete: (m: Milestone) => void;
  onArchive: (m: Milestone) => void; onSetStatus?: (m: Milestone, s: Status) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="sm" variant="ghost">⋯</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(m)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
        {m.status !== "completed" && (
          <DropdownMenuItem onClick={() => onComplete(m)}><CheckCircle2 className="h-4 w-4 mr-2" />Mark completed</DropdownMenuItem>
        )}
        {onSetStatus && STATUSES.filter((s) => s !== m.status && s !== "completed").map((s) => (
          <DropdownMenuItem key={s} onClick={() => onSetStatus(m, s)}>Set: {s.replace(/_/g, " ")}</DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={() => onArchive(m)} className="text-rose-600"><Archive className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TimelineView({ items, tasksByMilestone, onEdit, onComplete, onArchive }: any) {
  // Group by Year-Month
  const groups = useMemo(() => {
    const g = new Map<string, Milestone[]>();
    const sorted = [...items].sort((a, b) => (a.due_date ?? "9999") < (b.due_date ?? "9999") ? -1 : 1);
    for (const m of sorted) {
      const key = m.due_date ? new Date(m.due_date).toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "No date";
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(m);
    }
    return [...g.entries()];
  }, [items]);
  return (
    <div className="space-y-6">
      {groups.map(([month, list]) => (
        <div key={month}>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{month}</div>
          <div className="border-l-2 border-muted ml-2 pl-5 space-y-3">
            {list.map((m: Milestone) => {
              const linked = tasksByMilestone.get(m.id)?.length ?? 0;
              const dot =
                m.status === "completed" ? "bg-emerald-500" :
                isDelayed(m) ? "bg-rose-500" :
                isUpcoming(m) ? "bg-blue-500" : "bg-zinc-400";
              return (
                <div key={m.id} className="relative">
                  <span className={`absolute -left-[28px] top-2 h-3 w-3 rounded-full ring-4 ring-background ${dot}`} />
                  <Card><CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{m.name}</h3>
                          <Badge variant="secondary" className={STATUS_STYLE[m.status]}>{m.status.replace(/_/g, " ")}</Badge>
                          <Indicator m={m} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {m.project_name} · Planned {fmt(m.due_date)}
                          {m.completed_at && ` · Completed ${fmt(m.completed_at)}`}
                          {linked > 0 && ` · ${linked} linked task${linked === 1 ? "" : "s"}`}
                        </div>
                        {m.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{m.description}</p>}
                        <div className="flex items-center gap-2 mt-3 max-w-md">
                          <Progress value={m.progress ?? 0} className="h-1.5" />
                          <span className="text-xs text-muted-foreground w-10 text-right">{m.progress ?? 0}%</span>
                        </div>
                      </div>
                      <ActionMenu m={m} onEdit={onEdit} onComplete={onComplete} onArchive={onArchive} />
                    </div>
                  </CardContent></Card>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function CardsView({ items, tasksByMilestone, onEdit, onComplete, onArchive, onSetStatus }: any) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((m: Milestone) => {
        const linked = tasksByMilestone.get(m.id)?.length ?? 0;
        return (
          <Card key={m.id}><CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium truncate">{m.name}</h3>
              <ActionMenu m={m} onEdit={onEdit} onComplete={onComplete} onArchive={onArchive} onSetStatus={onSetStatus} />
            </div>
            <div className="text-xs text-muted-foreground">{m.project_name}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={STATUS_STYLE[m.status]}>{m.status.replace(/_/g, " ")}</Badge>
              <Indicator m={m} />
            </div>
            <div className="text-xs">Planned: <span className="font-medium">{fmt(m.due_date)}</span></div>
            {m.completed_at && <div className="text-xs">Completed: <span className="font-medium">{fmt(m.completed_at)}</span></div>}
            <div className="flex items-center gap-2 pt-1">
              <Progress value={m.progress ?? 0} className="h-1.5" />
              <span className="text-xs text-muted-foreground w-10 text-right">{m.progress ?? 0}%</span>
            </div>
            {linked > 0 && <div className="text-xs text-muted-foreground">{linked} linked task{linked === 1 ? "" : "s"}</div>}
          </CardContent></Card>
        );
      })}
    </div>
  );
}

function TableView({ items, tasksByMilestone, onEdit, onComplete, onArchive }: any) {
  return (
    <Card><CardContent className="p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b">
            <th className="text-left p-3">Milestone</th>
            <th className="text-left p-3">Project</th>
            <th className="text-left p-3">Planned</th>
            <th className="text-left p-3">Actual</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Progress</th>
            <th className="text-left p-3">Tasks</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m: Milestone) => (
            <tr key={m.id} className="border-b hover:bg-muted/30">
              <td className="p-3"><div className="flex items-center gap-2"><span className="font-medium">{m.name}</span><Indicator m={m} /></div></td>
              <td className="p-3 text-muted-foreground">{m.project_name}</td>
              <td className="p-3">{fmt(m.due_date)}</td>
              <td className="p-3">{fmt(m.completed_at)}</td>
              <td className="p-3"><Badge variant="secondary" className={STATUS_STYLE[m.status]}>{m.status.replace(/_/g, " ")}</Badge></td>
              <td className="p-3 w-40"><div className="flex items-center gap-2"><Progress value={m.progress ?? 0} className="h-1.5" /><span className="text-xs w-8 text-right">{m.progress ?? 0}%</span></div></td>
              <td className="p-3 text-muted-foreground">{tasksByMilestone.get(m.id)?.length ?? 0}</td>
              <td className="p-3 text-right"><ActionMenu m={m} onEdit={onEdit} onComplete={onComplete} onArchive={onArchive} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function MilestoneDialog({ open, onClose, row, onSubmit, busy }: {
  open: boolean; onClose: () => void; row?: Milestone;
  onSubmit: (vals: any) => void; busy: boolean;
}) {
  const [form, setForm] = useState({
    name: row?.name ?? "",
    description: row?.description ?? "",
    due_date: row?.due_date ?? "",
    status: (row?.status ?? "not_started") as Status,
    progress: row?.progress ?? 0,
  });

  const submit = () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.progress < 0 || form.progress > 100) return toast.error("Progress must be 0–100");
    onSubmit({
      name: form.name.trim(),
      description: form.description || null,
      due_date: form.due_date || null,
      status: form.status,
      progress: Number(form.progress) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{row ? "Edit Milestone" : "New Milestone"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Planned Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: Status) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Progress %</Label>
              <Input type="number" min={0} max={100} value={form.progress}
                onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{row ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

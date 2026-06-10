import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, Plus, Pencil, Archive, ListTree, Search, FolderTree, AlertTriangle } from "lucide-react";

import { listWbs, createWbs, updateWbs, archiveWbs, listTasks } from "@/lib/tasks.functions";
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

const STATUSES = ["not_started", "in_progress", "on_hold", "completed", "delayed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLE: Record<string, string> = {
  not_started: "bg-zinc-100 text-zinc-700",
  in_progress: "bg-blue-100 text-blue-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  delayed: "bg-rose-100 text-rose-700",
  cancelled: "bg-zinc-200 text-zinc-500",
};

type WbsRow = {
  id: string; project_id: string; parent_wbs_id: string | null;
  wbs_code: string | null; title: string; description: string | null;
  planned_start: string | null; planned_finish: string | null;
  progress: number; status: string; sort_order: number;
};

type TreeNode = WbsRow & { children: TreeNode[]; level: number; code: string };

function buildTree(rows: WbsRow[]): TreeNode[] {
  const byParent = new Map<string | null, WbsRow[]>();
  for (const r of rows) {
    const k = r.parent_wbs_id;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(r);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => (a.sort_order - b.sort_order) || (a.wbs_code ?? "").localeCompare(b.wbs_code ?? ""));
  }
  const walk = (parentId: string | null, level: number, prefix: string): TreeNode[] => {
    const kids = byParent.get(parentId) ?? [];
    return kids.map((r, i) => {
      const code = r.wbs_code || `${prefix}${i + 1}`;
      return { ...r, level, code, children: walk(r.id, level + 1, `${code}.`) };
    });
  };
  return walk(null, 0, "");
}

function flatten(nodes: TreeNode[], expanded: Set<string>, out: TreeNode[] = []): TreeNode[] {
  for (const n of nodes) {
    out.push(n);
    if (n.children.length && expanded.has(n.id)) flatten(n.children, expanded, out);
  }
  return out;
}

function calcRollup(node: TreeNode, tasksByWbs: Map<string, { progress: number }[]>): number {
  if (node.children.length === 0) {
    const tasks = tasksByWbs.get(node.id) ?? [];
    if (tasks.length === 0) return node.progress ?? 0;
    return Math.round(tasks.reduce((s, t) => s + (t.progress ?? 0), 0) / tasks.length);
  }
  const vals = node.children.map((c) => calcRollup(c, tasksByWbs));
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

function isOverdue(n: WbsRow) {
  if (!n.planned_finish) return false;
  if (["completed", "cancelled"].includes(n.status)) return false;
  return new Date(n.planned_finish) < new Date();
}

export const Route = createFileRoute("/_authenticated/wbs")({
  head: () => ({ meta: [{ title: "WBS — ProjectCore" }] }),
  component: WBSPage,
});

function WBSPage() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; parent?: WbsRow | null; row?: WbsRow } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<WbsRow | null>(null);

  const listFn = useServerFn(listWbs);
  const listTasksFn = useServerFn(listTasks);
  const createFn = useServerFn(createWbs);
  const updateFn = useServerFn(updateWbs);
  const archiveFn = useServerFn(archiveWbs);

  const { data: wbs = [], isLoading } = useQuery<WbsRow[]>({
    queryKey: ["wbs", projectId],
    queryFn: () => listFn({ data: { projectId: projectId || undefined } }) as any,
    enabled: true,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["wbs-tasks", projectId],
    queryFn: () => listTasksFn({ data: { projectId: projectId || undefined } }) as any,
  });

  const tasksByWbs = useMemo(() => {
    const m = new Map<string, { progress: number }[]>();
    for (const t of tasks as any[]) {
      if (!t.wbs_id) continue;
      if (!m.has(t.wbs_id)) m.set(t.wbs_id, []);
      m.get(t.wbs_id)!.push({ progress: t.progress ?? 0 });
    }
    return m;
  }, [tasks]);

  const tree = useMemo(() => buildTree(wbs), [wbs]);

  const filteredTree = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term && statusFilter === "all") return tree;
    const matches = (n: TreeNode): TreeNode | null => {
      const kids = n.children.map(matches).filter(Boolean) as TreeNode[];
      const self =
        (!term || n.title.toLowerCase().includes(term) || (n.wbs_code ?? "").toLowerCase().includes(term)) &&
        (statusFilter === "all" || n.status === statusFilter);
      if (self || kids.length) return { ...n, children: kids };
      return null;
    };
    return tree.map(matches).filter(Boolean) as TreeNode[];
  }, [tree, search, statusFilter]);

  // Auto-expand when searching
  const effectiveExpanded = useMemo(() => {
    if (!search && statusFilter === "all") return expanded;
    const all = new Set<string>();
    const walk = (ns: TreeNode[]) => ns.forEach((n) => { all.add(n.id); walk(n.children); });
    walk(filteredTree);
    return all;
  }, [expanded, filteredTree, search, statusFilter]);

  const rows = useMemo(() => flatten(filteredTree, effectiveExpanded), [filteredTree, effectiveExpanded]);

  const stats = useMemo(() => {
    const total = wbs.length;
    const completed = wbs.filter((w) => w.status === "completed").length;
    const overdue = wbs.filter(isOverdue).length;
    const avg = total ? Math.round(wbs.reduce((s, w) => s + (w.progress ?? 0), 0) / total) : 0;
    return { total, completed, overdue, avg };
  }, [wbs]);

  const toggle = (id: string) => {
    const n = new Set(expanded);
    n.has(id) ? n.delete(id) : n.add(id);
    setExpanded(n);
  };
  const expandAll = () => {
    const s = new Set<string>();
    const walk = (ns: TreeNode[]) => ns.forEach((n) => { s.add(n.id); walk(n.children); });
    walk(tree);
    setExpanded(s);
  };
  const collapseAll = () => setExpanded(new Set());

  const invalidate = () => qc.invalidateQueries({ queryKey: ["wbs"] });

  const createMut = useMutation({
    mutationFn: (vars: any) => createFn({ data: vars }),
    onSuccess: () => { toast.success("WBS item created"); invalidate(); setDialog(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create"),
  });
  const updateMut = useMutation({
    mutationFn: (vars: any) => updateFn({ data: vars }),
    onSuccess: () => { toast.success("WBS item updated"); invalidate(); setDialog(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });
  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => { toast.success("WBS item archived"); invalidate(); setConfirmArchive(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to archive"),
  });

  const suggestCode = (parent?: WbsRow | null): string => {
    const siblings = wbs.filter((w) => w.parent_wbs_id === (parent?.id ?? null));
    const next = siblings.length + 1;
    if (!parent) return String(next);
    const node = rows.find((r) => r.id === parent.id);
    return `${node?.code ?? parent.wbs_code ?? ""}.${next}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><FolderTree className="h-6 w-6" /> Work Breakdown Structure</h1>
          <p className="text-sm text-muted-foreground">Break projects into phases, packages, and activities.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}><ChevronDown className="h-4 w-4 mr-1" />Expand all</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}><ChevronRight className="h-4 w-4 mr-1" />Collapse all</Button>
          <Button size="sm" disabled={!projectId} onClick={() => setDialog({ mode: "create", parent: null })}>
            <Plus className="h-4 w-4 mr-1" />Add WBS
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Items" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} tone="emerald" />
        <StatCard label="Overdue" value={stats.overdue} tone="rose" />
        <StatCard label="Avg Progress" value={`${stats.avg}%`} tone="blue" />
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label className="text-xs">Project</Label>
              <ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" />
            </div>
            <div>
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code or title" className="pl-8" />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[minmax(260px,1.5fr)_120px_120px_140px_160px_160px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
            <div>WBS / Title</div>
            <div>Status</div>
            <div>Progress</div>
            <div>Tasks</div>
            <div>Planned Start</div>
            <div className="text-right">Planned Finish</div>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <ListTree className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {wbs.length === 0
                ? (projectId ? "No WBS items yet. Click Add WBS to start." : "Select a project, then add WBS items.")
                : "No items match the current filters."}
            </div>
          ) : (
            <ul className="divide-y">
              {rows.map((n) => {
                const linked = tasksByWbs.get(n.id)?.length ?? 0;
                const rollup = calcRollup(n, tasksByWbs);
                const overdue = isOverdue(n);
                const hasChildren = n.children.length > 0;
                const isOpen = effectiveExpanded.has(n.id);
                return (
                  <li key={n.id} className="px-3 md:px-4 py-2.5 hover:bg-muted/30">
                    <div className="grid md:grid-cols-[minmax(260px,1.5fr)_120px_120px_140px_160px_160px] gap-2 items-center">
                      <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: n.level * 18 }}>
                        {hasChildren ? (
                          <button onClick={() => toggle(n.id)} className="p-0.5 rounded hover:bg-muted">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        ) : <span className="w-5" />}
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">{n.code}</span>
                        <span className="font-medium truncate ml-1">{n.title}</span>
                        {overdue && <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />}
                      </div>
                      <div>
                        <Badge variant="secondary" className={STATUS_STYLE[n.status] ?? ""}>
                          {(n.status ?? "not_started").replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={hasChildren ? rollup : (n.progress ?? 0)} className="h-1.5" />
                        <span className="text-xs text-muted-foreground w-9 text-right">{hasChildren ? rollup : (n.progress ?? 0)}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{linked} linked</div>
                      <div className="text-xs">{n.planned_start ?? "—"}</div>
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs mr-2">{n.planned_finish ?? "—"}</span>
                        <Button size="icon" variant="ghost" title="Add child" onClick={() => setDialog({ mode: "create", parent: n })}><Plus className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => setDialog({ mode: "edit", row: n })}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Archive" onClick={() => setConfirmArchive(n)}><Archive className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {dialog && (
        <WbsDialog
          open
          onClose={() => setDialog(null)}
          projectId={projectId}
          mode={dialog.mode}
          parent={dialog.parent ?? null}
          row={dialog.row}
          suggestedCode={dialog.mode === "create" ? suggestCode(dialog.parent) : undefined}
          allItems={wbs}
          onSubmit={(vals) => {
            if (dialog.mode === "create") createMut.mutate({ ...vals, project_id: projectId, parent_wbs_id: dialog.parent?.id ?? null });
            else updateMut.mutate({ id: dialog.row!.id, ...vals });
          }}
          busy={createMut.isPending || updateMut.isPending}
        />
      )}

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive WBS item?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmArchive && wbs.some((w) => w.parent_wbs_id === confirmArchive.id)
                ? "This item has child items. Archiving only hides this item; children remain visible."
                : "This item will be hidden from the active list. You can restore it later from the database."}
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
  const t =
    tone === "emerald" ? "text-emerald-600" :
    tone === "rose" ? "text-rose-600" :
    tone === "blue" ? "text-blue-600" : "";
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${t}`}>{value}</div>
    </CardContent></Card>
  );
}

function WbsDialog({
  open, onClose, projectId, mode, parent, row, suggestedCode, allItems, onSubmit, busy,
}: {
  open: boolean; onClose: () => void; projectId: string;
  mode: "create" | "edit"; parent: WbsRow | null; row?: WbsRow;
  suggestedCode?: string; allItems: WbsRow[];
  onSubmit: (vals: any) => void; busy: boolean;
}) {
  const [form, setForm] = useState({
    title: row?.title ?? "",
    wbs_code: row?.wbs_code ?? suggestedCode ?? "",
    description: row?.description ?? "",
    planned_start: row?.planned_start ?? "",
    planned_finish: row?.planned_finish ?? "",
    status: (row?.status ?? "not_started") as Status,
    progress: row?.progress ?? 0,
    parent_wbs_id: row?.parent_wbs_id ?? parent?.id ?? "",
    sort_order: row?.sort_order ?? 0,
  });

  const submit = () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (mode === "create" && !projectId) return toast.error("Pick a project first");
    if (form.planned_start && form.planned_finish && form.planned_finish < form.planned_start) {
      return toast.error("Planned finish cannot be before planned start");
    }
    if (form.progress < 0 || form.progress > 100) return toast.error("Progress must be 0–100");
    if (row && form.parent_wbs_id === row.id) return toast.error("WBS item cannot be its own parent");

    onSubmit({
      title: form.title.trim(),
      wbs_code: form.wbs_code || null,
      description: form.description || null,
      planned_start: form.planned_start || null,
      planned_finish: form.planned_finish || null,
      status: form.status,
      progress: Number(form.progress) || 0,
      sort_order: Number(form.sort_order) || 0,
      ...(mode === "edit" ? { parent_wbs_id: form.parent_wbs_id || null } : {}),
    });
  };

  const parentOptions = allItems.filter((w) => !row || w.id !== row.id);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{mode === "create" ? "Add WBS item" : "Edit WBS item"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div>
              <Label>Code</Label>
              <Input value={form.wbs_code} onChange={(e) => setForm({ ...form, wbs_code: e.target.value })} placeholder="1.1" />
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          {mode === "edit" && (
            <div>
              <Label>Parent</Label>
              <Select value={form.parent_wbs_id || "__none__"} onValueChange={(v) => setForm({ ...form, parent_wbs_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Top level —</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.wbs_code ? `${p.wbs_code} · ` : ""}{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Planned Start</Label>
              <Input type="date" value={form.planned_start} onChange={(e) => setForm({ ...form, planned_start: e.target.value })} />
            </div>
            <div>
              <Label>Planned Finish</Label>
              <Input type="date" value={form.planned_finish} onChange={(e) => setForm({ ...form, planned_finish: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
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
            <div>
              <Label>Sort</Label>
              <Input type="number" value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{mode === "create" ? "Create" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

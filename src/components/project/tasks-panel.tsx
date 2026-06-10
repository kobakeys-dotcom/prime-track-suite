import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { listTasks, createTask, updateTaskStatus } from "@/lib/tasks.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["todo", "in_progress", "blocked", "done", "cancelled"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;
const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

export function TasksPanel({ projectId, showProjectColumn = false }: { projectId?: string; showProjectColumn?: boolean }) {
  const fetchTasks = useServerFn(listTasks);
  const updateStatus = useServerFn(updateTaskStatus);
  const qc = useQueryClient();
  const key = ["tasks", projectId ?? "all"];
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: key, queryFn: () => fetchTasks({ data: { projectId } }),
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; status: typeof STATUSES[number] }) => updateStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{projectId && <NewTaskDialog projectId={projectId} onCreated={() => qc.invalidateQueries({ queryKey: key })} />}</div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tasks.length === 0 ? (
        <div className="bg-card border border-border rounded-sm p-10 text-center">
          <ListChecks className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No tasks yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                {showProjectColumn && <th className="text-left px-4 py-3">Project</th>}
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Due</th>
                <th className="text-left px-4 py-3 w-44">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t: any) => (
                <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  {showProjectColumn && <td className="px-4 py-3 text-xs text-muted-foreground">{t.project_name}</td>}
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{t.due_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Select value={t.status} onValueChange={(v) => mut.mutate({ id: t.id, status: v as any })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewTaskDialog({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium" as const, status: "todo" as const, due_date: "",
  });
  const create = useServerFn(createTask);
  const mut = useMutation({
    mutationFn: () => create({ data: {
      project_id: projectId,
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
    } }),
    onSuccess: () => {
      toast.success("Task created");
      onCreated();
      setOpen(false);
      setForm({ title: "", description: "", priority: "medium", status: "todo", due_date: "" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> New Task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!form.title) return; mut.mutate(); }}>
          <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Due</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">
              {mut.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

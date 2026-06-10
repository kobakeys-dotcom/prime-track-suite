import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { Plus, FolderKanban, Search, Pencil, Archive, ArchiveRestore, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  listProjects, createProject, updateProject, archiveProject, deleteProject, listCompanyMembers,
} from "@/lib/projects.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — ProjectCore" }] }),
  component: ProjectsPage,
});

const STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;
const RISKS = ["low", "medium", "high"] as const;

const STATUS_STYLES: Record<string, string> = {
  planning: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-zinc-200 text-zinc-700",
  cancelled: "bg-rose-100 text-rose-700",
};

type FormState = {
  name: string; code: string; client: string; consultant_name: string; contractor_name: string;
  location: string; project_type: string; contract_number: string;
  status: typeof STATUSES[number]; priority: typeof PRIORITIES[number]; risk_level: typeof RISKS[number];
  start_date: string; end_date: string; planned_end_date: string; revised_end_date: string;
  contract_value: string; budget_amount: string; currency: string;
  project_manager_id: string; description: string; progress: string;
};

const EMPTY_FORM: FormState = {
  name: "", code: "", client: "", consultant_name: "", contractor_name: "",
  location: "", project_type: "", contract_number: "",
  status: "planning", priority: "medium", risk_level: "low",
  start_date: "", end_date: "", planned_end_date: "", revised_end_date: "",
  contract_value: "", budget_amount: "", currency: "USD",
  project_manager_id: "", description: "", progress: "",
};

function toPayload(f: FormState) {
  return {
    name: f.name,
    code: f.code || null,
    client: f.client || null,
    consultant_name: f.consultant_name || null,
    contractor_name: f.contractor_name || null,
    location: f.location || null,
    project_type: f.project_type || null,
    contract_number: f.contract_number || null,
    status: f.status,
    priority: f.priority,
    risk_level: f.risk_level,
    start_date: f.start_date || null,
    end_date: f.end_date || null,
    planned_end_date: f.planned_end_date || null,
    revised_end_date: f.revised_end_date || null,
    contract_value: f.contract_value ? Number(f.contract_value) : null,
    budget_amount: f.budget_amount ? Number(f.budget_amount) : null,
    currency: f.currency || "USD",
    project_manager_id: f.project_manager_id || null,
    description: f.description || null,
    progress: f.progress ? Number(f.progress) : 0,
  };
}

function ProjectsPage() {
  const fetchProjects = useServerFn(listProjects);
  const fetchMembers = useServerFn(listCompanyMembers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pmFilter, setPmFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [view, setView] = useState<"active" | "archived">("active");

  const { data: projects = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["projects", view],
    queryFn: () => fetchProjects({ data: { onlyArchived: view === "archived" } }),
  });
  const { data: members = [] } = useQuery({ queryKey: ["company-members"], queryFn: () => fetchMembers() });

  const clients = useMemo(
    () => Array.from(new Set(projects.map((p) => p.client).filter(Boolean))) as string[],
    [projects],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (pmFilter !== "all" && p.project_manager_id !== pmFilter) return false;
      if (clientFilter !== "all" && p.client !== clientFilter) return false;
      if (!s) return true;
      return [p.name, p.code, p.client, p.location, p.contract_number, p.project_type]
        .some((v) => (v ?? "").toLowerCase().includes(s));
    });
  }, [projects, search, statusFilter, pmFilter, clientFilter]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Every project under your company.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView(view === "active" ? "archived" : "active")}>
            {view === "active" ? "Show archived" : "Show active"}
          </Button>
          <ProjectDialog members={members} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={pmFilter} onValueChange={setPmFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Project Manager" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All managers</SelectItem>
            {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email}</SelectItem>)}
          </SelectContent>
        </Select>
        {clients.length > 0 && (
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading projects…</div>
      ) : isError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-sm p-6 text-sm">
          <p className="font-medium text-rose-700">Failed to load projects</p>
          <p className="text-xs text-rose-600 mt-1">{(error as Error)?.message}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-sm p-12 text-center">
          <FolderKanban className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">{projects.length === 0 ? (view === "archived" ? "No archived projects" : "No projects yet") : "No projects match your filters"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {projects.length === 0 && view === "active" ? "Create your first project to start tracking tasks, daily reports, RFIs, and more." : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Project</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Progress</th>
                <th className="text-right px-4 py-3">End Date</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link to="/projects/$projectId" params={{ projectId: p.id }} className="font-medium hover:text-accent">
                      {p.name}
                    </Link>
                    {p.location && <div className="text-xs text-muted-foreground">{p.location}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.code ?? "—"}</td>
                  <td className="px-4 py-3">{p.client ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_STYLES[p.status] ?? ""}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{p.progress}%</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{p.end_date ?? p.planned_end_date ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <RowActions project={p} members={members} archived={view === "archived"} />
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

function RowActions({ project, members, archived }: { project: any; members: any[]; archived: boolean }) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const archive = useServerFn(archiveProject);
  const del = useServerFn(deleteProject);

  const archiveMut = useMutation({
    mutationFn: (archived: boolean) => archive({ data: { projectId: project.id, archived } }),
    onSuccess: (_d, vars) => {
      toast.success(vars ? "Project archived" : "Project restored");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Action failed"),
  });
  const deleteMut = useMutation({
    mutationFn: () => del({ data: { projectId: project.id } }),
    onSuccess: () => {
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setDeleteOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4 mr-2" /> Edit
          </DropdownMenuItem>
          {archived ? (
            <DropdownMenuItem onSelect={() => archiveMut.mutate(false)}>
              <ArchiveRestore className="size-4 mr-2" /> Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => archiveMut.mutate(true)}>
              <Archive className="size-4 mr-2" /> Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-rose-600" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectDialog members={members} project={project} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes "{project.name}" and all related tasks, reports, RFIs, etc. Consider archiving instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              disabled={deleteMut.isPending}
              onClick={(e) => { e.preventDefault(); deleteMut.mutate(); }}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ProjectDialog({
  members, project, open: controlledOpen, onOpenChange,
}: { members: any[]; project?: any; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (v: boolean) => { if (isControlled) onOpenChange?.(v); else setUncontrolledOpen(v); };

  const initial: FormState = project
    ? {
        name: project.name ?? "", code: project.code ?? "",
        client: project.client ?? "", consultant_name: project.consultant_name ?? "",
        contractor_name: project.contractor_name ?? "", location: project.location ?? "",
        project_type: project.project_type ?? "", contract_number: project.contract_number ?? "",
        status: project.status ?? "planning",
        priority: project.priority ?? "medium",
        risk_level: project.risk_level ?? "low",
        start_date: project.start_date ?? "", end_date: project.end_date ?? "",
        planned_end_date: project.planned_end_date ?? "", revised_end_date: project.revised_end_date ?? "",
        contract_value: project.contract_value?.toString() ?? "",
        budget_amount: project.budget_amount?.toString() ?? "",
        currency: project.currency ?? "USD",
        project_manager_id: project.project_manager_id ?? "",
        description: project.description ?? "",
        progress: project.progress?.toString() ?? "",
      }
    : EMPTY_FORM;

  const [form, setForm] = useState<FormState>(initial);
  const qc = useQueryClient();
  const create = useServerFn(createProject);
  const update = useServerFn(updateProject);

  const mut = useMutation({
    mutationFn: () =>
      project
        ? update({ data: { projectId: project.id, patch: toPayload(form) } })
        : create({ data: toPayload(form) }),
    onSuccess: () => {
      toast.success(project ? "Project updated" : "Project created");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", project?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      if (!project) setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && project) setForm(initial); }}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> New Project</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle></DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); if (!form.name) return; mut.mutate(); }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Project name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
            <div><Label>Project code</Label><Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="PRJ-001" /></div>
            <div><Label>Contract number</Label><Input value={form.contract_number} onChange={(e) => set("contract_number", e.target.value)} /></div>
            <div><Label>Client</Label><Input value={form.client} onChange={(e) => set("client", e.target.value)} /></div>
            <div><Label>Consultant</Label><Input value={form.consultant_name} onChange={(e) => set("consultant_name", e.target.value)} /></div>
            <div><Label>Contractor</Label><Input value={form.contractor_name} onChange={(e) => set("contractor_name", e.target.value)} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
            <div><Label>Project type</Label><Input value={form.project_type} onChange={(e) => set("project_type", e.target.value)} placeholder="Building, Roads…" /></div>
            <div>
              <Label>Project manager</Label>
              <Select value={form.project_manager_id || "none"} onValueChange={(v) => set("project_manager_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Risk level</Label>
              <Select value={form.risk_level} onValueChange={(v) => set("risk_level", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RISKS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => set("currency", e.target.value)} placeholder="USD" /></div>
            <div><Label>Contract value</Label><Input type="number" step="0.01" value={form.contract_value} onChange={(e) => set("contract_value", e.target.value)} /></div>
            <div><Label>Budget amount</Label><Input type="number" step="0.01" value={form.budget_amount} onChange={(e) => set("budget_amount", e.target.value)} /></div>
            <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
            <div><Label>End date</Label><Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} /></div>
            <div><Label>Planned end date</Label><Input type="date" value={form.planned_end_date} onChange={(e) => set("planned_end_date", e.target.value)} /></div>
            <div><Label>Revised end date</Label><Input type="date" value={form.revised_end_date} onChange={(e) => set("revised_end_date", e.target.value)} /></div>
            <div><Label>Progress (%)</Label><Input type="number" min="0" max="100" value={form.progress} onChange={(e) => set("progress", e.target.value)} /></div>
          </div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">
              {mut.isPending ? "Saving…" : project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

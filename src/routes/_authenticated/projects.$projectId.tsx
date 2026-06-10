import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/lib/projects.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TasksPanel } from "@/components/project/tasks-panel";
import { DailyReportsPanel } from "@/components/project/daily-reports-panel";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({ meta: [{ title: "Project — ProjectCore" }] }),
  component: ProjectDetail,
});

const STATUS_STYLES: Record<string, string> = {
  planning: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-zinc-200 text-zinc-700",
  cancelled: "bg-rose-100 text-rose-700",
};

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const fetchProject = useServerFn(getProject);
  const { data, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject({ data: { projectId } }),
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-8 text-sm text-muted-foreground">Not found.</div>;

  const { project, stats } = data;

  return (
    <div className="p-8 space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" /> All projects
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold">{project.name}</h1>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_STYLES[project.status] ?? ""}`}>
              {project.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {project.code && <span className="font-mono mr-3">{project.code}</span>}
            {project.client && <span>{project.client}</span>}
            {project.location && <span> · {project.location}</span>}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Progress</div>
          <div className="font-display text-3xl font-bold">{project.progress}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Tasks" value={stats.tasks} />
        <Stat label="Tasks Done" value={stats.tasksDone} />
        <Stat label="Daily Reports" value={stats.reports} />
        <Stat label="Contract Value" value={project.contract_value ? `$${Number(project.contract_value).toLocaleString()}` : "—"} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="reports">Daily Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <div className="bg-card border border-border rounded-sm p-6 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Description</div>
              <p className="text-sm whitespace-pre-wrap">{project.description ?? "—"}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Field label="Start date" value={project.start_date ?? "—"} />
              <Field label="End date" value={project.end_date ?? "—"} />
              <Field label="Created" value={new Date(project.created_at).toLocaleDateString()} />
              <Field label="Updated" value={new Date(project.updated_at).toLocaleDateString()} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="tasks" className="pt-4">
          <TasksPanel projectId={projectId} />
        </TabsContent>
        <TabsContent value="reports" className="pt-4">
          <DailyReportsPanel projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-sm p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-display font-bold">{value}</p>
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

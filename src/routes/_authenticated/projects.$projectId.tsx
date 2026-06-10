import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/lib/projects.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TasksPanel } from "@/components/project/tasks-panel";
import { GanttView } from "@/components/project/gantt-view";
import { DailyReportsPanel } from "@/components/project/daily-reports-panel";
import { ProjectRfisPanel, ProjectSubmittalsPanel, ProjectDocumentsPanel, ProjectBoqPanel, ProjectVariationsPanel, ProjectPaymentClaimsPanel, ProjectBudgetPanel, ProjectMaterialRequestsPanel } from "@/components/project/module-panels";
import { RfqRegister } from "@/components/rfq-register";
import { PurchaseOrderRegister } from "@/components/purchase-order-register";
import { DeliveryRegister } from "@/components/delivery-register";
import { QualityInspectionRegister } from "@/components/quality-inspection-register";
import { SafetyInspectionRegister } from "@/components/safety-inspection-register";
import { NcrRegister } from "@/components/ncr-register";
import { RiskRegister } from "@/components/risk-register";
import { ManpowerRegister } from "@/components/manpower-register";

import { RegisterPage } from "@/components/register-page";
import { REGISTERS, STATUS_STYLES_GENERIC } from "@/lib/register-configs";
import { MeetingActionItems } from "@/components/meeting-action-items";
import { CashFlowModule } from "@/components/cash-flow-module";

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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="reports">Daily Reports</TabsTrigger>
          <TabsTrigger value="boq">BOQ</TabsTrigger>
          <TabsTrigger value="rfis">RFIs</TabsTrigger>
          <TabsTrigger value="submittals">Submittals</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="variations">Variations</TabsTrigger>
          <TabsTrigger value="claims">Payment Claims</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="material-requests">Material Requests</TabsTrigger>
          <TabsTrigger value="rfqs">RFQs</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="snags">Snags</TabsTrigger>
          <TabsTrigger value="ncrs">NCRs</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="manpower">Manpower</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="action-items">Action Items</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <div className="bg-card border border-border rounded-sm p-6 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Description</div>
              <p className="text-sm whitespace-pre-wrap">{project.description ?? "—"}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Field label="Contract #" value={(project as any).contract_number ?? "—"} />
              <Field label="Type" value={(project as any).project_type ?? "—"} />
              <Field label="Consultant" value={(project as any).consultant_name ?? "—"} />
              <Field label="Contractor" value={(project as any).contractor_name ?? "—"} />
              <Field label="Priority" value={(project as any).priority ?? "—"} />
              <Field label="Risk level" value={(project as any).risk_level ?? "—"} />
              <Field label="Currency" value={(project as any).currency ?? "—"} />
              <Field label="Budget" value={(project as any).budget_amount ? `${(project as any).currency ?? ""} ${Number((project as any).budget_amount).toLocaleString()}` : "—"} />
              <Field label="Project manager" value={(project as any).project_manager?.full_name ?? (project as any).project_manager?.email ?? "—"} />
              <Field label="Start date" value={project.start_date ?? "—"} />
              <Field label="End date" value={project.end_date ?? "—"} />
              <Field label="Planned end" value={(project as any).planned_end_date ?? "—"} />
              <Field label="Revised end" value={(project as any).revised_end_date ?? "—"} />
              <Field label="Created" value={new Date(project.created_at).toLocaleDateString()} />
              <Field label="Updated" value={new Date(project.updated_at).toLocaleDateString()} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="tasks" className="pt-4"><TasksPanel projectId={projectId} /></TabsContent>
        <TabsContent value="planning" className="pt-4"><GanttView projectId={projectId} hideProjectPicker /></TabsContent>
        <TabsContent value="reports" className="pt-4"><DailyReportsPanel projectId={projectId} /></TabsContent>
        <TabsContent value="boq" className="pt-4"><ProjectBoqPanel projectId={projectId} /></TabsContent>
        <TabsContent value="rfis" className="pt-4"><ProjectRfisPanel projectId={projectId} /></TabsContent>
        <TabsContent value="submittals" className="pt-4"><ProjectSubmittalsPanel projectId={projectId} /></TabsContent>
        <TabsContent value="documents" className="pt-4"><ProjectDocumentsPanel projectId={projectId} /></TabsContent>
        <TabsContent value="action-items" className="pt-4"><MeetingActionItems projectId={projectId} variant="compact" /></TabsContent>
        <TabsContent value="variations" className="pt-4"><ProjectVariationsPanel projectId={projectId} /></TabsContent>
        <TabsContent value="claims" className="pt-4"><ProjectPaymentClaimsPanel projectId={projectId} /></TabsContent>
        <TabsContent value="budget" className="pt-4"><ProjectBudgetPanel projectId={projectId} /></TabsContent>
        <TabsContent value="cash-flow" className="pt-4"><CashFlowModule fixedProjectId={projectId} compact /></TabsContent>
        <TabsContent value="material-requests" className="pt-4"><ProjectMaterialRequestsPanel projectId={projectId} /></TabsContent>
        <TabsContent value="rfqs" className="pt-4"><RfqRegister projectId={projectId} /></TabsContent>
        <TabsContent value="purchase-orders" className="pt-4"><PurchaseOrderRegister projectId={projectId} /></TabsContent>
        <TabsContent value="deliveries" className="pt-4"><DeliveryRegister projectId={projectId} /></TabsContent>
        <TabsContent value="quality" className="pt-4"><QualityInspectionRegister projectId={projectId} /></TabsContent>
        <TabsContent value="safety" className="pt-4"><SafetyInspectionRegister projectId={projectId} /></TabsContent>
        <TabsContent value="ncrs" className="pt-4"><NcrRegister projectId={projectId} /></TabsContent>
        <TabsContent value="risks" className="pt-4"><RiskRegister projectId={projectId} /></TabsContent>
        <TabsContent value="manpower" className="pt-4"><ManpowerRegister projectId={projectId} /></TabsContent>
        {(["snags", "issues", "meetings"] as const).map((k) => {
          const cfg = REGISTERS[k];
          const tabValue = ({ snags: "snags", issues: "issues", meetings: "meetings" } as Record<string, string>)[k];
          if (!cfg) return null;
          return (
            <TabsContent key={k} value={tabValue} className="pt-4">
              <RegisterPage table={k} title={cfg.title} description={cfg.description} fields={cfg.fields} projectScoped fixedProjectId={projectId} statusField={cfg.statusField} statusStyles={STATUS_STYLES_GENERIC} />
            </TabsContent>
          );
        })}

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

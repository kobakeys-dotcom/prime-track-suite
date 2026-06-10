import { createFileRoute } from "@tanstack/react-router";
import { GanttView } from "@/components/project/gantt-view";

export const Route = createFileRoute("/_authenticated/planning")({
  head: () => ({ meta: [{ title: "Planning — ProjectCore" }] }),
  component: PlanningPage,
});

function PlanningPage() {
  return (
    <div className="p-6 space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Gantt Chart / Project Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1">Plan, track and review tasks, milestones and WBS across projects.</p>
      </header>
      <GanttView />
    </div>
  );
}

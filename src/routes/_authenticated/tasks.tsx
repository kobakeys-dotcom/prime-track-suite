import { createFileRoute } from "@tanstack/react-router";
import { TasksPanel } from "@/components/project/tasks-panel";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — ProjectCore" }] }),
  component: () => (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">All Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">Cross-project task list. Open a project to create new tasks.</p>
      </div>
      <TasksPanel showProjectColumn />
    </div>
  ),
});

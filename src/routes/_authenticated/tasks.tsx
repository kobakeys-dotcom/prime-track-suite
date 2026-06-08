import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — ProjectCore" }] }),
  component: () => <ModuleStub title="Tasks" description="Assign, track, and complete project tasks with priorities, due dates, and progress." />,
});

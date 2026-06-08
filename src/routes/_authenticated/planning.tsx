import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/planning")({
  head: () => ({ meta: [{ title: "Planning — ProjectCore" }] }),
  component: () => <ModuleStub title="Planning" description="Schedule milestones and visualize program timelines across your projects." />,
});

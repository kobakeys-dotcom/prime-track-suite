import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — ProjectCore" }] }),
  component: () => <ModuleStub title="Projects" description="Create and manage projects across your company. Each project has its own tasks, daily reports, BOQ, RFIs, submittals, drawings, documents, approvals, and reports." />,
});

import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/submittals")({
  head: () => ({ meta: [{ title: "Submittals — ProjectCore" }] }),
  component: () => <ModuleStub title="Submittals" description="Manage shop drawings, material data, and samples through review and approval." />,
});

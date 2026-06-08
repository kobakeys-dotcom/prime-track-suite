import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/drawings")({
  head: () => ({ meta: [{ title: "Drawings — ProjectCore" }] }),
  component: () => <ModuleStub title="Drawing Register" description="Maintain the controlled drawing register with discipline, revision, and issued date." />,
});

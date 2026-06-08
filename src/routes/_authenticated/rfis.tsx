import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/rfis")({
  head: () => ({ meta: [{ title: "RFIs — ProjectCore" }] }),
  component: () => <ModuleStub title="Requests for Information" description="Raise, route, and close RFIs with full approval workflow." />,
});

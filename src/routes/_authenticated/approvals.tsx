import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals — ProjectCore" }] }),
  component: () => <ModuleStub title="Approvals" description="Single inbox for everything awaiting your sign-off: RFIs, submittals, documents, variations, payment claims." />,
});

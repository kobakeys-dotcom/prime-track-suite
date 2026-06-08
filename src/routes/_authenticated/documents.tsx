import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — ProjectCore" }] }),
  component: () => <ModuleStub title="Documents" description="Centralized document register with categories, versions, and expiry tracking." />,
});

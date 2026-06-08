import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ProjectCore" }] }),
  component: () => <ModuleStub title="Settings" description="Manage your company, team members, roles, and notification preferences." />,
});

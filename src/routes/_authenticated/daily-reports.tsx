import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/daily-reports")({
  head: () => ({ meta: [{ title: "Daily Reports — ProjectCore" }] }),
  component: () => <ModuleStub title="Daily Reports" description="Site engineers log weather, manpower, equipment, work completed, materials used, issues, photos, and next-day plans." />,
});

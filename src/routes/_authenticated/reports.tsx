import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — ProjectCore" }] }),
  component: () => <ModuleStub title="Reports" description="Generate daily, weekly, monthly, RFI log, submittal log, document register, BOQ progress, and approval pending reports in PDF." />,
});

import { createFileRoute } from "@tanstack/react-router";
import { QualityInspectionRegister } from "@/components/quality-inspection-register";

export const Route = createFileRoute("/_authenticated/quality")({
  head: () => ({ meta: [{ title: "Quality Inspections — ProjectCore" }] }),
  component: () => (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Quality Inspections</h1>
        <p className="text-sm text-muted-foreground">QA/QC inspections, checklists, evidence and approvals.</p>
      </div>
      <QualityInspectionRegister />
    </div>
  ),
});

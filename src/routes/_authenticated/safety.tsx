import { createFileRoute } from "@tanstack/react-router";
import { SafetyInspectionRegister } from "@/components/safety-inspection-register";

export const Route = createFileRoute("/_authenticated/safety")({
  head: () => ({ meta: [{ title: "Safety Inspections — ProjectCore" }] }),
  component: () => (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold">Safety Inspections</h1>
        <p className="text-sm text-muted-foreground">HSE inspections, hazard tracking, and corrective action closeout.</p>
      </div>
      <SafetyInspectionRegister />
    </div>
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { EquipmentRegister } from "@/components/equipment-register";

export const Route = createFileRoute("/_authenticated/equipment")({
  head: () => ({ meta: [{ title: "Equipment — ProjectCore" }] }),
  component: () => (
    <div className="space-y-4 p-2 md:p-4">
      <div>
        <h1 className="text-2xl font-bold">Equipment / Plant &amp; Machinery</h1>
        <p className="text-sm text-muted-foreground">Register, assignments, usage logs, maintenance, breakdowns, inspections, and documents.</p>
      </div>
      <EquipmentRegister />
    </div>
  ),
});

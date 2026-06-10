import { createFileRoute } from "@tanstack/react-router";
import { BoqRegister } from "@/components/boq-register";

export const Route = createFileRoute("/_authenticated/boq")({
  head: () => ({ meta: [{ title: "BOQ — ProjectCore" }] }),
  component: BoqPage,
});

function BoqPage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Bill of Quantities</h1>
        <p className="text-sm text-muted-foreground mt-1">Contract quantities, progress measurement, claimed and certified values.</p>
      </div>
      <BoqRegister variant="full" />
    </div>
  );
}

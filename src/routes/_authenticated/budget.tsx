import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BudgetVsActual } from "@/components/budget-vs-actual";
import { ProjectPicker } from "@/components/project-picker";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({ meta: [{ title: "Budget vs Actual — ProjectCore" }] }),
  component: BudgetPage,
});

function BudgetPage() {
  const [projectId, setProjectId] = useState("");
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Budget vs Actual / Cost Control</h1>
          <p className="text-sm text-muted-foreground mt-1">Track original budget, approved changes, actual cost, committed cost, forecast and variance.</p>
        </div>
        <div className="w-64"><ProjectPicker value={projectId} onChange={setProjectId} /></div>
      </div>
      <BudgetVsActual projectId={projectId || undefined} variant="full" />
    </div>
  );
}

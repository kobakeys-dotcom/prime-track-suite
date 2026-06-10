import { createFileRoute } from "@tanstack/react-router";
import { DailyReportsPanel } from "@/components/project/daily-reports-panel";

export const Route = createFileRoute("/_authenticated/daily-reports")({
  head: () => ({ meta: [{ title: "Daily Reports — ProjectCore" }] }),
  component: () => (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Daily Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">All site reports across projects. Open a project to submit a new report.</p>
      </div>
      <DailyReportsPanel showProjectColumn />
    </div>
  ),
});

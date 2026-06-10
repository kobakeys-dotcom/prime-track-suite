import { createFileRoute } from "@tanstack/react-router";
import { TimesheetRegister } from "@/components/timesheet-register";

export const Route = createFileRoute("/_authenticated/timesheets")({
  head: () => ({ meta: [{ title: "Timesheets — ProjectCore" }] }),
  component: () => (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Timesheets</h1>
        <p className="text-sm text-muted-foreground">Daily labour hours, attendance, overtime, approvals, and payroll-ready summaries.</p>
      </div>
      <TimesheetRegister />
    </div>
  ),
});

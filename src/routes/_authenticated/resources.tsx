import { createFileRoute } from "@tanstack/react-router";
import { ManpowerRegister } from "@/components/manpower-register";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({ meta: [{ title: "Manpower — ProjectCore" }] }),
  component: () => (
    <div className="space-y-4 p-2 md:p-4">
      <div>
        <h1 className="text-2xl font-bold">Manpower</h1>
        <p className="text-sm text-muted-foreground">Workforce planning, attendance, productivity, and labour reporting.</p>
      </div>
      <ManpowerRegister />
    </div>
  ),
});

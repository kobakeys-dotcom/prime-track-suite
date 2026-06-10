import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { getCashFlow } from "@/lib/finance.functions";
import { ProjectPicker } from "@/components/project-picker";

export const Route = createFileRoute("/_authenticated/cash-flow")({
  head: () => ({ meta: [{ title: "Cash Flow — ProjectCore" }] }),
  component: CashFlowPage,
});

function CashFlowPage() {
  const [projectId, setProjectId] = useState("");
  const fetcher = useServerFn(getCashFlow);
  const { data = [], isLoading } = useQuery({
    queryKey: ["cashflow", projectId],
    queryFn: () => fetcher({ data: { projectId: projectId || undefined } }) as any,
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Cash Flow</h1>
          <p className="text-sm text-muted-foreground mt-1">Monthly payment claims: submitted, certified (approved) and paid.</p>
        </div>
        <div className="w-64"><ProjectPicker value={projectId} onChange={setProjectId} /></div>
      </div>
      <div className="bg-card border border-border rounded-sm p-6 h-96">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
        ) : (data as any[]).length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No payment claims yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data as any}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="claimed" fill="#94a3b8" name="Claimed" />
              <Bar dataKey="certified" fill="#3b82f6" name="Certified" />
              <Bar dataKey="paid" fill="#10b981" name="Paid" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

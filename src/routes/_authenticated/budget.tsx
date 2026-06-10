import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getBudgetVsActual } from "@/lib/finance.functions";
import { ProjectPicker } from "@/components/project-picker";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({ meta: [{ title: "Budget vs Actual — ProjectCore" }] }),
  component: BudgetPage,
});

function fmt(n: number) { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n); }

function BudgetPage() {
  const [projectId, setProjectId] = useState("");
  const fetcher = useServerFn(getBudgetVsActual);
  const { data = [], isLoading } = useQuery({
    queryKey: ["budget", projectId],
    queryFn: () => fetcher({ data: { projectId: projectId || undefined } }) as any,
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Budget vs Actual</h1>
          <p className="text-sm text-muted-foreground mt-1">Original budget from BOQ, revised by approved variations, and certified value from approved payment claims.</p>
        </div>
        <div className="w-64"><ProjectPicker value={projectId} onChange={setProjectId} /></div>
      </div>
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left p-3">Project</th>
              <th className="text-right p-3">Original Budget</th>
              <th className="text-right p-3">Approved Variations</th>
              <th className="text-right p-3">Revised Budget</th>
              <th className="text-right p-3">Actual (work done)</th>
              <th className="text-right p-3">Certified (paid)</th>
              <th className="text-right p-3">Variance</th>
              <th className="text-right p-3">% Complete</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && (data as any[]).length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No data yet — add BOQ items to see budget figures.</td></tr>}
            {(data as any[]).map((r) => {
              const variance = r.revised_budget - r.actual;
              const pct = r.revised_budget > 0 ? (r.actual / r.revised_budget) * 100 : 0;
              return (
                <tr key={r.project_id} className="border-t border-border">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-right font-mono">{fmt(r.budget)}</td>
                  <td className="p-3 text-right font-mono">{fmt(r.variations)}</td>
                  <td className="p-3 text-right font-mono font-semibold">{fmt(r.revised_budget)}</td>
                  <td className="p-3 text-right font-mono">{fmt(r.actual)}</td>
                  <td className="p-3 text-right font-mono">{fmt(r.certified)}</td>
                  <td className={`p-3 text-right font-mono ${variance < 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmt(variance)}</td>
                  <td className="p-3 text-right font-mono">{pct.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listTasks } from "@/lib/tasks.functions";
import { ProjectPicker } from "@/components/project-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/planning")({
  head: () => ({ meta: [{ title: "Planning — ProjectCore" }] }),
  component: PlanningPage,
});

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-muted-foreground/40",
  in_progress: "bg-primary",
  blocked: "bg-destructive",
  done: "bg-emerald-600",
  cancelled: "bg-muted-foreground/20",
};

function PlanningPage() {
  const [projectId, setProjectId] = useState<string>("");
  const fetcher = useServerFn(listTasks);
  const { data: tasks = [] } = useQuery({
    queryKey: ["planning-tasks", projectId],
    queryFn: () => fetcher({ data: projectId ? { projectId } : {} }),
  });

  const rows = useMemo(() => {
    const items = (tasks as any[])
      .filter((t) => t.start_date || t.due_date)
      .map((t) => {
        const start = new Date(t.start_date ?? t.due_date);
        const end = new Date(t.due_date ?? t.start_date);
        return { ...t, _start: start, _end: end };
      });
    return items;
  }, [tasks]);

  const { min, max, totalDays } = useMemo(() => {
    if (!rows.length) {
      const now = new Date();
      return { min: now, max: new Date(now.getTime() + 30 * 86400000), totalDays: 30 };
    }
    const min = new Date(Math.min(...rows.map((r) => r._start.getTime())));
    const max = new Date(Math.max(...rows.map((r) => r._end.getTime())));
    const totalDays = Math.max(1, Math.ceil((max.getTime() - min.getTime()) / 86400000) + 1);
    return { min, max, totalDays };
  }, [rows]);

  const months = useMemo(() => {
    const out: { label: string; pct: number }[] = [];
    const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
    while (cursor <= max) {
      const monthStart = new Date(cursor);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const visibleStart = monthStart < min ? min : monthStart;
      const visibleEnd = monthEnd > max ? max : monthEnd;
      const days = Math.max(1, Math.ceil((visibleEnd.getTime() - visibleStart.getTime()) / 86400000) + 1);
      out.push({
        label: cursor.toLocaleString(undefined, { month: "short", year: "2-digit" }),
        pct: (days / totalDays) * 100,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [min, max, totalDays]);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planning</h1>
          <p className="text-sm text-muted-foreground">Gantt timeline of scheduled tasks.</p>
        </div>
        <div className="w-64"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No scheduled tasks with start or due dates yet.</p>
          ) : (
            <div className="space-y-1">
              <div className="flex border-b text-xs text-muted-foreground">
                <div className="w-64 shrink-0 px-2 py-1 font-medium">Task</div>
                <div className="flex-1 flex">
                  {months.map((m, i) => (
                    <div key={i} className="border-l px-2 py-1" style={{ width: `${m.pct}%` }}>{m.label}</div>
                  ))}
                </div>
              </div>
              {rows.map((t) => {
                const offset = ((t._start.getTime() - min.getTime()) / 86400000 / totalDays) * 100;
                const width = Math.max(
                  1,
                  ((t._end.getTime() - t._start.getTime()) / 86400000 + 1) / totalDays * 100,
                );
                return (
                  <div key={t.id} className="flex items-center border-b last:border-b-0 hover:bg-muted/30">
                    <div className="w-64 shrink-0 px-2 py-2 text-sm truncate">
                      <div className="font-medium truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{t.project_name}</div>
                    </div>
                    <div className="flex-1 relative h-10">
                      <div
                        className={`absolute top-2 h-6 rounded-sm ${STATUS_COLORS[t.status] ?? "bg-primary"}`}
                        style={{ left: `${offset}%`, width: `${width}%` }}
                        title={`${t.title} • ${t._start.toLocaleDateString()} → ${t._end.toLocaleDateString()}`}
                      >
                        <div className="h-full bg-foreground/20 rounded-sm" style={{ width: `${t.progress ?? 0}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

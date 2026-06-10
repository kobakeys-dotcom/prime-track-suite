import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ListTodo, ArrowRight, Loader2 } from "lucide-react";
import { listActionItems, promoteActionItemToTask } from "@/lib/meetings.functions";
import { Button } from "@/components/ui/button";
import { ProjectPicker } from "@/components/project-picker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/action-items")({
  head: () => ({ meta: [{ title: "Action Items — ProjectCore" }] }),
  component: ActionItemsPage,
});

const STATUS: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
  closed: "bg-zinc-200 text-zinc-600",
};

function ActionItemsPage() {
  const [projectId, setProjectId] = useState("");
  const list = useServerFn(listActionItems);
  const promote = useServerFn(promoteActionItemToTask);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["action-items", projectId],
    queryFn: () => list({ data: { projectId: projectId || undefined } }) as any,
  });

  const mut = useMutation({
    mutationFn: (id: string) => promote({ data: { id } }) as any,
    onSuccess: () => { toast.success("Promoted to task"); qc.invalidateQueries({ queryKey: ["action-items"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><ListTodo className="size-6 text-accent" /> Meeting Action Items</h1>
          <p className="text-sm text-muted-foreground mt-1">Outstanding actions from meeting minutes. Promote to a task to track on the project board.</p>
        </div>
        <div className="w-64"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
      </div>
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (data as any[]).length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No action items.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Meeting</th>
                <th className="text-left px-4 py-3">Assignee</th>
                <th className="text-left px-4 py-3">Due</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody>
              {(data as any[]).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">{r.description}</td>
                  <td className="px-4 py-3 text-xs">{r.meeting_title}</td>
                  <td className="px-4 py-3 text-xs">{r.assignee_name}</td>
                  <td className="px-4 py-3 text-xs font-mono">{r.due_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", STATUS[r.status] ?? "bg-zinc-100 text-zinc-700")}>
                      {(r.status ?? "—").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => mut.mutate(r.id)} disabled={mut.isPending}>
                      {mut.isPending ? <Loader2 className="size-3 animate-spin" /> : <ArrowRight className="size-3" />} To task
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

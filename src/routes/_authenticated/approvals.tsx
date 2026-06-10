import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Stamp } from "lucide-react";
import { toast } from "sonner";
import { listApprovals, updateApprovalStatus } from "@/lib/workflows.functions";
import { APPROVAL_STATUSES, APPROVAL_STATUS_STYLES, statusLabel } from "@/lib/status";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals — ProjectCore" }] }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const fetcher = useServerFn(listApprovals);
  const update = useServerFn(updateApprovalStatus);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["approvals"], queryFn: () => fetcher() });
  const mut = useMutation({
    mutationFn: (v: { id: string; status: any }) => update({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["approvals"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">Pending decisions and approval workflow history.</p>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-12 text-center">
            <Stamp className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No approval requests yet</p>
            <p className="text-xs text-muted-foreground mt-1">Approval rows are created from RFIs, submittals and other workflows.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr><th className="text-left px-4 py-3">Title</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Project</th><th className="text-left px-4 py-3 w-44">Status</th></tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.title}</td>
                    <td className="px-4 py-3 text-xs font-mono">{r.entity_type}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.project_name}</td>
                    <td className="px-4 py-3">
                      <Select value={r.status} onValueChange={(v) => mut.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className={`h-8 text-xs ${APPROVAL_STATUS_STYLES[r.status]}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{APPROVAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

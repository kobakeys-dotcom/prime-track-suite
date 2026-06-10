import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Stamp, Check, X, MessageSquare, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { listApprovals, updateApprovalStatus } from "@/lib/workflows.functions";
import { APPROVAL_STATUSES, APPROVAL_STATUS_STYLES, statusLabel } from "@/lib/status";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals — ProjectCore" }] }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const fetcher = useServerFn(listApprovals);
  const update = useServerFn(updateApprovalStatus);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["approvals"], queryFn: () => fetcher() });
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [typeFilter, setTypeFilter] = useState("__all");
  const [search, setSearch] = useState("");
  const [decideRow, setDecideRow] = useState<{ row: any; status: string } | null>(null);
  const [comment, setComment] = useState("");

  const mut = useMutation({
    mutationFn: (v: { id: string; status: any; comment?: string }) => update({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["register"] });
      toast.success("Updated");
      setDecideRow(null); setComment("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const types = useMemo(() => Array.from(new Set((rows as any[]).map((r) => r.entity_type))).sort(), [rows]);
  const filtered = useMemo(() => {
    let out = rows as any[];
    if (statusFilter !== "__all") out = out.filter((r) => r.status === statusFilter);
    if (typeFilter !== "__all") out = out.filter((r) => r.entity_type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((r) => `${r.title} ${r.project_name}`.toLowerCase().includes(q));
    }
    return out;
  }, [rows, statusFilter, typeFilter, search]);

  function quickDecide(row: any, status: string) {
    setDecideRow({ row, status });
    setComment("");
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Approvals Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">Decisions sync back to the source record (variations, claims, POs, RFIs, submittals).</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All statuses</SelectItem>
              {APPROVAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All types</SelectItem>
              {types.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 w-56" />
          </div>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-12 text-center">
            <Stamp className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No approvals match these filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different status or type, or clear the search.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Project</th>
                  <th className="text-left px-4 py-3 w-44">Status</th>
                  <th className="px-4 py-3 w-40 text-right">Decide</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.title}{r.comment && <span title={r.comment}><MessageSquare className="size-3 inline ml-1.5 text-muted-foreground" /></span>}</td>
                    <td className="px-4 py-3 text-xs font-mono">{r.entity_type}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.project_name}</td>
                    <td className="px-4 py-3">
                      <Select value={r.status} onValueChange={(v) => mut.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className={`h-8 text-xs ${APPROVAL_STATUS_STYLES[r.status]}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{APPROVAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => quickDecide(r, "approved")} className="p-1.5 hover:bg-emerald-100 text-emerald-700 rounded" title="Approve with comment"><Check className="size-4" /></button>
                      <button onClick={() => quickDecide(r, "rejected")} className="p-1.5 hover:bg-rose-100 text-rose-600 rounded" title="Reject with comment"><X className="size-4" /></button>
                      <button onClick={() => quickDecide(r, "revise_resubmit")} className="p-1.5 hover:bg-amber-100 text-amber-700 rounded" title="Request revision"><MessageSquare className="size-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Dialog open={!!decideRow} onOpenChange={(v) => { if (!v) { setDecideRow(null); setComment(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{decideRow && statusLabel(decideRow.status as any)}: {decideRow?.row.title}</DialogTitle></DialogHeader>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a decision comment (optional)…" rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecideRow(null)}>Cancel</Button>
            <Button onClick={() => decideRow && mut.mutate({ id: decideRow.row.id, status: decideRow.status, comment: comment || undefined })} className="bg-accent text-white hover:bg-accent/90">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

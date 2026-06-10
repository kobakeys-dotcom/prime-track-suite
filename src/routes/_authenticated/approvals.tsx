import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Stamp, Check, X, MessageSquare, Search, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listApprovals, updateApprovalStatus } from "@/lib/workflows.functions";
import { APPROVAL_STATUSES, APPROVAL_STATUS_STYLES, statusLabel } from "@/lib/status";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals — ProjectCore" }] }),
  component: ApprovalsPage,
});

const ENTITY_ROUTES: Record<string, string> = {
  variations: "/variations",
  payment_claims: "/payment-claims",
  procurement_requests: "/procurement",
  purchase_orders: "/purchase-orders",
  submittals: "/submittals",
  rfis: "/rfis",
  quality_inspections: "/quality",
  safety_inspections: "/safety",
  ncrs: "/ncrs",
};

const TYPE_LABEL: Record<string, string> = {
  variations: "Variation",
  payment_claims: "Payment Claim",
  procurement_requests: "Material Request",
  purchase_orders: "Purchase Order",
  submittals: "Submittal",
  rfis: "RFI",
  quality_inspections: "Quality Inspection",
  safety_inspections: "Safety Inspection",
  ncrs: "NCR",
};

type TabKey = "mine" | "requested" | "all" | "completed";

function ApprovalsPage() {
  const fetcher = useServerFn(listApprovals);
  const update = useServerFn(updateApprovalStatus);
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["approvals"], queryFn: () => fetcher() });
  const [tab, setTab] = useState<TabKey>("mine");
  const [statusFilter, setStatusFilter] = useState("__all");
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
      toast.success("Decision recorded");
      setDecideRow(null); setComment("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const types = useMemo(() => Array.from(new Set((rows as any[]).map((r) => r.entity_type))).sort(), [rows]);

  const tabbed = useMemo(() => {
    const all = rows as any[];
    if (tab === "mine") return all.filter((r) => ["submitted", "under_review"].includes(r.status) && (!r.approver_id || r.approver_id === me));
    if (tab === "requested") return all.filter((r) => r.requested_by === me);
    if (tab === "completed") return all.filter((r) => ["approved", "rejected", "revise_resubmit", "closed"].includes(r.status));
    return all;
  }, [rows, tab, me]);

  const filtered = useMemo(() => {
    let out = tabbed;
    if (statusFilter !== "__all") out = out.filter((r) => r.status === statusFilter);
    if (typeFilter !== "__all") out = out.filter((r) => r.entity_type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((r) => `${r.title} ${r.project_name} ${r.requested_by_name ?? ""}`.toLowerCase().includes(q));
    }
    return out;
  }, [tabbed, statusFilter, typeFilter, search]);

  const counts = useMemo(() => {
    const all = rows as any[];
    return {
      mine: all.filter((r) => ["submitted", "under_review"].includes(r.status) && (!r.approver_id || r.approver_id === me)).length,
      requested: all.filter((r) => r.requested_by === me).length,
      all: all.length,
      completed: all.filter((r) => ["approved", "rejected", "revise_resubmit", "closed"].includes(r.status)).length,
      pending: all.filter((r) => r.status === "submitted").length,
      approvedWeek: all.filter((r) => r.status === "approved" && r.decided_at && Date.now() - +new Date(r.decided_at) < 7 * 864e5).length,
      rejectedWeek: all.filter((r) => r.status === "rejected" && r.decided_at && Date.now() - +new Date(r.decided_at) < 7 * 864e5).length,
      revision: all.filter((r) => r.status === "revise_resubmit").length,
    };
  }, [rows, me]);

  function quickDecide(row: any, status: string) {
    setDecideRow({ row, status });
    setComment("");
  }

  function exportCsv() {
    const headers = ["Title", "Type", "Project", "Requested By", "Status", "Comment", "Created", "Decided"];
    const data = filtered.map((r: any) => [r.title, TYPE_LABEL[r.entity_type] ?? r.entity_type, r.project_name ?? "", r.requested_by_name ?? "", statusLabel(r.status as any), r.comment ?? "", r.created_at, r.decided_at ?? ""]);
    const csv = [headers, ...data].map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `approvals-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const reasonRequired = decideRow?.status === "rejected" || decideRow?.status === "revise_resubmit";

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Approvals Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">Decisions sync back to source records (variations, claims, POs, RFIs, submittals, inspections, NCRs).</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="size-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "My Pending", value: counts.mine },
          { label: "Requested by Me", value: counts.requested },
          { label: "Approved (7d)", value: counts.approvedWeek },
          { label: "Revision Requested", value: counts.revision },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-sm p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</p>
            <p className="font-display text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="mine">My Pending ({counts.mine})</TabsTrigger>
          <TabsTrigger value="requested">Requested by Me ({counts.requested})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

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
            {types.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t] ?? t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, project, requester…" className="pl-9 w-72" />
        </div>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-12 text-center">
            <Stamp className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No approvals match these filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different tab, status, or clear the search.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Project</th>
                  <th className="text-left px-4 py-3">Requested By</th>
                  <th className="text-left px-4 py-3 w-44">Status</th>
                  <th className="px-4 py-3 w-52 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => {
                  const route = ENTITY_ROUTES[r.entity_type];
                  const canDecide = tab !== "requested" && ["submitted", "under_review"].includes(r.status);
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {r.title}
                        {r.comment && <span title={r.comment}><MessageSquare className="size-3 inline ml-1.5 text-muted-foreground" /></span>}
                      </td>
                      <td className="px-4 py-3 text-xs">{TYPE_LABEL[r.entity_type] ?? r.entity_type}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.project_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.requested_by_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Select value={r.status} onValueChange={(v) => mut.mutate({ id: r.id, status: v })} disabled={!canDecide}>
                          <SelectTrigger className={`h-8 text-xs ${APPROVAL_STATUS_STYLES[r.status]}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{APPROVAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {canDecide && (
                          <>
                            <button onClick={() => quickDecide(r, "approved")} className="p-1.5 hover:bg-emerald-100 text-emerald-700 rounded" title="Approve"><Check className="size-4" /></button>
                            <button onClick={() => quickDecide(r, "rejected")} className="p-1.5 hover:bg-rose-100 text-rose-600 rounded" title="Reject (reason required)"><X className="size-4" /></button>
                            <button onClick={() => quickDecide(r, "revise_resubmit")} className="p-1.5 hover:bg-amber-100 text-amber-700 rounded" title="Request revision (notes required)"><MessageSquare className="size-4" /></button>
                          </>
                        )}
                        {route && (
                          <Link to={route} className="p-1.5 hover:bg-muted rounded inline-block text-muted-foreground" title="Open source record">
                            <ExternalLink className="size-4" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      <Dialog open={!!decideRow} onOpenChange={(v) => { if (!v) { setDecideRow(null); setComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decideRow && statusLabel(decideRow.status as any)}: {decideRow?.row.title}</DialogTitle>
            <DialogDescription>
              {reasonRequired ? "A reason is required and will be sent to the requester." : "Optionally add a decision comment."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={reasonRequired ? "Reason / revision notes…" : "Optional comment…"}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecideRow(null)}>Cancel</Button>
            <Button
              disabled={mut.isPending || (reasonRequired && !comment.trim())}
              onClick={() => decideRow && mut.mutate({ id: decideRow.row.id, status: decideRow.status, comment: comment || undefined })}
              className="bg-accent text-white hover:bg-accent/90"
            >
              {mut.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

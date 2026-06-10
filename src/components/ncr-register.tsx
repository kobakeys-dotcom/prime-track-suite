import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Search, Archive, Pencil, CheckCircle2, X as XIcon, FileText, Download,
  AlertTriangle, Printer, Paperclip, Trash2, RotateCcw, Send, Shield,
} from "lucide-react";

import {
  listNcrs, getNcr, saveNcr, setNcrStatus, archiveNcr,
  saveNcrAction, setNcrActionStatus, archiveNcrAction,
  addNcrAttachment, deleteNcrAttachment, addNcrComment, ncrStats, listProjectMembers,
  STATUSES, NCR_TYPES, CATEGORIES, SEVERITIES, PRIORITIES, ROOT_CAUSE_CATEGORIES,
  ACTION_TYPES, ACTION_STATUSES, ATTACHMENT_TYPES,
} from "@/lib/ncrs.functions";
import { ProjectPicker } from "@/components/project-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-zinc-100 text-zinc-700",
  Submitted: "bg-blue-100 text-blue-700",
  Open: "bg-amber-100 text-amber-700",
  "Action In Progress": "bg-indigo-100 text-indigo-700",
  "Pending Verification": "bg-violet-100 text-violet-700",
  Verified: "bg-emerald-100 text-emerald-700",
  Closed: "bg-zinc-200 text-zinc-600",
  Rejected: "bg-rose-100 text-rose-700",
  "Revision Requested": "bg-orange-100 text-orange-700",
  Reopened: "bg-orange-100 text-orange-700",
  Cancelled: "bg-rose-50 text-rose-500",
  Archived: "bg-zinc-100 text-zinc-400",
};
const SEVERITY_STYLE: Record<string, string> = {
  Low: "bg-zinc-100 text-zinc-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-rose-100 text-rose-700",
};

type ActionRow = {
  id?: string;
  action_type: string;
  action_title: string;
  action_description?: string | null;
  assigned_to?: string | null;
  target_date?: string | null;
  status: string;
  priority: string;
  completion_notes?: string | null;
};

function csvDownload(rows: any[]) {
  const headers = ["NCR No.","Title","Project","Type","Category","Severity","Priority","Status","Location","Target Closeout","Actual Closeout","Cost Impact","Time Impact"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.ncr_number, r.ncr_title, r.project_id, r.ncr_type, r.category, r.severity, r.priority,
      r.status, r.location ?? "", r.target_closeout_date ?? "", r.actual_closeout_date ?? "",
      r.cost_impact ? r.cost_impact_amount : "", r.time_impact ? r.time_impact_days : "",
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ncrs-${Date.now()}.csv`;
  a.click();
}

function isOverdue(r: any): boolean {
  if (!r.target_closeout_date) return false;
  if (["Closed","Cancelled","Archived","Verified"].includes(r.status)) return false;
  return r.target_closeout_date < new Date().toISOString().slice(0, 10);
}

export function NcrRegister({ projectId }: { projectId?: string }) {
  const [filterProject, setFilterProject] = useState(projectId ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const effectiveProject = projectId ?? filterProject;
  const qc = useQueryClient();

  const fetchList = useServerFn(listNcrs);
  const fetchStats = useServerFn(ncrStats);

  const listQ = useQuery({
    queryKey: ["ncrs", effectiveProject || "all", statusFilter],
    queryFn: () => fetchList({ data: { projectId: effectiveProject || null, status: statusFilter } }),
  });
  const statsQ = useQuery({
    queryKey: ["ncr-stats", effectiveProject || "all"],
    queryFn: () => fetchStats({ data: { projectId: effectiveProject || null } }),
  });

  const rows = useMemo(() => {
    let r = listQ.data ?? [];
    if (severityFilter !== "all") r = r.filter((x: any) => x.severity === severityFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      r = r.filter((x: any) =>
        [x.ncr_number, x.ncr_title, x.description, x.location, x.responsible_party, x.root_cause, x.corrective_action]
          .some((v) => (v ?? "").toString().toLowerCase().includes(s))
      );
    }
    return r;
  }, [listQ.data, severityFilter, search]);

  const stats = statsQ.data ?? { total: 0, draft: 0, open: 0, inProgress: 0, pendingVerification: 0, verified: 0, closed: 0, overdue: 0, critical: 0, costImpact: 0, timeImpact: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">Non-Conformance Reports</h2>
          <p className="text-sm text-muted-foreground">Track NCRs, root causes, corrective actions and closeout.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!projectId && (
            <div className="w-56"><ProjectPicker value={filterProject} onChange={setFilterProject} /></div>
          )}
          <Button variant="outline" size="sm" onClick={() => csvDownload(rows)}><Download className="size-3.5 mr-1" />CSV</Button>
          <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }} disabled={!effectiveProject}>
            <Plus className="size-3.5 mr-1" />New NCR
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Open" value={stats.open} accent="text-amber-700" />
        <StatCard label="Pending Verif." value={stats.pendingVerification} accent="text-violet-700" />
        <StatCard label="Closed" value={stats.closed} accent="text-emerald-700" />
        <StatCard label="Overdue" value={stats.overdue} accent="text-rose-700" />
        <StatCard label="High / Critical" value={stats.critical} accent="text-rose-700" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search NCRs…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-7 h-8" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {listQ.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <Shield className="mx-auto mb-2 size-6 opacity-40" />
              No NCRs yet. {effectiveProject ? "Click New NCR to create one." : "Select a project to create one."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-3">NCR No.</th>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Severity</th>
                    <th className="py-2 pr-3">Target</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setDetailId(r.id)}>
                      <td className="py-2 pr-3 font-mono text-xs">{r.ncr_number}</td>
                      <td className="py-2 pr-3 font-medium">
                        {r.ncr_title}
                        {isOverdue(r) && <Badge className="ml-2 bg-rose-100 text-rose-700">Overdue</Badge>}
                      </td>
                      <td className="py-2 pr-3 text-xs">{r.ncr_type}</td>
                      <td className="py-2 pr-3"><Badge className={SEVERITY_STYLE[r.severity] ?? ""}>{r.severity}</Badge></td>
                      <td className="py-2 pr-3 text-xs">{r.target_closeout_date ?? "—"}</td>
                      <td className="py-2 pr-3"><Badge className={STATUS_STYLE[r.status] ?? ""}>{r.status}</Badge></td>
                      <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => { setEditing(r); setOpenForm(true); }}><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => setConfirmArchive(r.id)}><Archive className="size-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {openForm && (
        <NcrForm
          projectId={effectiveProject}
          initial={editing}
          onClose={() => { setOpenForm(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["ncrs"] }); qc.invalidateQueries({ queryKey: ["ncr-stats"] }); }}
        />
      )}
      {detailId && (
        <NcrDetail id={detailId} onClose={() => setDetailId(null)} onChanged={() => { qc.invalidateQueries({ queryKey: ["ncrs"] }); qc.invalidateQueries({ queryKey: ["ncr-stats"] }); }} />
      )}

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive NCR?</AlertDialogTitle>
            <AlertDialogDescription>The NCR will be hidden from the register. This action can be reversed via the database.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <ArchiveBtn id={confirmArchive!} onDone={() => { setConfirmArchive(null); qc.invalidateQueries({ queryKey: ["ncrs"] }); qc.invalidateQueries({ queryKey: ["ncr-stats"] }); }} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ArchiveBtn({ id, onDone }: { id: string; onDone: () => void }) {
  const fn = useServerFn(archiveNcr);
  const m = useMutation({
    mutationFn: () => fn({ data: { id } }),
    onSuccess: () => { toast.success("Archived"); onDone(); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  return <AlertDialogAction onClick={() => m.mutate()}>Archive</AlertDialogAction>;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-2xl font-display font-bold ${accent ?? ""}`}>{value}</div>
    </CardContent></Card>
  );
}

function NcrForm({ projectId, initial, onClose, onSaved }: { projectId: string; initial: any | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(initial ?? {
    project_id: projectId,
    ncr_title: "",
    ncr_type: "Quality",
    category: "General",
    severity: "Medium",
    priority: "Medium",
    description: "",
    target_closeout_date: "",
    verification_required: true,
    cost_impact: false, cost_impact_amount: 0,
    time_impact: false, time_impact_days: 0,
    recurrence_risk: "Medium",
    is_client_visible: false,
  });

  const save = useServerFn(saveNcr);
  const m = useMutation({
    mutationFn: () => save({ data: cleanForm({ ...form, project_id: form.project_id ?? projectId }) }),
    onSuccess: () => { toast.success(initial ? "Updated" : "Created"); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit NCR" : "New NCR"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <FieldRow label="NCR Title *" className="col-span-2">
            <Input value={form.ncr_title ?? ""} onChange={(e) => setForm({ ...form, ncr_title: e.target.value })} />
          </FieldRow>
          <FieldRow label="Type">
            <Select value={form.ncr_type} onValueChange={(v) => setForm({ ...form, ncr_type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{NCR_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Category">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Severity">
            <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{SEVERITIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Priority">
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Location"><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></FieldRow>
          <FieldRow label="Area"><Input value={form.area ?? ""} onChange={(e) => setForm({ ...form, area: e.target.value })} /></FieldRow>
          <FieldRow label="Floor / Level"><Input value={form.floor_level ?? ""} onChange={(e) => setForm({ ...form, floor_level: e.target.value })} /></FieldRow>
          <FieldRow label="Target Closeout Date"><Input type="date" value={form.target_closeout_date ?? ""} onChange={(e) => setForm({ ...form, target_closeout_date: e.target.value })} /></FieldRow>
          <FieldRow label="Description *" className="col-span-2">
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FieldRow>
          <FieldRow label="Non-Conformance Details" className="col-span-2">
            <Textarea rows={2} value={form.non_conformance_details ?? ""} onChange={(e) => setForm({ ...form, non_conformance_details: e.target.value })} />
          </FieldRow>
          <FieldRow label="Specification Ref"><Input value={form.specification_reference ?? ""} onChange={(e) => setForm({ ...form, specification_reference: e.target.value })} /></FieldRow>
          <FieldRow label="Drawing Ref"><Input value={form.drawing_reference ?? ""} onChange={(e) => setForm({ ...form, drawing_reference: e.target.value })} /></FieldRow>
          <FieldRow label="Responsible Party"><Input value={form.responsible_party ?? ""} onChange={(e) => setForm({ ...form, responsible_party: e.target.value })} /></FieldRow>
          <FieldRow label="Standard Ref"><Input value={form.standard_reference ?? ""} onChange={(e) => setForm({ ...form, standard_reference: e.target.value })} /></FieldRow>
          <FieldRow label="Root Cause Category">
            <Select value={form.root_cause_category ?? ""} onValueChange={(v) => setForm({ ...form, root_cause_category: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{ROOT_CAUSE_CATEGORIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Recurrence Risk">
            <Select value={form.recurrence_risk} onValueChange={(v) => setForm({ ...form, recurrence_risk: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{SEVERITIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Root Cause" className="col-span-2">
            <Textarea rows={2} value={form.root_cause ?? ""} onChange={(e) => setForm({ ...form, root_cause: e.target.value })} />
          </FieldRow>
          <FieldRow label="Containment Action" className="col-span-2">
            <Textarea rows={2} value={form.containment_action ?? ""} onChange={(e) => setForm({ ...form, containment_action: e.target.value })} />
          </FieldRow>
          <FieldRow label="Corrective Action" className="col-span-2">
            <Textarea rows={2} value={form.corrective_action ?? ""} onChange={(e) => setForm({ ...form, corrective_action: e.target.value })} />
          </FieldRow>
          <FieldRow label="Preventive Action" className="col-span-2">
            <Textarea rows={2} value={form.preventive_action ?? ""} onChange={(e) => setForm({ ...form, preventive_action: e.target.value })} />
          </FieldRow>
          <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3 border-t pt-3">
            <ToggleField label="Cost Impact" value={form.cost_impact} onChange={(v) => setForm({ ...form, cost_impact: v })} />
            <FieldRow label="Cost Amount"><Input type="number" min={0} value={form.cost_impact_amount ?? 0} onChange={(e) => setForm({ ...form, cost_impact_amount: Number(e.target.value) })} /></FieldRow>
            <ToggleField label="Time Impact" value={form.time_impact} onChange={(v) => setForm({ ...form, time_impact: v })} />
            <FieldRow label="Time (days)"><Input type="number" min={0} value={form.time_impact_days ?? 0} onChange={(e) => setForm({ ...form, time_impact_days: Number(e.target.value) })} /></FieldRow>
            <ToggleField label="Verification Required" value={form.verification_required} onChange={(v) => setForm({ ...form, verification_required: v })} />
            <ToggleField label="Client Visible" value={form.is_client_visible} onChange={(v) => setForm({ ...form, is_client_visible: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !form.ncr_title || !form.description}>
            {m.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function cleanForm(f: any): any {
  const out: any = { ...f };
  for (const k of ["target_closeout_date","location","area","floor_level","non_conformance_details","specification_reference","drawing_reference","standard_reference","responsible_party","root_cause","root_cause_category","corrective_action","preventive_action","containment_action","ncr_number","ncr_source"]) {
    if (out[k] === "") out[k] = null;
  }
  out.cost_impact_amount = Number(out.cost_impact_amount ?? 0);
  out.time_impact_days = Number(out.time_impact_days ?? 0);
  return out;
}

function FieldRow({ label, children, className }: { label: string; children: any; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded border px-3 py-2">
      <span className="text-xs">{label}</span>
      <Switch checked={!!value} onCheckedChange={onChange} />
    </div>
  );
}

function NcrDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const fetchOne = useServerFn(getNcr);
  const q = useQuery({ queryKey: ["ncr", id], queryFn: () => fetchOne({ data: { id } }) });
  const qc = useQueryClient();
  const refresh = () => { qc.invalidateQueries({ queryKey: ["ncr", id] }); onChanged(); };

  const [statusDialog, setStatusDialog] = useState<{ status: any; label: string; needsReason?: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [actionDialog, setActionDialog] = useState<ActionRow | null>(null);
  const [commentText, setCommentText] = useState("");
  const [attach, setAttach] = useState({ file_name: "", file_url: "", attachment_type: "NCR Evidence", description: "" });

  const setStatus = useServerFn(setNcrStatus);
  const saveAction = useServerFn(saveNcrAction);
  const archiveAction = useServerFn(archiveNcrAction);
  const setActStatus = useServerFn(setNcrActionStatus);
  const addAtt = useServerFn(addNcrAttachment);
  const delAtt = useServerFn(deleteNcrAttachment);
  const addComment = useServerFn(addNcrComment);

  const ncr = q.data?.ncr;

  const doStatus = (status: any, label: string, needsReason = false) => setStatusDialog({ status, label, needsReason });
  const confirmStatus = async () => {
    if (!statusDialog) return;
    if (statusDialog.needsReason && !reason.trim()) { toast.error("Reason required"); return; }
    try {
      await setStatus({ data: { id, status: statusDialog.status, remarks: reason || null } });
      toast.success(`${statusDialog.label} done`);
      setStatusDialog(null); setReason(""); refresh();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        {q.isLoading || !ncr ? <Skeleton className="h-40 w-full" /> : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="font-mono text-sm">{ncr.ncr_number}</span>
                <Badge className={STATUS_STYLE[ncr.status]}>{ncr.status}</Badge>
                <Badge className={SEVERITY_STYLE[ncr.severity]}>{ncr.severity}</Badge>
                {isOverdue(ncr) && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
              </SheetTitle>
              <div className="text-base font-semibold">{ncr.ncr_title}</div>
            </SheetHeader>

            <div className="flex flex-wrap gap-2 my-3">
              {ncr.status === "Draft" && <Button size="sm" onClick={() => doStatus("Submitted", "Submit")}><Send className="size-3.5 mr-1" />Submit</Button>}
              {(ncr.status === "Submitted" || ncr.status === "Open") && <Button size="sm" variant="outline" onClick={() => doStatus("Action In Progress", "Start actions")}>Start Actions</Button>}
              {ncr.status === "Action In Progress" && <Button size="sm" variant="outline" onClick={() => doStatus("Pending Verification", "Pending verification")}>Pending Verification</Button>}
              {ncr.status === "Pending Verification" && <Button size="sm" onClick={() => doStatus("Verified", "Verify", false)}><CheckCircle2 className="size-3.5 mr-1" />Verify</Button>}
              {ncr.status === "Verified" && <Button size="sm" onClick={() => doStatus("Closed", "Close", true)}><CheckCircle2 className="size-3.5 mr-1" />Close</Button>}
              {!["Closed","Archived","Cancelled","Draft"].includes(ncr.status) && <Button size="sm" variant="outline" onClick={() => doStatus("Rejected", "Reject", true)}><XIcon className="size-3.5 mr-1" />Reject</Button>}
              {!["Closed","Archived","Cancelled","Draft"].includes(ncr.status) && <Button size="sm" variant="outline" onClick={() => doStatus("Revision Requested", "Request revision", true)}>Request Revision</Button>}
              {ncr.status === "Closed" && <Button size="sm" variant="outline" onClick={() => doStatus("Reopened", "Reopen", true)}><RotateCcw className="size-3.5 mr-1" />Reopen</Button>}
              <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-3.5 mr-1" />Print</Button>
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="root">Root Cause</TabsTrigger>
                <TabsTrigger value="actions">Actions ({q.data!.actions.length})</TabsTrigger>
                <TabsTrigger value="attachments">Attachments ({q.data!.attachments.length})</TabsTrigger>
                <TabsTrigger value="comments">Comments ({q.data!.comments.length})</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 pt-3">
                <Grid>
                  <ROField label="Type" value={ncr.ncr_type} />
                  <ROField label="Category" value={ncr.category} />
                  <ROField label="Priority" value={ncr.priority} />
                  <ROField label="Recurrence Risk" value={ncr.recurrence_risk} />
                  <ROField label="Location" value={ncr.location} />
                  <ROField label="Area" value={ncr.area} />
                  <ROField label="Floor" value={ncr.floor_level} />
                  <ROField label="Target Closeout" value={ncr.target_closeout_date} />
                  <ROField label="Actual Closeout" value={ncr.actual_closeout_date} />
                  <ROField label="Responsible Party" value={ncr.responsible_party} />
                  <ROField label="Cost Impact" value={ncr.cost_impact ? `Yes — ${ncr.cost_impact_amount}` : "No"} />
                  <ROField label="Time Impact" value={ncr.time_impact ? `Yes — ${ncr.time_impact_days} days` : "No"} />
                </Grid>
                <ROBlock label="Description" value={ncr.description} />
                <ROBlock label="Non-Conformance Details" value={ncr.non_conformance_details} />
                <Grid>
                  <ROField label="Specification Ref" value={ncr.specification_reference} />
                  <ROField label="Drawing Ref" value={ncr.drawing_reference} />
                  <ROField label="Standard Ref" value={ncr.standard_reference} />
                </Grid>
              </TabsContent>

              <TabsContent value="root" className="space-y-3 pt-3">
                <ROField label="Root Cause Category" value={ncr.root_cause_category} />
                <ROBlock label="Root Cause" value={ncr.root_cause} />
                <ROBlock label="Containment Action" value={ncr.containment_action} />
                <ROBlock label="Corrective Action" value={ncr.corrective_action} />
                <ROBlock label="Preventive Action" value={ncr.preventive_action} />
              </TabsContent>

              <TabsContent value="actions" className="space-y-3 pt-3">
                <Button size="sm" onClick={() => setActionDialog({ action_type: "Corrective Action", action_title: "", status: "Open", priority: "Medium" })}>
                  <Plus className="size-3.5 mr-1" />Add Action
                </Button>
                {q.data!.actions.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">No actions yet.</div>
                ) : (
                  <div className="space-y-2">
                    {q.data!.actions.map((a: any) => (
                      <Card key={a.id}><CardContent className="p-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm">{a.action_title}</div>
                            <div className="text-xs text-muted-foreground">{a.action_type} · Target {a.target_date ?? "—"}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge className={STATUS_STYLE[a.status] ?? ""}>{a.status}</Badge>
                          </div>
                        </div>
                        {a.action_description && <div className="text-xs">{a.action_description}</div>}
                        {a.completion_notes && <div className="text-xs italic">Completed: {a.completion_notes}</div>}
                        <div className="flex gap-1 pt-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setActionDialog(a)}>Edit</Button>
                          {a.status !== "Completed" && a.status !== "Verified" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => {
                              const notes = window.prompt("Completion notes?") ?? "";
                              if (!notes) return;
                              await setActStatus({ data: { id: a.id, status: "Completed", completion_notes: notes } });
                              toast.success("Marked completed"); refresh();
                            }}>Complete</Button>
                          )}
                          {a.status === "Completed" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => {
                              await setActStatus({ data: { id: a.id, status: "Verified" } });
                              toast.success("Verified"); refresh();
                            }}>Verify</Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                            await archiveAction({ data: { id: a.id } }); toast.success("Removed"); refresh();
                          }}><Trash2 className="size-3" /></Button>
                        </div>
                      </CardContent></Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="attachments" className="space-y-3 pt-3">
                <Card><CardContent className="p-3 space-y-2">
                  <div className="text-xs font-semibold uppercase">Add Attachment (URL)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="File name" value={attach.file_name} onChange={(e) => setAttach({ ...attach, file_name: e.target.value })} />
                    <Input placeholder="https://…" value={attach.file_url} onChange={(e) => setAttach({ ...attach, file_url: e.target.value })} />
                    <Select value={attach.attachment_type} onValueChange={(v) => setAttach({ ...attach, attachment_type: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{ATTACHMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder="Description" value={attach.description} onChange={(e) => setAttach({ ...attach, description: e.target.value })} />
                  </div>
                  <Button size="sm" disabled={!attach.file_name || !attach.file_url} onClick={async () => {
                    await addAtt({ data: { ncr_id: id, ...attach } });
                    setAttach({ file_name: "", file_url: "", attachment_type: "NCR Evidence", description: "" });
                    toast.success("Attached"); refresh();
                  }}><Paperclip className="size-3.5 mr-1" />Attach</Button>
                </CardContent></Card>
                {q.data!.attachments.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">No attachments.</div>
                ) : (
                  <div className="space-y-1">
                    {q.data!.attachments.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                        <div>
                          <a href={a.file_url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline">{a.file_name}</a>
                          <div className="text-xs text-muted-foreground">{a.attachment_type} · {a.description ?? ""}</div>
                        </div>
                        <Button size="icon" variant="ghost" className="size-7" onClick={async () => { await delAtt({ data: { id: a.id } }); toast.success("Removed"); refresh(); }}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-3 pt-3">
                <div className="flex gap-2">
                  <Textarea rows={2} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment…" />
                  <Button onClick={async () => {
                    if (!commentText.trim()) return;
                    await addComment({ data: { ncr_id: id, comment: commentText } });
                    setCommentText(""); toast.success("Comment added"); refresh();
                  }}>Post</Button>
                </div>
                <div className="space-y-2">
                  {q.data!.comments.map((c: any) => (
                    <div key={c.id} className="border rounded p-2 text-sm">
                      <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                      <div>{c.comment}</div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="history" className="pt-3">
                <div className="space-y-1 text-sm">
                  {q.data!.history.map((h: any) => (
                    <div key={h.id} className="border-l-2 border-muted pl-3 py-1">
                      <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                      <div>{h.old_status ?? "—"} → <span className="font-medium">{h.new_status}</span></div>
                      {h.remarks && <div className="text-xs italic">{h.remarks}</div>}
                    </div>
                  ))}
                  {q.data!.history.length === 0 && <div className="text-muted-foreground text-center py-4">No history.</div>}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>

      <Dialog open={!!statusDialog} onOpenChange={(o) => { if (!o) { setStatusDialog(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{statusDialog?.label}</DialogTitle></DialogHeader>
          {statusDialog?.needsReason && (
            <Textarea rows={3} placeholder="Reason / notes…" value={reason} onChange={(e) => setReason(e.target.value)} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStatusDialog(null); setReason(""); }}>Cancel</Button>
            <Button onClick={confirmStatus}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {actionDialog && (
        <Dialog open onOpenChange={(o) => !o && setActionDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{actionDialog.id ? "Edit Action" : "Add Action"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Type">
                <Select value={actionDialog.action_type} onValueChange={(v) => setActionDialog({ ...actionDialog, action_type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Priority">
                <Select value={actionDialog.priority} onValueChange={(v) => setActionDialog({ ...actionDialog, priority: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Title *" className="col-span-2">
                <Input value={actionDialog.action_title} onChange={(e) => setActionDialog({ ...actionDialog, action_title: e.target.value })} />
              </FieldRow>
              <FieldRow label="Description" className="col-span-2">
                <Textarea rows={2} value={actionDialog.action_description ?? ""} onChange={(e) => setActionDialog({ ...actionDialog, action_description: e.target.value })} />
              </FieldRow>
              <FieldRow label="Target Date"><Input type="date" value={actionDialog.target_date ?? ""} onChange={(e) => setActionDialog({ ...actionDialog, target_date: e.target.value })} /></FieldRow>
              <FieldRow label="Status">
                <Select value={actionDialog.status} onValueChange={(v) => setActionDialog({ ...actionDialog, status: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTION_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button disabled={!actionDialog.action_title} onClick={async () => {
                await saveAction({ data: { ncr_id: id, ...actionDialog, target_date: actionDialog.target_date || null } as any });
                toast.success("Saved"); setActionDialog(null); refresh();
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Sheet>
  );
}

function Grid({ children }: { children: any }) { return <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{children}</div>; }
function ROField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value ?? "—"}</div>
    </div>
  );
}
function ROBlock({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="text-sm whitespace-pre-wrap border rounded p-2 bg-muted/30 min-h-[40px]">{value ?? "—"}</div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Search, Archive, Pencil, CheckCircle2, X as XIcon, FileText, Download,
  ShieldAlert, AlertTriangle, Printer, Paperclip, Trash2, Send, Lock,
} from "lucide-react";

import {
  listSafetyInspections, getSafetyInspection, saveSafetyInspection, setSafetyInspectionStatus,
  archiveSafetyInspection, updateSafetyChecklistResult, closeCorrectiveAction,
  addSafetyHazard, archiveSafetyHazard,
  addSafetyInspectionAttachment, deleteSafetyInspectionAttachment, safetyInspectionStats, listSafetyInspectors,
} from "@/lib/safety-inspections.functions";
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
  Scheduled: "bg-cyan-100 text-cyan-700",
  "In Progress": "bg-indigo-100 text-indigo-700",
  Inspected: "bg-violet-100 text-violet-700",
  "Under Review": "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  "Unsafe / Failed": "bg-rose-100 text-rose-700",
  "Corrective Action Required": "bg-orange-100 text-orange-700",
  Rejected: "bg-rose-100 text-rose-700",
  "Revision Requested": "bg-orange-100 text-orange-700",
  Closed: "bg-zinc-200 text-zinc-600",
  Cancelled: "bg-rose-50 text-rose-500",
  Archived: "bg-zinc-100 text-zinc-400",
};
const RESULT_STYLE: Record<string, string> = {
  Pending: "bg-zinc-100 text-zinc-600",
  Safe: "bg-emerald-100 text-emerald-700",
  "Safe with Observations": "bg-emerald-50 text-emerald-600",
  Unsafe: "bg-rose-100 text-rose-700",
  "Partially Safe": "bg-orange-100 text-orange-700",
  "Not Applicable": "bg-zinc-100 text-zinc-500",
};
const RISK_STYLE: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-rose-100 text-rose-700",
};
const PRIORITY_STYLE: Record<string, string> = {
  Low: "bg-zinc-100 text-zinc-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-rose-100 text-rose-700",
};

const TYPES = [
  "General Safety Inspection","Daily Safety Inspection","Weekly HSE Inspection","PPE Inspection",
  "Housekeeping Inspection","Working at Height Inspection","Scaffolding Inspection",
  "Electrical Safety Inspection","Fire Safety Inspection","Hot Work Inspection",
  "Lifting Operation Inspection","Excavation Safety Inspection","Confined Space Inspection",
  "Plant and Equipment Inspection","Traffic Management Inspection","Environmental Inspection",
  "Emergency Preparedness Inspection",
];
const CATEGORIES = ["General","PPE","Housekeeping","Work at Height","Electrical","Fire Safety","Hot Work","Lifting","Excavation","Confined Space","Scaffolding","Equipment","Traffic","Welfare","Environmental","Emergency"];
const PRIORITIES = ["Low","Medium","High","Critical"];
const RISK_LEVELS = ["Low","Medium","High","Critical"];
const CHECK_RESULTS = ["Pending","Safe","Unsafe","N/A"] as const;
const HAZARD_CATEGORIES = ["Working at Height","Electrical Hazard","Fire Hazard","Hot Work","Lifting Operation","Excavation","Confined Space","PPE Non-Compliance","Housekeeping","Manual Handling","Plant and Equipment","Traffic Management","Scaffolding","Edge Protection","Chemical / Hazardous Substance","Weather / Environment","General"];
const LIKELIHOODS = ["Rare","Unlikely","Possible","Likely","Almost Certain"];
const SEVERITIES = ["Minor","Moderate","Major","Severe","Fatal"];
const CLOSEOUT_STATUSES = ["Open","In Progress","Closed","Overdue","Not Required"];
const ATTACHMENT_TYPES = ["Safety Photo","Hazard Evidence","Corrective Action Evidence","PPE Evidence","Incident Evidence","Safety Checklist","Permit Document","Training Record","Toolbox Talk Record","Supporting Document"];

type Checklist = {
  id?: string;
  item_number?: string | null;
  checklist_item: string;
  safety_standard_reference?: string | null;
  requirement?: string | null;
  result: "Pending" | "Safe" | "Unsafe" | "N/A";
  risk_level: "Low" | "Medium" | "High" | "Critical";
  remarks?: string | null;
  corrective_action?: string | null;
  closeout_status?: string;
  photo_required?: boolean;
  sort_order?: number;
};
function emptyChecklist(): Checklist {
  return { checklist_item: "", result: "Pending", risk_level: "Medium", photo_required: false, closeout_status: "Open" };
}

function csvDownload(rows: any[]) {
  const headers = ["No.","Title","Project","Type","Category","Location","Activity","Date","Inspector","Result","Risk","Status","Safe","Unsafe","N/A","Hazards","Open CA","Closed CA","Issue","NCR"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.inspection_number, r.inspection_title, r.project_id, r.inspection_type, r.category ?? "",
      r.location ?? "", r.work_activity ?? "", r.inspection_date ?? "", r.assigned_inspector_id ?? "",
      r.inspection_result, r.overall_risk_level, r.status,
      r.checklist_safe_count, r.checklist_unsafe_count, r.checklist_na_count,
      r.hazards_found, r.corrective_actions_open, r.corrective_actions_closed,
      r.issue_created ? "Yes" : "No", r.ncr_created ? "Yes" : "No",
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `safety-inspections-${Date.now()}.csv`;
  a.click();
}

export function SafetyInspectionRegister({ projectId }: { projectId?: string }) {
  const [filterProject, setFilterProject] = useState<string>(projectId ?? "");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const effectiveProject = projectId ?? filterProject;
  const qc = useQueryClient();
  const fetchList = useServerFn(listSafetyInspections);
  const fetchStats = useServerFn(safetyInspectionStats);
  const archiveFn = useServerFn(archiveSafetyInspection);

  const listQ = useQuery({
    queryKey: ["safety-inspections", effectiveProject || "all", statusFilter],
    queryFn: () => fetchList({ data: { projectId: effectiveProject || undefined, status: statusFilter } }),
  });
  const statsQ = useQuery({
    queryKey: ["safety-inspections-stats", effectiveProject || "all"],
    queryFn: () => fetchStats({ data: { projectId: effectiveProject || undefined } }),
  });

  const archiveM = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Inspection archived");
      setConfirmArchive(null);
      qc.invalidateQueries({ queryKey: ["safety-inspections"] });
      qc.invalidateQueries({ queryKey: ["safety-inspections-stats"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Archive failed"),
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listQ.data ?? [];
    return (listQ.data ?? []).filter((r: any) =>
      [r.inspection_number, r.inspection_title, r.inspection_type, r.category, r.location, r.work_activity, r.findings]
        .some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [listQ.data, search]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Stat label="Total" value={statsQ.data?.total ?? 0} />
        <Stat label="Pending" value={statsQ.data?.pending ?? 0} />
        <Stat label="Approved" value={statsQ.data?.approved ?? 0} accent="emerald" />
        <Stat label="Safe" value={statsQ.data?.safe ?? 0} accent="emerald" />
        <Stat label="Unsafe" value={statsQ.data?.unsafe ?? 0} accent="rose" />
        <Stat label="Critical Risk" value={statsQ.data?.criticalRisk ?? 0} accent="rose" />
        <Stat label="Open Actions" value={statsQ.data?.openCa ?? 0} accent="orange" />
        <Stat label="Hazards" value={statsQ.data?.hazards ?? 0} accent="orange" />
        <Stat label="Overdue" value={statsQ.data?.overdue ?? 0} accent="rose" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!projectId && (
          <div className="w-64">
            <ProjectPicker value={filterProject} onChange={setFilterProject} placeholder="All projects" />
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 w-64" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.keys(STATUS_STYLE).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => csvDownload(rows)}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }} disabled={!effectiveProject}>
            <Plus className="h-4 w-4 mr-1" /> New Inspection
          </Button>
        </div>
      </div>

      {listQ.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <ShieldAlert className="mx-auto h-10 w-10 mb-2 opacity-50" />
          <p>No safety inspections yet.</p>
          {effectiveProject && <Button className="mt-3" onClick={() => { setEditing(null); setOpenForm(true); }}>Create first inspection</Button>}
        </CardContent></Card>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">No.</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Location</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Risk</th>
                <th className="text-left p-3">Result</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">S/U/NA</th>
                <th className="text-right p-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDetailId(r.id)}>
                  <td className="p-3 font-mono text-xs">{r.inspection_number}</td>
                  <td className="p-3 font-medium">{r.inspection_title ?? "—"}</td>
                  <td className="p-3 text-xs">{r.inspection_type}</td>
                  <td className="p-3 text-xs">{r.location ?? "—"}</td>
                  <td className="p-3 text-xs">{r.inspection_date}</td>
                  <td className="p-3"><Badge className={RISK_STYLE[r.overall_risk_level] ?? ""}>{r.overall_risk_level}</Badge></td>
                  <td className="p-3"><Badge className={RESULT_STYLE[r.inspection_result] ?? ""}>{r.inspection_result}</Badge></td>
                  <td className="p-3"><Badge className={STATUS_STYLE[r.status] ?? ""}>{r.status}</Badge></td>
                  <td className="p-3 text-right text-xs">
                    <span className="text-emerald-600">{r.checklist_safe_count}</span> /{" "}
                    <span className="text-rose-600">{r.checklist_unsafe_count}</span> /{" "}
                    <span className="text-zinc-500">{r.checklist_na_count}</span>
                  </td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpenForm(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {r.status === "Draft" && (
                      <Button variant="ghost" size="icon" onClick={() => setConfirmArchive(r.id)}>
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openForm && (
        <InspectionFormDialog
          open={openForm} onOpenChange={setOpenForm}
          projectId={effectiveProject} editing={editing}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["safety-inspections"] });
            qc.invalidateQueries({ queryKey: ["safety-inspections-stats"] });
          }}
        />
      )}

      {detailId && (
        <InspectionDetailSheet id={detailId} onClose={() => setDetailId(null)} onEdit={(row) => { setEditing(row); setOpenForm(true); }} />
      )}

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive inspection?</AlertDialogTitle>
            <AlertDialogDescription>This will hide the inspection from the register.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmArchive && archiveM.mutate(confirmArchive)}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  const cls: Record<string, string> = { emerald: "text-emerald-600", rose: "text-rose-600", orange: "text-orange-600", blue: "text-blue-600" };
  return (
    <Card><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${accent ? cls[accent] : ""}`}>{value}</div>
    </CardContent></Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/* ------------- Form ------------- */
function InspectionFormDialog({ open, onOpenChange, projectId, editing, onSaved }: {
  open: boolean; onOpenChange: (b: boolean) => void; projectId: string; editing: any | null; onSaved: () => void;
}) {
  const saveFn = useServerFn(saveSafetyInspection);
  const inspectorsFn = useServerFn(listSafetyInspectors);
  const inspectorsQ = useQuery({ queryKey: ["safety-inspectors-lite"], queryFn: () => inspectorsFn() });

  const [form, setForm] = useState<any>({
    project_id: projectId,
    inspection_title: editing?.inspection_title ?? "",
    inspection_type: editing?.inspection_type ?? "General Safety Inspection",
    category: editing?.category ?? "",
    location: editing?.location ?? "",
    area: editing?.area ?? "",
    floor_level: editing?.floor_level ?? "",
    work_activity: editing?.work_activity ?? "",
    assigned_inspector_id: editing?.assigned_inspector_id ?? "",
    inspection_date: editing?.inspection_date ?? new Date().toISOString().slice(0, 10),
    inspection_time: editing?.inspection_time ?? "",
    due_date: editing?.due_date ?? "",
    priority: editing?.priority ?? "Medium",
    overall_risk_level: editing?.overall_risk_level ?? "Medium",
    is_client_visible: editing?.is_client_visible ?? false,
    findings: editing?.findings ?? "",
    corrective_action_summary: editing?.corrective_action_summary ?? "",
  });
  const [checklist, setChecklist] = useState<Checklist[]>([]);
  const [loadedExisting, setLoadedExisting] = useState(false);

  const getFn = useServerFn(getSafetyInspection);
  const detailQ = useQuery({
    queryKey: ["si-detail-edit", editing?.id],
    queryFn: () => getFn({ data: { id: editing.id } }),
    enabled: !!editing?.id && !loadedExisting,
  });
  if (detailQ.data && !loadedExisting) {
    setChecklist((detailQ.data as any).checklist ?? []);
    setLoadedExisting(true);
  }

  const saveM = useMutation({
    mutationFn: (payload: any) => saveFn({ data: payload }),
    onSuccess: () => { toast.success(editing ? "Inspection updated" : "Inspection created"); onSaved(); onOpenChange(false); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  function submit(status?: string) {
    if (!form.inspection_title.trim()) { toast.error("Title is required"); return; }
    if (!form.inspection_date) { toast.error("Date is required"); return; }
    for (const c of checklist) {
      if (c.result === "Unsafe" && !c.remarks?.trim() && !c.corrective_action?.trim()) {
        toast.error("Unsafe items need remarks or corrective action"); return;
      }
    }
    const payload = {
      ...form,
      ...(editing?.id ? { id: editing.id } : {}),
      ...(status ? { status } : {}),
      assigned_inspector_id: form.assigned_inspector_id || null,
      category: form.category || null,
      location: form.location || null,
      area: form.area || null,
      floor_level: form.floor_level || null,
      work_activity: form.work_activity || null,
      inspection_time: form.inspection_time || null,
      due_date: form.due_date || null,
      findings: form.findings || null,
      corrective_action_summary: form.corrective_action_summary || null,
      checklist: checklist.filter((c) => c.checklist_item.trim()),
    };
    saveM.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Safety Inspection" : "New Safety Inspection"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title *"><Input value={form.inspection_title} onChange={(e) => setForm({ ...form, inspection_title: e.target.value })} /></Field>
            <Field label="Type">
              <Select value={form.inspection_type} onValueChange={(v) => setForm({ ...form, inspection_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.category || "_none"} onValueChange={(v) => setForm({ ...form, category: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="_none">—</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Work Activity"><Input value={form.work_activity} onChange={(e) => setForm({ ...form, work_activity: e.target.value })} /></Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Area"><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></Field>
            <Field label="Floor / Level"><Input value={form.floor_level} onChange={(e) => setForm({ ...form, floor_level: e.target.value })} /></Field>
            <Field label="Inspection Date *"><Input type="date" value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} /></Field>
            <Field label="Inspection Time"><Input type="time" value={form.inspection_time} onChange={(e) => setForm({ ...form, inspection_time: e.target.value })} /></Field>
            <Field label="Due Date"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <Field label="Priority">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Overall Risk Level">
              <Select value={form.overall_risk_level} onValueChange={(v) => setForm({ ...form, overall_risk_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RISK_LEVELS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Assigned Inspector">
              <Select value={form.assigned_inspector_id || "_none"} onValueChange={(v) => setForm({ ...form, assigned_inspector_id: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {(inspectorsQ.data ?? []).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Client Visible">
              <div className="flex items-center h-9 gap-2">
                <Switch checked={!!form.is_client_visible} onCheckedChange={(b) => setForm({ ...form, is_client_visible: b })} />
                <span className="text-xs text-muted-foreground">Share with client</span>
              </div>
            </Field>
          </div>

          <Field label="Findings"><Textarea rows={2} value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} /></Field>
          <Field label="Corrective Action Summary"><Textarea rows={2} value={form.corrective_action_summary} onChange={(e) => setForm({ ...form, corrective_action_summary: e.target.value })} /></Field>

          <div className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">Safety Checklist</Label>
              <Button size="sm" variant="outline" onClick={() => setChecklist([...checklist, emptyChecklist()])}>
                <Plus className="h-4 w-4 mr-1" /> Add item
              </Button>
            </div>
            {checklist.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No checklist items yet.</p>
            ) : (
              <div className="space-y-2">
                {checklist.map((c, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start border-b pb-2">
                    <Input className="col-span-1" placeholder="No." value={c.item_number ?? ""}
                      onChange={(e) => { const n = [...checklist]; n[i].item_number = e.target.value; setChecklist(n); }} />
                    <Input className="col-span-4" placeholder="Checklist item *" value={c.checklist_item}
                      onChange={(e) => { const n = [...checklist]; n[i].checklist_item = e.target.value; setChecklist(n); }} />
                    <Input className="col-span-3" placeholder="Standard / requirement" value={c.requirement ?? ""}
                      onChange={(e) => { const n = [...checklist]; n[i].requirement = e.target.value; setChecklist(n); }} />
                    <Select value={c.result} onValueChange={(v) => { const n = [...checklist]; n[i].result = v as any; setChecklist(n); }}>
                      <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                      <SelectContent>{CHECK_RESULTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={c.risk_level} onValueChange={(v) => { const n = [...checklist]; n[i].risk_level = v as any; setChecklist(n); }}>
                      <SelectTrigger className="col-span-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{RISK_LEVELS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Input className="col-span-12" placeholder="Remarks / corrective action (required for Unsafe)"
                      value={c.remarks ?? ""}
                      onChange={(e) => { const n = [...checklist]; n[i].remarks = e.target.value; setChecklist(n); }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" disabled={saveM.isPending} onClick={() => submit("Draft")}>Save Draft</Button>
          <Button disabled={saveM.isPending} onClick={() => submit("Submitted")}><Send className="h-4 w-4 mr-1" /> Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------- Detail Sheet ------------- */
function InspectionDetailSheet({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: (r: any) => void }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getSafetyInspection);
  const setStatusFn = useServerFn(setSafetyInspectionStatus);
  const updateChecklistFn = useServerFn(updateSafetyChecklistResult);
  const closeCaFn = useServerFn(closeCorrectiveAction);
  const addHazardFn = useServerFn(addSafetyHazard);
  const archHazardFn = useServerFn(archiveSafetyHazard);
  const addAttFn = useServerFn(addSafetyInspectionAttachment);
  const delAttFn = useServerFn(deleteSafetyInspectionAttachment);

  const detailQ = useQuery({ queryKey: ["si-detail", id], queryFn: () => getFn({ data: { id } }) });
  const data = detailQ.data as any;

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [attOpen, setAttOpen] = useState(false);
  const [attForm, setAttForm] = useState({ file_name: "", file_url: "", attachment_type: "Safety Photo", description: "", is_client_visible: false });
  const [hazardOpen, setHazardOpen] = useState(false);
  const [hazardForm, setHazardForm] = useState<any>({
    hazard_title: "", hazard_description: "", hazard_category: "General",
    risk_level: "Medium", likelihood: "", severity: "", location: "",
    corrective_action: "", target_closeout_date: "",
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["si-detail", id] });
    qc.invalidateQueries({ queryKey: ["safety-inspections"] });
    qc.invalidateQueries({ queryKey: ["safety-inspections-stats"] });
  };

  const setStatusM = useMutation({
    mutationFn: (payload: any) => setStatusFn({ data: payload }),
    onSuccess: () => { toast.success("Status updated"); setRejectOpen(false); setReviseOpen(false); setApproveOpen(false); setCloseOpen(false); setReasonText(""); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const addAttM = useMutation({
    mutationFn: (payload: any) => addAttFn({ data: payload }),
    onSuccess: () => { toast.success("Attachment added"); setAttOpen(false); setAttForm({ file_name: "", file_url: "", attachment_type: "Safety Photo", description: "", is_client_visible: false }); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const delAttM = useMutation({
    mutationFn: (aid: string) => delAttFn({ data: { id: aid } }),
    onSuccess: () => { toast.success("Removed"); refresh(); },
  });
  const addHazardM = useMutation({
    mutationFn: (payload: any) => addHazardFn({ data: payload }),
    onSuccess: () => { toast.success("Hazard added"); setHazardOpen(false); setHazardForm({ hazard_title: "", hazard_description: "", hazard_category: "General", risk_level: "Medium", likelihood: "", severity: "", location: "", corrective_action: "", target_closeout_date: "" }); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const archHazardM = useMutation({
    mutationFn: (hid: string) => archHazardFn({ data: { id: hid, safety_inspection_id: id } }),
    onSuccess: () => { toast.success("Hazard archived"); refresh(); },
  });
  const closeCaM = useMutation({
    mutationFn: (payload: any) => closeCaFn({ data: payload }),
    onSuccess: () => { toast.success("Corrective action updated"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const [checklistEdit, setChecklistEdit] = useState<Record<string, { result: string; risk_level: string; remarks: string }>>({});
  const updateChecklistM = useMutation({
    mutationFn: () => {
      const items = Object.entries(checklistEdit).map(([cid, v]) => ({
        id: cid, result: v.result as any, risk_level: v.risk_level as any, remarks: v.remarks || null,
      }));
      return updateChecklistFn({ data: { safety_inspection_id: id, items } });
    },
    onSuccess: () => { toast.success("Checklist updated"); setChecklistEdit({}); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  function printReport() { window.print(); }

  if (detailQ.isLoading || !data) {
    return (
      <Sheet open onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-3xl"><Skeleton className="h-full w-full" /></SheetContent>
      </Sheet>
    );
  }

  const hasOpenCriticalCa = (data.hazards ?? []).some((h: any) => h.risk_level === "Critical" && h.closeout_status !== "Closed" && h.closeout_status !== "Not Required");

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm">{data.inspection_number}</span>
            <Badge className={STATUS_STYLE[data.status] ?? ""}>{data.status}</Badge>
            <Badge className={RESULT_STYLE[data.inspection_result] ?? ""}>{data.inspection_result}</Badge>
            <Badge className={RISK_STYLE[data.overall_risk_level] ?? ""}>Risk: {data.overall_risk_level}</Badge>
            <Badge className={PRIORITY_STYLE[data.priority] ?? ""}>{data.priority}</Badge>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="text-lg font-bold">{data.inspection_title}</div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(data)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
            {data.status === "Draft" && (
              <Button size="sm" onClick={() => setStatusM.mutate({ id, status: "Submitted" })}><Send className="h-4 w-4 mr-1" /> Submit</Button>
            )}
            {(data.status === "Submitted" || data.status === "Scheduled") && (
              <Button size="sm" onClick={() => setStatusM.mutate({ id, status: "In Progress" })}>Start Inspection</Button>
            )}
            {data.status === "In Progress" && (
              <Button size="sm" onClick={() => setStatusM.mutate({ id, status: "Inspected" })}>Mark Inspected</Button>
            )}
            {["Inspected","Under Review"].includes(data.status) && (
              <>
                <Button size="sm" onClick={() => setApproveOpen(true)}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}><XIcon className="h-4 w-4 mr-1" /> Reject</Button>
                <Button size="sm" variant="outline" onClick={() => setReviseOpen(true)}>Request Revision</Button>
              </>
            )}
            {data.status === "Approved" && (
              <Button size="sm" variant="outline" onClick={() => setCloseOpen(true)}><Lock className="h-4 w-4 mr-1" /> Close</Button>
            )}
            <Button size="sm" variant="outline" onClick={printReport}><Printer className="h-4 w-4 mr-1" /> Print Report</Button>
          </div>

          {hasOpenCriticalCa && data.status === "Approved" && (
            <div className="border border-rose-200 bg-rose-50 rounded-md p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5" />
              <span>Critical hazards have open corrective actions. Close them before closing the inspection.</span>
            </div>
          )}

          <Tabs defaultValue="overview">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="checklist">Checklist ({data.checklist.length})</TabsTrigger>
              <TabsTrigger value="hazards">Hazards ({data.hazards.length})</TabsTrigger>
              <TabsTrigger value="actions">Corrective Actions</TabsTrigger>
              <TabsTrigger value="attachments">Attachments ({data.attachments.length})</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <Info label="Type" value={data.inspection_type} />
                <Info label="Category" value={data.category} />
                <Info label="Location" value={data.location} />
                <Info label="Area" value={data.area} />
                <Info label="Floor / Level" value={data.floor_level} />
                <Info label="Work Activity" value={data.work_activity} />
                <Info label="Date" value={data.inspection_date} />
                <Info label="Time" value={data.inspection_time} />
                <Info label="Due" value={data.due_date} />
                <Info label="Client Visible" value={data.is_client_visible ? "Yes" : "No"} />
                <Info label="Open Actions" value={data.corrective_actions_open} />
                <Info label="Closed Actions" value={data.corrective_actions_closed} />
              </div>
              {data.findings && <Section title="Findings" body={data.findings} />}
              {data.corrective_action_summary && <Section title="Corrective Action Summary" body={data.corrective_action_summary} />}
              {data.rejection_reason && <Section title="Rejection Reason" body={data.rejection_reason} accent="rose" />}
              {data.revision_notes && <Section title="Revision Notes" body={data.revision_notes} accent="orange" />}
              {data.approval_comments && <Section title="Approval Comments" body={data.approval_comments} accent="emerald" />}
            </TabsContent>

            <TabsContent value="checklist" className="pt-3 space-y-2">
              {data.checklist.length === 0 ? (
                <p className="text-sm text-muted-foreground">No checklist items.</p>
              ) : (
                <>
                  <div className="border rounded-md overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs uppercase">
                        <tr>
                          <th className="text-left p-2">#</th>
                          <th className="text-left p-2">Item</th>
                          <th className="text-left p-2 w-28">Result</th>
                          <th className="text-left p-2 w-24">Risk</th>
                          <th className="text-left p-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.checklist.map((c: any) => {
                          const edit = checklistEdit[c.id];
                          const result = edit?.result ?? c.result;
                          const risk = edit?.risk_level ?? c.risk_level ?? "Medium";
                          const remarks = edit?.remarks ?? c.remarks ?? "";
                          return (
                            <tr key={c.id} className="border-t">
                              <td className="p-2 text-xs">{c.item_number ?? ""}</td>
                              <td className="p-2">
                                <div className="font-medium">{c.checklist_item}</div>
                                {c.requirement && <div className="text-xs text-muted-foreground">{c.requirement}</div>}
                              </td>
                              <td className="p-2">
                                <Select value={result} onValueChange={(v) =>
                                  setChecklistEdit({ ...checklistEdit, [c.id]: { result: v, risk_level: risk, remarks } })}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>{CHECK_RESULTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                <Select value={risk} onValueChange={(v) =>
                                  setChecklistEdit({ ...checklistEdit, [c.id]: { result, risk_level: v, remarks } })}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>{RISK_LEVELS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                <Input className="h-8" value={remarks}
                                  onChange={(e) => setChecklistEdit({ ...checklistEdit, [c.id]: { result, risk_level: risk, remarks: e.target.value } })} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {Object.keys(checklistEdit).length > 0 && (
                    <Button size="sm" onClick={() => updateChecklistM.mutate()} disabled={updateChecklistM.isPending}>
                      Save Checklist Changes
                    </Button>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Safe: <span className="text-emerald-600">{data.checklist_safe_count}</span> ·{" "}
                    Unsafe: <span className="text-rose-600">{data.checklist_unsafe_count}</span> ·{" "}
                    N/A: <span className="text-zinc-500">{data.checklist_na_count}</span> ·{" "}
                    Total: {data.total_checklist_items}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="hazards" className="pt-3 space-y-2">
              <Button size="sm" variant="outline" onClick={() => setHazardOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Hazard
              </Button>
              {data.hazards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hazards recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {data.hazards.map((h: any) => (
                    <li key={h.id} className="border rounded-md p-3 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{h.hazard_title}</span>
                        <Badge className={RISK_STYLE[h.risk_level] ?? ""}>{h.risk_level}</Badge>
                        <Badge variant="outline" className="text-[10px]">{h.hazard_category}</Badge>
                        <Badge variant="outline" className="text-[10px]">{h.closeout_status}</Badge>
                        <Button variant="ghost" size="icon" className="ml-auto" onClick={() => archHazardM.mutate(h.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {h.hazard_description && <p className="text-sm">{h.hazard_description}</p>}
                      <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                        {h.location && <span>Location: {h.location}</span>}
                        {h.likelihood && <span>Likelihood: {h.likelihood}</span>}
                        {h.severity && <span>Severity: {h.severity}</span>}
                        {h.target_closeout_date && <span>Target: {h.target_closeout_date}</span>}
                      </div>
                      {h.corrective_action && <p className="text-sm border-l-2 border-orange-300 pl-2 mt-1">{h.corrective_action}</p>}
                      <div className="flex gap-2 pt-1">
                        <Select value={h.closeout_status} onValueChange={(v) =>
                          closeCaM.mutate({ hazard_id: h.id, safety_inspection_id: id, closeout_status: v, closeout_notes: h.closeout_notes })}>
                          <SelectTrigger className="h-7 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>{CLOSEOUT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="actions" className="pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">All unsafe checklist items + hazards with corrective actions</p>
              {[
                ...data.checklist.filter((c: any) => c.result === "Unsafe").map((c: any) => ({ kind: "checklist", id: c.id, title: c.checklist_item, action: c.corrective_action || c.remarks, status: c.closeout_status, risk: c.risk_level, target: c.target_closeout_date })),
                ...data.hazards.map((h: any) => ({ kind: "hazard", id: h.id, title: h.hazard_title, action: h.corrective_action, status: h.closeout_status, risk: h.risk_level, target: h.target_closeout_date })),
              ].length === 0 ? (
                <p className="text-sm text-muted-foreground">No corrective actions.</p>
              ) : (
                <ul className="space-y-2">
                  {[
                    ...data.checklist.filter((c: any) => c.result === "Unsafe").map((c: any) => ({ kind: "checklist" as const, id: c.id, title: c.checklist_item, action: c.corrective_action || c.remarks, status: c.closeout_status ?? "Open", risk: c.risk_level, target: c.target_closeout_date, notes: c.closeout_notes })),
                    ...data.hazards.map((h: any) => ({ kind: "hazard" as const, id: h.id, title: h.hazard_title, action: h.corrective_action, status: h.closeout_status, risk: h.risk_level, target: h.target_closeout_date, notes: h.closeout_notes })),
                  ].map((it) => (
                    <li key={`${it.kind}-${it.id}`} className="border rounded-md p-3 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{it.kind}</Badge>
                        <span className="font-medium">{it.title}</span>
                        <Badge className={RISK_STYLE[it.risk] ?? ""}>{it.risk}</Badge>
                        <Badge variant="outline" className="text-[10px]">{it.status}</Badge>
                        {it.target && <span className="text-xs text-muted-foreground ml-auto">Target: {it.target}</span>}
                      </div>
                      {it.action && <p className="text-sm">{it.action}</p>}
                      <div className="flex gap-2 items-center pt-1">
                        <Select value={it.status} onValueChange={(v) =>
                          closeCaM.mutate({ [it.kind === "checklist" ? "checklist_item_id" : "hazard_id"]: it.id, safety_inspection_id: id, closeout_status: v, closeout_notes: it.notes })}>
                          <SelectTrigger className="h-7 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>{CLOSEOUT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input className="h-7" placeholder="Closeout notes" defaultValue={it.notes ?? ""}
                          onBlur={(e) => e.target.value !== (it.notes ?? "") && closeCaM.mutate({ [it.kind === "checklist" ? "checklist_item_id" : "hazard_id"]: it.id, safety_inspection_id: id, closeout_status: it.status, closeout_notes: e.target.value })} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="attachments" className="pt-3 space-y-2">
              <Button size="sm" variant="outline" onClick={() => setAttOpen(true)}>
                <Paperclip className="h-4 w-4 mr-1" /> Add Attachment (URL)
              </Button>
              {data.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.attachments.map((a: any) => (
                    <li key={a.id} className="flex items-center justify-between border rounded px-3 py-2">
                      <div>
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          <FileText className="inline h-4 w-4 mr-1" />{a.file_name}
                        </a>
                        <Badge variant="outline" className="ml-2 text-[10px]">{a.attachment_type}</Badge>
                        {a.description && <span className="ml-2 text-xs text-muted-foreground">{a.description}</span>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => delAttM.mutate(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="history" className="pt-3">
              {data.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No status changes yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.history.map((h: any) => (
                    <li key={h.id} className="border-l-2 pl-3 py-1">
                      <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                      <div>
                        {h.old_status ?? "—"} → <strong>{h.new_status}</strong>
                        {h.remarks && <span className="text-muted-foreground"> · {h.remarks}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Reject */}
        <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Reject inspection</AlertDialogTitle></AlertDialogHeader>
            <Textarea placeholder="Rejection reason *" value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => reasonText.trim() && setStatusM.mutate({ id, status: "Rejected", rejection_reason: reasonText })}>
                Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Revision */}
        <AlertDialog open={reviseOpen} onOpenChange={setReviseOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Request revision</AlertDialogTitle></AlertDialogHeader>
            <Textarea placeholder="Revision notes *" value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => reasonText.trim() && setStatusM.mutate({ id, status: "Revision Requested", revision_notes: reasonText })}>
                Request Revision
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Approve */}
        <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Approve inspection</AlertDialogTitle></AlertDialogHeader>
            <Textarea placeholder="Approval comments (optional)" value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => setStatusM.mutate({ id, status: "Approved", approval_comments: reasonText || undefined })}>
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Close */}
        <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Close inspection</AlertDialogTitle>
              <AlertDialogDescription>
                {hasOpenCriticalCa ? "Critical hazards still have open corrective actions. Are you sure?" : "Mark this inspection as closed."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => setStatusM.mutate({ id, status: "Closed" })}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Hazard */}
        <Dialog open={hazardOpen} onOpenChange={setHazardOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Add Hazard</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hazard Title *"><Input value={hazardForm.hazard_title} onChange={(e) => setHazardForm({ ...hazardForm, hazard_title: e.target.value })} /></Field>
              <Field label="Category">
                <Select value={hazardForm.hazard_category} onValueChange={(v) => setHazardForm({ ...hazardForm, hazard_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{HAZARD_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Risk Level">
                <Select value={hazardForm.risk_level} onValueChange={(v) => setHazardForm({ ...hazardForm, risk_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RISK_LEVELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Likelihood">
                <Select value={hazardForm.likelihood || "_none"} onValueChange={(v) => setHazardForm({ ...hazardForm, likelihood: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent><SelectItem value="_none">—</SelectItem>{LIKELIHOODS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Severity">
                <Select value={hazardForm.severity || "_none"} onValueChange={(v) => setHazardForm({ ...hazardForm, severity: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent><SelectItem value="_none">—</SelectItem>{SEVERITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Location"><Input value={hazardForm.location} onChange={(e) => setHazardForm({ ...hazardForm, location: e.target.value })} /></Field>
              <Field label="Target Closeout"><Input type="date" value={hazardForm.target_closeout_date} onChange={(e) => setHazardForm({ ...hazardForm, target_closeout_date: e.target.value })} /></Field>
            </div>
            <Field label="Description"><Textarea rows={2} value={hazardForm.hazard_description} onChange={(e) => setHazardForm({ ...hazardForm, hazard_description: e.target.value })} /></Field>
            <Field label="Corrective Action"><Textarea rows={2} value={hazardForm.corrective_action} onChange={(e) => setHazardForm({ ...hazardForm, corrective_action: e.target.value })} /></Field>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHazardOpen(false)}>Cancel</Button>
              <Button disabled={!hazardForm.hazard_title || addHazardM.isPending}
                onClick={() => addHazardM.mutate({
                  safety_inspection_id: id, ...hazardForm,
                  location: hazardForm.location || null,
                  likelihood: hazardForm.likelihood || null,
                  severity: hazardForm.severity || null,
                  hazard_description: hazardForm.hazard_description || null,
                  corrective_action: hazardForm.corrective_action || null,
                  target_closeout_date: hazardForm.target_closeout_date || null,
                })}>Add Hazard</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Attachment */}
        <Dialog open={attOpen} onOpenChange={setAttOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Attachment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label="File name *"><Input value={attForm.file_name} onChange={(e) => setAttForm({ ...attForm, file_name: e.target.value })} /></Field>
              <Field label="File URL *"><Input placeholder="https://..." value={attForm.file_url} onChange={(e) => setAttForm({ ...attForm, file_url: e.target.value })} /></Field>
              <Field label="Type">
                <Select value={attForm.attachment_type} onValueChange={(v) => setAttForm({ ...attForm, attachment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ATTACHMENT_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Description"><Input value={attForm.description} onChange={(e) => setAttForm({ ...attForm, description: e.target.value })} /></Field>
              <div className="flex items-center gap-2">
                <Switch checked={attForm.is_client_visible} onCheckedChange={(b) => setAttForm({ ...attForm, is_client_visible: b })} />
                <span className="text-xs">Client visible</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAttOpen(false)}>Cancel</Button>
              <Button disabled={!attForm.file_name || !attForm.file_url || addAttM.isPending}
                onClick={() => addAttM.mutate({ safety_inspection_id: id, ...attForm })}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div>{value ?? "—"}</div>
    </div>
  );
}

function Section({ title, body, accent }: { title: string; body: string; accent?: string }) {
  const cls: Record<string, string> = {
    rose: "border-rose-200 bg-rose-50", orange: "border-orange-200 bg-orange-50", emerald: "border-emerald-200 bg-emerald-50",
  };
  return (
    <div className={`border rounded-md p-3 ${accent ? cls[accent] : ""}`}>
      <div className="text-xs font-bold uppercase tracking-wider mb-1">{title}</div>
      <p className="text-sm whitespace-pre-wrap">{body}</p>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Search, Archive, Pencil, CheckCircle2, X as XIcon, FileText, Download,
  ClipboardCheck, AlertTriangle, Printer, Paperclip, Trash2, RotateCcw, Send,
} from "lucide-react";

import {
  listInspections, getInspection, saveInspection, setInspectionStatus,
  archiveInspection, updateChecklistResult, createReinspection,
  addInspectionAttachment, deleteInspectionAttachment, inspectionStats, listInspectors,
} from "@/lib/quality-inspections.functions";
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
  Failed: "bg-rose-100 text-rose-700",
  Rejected: "bg-rose-100 text-rose-700",
  "Revision Requested": "bg-orange-100 text-orange-700",
  "Reinspection Required": "bg-orange-100 text-orange-700",
  Closed: "bg-zinc-200 text-zinc-600",
  Cancelled: "bg-rose-50 text-rose-500",
  Archived: "bg-zinc-100 text-zinc-400",
};
const RESULT_STYLE: Record<string, string> = {
  Pending: "bg-zinc-100 text-zinc-600",
  Pass: "bg-emerald-100 text-emerald-700",
  "Pass with Comments": "bg-emerald-50 text-emerald-600",
  Fail: "bg-rose-100 text-rose-700",
  "Partially Passed": "bg-orange-100 text-orange-700",
  "Not Applicable": "bg-zinc-100 text-zinc-500",
};
const PRIORITY_STYLE: Record<string, string> = {
  Low: "bg-zinc-100 text-zinc-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-rose-100 text-rose-700",
};

const TYPES = [
  "General","Material Inspection","Work Inspection","Concrete Inspection","Rebar Inspection",
  "Formwork Inspection","Steel Structure Inspection","Welding Inspection","Waterproofing Inspection",
  "Painting Inspection","MEP Inspection","Electrical Inspection","Plumbing Inspection","HVAC Inspection",
  "Fire System Inspection","Elevator Inspection","Finishing Inspection","Testing and Commissioning",
  "Final Handover Inspection",
];
const DISCIPLINES = ["Civil","Structural","Architectural","MEP","Electrical","Plumbing","HVAC","Fire","Elevator","Finishing","External Works","General"];
const CATEGORIES = ["Workmanship","Material Quality","Dimensional Check","Installation Check","Testing","Commissioning","Compliance","Handover","Client Inspection","Consultant Inspection"];
const PRIORITIES = ["Low","Medium","High","Critical"];
const CHECK_RESULTS = ["Pending","Pass","Fail","N/A"] as const;
const ATTACHMENT_TYPES = ["Inspection Photo","Test Report","Checklist Evidence","Drawing Reference","Material Certificate","Delivery Note","NCR Evidence","Corrective Action Evidence","Supporting Document"];

type Checklist = {
  id?: string;
  item_number?: string | null;
  checklist_item: string;
  specification_reference?: string | null;
  acceptance_criteria?: string | null;
  result: "Pending" | "Pass" | "Fail" | "N/A";
  remarks?: string | null;
  corrective_action?: string | null;
  photo_required?: boolean;
  sort_order?: number;
};
function emptyChecklist(): Checklist {
  return { checklist_item: "", result: "Pending", photo_required: false };
}

function csvDownload(rows: any[]) {
  const headers = ["No.","Title","Project","Type","Discipline","Location","Date","Inspector","Result","Status","Pass","Fail","N/A","Reinspect"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.inspection_number, r.inspection_title, r.project_id, r.inspection_type, r.discipline ?? "",
      r.location ?? "", r.inspection_date ?? "", r.assigned_inspector_id ?? "",
      r.inspection_result, r.status, r.checklist_pass_count, r.checklist_fail_count,
      r.checklist_na_count, r.reinspection_required ? "Yes" : "No",
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `inspections-${Date.now()}.csv`;
  a.click();
}

export function QualityInspectionRegister({ projectId }: { projectId?: string }) {
  const [filterProject, setFilterProject] = useState<string>(projectId ?? "");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const effectiveProject = projectId ?? filterProject;
  const qc = useQueryClient();
  const fetchList = useServerFn(listInspections);
  const fetchStats = useServerFn(inspectionStats);
  const archiveFn = useServerFn(archiveInspection);

  const listQ = useQuery({
    queryKey: ["quality-inspections", effectiveProject || "all", statusFilter],
    queryFn: () => fetchList({ data: { projectId: effectiveProject || undefined, status: statusFilter } }),
  });
  const statsQ = useQuery({
    queryKey: ["quality-inspections-stats", effectiveProject || "all"],
    queryFn: () => fetchStats({ data: { projectId: effectiveProject || undefined } }),
  });

  const archiveM = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Inspection archived");
      setConfirmArchive(null);
      qc.invalidateQueries({ queryKey: ["quality-inspections"] });
      qc.invalidateQueries({ queryKey: ["quality-inspections-stats"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Archive failed"),
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listQ.data ?? [];
    return (listQ.data ?? []).filter((r: any) =>
      [r.inspection_number, r.inspection_title, r.inspection_type, r.discipline, r.location, r.findings]
        .some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [listQ.data, search]);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Stat label="Total" value={statsQ.data?.total ?? 0} />
        <Stat label="Pending Approval" value={statsQ.data?.inspected ?? 0} />
        <Stat label="Approved" value={statsQ.data?.approved ?? 0} accent="emerald" />
        <Stat label="Passed" value={statsQ.data?.passed ?? 0} accent="emerald" />
        <Stat label="Failed" value={statsQ.data?.failed ?? 0} accent="rose" />
        <Stat label="Reinspection" value={statsQ.data?.reinspection ?? 0} accent="orange" />
      </div>

      {/* Toolbar */}
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
          <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }}
            disabled={!effectiveProject}>
            <Plus className="h-4 w-4 mr-1" /> New Inspection
          </Button>
        </div>
      </div>

      {/* List */}
      {listQ.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <ClipboardCheck className="mx-auto h-10 w-10 mb-2 opacity-50" />
          <p>No quality inspections yet.</p>
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
                <th className="text-left p-3">Discipline</th>
                <th className="text-left p-3">Location</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Result</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">P/F/NA</th>
                <th className="text-right p-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDetailId(r.id)}>
                  <td className="p-3 font-mono text-xs">{r.inspection_number}</td>
                  <td className="p-3 font-medium">{r.inspection_title}</td>
                  <td className="p-3">{r.inspection_type}</td>
                  <td className="p-3">{r.discipline ?? "—"}</td>
                  <td className="p-3">{r.location ?? "—"}</td>
                  <td className="p-3">{r.inspection_date}</td>
                  <td className="p-3"><Badge className={RESULT_STYLE[r.inspection_result] ?? ""}>{r.inspection_result}</Badge></td>
                  <td className="p-3"><Badge className={STATUS_STYLE[r.status] ?? ""}>{r.status}</Badge></td>
                  <td className="p-3 text-right text-xs">
                    <span className="text-emerald-600">{r.checklist_pass_count}</span> /{" "}
                    <span className="text-rose-600">{r.checklist_fail_count}</span> /{" "}
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
          open={openForm}
          onOpenChange={setOpenForm}
          projectId={effectiveProject}
          editing={editing}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["quality-inspections"] });
            qc.invalidateQueries({ queryKey: ["quality-inspections-stats"] });
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
            <AlertDialogDescription>This will hide the inspection from the register. It can still be viewed in archive.</AlertDialogDescription>
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
  const cls: Record<string, string> = {
    emerald: "text-emerald-600", rose: "text-rose-600", orange: "text-orange-600", blue: "text-blue-600",
  };
  return (
    <Card><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${accent ? cls[accent] : ""}`}>{value}</div>
    </CardContent></Card>
  );
}

/* ------------- Form Dialog ------------- */
function InspectionFormDialog({
  open, onOpenChange, projectId, editing, onSaved,
}: {
  open: boolean; onOpenChange: (b: boolean) => void;
  projectId: string; editing: any | null; onSaved: () => void;
}) {
  const saveFn = useServerFn(saveInspection);
  const inspectorsFn = useServerFn(listInspectors);
  const inspectorsQ = useQuery({ queryKey: ["inspectors-lite"], queryFn: () => inspectorsFn() });

  const [form, setForm] = useState<any>({
    project_id: projectId,
    inspection_title: editing?.inspection_title ?? "",
    inspection_type: editing?.inspection_type ?? "General",
    discipline: editing?.discipline ?? "",
    category: editing?.category ?? "",
    location: editing?.location ?? "",
    area: editing?.area ?? "",
    floor_level: editing?.floor_level ?? "",
    room_zone: editing?.room_zone ?? "",
    assigned_inspector_id: editing?.assigned_inspector_id ?? "",
    inspection_date: editing?.inspection_date ?? new Date().toISOString().slice(0, 10),
    inspection_time: editing?.inspection_time ?? "",
    due_date: editing?.due_date ?? "",
    priority: editing?.priority ?? "Medium",
    is_client_visible: editing?.is_client_visible ?? false,
    findings: editing?.findings ?? "",
    corrective_action: editing?.corrective_action ?? "",
  });
  const [checklist, setChecklist] = useState<Checklist[]>([]);
  const [loadedExisting, setLoadedExisting] = useState(false);

  // Load existing checklist
  const getFn = useServerFn(getInspection);
  const detailQ = useQuery({
    queryKey: ["qi-detail-edit", editing?.id],
    queryFn: () => getFn({ data: { id: editing.id } }),
    enabled: !!editing?.id && !loadedExisting,
  });
  if (detailQ.data && !loadedExisting) {
    setChecklist((detailQ.data as any).checklist ?? []);
    setLoadedExisting(true);
  }

  const saveM = useMutation({
    mutationFn: (payload: any) => saveFn({ data: payload }),
    onSuccess: () => {
      toast.success(editing ? "Inspection updated" : "Inspection created");
      onSaved(); onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  function submit(status?: string) {
    if (!form.inspection_title.trim()) { toast.error("Title is required"); return; }
    if (!form.inspection_date) { toast.error("Date is required"); return; }
    const payload = {
      ...form,
      ...(editing?.id ? { id: editing.id } : {}),
      ...(status ? { status } : {}),
      assigned_inspector_id: form.assigned_inspector_id || null,
      discipline: form.discipline || null,
      category: form.category || null,
      location: form.location || null,
      area: form.area || null,
      floor_level: form.floor_level || null,
      room_zone: form.room_zone || null,
      inspection_time: form.inspection_time || null,
      due_date: form.due_date || null,
      findings: form.findings || null,
      corrective_action: form.corrective_action || null,
      checklist: checklist.filter((c) => c.checklist_item.trim()),
    };
    saveM.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Inspection" : "New Quality Inspection"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title *"><Input value={form.inspection_title} onChange={(e) => setForm({ ...form, inspection_title: e.target.value })} /></Field>
            <Field label="Type">
              <Select value={form.inspection_type} onValueChange={(v) => setForm({ ...form, inspection_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Discipline">
              <Select value={form.discipline || "_none"} onValueChange={(v) => setForm({ ...form, discipline: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="_none">—</SelectItem>{DISCIPLINES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.category || "_none"} onValueChange={(v) => setForm({ ...form, category: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="_none">—</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Area"><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></Field>
            <Field label="Floor / Level"><Input value={form.floor_level} onChange={(e) => setForm({ ...form, floor_level: e.target.value })} /></Field>
            <Field label="Room / Zone"><Input value={form.room_zone} onChange={(e) => setForm({ ...form, room_zone: e.target.value })} /></Field>
            <Field label="Inspection Date *"><Input type="date" value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} /></Field>
            <Field label="Inspection Time"><Input type="time" value={form.inspection_time} onChange={(e) => setForm({ ...form, inspection_time: e.target.value })} /></Field>
            <Field label="Due Date"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <Field label="Priority">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
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
          <Field label="Corrective Action"><Textarea rows={2} value={form.corrective_action} onChange={(e) => setForm({ ...form, corrective_action: e.target.value })} /></Field>

          {/* Checklist editor */}
          <div className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">Checklist Items</Label>
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
                    <Input className="col-span-3" placeholder="Acceptance criteria" value={c.acceptance_criteria ?? ""}
                      onChange={(e) => { const n = [...checklist]; n[i].acceptance_criteria = e.target.value; setChecklist(n); }} />
                    <Select value={c.result} onValueChange={(v) => { const n = [...checklist]; n[i].result = v as any; setChecklist(n); }}>
                      <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                      <SelectContent>{CHECK_RESULTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Input className="col-span-12" placeholder="Remarks / corrective action (required for Fail)"
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
          <Button disabled={saveM.isPending} onClick={() => submit("Submitted")}>
            <Send className="h-4 w-4 mr-1" /> Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

/* ------------- Detail Sheet ------------- */
function InspectionDetailSheet({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: (r: any) => void }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getInspection);
  const setStatusFn = useServerFn(setInspectionStatus);
  const updateChecklistFn = useServerFn(updateChecklistResult);
  const reinspectFn = useServerFn(createReinspection);
  const addAttFn = useServerFn(addInspectionAttachment);
  const delAttFn = useServerFn(deleteInspectionAttachment);

  const detailQ = useQuery({ queryKey: ["qi-detail", id], queryFn: () => getFn({ data: { id } }) });
  const data = detailQ.data as any;

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [attOpen, setAttOpen] = useState(false);
  const [attForm, setAttForm] = useState({ file_name: "", file_url: "", attachment_type: "Inspection Photo", description: "", is_client_visible: false });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["qi-detail", id] });
    qc.invalidateQueries({ queryKey: ["quality-inspections"] });
    qc.invalidateQueries({ queryKey: ["quality-inspections-stats"] });
  };

  const setStatusM = useMutation({
    mutationFn: (payload: any) => setStatusFn({ data: payload }),
    onSuccess: () => { toast.success("Status updated"); setRejectOpen(false); setReviseOpen(false); setApproveOpen(false); setReasonText(""); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const reinspectM = useMutation({
    mutationFn: () => reinspectFn({ data: { id } }),
    onSuccess: () => { toast.success("Re-inspection created"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const addAttM = useMutation({
    mutationFn: (payload: any) => addAttFn({ data: payload }),
    onSuccess: () => { toast.success("Attachment added"); setAttOpen(false); setAttForm({ file_name: "", file_url: "", attachment_type: "Inspection Photo", description: "", is_client_visible: false }); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const delAttM = useMutation({
    mutationFn: (aid: string) => delAttFn({ data: { id: aid } }),
    onSuccess: () => { toast.success("Removed"); refresh(); },
  });

  const [checklistEdit, setChecklistEdit] = useState<Record<string, { result: string; remarks: string }>>({});
  const updateChecklistM = useMutation({
    mutationFn: () => {
      const items = Object.entries(checklistEdit).map(([cid, v]) => ({
        id: cid, result: v.result as any, remarks: v.remarks || null,
      }));
      return updateChecklistFn({ data: { quality_inspection_id: id, items } });
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

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <span className="font-mono text-sm">{data.inspection_number}</span>
            <Badge className={STATUS_STYLE[data.status] ?? ""}>{data.status}</Badge>
            <Badge className={RESULT_STYLE[data.inspection_result] ?? ""}>{data.inspection_result}</Badge>
            <Badge className={PRIORITY_STYLE[data.priority] ?? ""}>{data.priority}</Badge>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="text-lg font-bold">{data.inspection_title}</div>

          {/* Actions */}
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
                <Button size="sm" variant="default" onClick={() => setApproveOpen(true)}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}><XIcon className="h-4 w-4 mr-1" /> Reject</Button>
                <Button size="sm" variant="outline" onClick={() => setReviseOpen(true)}>Request Revision</Button>
              </>
            )}
            {data.inspection_result === "Fail" && (
              <Button size="sm" variant="outline" onClick={() => reinspectM.mutate()}>
                <RotateCcw className="h-4 w-4 mr-1" /> Create Re-Inspection
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={printReport}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="checklist">Checklist ({data.checklist.length})</TabsTrigger>
              <TabsTrigger value="attachments">Attachments ({data.attachments.length})</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <Info label="Type" value={data.inspection_type} />
                <Info label="Discipline" value={data.discipline} />
                <Info label="Category" value={data.category} />
                <Info label="Location" value={data.location} />
                <Info label="Area" value={data.area} />
                <Info label="Floor / Level" value={data.floor_level} />
                <Info label="Room / Zone" value={data.room_zone} />
                <Info label="Date" value={data.inspection_date} />
                <Info label="Time" value={data.inspection_time} />
                <Info label="Due" value={data.due_date} />
                <Info label="Client Visible" value={data.is_client_visible ? "Yes" : "No"} />
                <Info label="Reinspection Required" value={data.reinspection_required ? "Yes" : "No"} />
              </div>
              {data.findings && <Section title="Findings" body={data.findings} />}
              {data.corrective_action && <Section title="Corrective Action" body={data.corrective_action} />}
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
                          <th className="text-left p-2">Criteria</th>
                          <th className="text-left p-2 w-28">Result</th>
                          <th className="text-left p-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.checklist.map((c: any) => {
                          const edit = checklistEdit[c.id];
                          const result = edit?.result ?? c.result;
                          const remarks = edit?.remarks ?? c.remarks ?? "";
                          return (
                            <tr key={c.id} className="border-t">
                              <td className="p-2 text-xs">{c.item_number ?? ""}</td>
                              <td className="p-2">{c.checklist_item}</td>
                              <td className="p-2 text-xs">{c.acceptance_criteria ?? "—"}</td>
                              <td className="p-2">
                                <Select value={result} onValueChange={(v) =>
                                  setChecklistEdit({ ...checklistEdit, [c.id]: { result: v, remarks } })}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>{CHECK_RESULTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                <Input className="h-8" value={remarks}
                                  onChange={(e) => setChecklistEdit({ ...checklistEdit, [c.id]: { result, remarks: e.target.value } })} />
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
                    Pass: <span className="text-emerald-600">{data.checklist_pass_count}</span> ·{" "}
                    Fail: <span className="text-rose-600">{data.checklist_fail_count}</span> ·{" "}
                    N/A: <span className="text-zinc-500">{data.checklist_na_count}</span> ·{" "}
                    Total: {data.total_checklist_items}
                  </div>
                </>
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

        {/* Reject dialog */}
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

        {/* Revision dialog */}
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

        {/* Approve dialog */}
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

        {/* Add attachment */}
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
                onClick={() => addAttM.mutate({ quality_inspection_id: id, ...attForm })}>Add</Button>
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

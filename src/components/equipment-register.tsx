import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search, Archive, Pencil, Download, Wrench, AlertTriangle, ShieldCheck, FileText, Truck, CheckCircle2 } from "lucide-react";

import {
  listEquipment, getEquipment, saveEquipment, archiveEquipment,
  listAssignments, saveAssignment, releaseAssignment,
  listUsageLogs, saveUsageLog, setUsageStatus, archiveUsageLog,
  saveMaintenance, archiveMaintenance,
  saveBreakdown, archiveBreakdown,
  saveInspection, archiveInspection,
  saveDocument, archiveDocument,
  addAttachment, deleteAttachment, addComment,
  equipmentStats,
  EQ_STATUSES, AVAILABILITY, CONDITIONS, OWNERSHIP, EQ_TYPES, EQ_CATEGORIES,
  SHIFTS, MAINT_TYPES, MAINT_STATUSES, BREAKDOWN_SEVERITY, BREAKDOWN_STATUSES,
  INSPECTION_TYPES, INSPECTION_RESULTS, DOC_TYPES, USAGE_STATUSES,
} from "@/lib/equipment.functions";
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

const STATUS_STYLE: Record<string, string> = {
  Available: "bg-emerald-100 text-emerald-700",
  Assigned: "bg-blue-100 text-blue-700",
  "In Use": "bg-indigo-100 text-indigo-700",
  Idle: "bg-zinc-100 text-zinc-600",
  "Under Maintenance": "bg-amber-100 text-amber-700",
  Breakdown: "bg-rose-100 text-rose-700",
  "Out of Service": "bg-rose-50 text-rose-500",
  Retired: "bg-zinc-200 text-zinc-500",
  Sold: "bg-zinc-100 text-zinc-500",
  Archived: "bg-zinc-100 text-zinc-400",
};
const COND_STYLE: Record<string, string> = {
  Excellent: "bg-emerald-100 text-emerald-700",
  Good: "bg-emerald-50 text-emerald-700",
  Fair: "bg-amber-50 text-amber-700",
  Poor: "bg-amber-100 text-amber-700",
  Damaged: "bg-rose-100 text-rose-700",
  Unsafe: "bg-rose-200 text-rose-800",
  "Needs Repair": "bg-orange-100 text-orange-700",
};

function fmt(n: any) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function exportCsv(filename: string, rows: any[], headers: { key: string; label: string }[]) {
  const head = headers.map((h) => h.label).join(",");
  const body = rows.map((r) => headers.map((h) => {
    const v = r[h.key] ?? "";
    const s = String(v).replace(/"/g, '""');
    return /[,"\n]/.test(s) ? `"${s}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([head + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function EquipmentRegister({ projectId: fixedProjectId }: { projectId?: string }) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string | null>(fixedProjectId || null);
  const [tab, setTab] = useState("register");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [availFilter, setAvailFilter] = useState("all");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [openUsage, setOpenUsage] = useState(false);
  const [editUsage, setEditUsage] = useState<any>(null);
  const [openAssign, setOpenAssign] = useState(false);

  const listFn = useServerFn(listEquipment);
  const statsFn = useServerFn(equipmentStats);
  const usageFn = useServerFn(listUsageLogs);
  const assignFn = useServerFn(listAssignments);
  const saveFn = useServerFn(saveEquipment);
  const archFn = useServerFn(archiveEquipment);
  const saveUsageFn = useServerFn(saveUsageLog);
  const setUsageStatusFn = useServerFn(setUsageStatus);
  const archUsageFn = useServerFn(archiveUsageLog);
  const saveAssignFn = useServerFn(saveAssignment);
  const releaseFn = useServerFn(releaseAssignment);

  const list = useQuery({ queryKey: ["equipment", projectId], queryFn: () => listFn({ data: { projectId } }) });
  const stats = useQuery({ queryKey: ["equipment-stats", projectId], queryFn: () => statsFn({ data: { projectId } }) });
  const usage = useQuery({ queryKey: ["equipment-usage", projectId], queryFn: () => usageFn({ data: { projectId } }) });
  const assignments = useQuery({ queryKey: ["equipment-assignments", projectId], queryFn: () => assignFn({ data: { projectId } }) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["equipment"] });
    qc.invalidateQueries({ queryKey: ["equipment-stats"] });
    qc.invalidateQueries({ queryKey: ["equipment-usage"] });
    qc.invalidateQueries({ queryKey: ["equipment-assignments"] });
    qc.invalidateQueries({ queryKey: ["equipment-detail"] });
  };

  const filtered = useMemo(() => {
    let rows = list.data || [];
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((r: any) =>
        (r.equipment_code || "").toLowerCase().includes(s) ||
        (r.equipment_name || "").toLowerCase().includes(s) ||
        (r.equipment_type || "").toLowerCase().includes(s) ||
        (r.make_brand || "").toLowerCase().includes(s) ||
        (r.model || "").toLowerCase().includes(s) ||
        (r.serial_number || "").toLowerCase().includes(s) ||
        (r.registration_number || "").toLowerCase().includes(s) ||
        (r.operator_name || "").toLowerCase().includes(s));
    }
    if (statusFilter !== "all") rows = rows.filter((r: any) => r.current_status === statusFilter);
    if (typeFilter !== "all") rows = rows.filter((r: any) => r.equipment_type === typeFilter);
    if (ownershipFilter !== "all") rows = rows.filter((r: any) => r.ownership_type === ownershipFilter);
    if (availFilter !== "all") rows = rows.filter((r: any) => r.availability_status === availFilter);
    return rows;
  }, [list.data, search, statusFilter, typeFilter, ownershipFilter, availFilter]);

  const saveMut = useMutation({
    mutationFn: (input: any) => saveFn({ data: input }),
    onSuccess: () => { toast.success("Equipment saved"); setOpenForm(false); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });
  const archMut = useMutation({
    mutationFn: (id: string) => archFn({ data: { id } }),
    onSuccess: () => { toast.success("Archived"); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const saveUsageMut = useMutation({
    mutationFn: (input: any) => saveUsageFn({ data: input }),
    onSuccess: () => { toast.success("Usage log saved"); setOpenUsage(false); setEditUsage(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const usageStatusMut = useMutation({
    mutationFn: (input: { id: string; status: string }) => setUsageStatusFn({ data: input }),
    onSuccess: () => { toast.success("Updated"); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const archUsageMut = useMutation({
    mutationFn: (id: string) => archUsageFn({ data: { id } }),
    onSuccess: () => { toast.success("Archived"); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const saveAssignMut = useMutation({
    mutationFn: (input: any) => saveAssignFn({ data: input }),
    onSuccess: () => { toast.success("Equipment assigned"); setOpenAssign(false); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const releaseMut = useMutation({
    mutationFn: (id: string) => releaseFn({ data: { id } }),
    onSuccess: () => { toast.success("Released"); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const cards = [
    { label: "Total", value: stats.data?.total, icon: Truck },
    { label: "Available", value: stats.data?.available, icon: CheckCircle2 },
    { label: "Assigned", value: stats.data?.assigned, icon: ShieldCheck },
    { label: "In Use", value: stats.data?.inUse, icon: Truck },
    { label: "Maintenance", value: stats.data?.maintenance, icon: Wrench },
    { label: "Breakdown", value: stats.data?.breakdown, icon: AlertTriangle },
    { label: "Maint Due", value: stats.data?.maintenanceDue, icon: Wrench },
    { label: "Expired Docs", value: stats.data?.expiredDocs, icon: FileText },
  ];

  return (
    <div className="space-y-4">
      {!fixedProjectId && (
        <div className="flex items-center gap-2 flex-wrap">
          <ProjectPicker value={projectId || ""} onChange={(v) => setProjectId(v || null)} />
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditUsage({ project_id: projectId || "" }); setOpenUsage(true); }} disabled={!projectId}><Plus className="h-4 w-4 mr-1" />Usage Log</Button>
            <Button size="sm" variant="outline" onClick={() => setOpenAssign(true)} disabled={!projectId}><Plus className="h-4 w-4 mr-1" />Assign</Button>
            <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }}><Plus className="h-4 w-4 mr-1" />Equipment</Button>
          </div>
        </div>
      )}
      {fixedProjectId && (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button size="sm" variant="outline" onClick={() => { setEditUsage({ project_id: projectId || fixedProjectId }); setOpenUsage(true); }}><Plus className="h-4 w-4 mr-1" />Usage Log</Button>
          <Button size="sm" variant="outline" onClick={() => setOpenAssign(true)}><Plus className="h-4 w-4 mr-1" />Assign</Button>
          <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }}><Plus className="h-4 w-4 mr-1" />Equipment</Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {cards.map((c) => (
          <Card key={c.label}><CardContent className="p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{c.label}</span><c.icon className="h-3 w-3" /></div>
            <div className="text-xl font-semibold mt-1">{stats.isLoading ? <Skeleton className="h-6 w-12" /> : fmt(c.value)}</div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="usage">Usage Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-3 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" /><Input className="pl-7 w-64" placeholder="Search code, name, serial..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem>{EQ_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Select value={availFilter} onValueChange={setAvailFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Availability" /></SelectTrigger><SelectContent><SelectItem value="all">All availability</SelectItem>{AVAILABILITY.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{EQ_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Select value={ownershipFilter} onValueChange={setOwnershipFilter}><SelectTrigger className="w-44"><SelectValue placeholder="Ownership" /></SelectTrigger><SelectContent><SelectItem value="all">All ownership</SelectItem>{OWNERSHIP.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => exportCsv("equipment.csv", filtered, [
              { key: "equipment_code", label: "Code" }, { key: "equipment_name", label: "Name" }, { key: "equipment_type", label: "Type" }, { key: "category", label: "Category" },
              { key: "ownership_type", label: "Ownership" }, { key: "current_location", label: "Location" }, { key: "operator_name", label: "Operator" },
              { key: "current_status", label: "Status" }, { key: "availability_status", label: "Availability" }, { key: "condition_status", label: "Condition" },
              { key: "next_maintenance_date", label: "Next Maintenance" }, { key: "insurance_expiry_date", label: "Insurance Expiry" },
            ])}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left"><tr>
                <th className="p-2">Code</th><th className="p-2">Name</th><th className="p-2">Type</th>
                <th className="p-2">Ownership</th><th className="p-2">Operator</th>
                <th className="p-2">Status</th><th className="p-2">Availability</th><th className="p-2">Condition</th>
                <th className="p-2">Next Maint.</th><th className="p-2 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {list.isLoading && <tr><td colSpan={10} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>}
                {!list.isLoading && filtered.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">No equipment found. Click "Equipment" to add one.</td></tr>}
                {filtered.map((r: any) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setOpenDetail(r.id)}>
                    <td className="p-2 font-mono text-xs">{r.equipment_code}</td>
                    <td className="p-2 font-medium">{r.equipment_name}</td>
                    <td className="p-2">{r.equipment_type}</td>
                    <td className="p-2"><Badge variant="outline">{r.ownership_type}</Badge></td>
                    <td className="p-2">{r.operator_name || "—"}</td>
                    <td className="p-2"><Badge className={STATUS_STYLE[r.current_status] || ""}>{r.current_status}</Badge></td>
                    <td className="p-2"><Badge variant="outline">{r.availability_status}</Badge></td>
                    <td className="p-2"><Badge className={COND_STYLE[r.condition_status] || ""}>{r.condition_status}</Badge></td>
                    <td className="p-2 text-xs">{r.next_maintenance_date || "—"}</td>
                    <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpenForm(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Archive this equipment?")) archMut.mutate(r.id); }}><Archive className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-3 pt-3">
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left"><tr>
                <th className="p-2">Equipment</th><th className="p-2">Start</th><th className="p-2">End</th>
                <th className="p-2">Operator</th><th className="p-2">Work Area</th><th className="p-2">Status</th><th className="p-2 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {(assignments.data || []).length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No assignments.</td></tr>}
                {(assignments.data || []).map((a: any) => {
                  const eq = (list.data || []).find((e: any) => e.id === a.equipment_id);
                  return (
                    <tr key={a.id} className="border-t">
                      <td className="p-2">{eq?.equipment_name || a.equipment_id.slice(0, 8)}</td>
                      <td className="p-2">{a.assignment_start_date}</td>
                      <td className="p-2">{a.assignment_end_date || "—"}</td>
                      <td className="p-2">{a.operator_name || "—"}</td>
                      <td className="p-2">{a.work_area || "—"}</td>
                      <td className="p-2"><Badge variant="outline">{a.status}</Badge></td>
                      <td className="p-2 text-right">
                        {a.status === "Active" && <Button size="sm" variant="outline" onClick={() => releaseMut.mutate(a.id)}>Release</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-3 pt-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => exportCsv("equipment-usage.csv", usage.data || [], [
              { key: "usage_date", label: "Date" }, { key: "shift", label: "Shift" }, { key: "operator_name", label: "Operator" },
              { key: "working_hours", label: "Working" }, { key: "idle_hours", label: "Idle" }, { key: "breakdown_hours", label: "Breakdown" },
              { key: "total_hours", label: "Total" }, { key: "fuel_consumed", label: "Fuel" },
              { key: "productivity_quantity", label: "Output Qty" }, { key: "productivity_unit", label: "Unit" }, { key: "productivity_rate", label: "Rate" },
              { key: "rental_cost", label: "Rental Cost" }, { key: "fuel_cost", label: "Fuel Cost" }, { key: "total_cost", label: "Total Cost" }, { key: "status", label: "Status" },
            ])}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left"><tr>
                <th className="p-2">Date</th><th className="p-2">Equipment</th><th className="p-2">Shift</th>
                <th className="p-2 text-right">Work</th><th className="p-2 text-right">Idle</th><th className="p-2 text-right">Brk</th>
                <th className="p-2 text-right">Fuel</th><th className="p-2 text-right">Output</th><th className="p-2 text-right">Cost</th>
                <th className="p-2">Status</th><th className="p-2 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {(usage.data || []).length === 0 && <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">No usage logs.</td></tr>}
                {(usage.data || []).map((u: any) => {
                  const eq = (list.data || []).find((e: any) => e.id === u.equipment_id);
                  return (
                    <tr key={u.id} className="border-t">
                      <td className="p-2">{u.usage_date}</td>
                      <td className="p-2">{eq?.equipment_name || u.equipment_id.slice(0, 8)}</td>
                      <td className="p-2">{u.shift}</td>
                      <td className="p-2 text-right">{fmt(u.working_hours)}</td>
                      <td className="p-2 text-right">{fmt(u.idle_hours)}</td>
                      <td className="p-2 text-right">{fmt(u.breakdown_hours)}</td>
                      <td className="p-2 text-right">{fmt(u.fuel_consumed)}</td>
                      <td className="p-2 text-right">{fmt(u.productivity_quantity)} {u.productivity_unit || ""}</td>
                      <td className="p-2 text-right">{fmt(u.total_cost)}</td>
                      <td className="p-2"><Badge variant="outline">{u.status}</Badge></td>
                      <td className="p-2 text-right">
                        <Button size="icon" variant="ghost" onClick={() => { setEditUsage(u); setOpenUsage(true); }}><Pencil className="h-4 w-4" /></Button>
                        {u.status !== "Approved" && <Button size="icon" variant="ghost" onClick={() => usageStatusMut.mutate({ id: u.id, status: "Approved" })}><CheckCircle2 className="h-4 w-4" /></Button>}
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Archive?")) archUsageMut.mutate(u.id); }}><Archive className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <EquipmentForm open={openForm} onClose={() => { setOpenForm(false); setEditing(null); }} initial={editing} projectId={projectId || fixedProjectId} onSave={(input: any) => saveMut.mutate(input)} saving={saveMut.isPending} />
      <UsageForm open={openUsage} onClose={() => { setOpenUsage(false); setEditUsage(null); }} initial={editUsage} projectId={projectId || fixedProjectId} equipment={list.data || []} onSave={(input: any) => saveUsageMut.mutate(input)} saving={saveUsageMut.isPending} />
      <AssignForm open={openAssign} onClose={() => setOpenAssign(false)} projectId={projectId || fixedProjectId} equipment={list.data || []} onSave={(input: any) => saveAssignMut.mutate(input)} saving={saveAssignMut.isPending} />
      <EquipmentDetail id={openDetail} onClose={() => setOpenDetail(null)} onChanged={invalidate} />
    </div>
  );
}

// ============= FORMS =============
function EquipmentForm({ open, onClose, initial, projectId, onSave, saving }: any) {
  const [f, setF] = useState<any>({});
  const upd = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  // initialize when open changes
  useMemo(() => {
    if (open) setF(initial ? { ...initial } : {
      equipment_name: "", equipment_type: "General Equipment", category: "General", ownership_type: "Owned",
      current_status: "Available", availability_status: "Available", condition_status: "Good",
      purchase_cost: 0, rental_rate_hourly: 0, rental_rate_daily: 0, fuel_capacity: 0, current_meter_reading: 0,
      project_id: projectId || null,
    });
  }, [open, initial, projectId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Equipment" : "New Equipment"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Code (auto)" value={f.equipment_code || ""} onChange={(v: any) => upd("equipment_code", v)} />
          <Field label="Name *" value={f.equipment_name || ""} onChange={(v: any) => upd("equipment_name", v)} />
          <SelectField label="Type" value={f.equipment_type} onChange={(v: any) => upd("equipment_type", v)} options={EQ_TYPES} />
          <SelectField label="Category" value={f.category} onChange={(v: any) => upd("category", v)} options={EQ_CATEGORIES} />
          <Field label="Make / Brand" value={f.make_brand || ""} onChange={(v: any) => upd("make_brand", v)} />
          <Field label="Model" value={f.model || ""} onChange={(v: any) => upd("model", v)} />
          <Field label="Serial No." value={f.serial_number || ""} onChange={(v: any) => upd("serial_number", v)} />
          <Field label="Reg. No." value={f.registration_number || ""} onChange={(v: any) => upd("registration_number", v)} />
          <Field label="Asset No." value={f.asset_number || ""} onChange={(v: any) => upd("asset_number", v)} />
          <SelectField label="Ownership" value={f.ownership_type} onChange={(v: any) => upd("ownership_type", v)} options={OWNERSHIP} />
          <Field label="Current Location" value={f.current_location || ""} onChange={(v: any) => upd("current_location", v)} />
          <Field label="Operator Name" value={f.operator_name || ""} onChange={(v: any) => upd("operator_name", v)} />
          <Field label="Operator Phone" value={f.operator_phone || ""} onChange={(v: any) => upd("operator_phone", v)} />
          <Field label="Fuel Type" value={f.fuel_type || ""} onChange={(v: any) => upd("fuel_type", v)} />
          <NumField label="Fuel Capacity" value={f.fuel_capacity} onChange={(v: any) => upd("fuel_capacity", v)} />
          <NumField label="Meter Reading" value={f.current_meter_reading} onChange={(v: any) => upd("current_meter_reading", v)} />
          <NumField label="Purchase Cost" value={f.purchase_cost} onChange={(v: any) => upd("purchase_cost", v)} />
          <NumField label="Rental / hour" value={f.rental_rate_hourly} onChange={(v: any) => upd("rental_rate_hourly", v)} />
          <NumField label="Rental / day" value={f.rental_rate_daily} onChange={(v: any) => upd("rental_rate_daily", v)} />
          <Field label="Purchase Date" type="date" value={f.purchase_date || ""} onChange={(v: any) => upd("purchase_date", v)} />
          <Field label="Last Maintenance" type="date" value={f.last_maintenance_date || ""} onChange={(v: any) => upd("last_maintenance_date", v)} />
          <Field label="Next Maintenance" type="date" value={f.next_maintenance_date || ""} onChange={(v: any) => upd("next_maintenance_date", v)} />
          <Field label="Insurance Expiry" type="date" value={f.insurance_expiry_date || ""} onChange={(v: any) => upd("insurance_expiry_date", v)} />
          <Field label="Reg. Expiry" type="date" value={f.registration_expiry_date || ""} onChange={(v: any) => upd("registration_expiry_date", v)} />
          <Field label="Inspection Expiry" type="date" value={f.inspection_expiry_date || ""} onChange={(v: any) => upd("inspection_expiry_date", v)} />
          <SelectField label="Status" value={f.current_status} onChange={(v: any) => upd("current_status", v)} options={EQ_STATUSES} />
          <SelectField label="Availability" value={f.availability_status} onChange={(v: any) => upd("availability_status", v)} options={AVAILABILITY} />
          <SelectField label="Condition" value={f.condition_status} onChange={(v: any) => upd("condition_status", v)} options={CONDITIONS} />
        </div>
        <div className="space-y-1"><Label>Remarks</Label><Textarea value={f.remarks || ""} onChange={(e) => upd("remarks", e.target.value)} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !f.equipment_name} onClick={() => onSave({
            ...f,
            purchase_cost: Number(f.purchase_cost || 0),
            rental_rate_hourly: Number(f.rental_rate_hourly || 0),
            rental_rate_daily: Number(f.rental_rate_daily || 0),
            fuel_capacity: Number(f.fuel_capacity || 0),
            current_meter_reading: Number(f.current_meter_reading || 0),
          })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsageForm({ open, onClose, initial, projectId, equipment, onSave, saving }: any) {
  const [f, setF] = useState<any>({});
  const upd = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  useMemo(() => {
    if (open) setF(initial?.id ? { ...initial } : {
      project_id: projectId, equipment_id: initial?.equipment_id || "", usage_date: new Date().toISOString().slice(0, 10),
      shift: "Day", start_meter_reading: 0, end_meter_reading: 0, working_hours: 0, idle_hours: 0, breakdown_hours: 0,
      fuel_consumed: 0, fuel_unit: "Liter", productivity_quantity: 0, hourly_rate: 0, fuel_cost: 0, status: "Draft",
    });
  }, [open, initial, projectId]);
  const total = Number(f.working_hours || 0) + Number(f.idle_hours || 0) + Number(f.breakdown_hours || 0);
  const prodRate = Number(f.working_hours) > 0 ? Number(f.productivity_quantity || 0) / Number(f.working_hours) : 0;
  const rentalCost = Number(f.working_hours || 0) * Number(f.hourly_rate || 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Usage Log" : "New Usage Log"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1"><Label>Equipment *</Label>
            <Select value={f.equipment_id || ""} onValueChange={(v: string) => upd("equipment_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
              <SelectContent>{(equipment || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.equipment_code} — {e.equipment_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Field label="Date *" type="date" value={f.usage_date || ""} onChange={(v: any) => upd("usage_date", v)} />
          <SelectField label="Shift" value={f.shift} onChange={(v: any) => upd("shift", v)} options={SHIFTS} />
          <Field label="Work Area" value={f.work_area || ""} onChange={(v: any) => upd("work_area", v)} />
          <Field label="Operator" value={f.operator_name || ""} onChange={(v: any) => upd("operator_name", v)} />
          <SelectField label="Status" value={f.status} onChange={(v: any) => upd("status", v)} options={USAGE_STATUSES} />
          <NumField label="Start Meter" value={f.start_meter_reading} onChange={(v: any) => upd("start_meter_reading", v)} />
          <NumField label="End Meter" value={f.end_meter_reading} onChange={(v: any) => upd("end_meter_reading", v)} />
          <div />
          <NumField label="Working Hours" value={f.working_hours} onChange={(v: any) => upd("working_hours", v)} />
          <NumField label="Idle Hours" value={f.idle_hours} onChange={(v: any) => upd("idle_hours", v)} />
          <NumField label="Breakdown Hours" value={f.breakdown_hours} onChange={(v: any) => upd("breakdown_hours", v)} />
          <NumField label="Fuel Consumed" value={f.fuel_consumed} onChange={(v: any) => upd("fuel_consumed", v)} />
          <Field label="Fuel Unit" value={f.fuel_unit || "Liter"} onChange={(v: any) => upd("fuel_unit", v)} />
          <NumField label="Productivity Qty" value={f.productivity_quantity} onChange={(v: any) => upd("productivity_quantity", v)} />
          <Field label="Productivity Unit" value={f.productivity_unit || ""} onChange={(v: any) => upd("productivity_unit", v)} />
          <NumField label="Hourly Rate" value={f.hourly_rate} onChange={(v: any) => upd("hourly_rate", v)} />
          <NumField label="Fuel Cost" value={f.fuel_cost} onChange={(v: any) => upd("fuel_cost", v)} />
        </div>
        <div className="text-xs text-muted-foreground grid grid-cols-3 gap-2 bg-muted/30 p-2 rounded">
          <div>Total hours: <b>{fmt(total)}</b></div>
          <div>Productivity rate: <b>{fmt(prodRate)}</b></div>
          <div>Rental cost: <b>{fmt(rentalCost)}</b> • Total cost: <b>{fmt(rentalCost + Number(f.fuel_cost || 0))}</b></div>
        </div>
        <div className="space-y-1"><Label>Remarks</Label><Textarea value={f.remarks || ""} onChange={(e) => upd("remarks", e.target.value)} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !f.equipment_id || !f.project_id || !f.usage_date} onClick={() => onSave({
            ...f,
            start_meter_reading: Number(f.start_meter_reading || 0),
            end_meter_reading: Number(f.end_meter_reading || 0),
            working_hours: Number(f.working_hours || 0),
            idle_hours: Number(f.idle_hours || 0),
            breakdown_hours: Number(f.breakdown_hours || 0),
            fuel_consumed: Number(f.fuel_consumed || 0),
            productivity_quantity: Number(f.productivity_quantity || 0),
            hourly_rate: Number(f.hourly_rate || 0),
            fuel_cost: Number(f.fuel_cost || 0),
          })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignForm({ open, onClose, projectId, equipment, onSave, saving }: any) {
  const [f, setF] = useState<any>({});
  const upd = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  useMemo(() => {
    if (open) setF({ project_id: projectId, equipment_id: "", assignment_start_date: new Date().toISOString().slice(0, 10), status: "Active" });
  }, [open, projectId]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Assign Equipment to Project</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2"><Label>Equipment *</Label>
            <Select value={f.equipment_id || ""} onValueChange={(v: string) => upd("equipment_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
              <SelectContent>{(equipment || []).filter((e: any) => e.current_status !== "Archived").map((e: any) => <SelectItem key={e.id} value={e.id}>{e.equipment_code} — {e.equipment_name} ({e.current_status})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Field label="Start Date *" type="date" value={f.assignment_start_date || ""} onChange={(v: any) => upd("assignment_start_date", v)} />
          <Field label="End Date" type="date" value={f.assignment_end_date || ""} onChange={(v: any) => upd("assignment_end_date", v)} />
          <Field label="Operator" value={f.operator_name || ""} onChange={(v: any) => upd("operator_name", v)} />
          <Field label="Work Area" value={f.work_area || ""} onChange={(v: any) => upd("work_area", v)} />
        </div>
        <div className="space-y-1"><Label>Remarks</Label><Textarea value={f.remarks || ""} onChange={(e) => upd("remarks", e.target.value)} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !f.equipment_id || !f.project_id || !f.assignment_start_date} onClick={() => onSave(f)}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= DETAIL DRAWER =============
function EquipmentDetail({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const getFn = useServerFn(getEquipment);
  const saveMaintFn = useServerFn(saveMaintenance);
  const archMaintFn = useServerFn(archiveMaintenance);
  const saveBreakFn = useServerFn(saveBreakdown);
  const archBreakFn = useServerFn(archiveBreakdown);
  const saveInspFn = useServerFn(saveInspection);
  const archInspFn = useServerFn(archiveInspection);
  const saveDocFn = useServerFn(saveDocument);
  const archDocFn = useServerFn(archiveDocument);
  const addAttFn = useServerFn(addAttachment);
  const delAttFn = useServerFn(deleteAttachment);
  const addComFn = useServerFn(addComment);

  const q = useQuery({ queryKey: ["equipment-detail", id], queryFn: () => getFn({ data: { id: id! } }), enabled: !!id });
  const qc = useQueryClient();
  const refresh = () => { qc.invalidateQueries({ queryKey: ["equipment-detail", id] }); onChanged(); };

  const [maintOpen, setMaintOpen] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const [inspOpen, setInspOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [attUrl, setAttUrl] = useState(""); const [attName, setAttName] = useState("");

  const saveMaintMut = useMutation({ mutationFn: (input: any) => saveMaintFn({ data: input }), onSuccess: () => { toast.success("Saved"); setMaintOpen(false); refresh(); }, onError: (e: any) => toast.error(e?.message) });
  const saveBreakMut = useMutation({ mutationFn: (input: any) => saveBreakFn({ data: input }), onSuccess: () => { toast.success("Saved"); setBreakOpen(false); refresh(); }, onError: (e: any) => toast.error(e?.message) });
  const saveInspMut = useMutation({ mutationFn: (input: any) => saveInspFn({ data: input }), onSuccess: () => { toast.success("Saved"); setInspOpen(false); refresh(); }, onError: (e: any) => toast.error(e?.message) });
  const saveDocMut = useMutation({ mutationFn: (input: any) => saveDocFn({ data: input }), onSuccess: () => { toast.success("Saved"); setDocOpen(false); refresh(); }, onError: (e: any) => toast.error(e?.message) });
  const addAttMut = useMutation({ mutationFn: (input: any) => addAttFn({ data: input }), onSuccess: () => { setAttUrl(""); setAttName(""); refresh(); } });
  const delAttMut = useMutation({ mutationFn: (idd: string) => delAttFn({ data: { id: idd } }), onSuccess: refresh });
  const addComMut = useMutation({ mutationFn: (input: any) => addComFn({ data: input }), onSuccess: () => { setComment(""); refresh(); } });
  const archMaintMut = useMutation({ mutationFn: (idd: string) => archMaintFn({ data: { id: idd } }), onSuccess: refresh });
  const archBreakMut = useMutation({ mutationFn: (idd: string) => archBreakFn({ data: { id: idd } }), onSuccess: refresh });
  const archInspMut = useMutation({ mutationFn: (idd: string) => archInspFn({ data: { id: idd } }), onSuccess: refresh });
  const archDocMut = useMutation({ mutationFn: (idd: string) => archDocFn({ data: { id: idd } }), onSuccess: refresh });

  const eq = q.data?.equipment;
  return (
    <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader><SheetTitle>{eq?.equipment_code} — {eq?.equipment_name}</SheetTitle></SheetHeader>
        {!eq ? <Skeleton className="h-40 w-full mt-4" /> : (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <Info label="Type" value={eq.equipment_type} />
              <Info label="Category" value={eq.category} />
              <Info label="Ownership" value={eq.ownership_type} />
              <Info label="Make/Model" value={`${eq.make_brand || ""} ${eq.model || ""}`} />
              <Info label="Serial" value={eq.serial_number} />
              <Info label="Reg No." value={eq.registration_number} />
              <Info label="Location" value={eq.current_location} />
              <Info label="Operator" value={eq.operator_name} />
              <Info label="Meter" value={fmt(eq.current_meter_reading)} />
              <Info label="Status" value={<Badge className={STATUS_STYLE[eq.current_status] || ""}>{eq.current_status}</Badge>} />
              <Info label="Availability" value={<Badge variant="outline">{eq.availability_status}</Badge>} />
              <Info label="Condition" value={<Badge className={COND_STYLE[eq.condition_status] || ""}>{eq.condition_status}</Badge>} />
              <Info label="Last Maint." value={eq.last_maintenance_date} />
              <Info label="Next Maint." value={eq.next_maintenance_date} />
              <Info label="Insurance" value={eq.insurance_expiry_date} />
              <Info label="Reg. Expiry" value={eq.registration_expiry_date} />
              <Info label="Inspection Expiry" value={eq.inspection_expiry_date} />
            </div>

            <Tabs defaultValue="maintenance">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="maintenance">Maintenance ({q.data?.maintenance.length})</TabsTrigger>
                <TabsTrigger value="breakdowns">Breakdowns ({q.data?.breakdowns.length})</TabsTrigger>
                <TabsTrigger value="inspections">Inspections ({q.data?.inspections.length})</TabsTrigger>
                <TabsTrigger value="documents">Documents ({q.data?.documents.length})</TabsTrigger>
                <TabsTrigger value="usage">Usage ({q.data?.usage.length})</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="maintenance" className="pt-3 space-y-2">
                <div className="flex justify-end"><Button size="sm" onClick={() => setMaintOpen(true)}><Plus className="h-4 w-4 mr-1" />Maintenance</Button></div>
                {(q.data?.maintenance || []).map((m: any) => (
                  <Card key={m.id}><CardContent className="p-3 text-sm flex items-center gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{m.maintenance_number} — {m.maintenance_title}</div>
                      <div className="text-xs text-muted-foreground">{m.maintenance_type} • Scheduled {m.scheduled_date || "—"} • {m.status}</div>
                    </div>
                    <Badge>{m.priority}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => archMaintMut.mutate(m.id)}><Archive className="h-4 w-4" /></Button>
                  </CardContent></Card>
                ))}
              </TabsContent>

              <TabsContent value="breakdowns" className="pt-3 space-y-2">
                <div className="flex justify-end"><Button size="sm" onClick={() => setBreakOpen(true)}><Plus className="h-4 w-4 mr-1" />Breakdown</Button></div>
                {(q.data?.breakdowns || []).map((b: any) => (
                  <Card key={b.id}><CardContent className="p-3 text-sm flex items-center gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{b.breakdown_number} — {b.problem_description.slice(0, 80)}</div>
                      <div className="text-xs text-muted-foreground">{b.breakdown_date} • Severity {b.severity} • {b.status} • Downtime {fmt(b.downtime_hours)}h</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => archBreakMut.mutate(b.id)}><Archive className="h-4 w-4" /></Button>
                  </CardContent></Card>
                ))}
              </TabsContent>

              <TabsContent value="inspections" className="pt-3 space-y-2">
                <div className="flex justify-end"><Button size="sm" onClick={() => setInspOpen(true)}><Plus className="h-4 w-4 mr-1" />Inspection</Button></div>
                {(q.data?.inspections || []).map((i: any) => (
                  <Card key={i.id}><CardContent className="p-3 text-sm flex items-center gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{i.inspection_number} — {i.inspection_type}</div>
                      <div className="text-xs text-muted-foreground">{i.inspection_date} • Result {i.result} • Condition {i.condition_status}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => archInspMut.mutate(i.id)}><Archive className="h-4 w-4" /></Button>
                  </CardContent></Card>
                ))}
              </TabsContent>

              <TabsContent value="documents" className="pt-3 space-y-2">
                <div className="flex justify-end"><Button size="sm" onClick={() => setDocOpen(true)}><Plus className="h-4 w-4 mr-1" />Document</Button></div>
                {(q.data?.documents || []).map((d: any) => (
                  <Card key={d.id}><CardContent className="p-3 text-sm flex items-center gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{d.document_name} <Badge variant="outline" className="ml-2">{d.document_type}</Badge></div>
                      <div className="text-xs text-muted-foreground">Expiry {d.expiry_date || "—"} • {d.status}
                        {d.file_url && <> • <a href={d.file_url} className="underline" target="_blank" rel="noreferrer">Open</a></>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => archDocMut.mutate(d.id)}><Archive className="h-4 w-4" /></Button>
                  </CardContent></Card>
                ))}
              </TabsContent>

              <TabsContent value="usage" className="pt-3 space-y-2">
                {(q.data?.usage || []).map((u: any) => (
                  <Card key={u.id}><CardContent className="p-3 text-sm">
                    <div className="flex justify-between"><span>{u.usage_date} • {u.shift}</span><Badge variant="outline">{u.status}</Badge></div>
                    <div className="text-xs text-muted-foreground">W {fmt(u.working_hours)} • I {fmt(u.idle_hours)} • B {fmt(u.breakdown_hours)} • Fuel {fmt(u.fuel_consumed)} • Cost {fmt(u.total_cost)}</div>
                  </CardContent></Card>
                ))}
              </TabsContent>

              <TabsContent value="attachments" className="pt-3 space-y-2">
                <div className="flex gap-2"><Input placeholder="Name" value={attName} onChange={(e) => setAttName(e.target.value)} /><Input placeholder="URL" value={attUrl} onChange={(e) => setAttUrl(e.target.value)} /><Button size="sm" disabled={!attUrl || !attName} onClick={() => addAttMut.mutate({ equipment_id: id!, project_id: eq.project_id, file_name: attName, file_url: attUrl })}>Add</Button></div>
                {(q.data?.attachments || []).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm border rounded p-2">
                    <a href={a.file_url} target="_blank" rel="noreferrer" className="underline flex-1">{a.file_name}</a>
                    <Button size="icon" variant="ghost" onClick={() => delAttMut.mutate(a.id)}><Archive className="h-4 w-4" /></Button>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="comments" className="pt-3 space-y-2">
                <div className="flex gap-2"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} /><Button size="sm" disabled={!comment} onClick={() => addComMut.mutate({ equipment_id: id!, project_id: eq.project_id, comment })}>Add</Button></div>
                {(q.data?.comments || []).map((c: any) => (
                  <Card key={c.id}><CardContent className="p-3 text-sm"><div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>{c.comment}</CardContent></Card>
                ))}
              </TabsContent>

              <TabsContent value="history" className="pt-3 space-y-2">
                {(q.data?.history || []).map((h: any) => (
                  <Card key={h.id}><CardContent className="p-3 text-sm">{h.old_status} → <b>{h.new_status}</b> <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span></CardContent></Card>
                ))}
              </TabsContent>
            </Tabs>

            <SubForm open={maintOpen} onClose={() => setMaintOpen(false)} title="Maintenance" onSave={(d: any) => saveMaintMut.mutate({ ...d, equipment_id: id, project_id: eq.project_id })} fields={[
              { k: "maintenance_title", label: "Title *" }, { k: "maintenance_type", label: "Type", options: MAINT_TYPES, default: "Preventive" },
              { k: "status", label: "Status", options: MAINT_STATUSES, default: "Scheduled" }, { k: "priority", label: "Priority", options: ["Low","Medium","High","Critical"], default: "Medium" },
              { k: "scheduled_date", label: "Scheduled", type: "date" }, { k: "completed_date", label: "Completed", type: "date" },
              { k: "performed_by", label: "Performed By" }, { k: "service_provider", label: "Service Provider" },
              { k: "cost", label: "Cost", type: "number", default: 0 }, { k: "next_maintenance_date", label: "Next Date", type: "date" },
              { k: "description", label: "Description", type: "textarea", full: true },
            ]} />
            <SubForm open={breakOpen} onClose={() => setBreakOpen(false)} title="Breakdown" onSave={(d: any) => saveBreakMut.mutate({ ...d, equipment_id: id, project_id: eq.project_id })} fields={[
              { k: "breakdown_date", label: "Date *", type: "date", default: new Date().toISOString().slice(0, 10) },
              { k: "severity", label: "Severity", options: BREAKDOWN_SEVERITY, default: "Medium" },
              { k: "status", label: "Status", options: BREAKDOWN_STATUSES, default: "Open" },
              { k: "operator_name", label: "Operator" }, { k: "location", label: "Location" },
              { k: "downtime_hours", label: "Downtime (h)", type: "number", default: 0 },
              { k: "repair_cost", label: "Repair Cost", type: "number", default: 0 },
              { k: "repaired_by", label: "Repaired By" }, { k: "resolved_date", label: "Resolved Date", type: "date" },
              { k: "problem_description", label: "Problem *", type: "textarea", full: true },
              { k: "repair_action", label: "Repair Action", type: "textarea", full: true },
            ]} />
            <SubForm open={inspOpen} onClose={() => setInspOpen(false)} title="Inspection" onSave={(d: any) => saveInspMut.mutate({ ...d, equipment_id: id, project_id: eq.project_id })} fields={[
              { k: "inspection_date", label: "Date *", type: "date", default: new Date().toISOString().slice(0, 10) },
              { k: "inspection_type", label: "Type", options: INSPECTION_TYPES, default: "Daily Check" },
              { k: "result", label: "Result", options: INSPECTION_RESULTS, default: "Pass" },
              { k: "condition_status", label: "Condition", options: CONDITIONS, default: "Good" },
              { k: "next_inspection_date", label: "Next Inspection", type: "date" },
              { k: "findings", label: "Findings", type: "textarea", full: true },
              { k: "corrective_action", label: "Corrective Action", type: "textarea", full: true },
            ]} />
            <SubForm open={docOpen} onClose={() => setDocOpen(false)} title="Document" onSave={(d: any) => saveDocMut.mutate({ ...d, equipment_id: id })} fields={[
              { k: "document_name", label: "Name *" }, { k: "document_type", label: "Type", options: DOC_TYPES, default: "Registration" },
              { k: "document_number", label: "Number" }, { k: "issue_date", label: "Issue Date", type: "date" },
              { k: "expiry_date", label: "Expiry Date", type: "date" }, { k: "file_url", label: "File URL" },
            ]} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SubForm({ open, onClose, title, onSave, fields }: any) {
  const [f, setF] = useState<any>({});
  useMemo(() => { if (open) { const init: any = {}; fields.forEach((x: any) => { if (x.default !== undefined) init[x.k] = x.default; }); setF(init); } }, [open]);
  const upd = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New {title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((x: any) => (
            <div key={x.k} className={`space-y-1 ${x.full ? "col-span-2" : ""}`}>
              <Label>{x.label}</Label>
              {x.options ? (
                <Select value={f[x.k] || ""} onValueChange={(v: string) => upd(x.k, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{x.options.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              ) : x.type === "textarea" ? (
                <Textarea value={f[x.k] || ""} onChange={(e) => upd(x.k, e.target.value)} />
              ) : (
                <Input type={x.type || "text"} value={f[x.k] ?? ""} onChange={(e) => upd(x.k, x.type === "number" ? Number(e.target.value) : e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(f)}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= HELPERS =============
function Field({ label, value, onChange, type = "text" }: any) {
  return <div className="space-y-1"><Label>{label}</Label><Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></div>;
}
function NumField({ label, value, onChange }: any) {
  return <div className="space-y-1"><Label>{label}</Label><Input type="number" step="0.01" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} /></div>;
}
function SelectField({ label, value, onChange, options }: any) {
  return <div className="space-y-1"><Label>{label}</Label>
    <Select value={value || ""} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  </div>;
}
function Info({ label, value }: any) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="text-sm font-medium">{value ?? "—"}</div></div>;
}

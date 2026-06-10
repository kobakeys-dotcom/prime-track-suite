import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search, Archive, Pencil, Download, Send, CheckCircle2, XCircle, Users, Clock, AlertTriangle, TrendingUp, Trash2 } from "lucide-react";

import {
  listManpower, getManpower, saveManpower, setManpowerStatus, archiveManpower,
  listManpowerPlans, saveManpowerPlan, archiveManpowerPlan,
  listWorkers, saveWorker, archiveWorker,
  saveAttendance, deleteAttendance, saveProductivity, deleteProductivity,
  addManpowerAttachment, deleteManpowerAttachment, addManpowerComment,
  manpowerStats,
  STATUSES, SHIFTS, SOURCES, CATEGORIES, TRADES, SKILL_LEVELS, WORKER_TYPES, ATTENDANCE_STATUSES,
} from "@/lib/manpower.functions";
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
  Draft: "bg-zinc-100 text-zinc-700",
  Submitted: "bg-blue-100 text-blue-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
  "Revision Requested": "bg-amber-100 text-amber-700",
  Closed: "bg-zinc-200 text-zinc-600",
  Cancelled: "bg-rose-50 text-rose-500",
  Archived: "bg-zinc-100 text-zinc-400",
};

function fmt(n: any) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

export function ManpowerRegister({ projectId: fixedProjectId }: { projectId?: string }) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string | null>(fixedProjectId || null);
  const [tab, setTab] = useState("records");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [tradeFilter, setTradeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [openPlanForm, setOpenPlanForm] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);
  const [openWorkerForm, setOpenWorkerForm] = useState(false);
  const [editWorker, setEditWorker] = useState<any>(null);

  const listFn = useServerFn(listManpower);
  const statsFn = useServerFn(manpowerStats);
  const plansFn = useServerFn(listManpowerPlans);
  const workersFn = useServerFn(listWorkers);
  const saveFn = useServerFn(saveManpower);
  const setStatusFn = useServerFn(setManpowerStatus);
  const archiveFn = useServerFn(archiveManpower);
  const savePlanFn = useServerFn(saveManpowerPlan);
  const archivePlanFn = useServerFn(archiveManpowerPlan);
  const saveWorkerFn = useServerFn(saveWorker);
  const archiveWorkerFn = useServerFn(archiveWorker);

  const records = useQuery({ queryKey: ["manpower", projectId], queryFn: () => listFn({ data: { projectId } }) });
  const stats = useQuery({ queryKey: ["manpower-stats", projectId], queryFn: () => statsFn({ data: { projectId } }) });
  const plans = useQuery({ queryKey: ["manpower-plans", projectId], queryFn: () => plansFn({ data: { projectId } }) });
  const workers = useQuery({ queryKey: ["manpower-workers", projectId], queryFn: () => workersFn({ data: { projectId } }) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["manpower"] });
    qc.invalidateQueries({ queryKey: ["manpower-stats"] });
    qc.invalidateQueries({ queryKey: ["manpower-plans"] });
    qc.invalidateQueries({ queryKey: ["manpower-workers"] });
    qc.invalidateQueries({ queryKey: ["manpower-detail"] });
  };

  const filtered = useMemo(() => {
    let rows = records.data || [];
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((r: any) =>
        (r.record_number || "").toLowerCase().includes(s) ||
        (r.work_area || "").toLowerCase().includes(s) ||
        (r.trade || "").toLowerCase().includes(s) ||
        (r.location || "").toLowerCase().includes(s) ||
        (r.remarks || "").toLowerCase().includes(s));
    }
    if (statusFilter !== "all") rows = rows.filter((r: any) => r.status === statusFilter);
    if (shiftFilter !== "all") rows = rows.filter((r: any) => r.shift === shiftFilter);
    if (tradeFilter !== "all") rows = rows.filter((r: any) => r.trade === tradeFilter);
    if (sourceFilter !== "all") rows = rows.filter((r: any) => r.manpower_source === sourceFilter);
    return rows;
  }, [records.data, search, statusFilter, shiftFilter, tradeFilter, sourceFilter]);

  const saveMut = useMutation({
    mutationFn: (input: any) => saveFn({ data: input }),
    onSuccess: () => { toast.success("Manpower record saved"); setOpenForm(false); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });
  const statusMut = useMutation({
    mutationFn: (input: { id: string; status: string; remarks?: string }) => setStatusFn({ data: input }),
    onSuccess: () => { toast.success("Status updated"); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveFn({ data: { id } }),
    onSuccess: () => { toast.success("Archived"); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const savePlanMut = useMutation({
    mutationFn: (input: any) => savePlanFn({ data: input }),
    onSuccess: () => { toast.success("Plan saved"); setOpenPlanForm(false); setEditPlan(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const archivePlanMut = useMutation({ mutationFn: (id: string) => archivePlanFn({ data: { id } }), onSuccess: () => { toast.success("Plan archived"); invalidate(); } });
  const saveWorkerMut = useMutation({
    mutationFn: (input: any) => saveWorkerFn({ data: input }),
    onSuccess: () => { toast.success("Worker saved"); setOpenWorkerForm(false); setEditWorker(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const archiveWorkerMut = useMutation({ mutationFn: (id: string) => archiveWorkerFn({ data: { id } }), onSuccess: () => { toast.success("Worker archived"); invalidate(); } });

  const exportCsv = () => {
    const rows = filtered;
    const header = ["Date","Number","Project","Shift","Work Area","Trade","Category","Source","Planned","Actual","Present","Absent","Idle","Regular Hrs","Overtime Hrs","Total Hrs","Productivity Rate","Total Cost","Status","Remarks"];
    const lines = [header.join(",")];
    rows.forEach((r: any) => {
      lines.push([r.record_date, r.record_number, r.project_id, r.shift, r.work_area, r.trade, r.manpower_category, r.manpower_source, r.planned_count, r.actual_count, r.present_count, r.absent_count, r.idle_count, r.regular_hours, r.overtime_hours, r.total_hours, r.productivity_rate, r.total_cost, r.status, (r.remarks || "").replace(/,/g, ";")].map((v: any) => `"${v ?? ""}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `manpower-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {!fixedProjectId && (
        <div className="flex flex-wrap items-center gap-2">
          <ProjectPicker value={projectId} onChange={setProjectId} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Manpower Today" value={fmt(stats.data?.todayCount)} />
        <StatCard icon={Users} label="Planned" value={fmt(stats.data?.todayPlanned)} />
        <StatCard icon={TrendingUp} label="Variance" value={fmt((stats.data?.todayCount || 0) - (stats.data?.todayPlanned || 0))} />
        <StatCard icon={CheckCircle2} label="Present" value={fmt(stats.data?.present)} />
        <StatCard icon={XCircle} label="Absent" value={fmt(stats.data?.absent)} />
        <StatCard icon={Clock} label="OT Hours" value={fmt(stats.data?.overtimeHours)} />
        <StatCard icon={Clock} label="Regular Hrs" value={fmt(stats.data?.regularHours)} />
        <StatCard icon={Clock} label="Idle Hrs" value={fmt(stats.data?.idleHours)} />
        <StatCard icon={Clock} label="Total Hrs" value={fmt(stats.data?.totalHours)} />
        <StatCard icon={Users} label="Company" value={fmt(stats.data?.company)} />
        <StatCard icon={Users} label="Subcontractor" value={fmt(stats.data?.subcontractor)} />
        <StatCard icon={AlertTriangle} label="Labor Cost" value={fmt(stats.data?.laborCost)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-3 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search number, trade, area…" className="pl-8" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Select value={shiftFilter} onValueChange={setShiftFilter}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All shifts</SelectItem>{SHIFTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Select value={tradeFilter} onValueChange={setTradeFilter}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All trades</SelectItem>{TRADES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sources</SelectItem>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-1" />CSV</Button>
            <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }} disabled={!projectId}><Plus className="w-4 h-4 mr-1" />Add Record</Button>
          </div>

          <Card><CardContent className="p-0 overflow-auto">
            {records.isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> :
              filtered.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">No manpower records yet. {projectId ? "Add the first record above." : "Select a project."}</div> :
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-left p-2">Date</th><th className="text-left p-2">Number</th><th className="text-left p-2">Shift</th>
                  <th className="text-left p-2">Trade</th><th className="text-left p-2">Source</th>
                  <th className="text-right p-2">Plan</th><th className="text-right p-2">Actual</th>
                  <th className="text-right p-2">Present</th><th className="text-right p-2">Absent</th>
                  <th className="text-right p-2">Reg Hrs</th><th className="text-right p-2">OT</th>
                  <th className="text-right p-2">Total Hrs</th><th className="text-left p-2">Status</th><th />
                </tr></thead>
                <tbody>
                  {filtered.map((r: any) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setOpenDetail(r.id)}>
                      <td className="p-2 whitespace-nowrap">{r.record_date}</td>
                      <td className="p-2 font-mono text-xs">{r.record_number}</td>
                      <td className="p-2">{r.shift}</td>
                      <td className="p-2">{r.trade}</td>
                      <td className="p-2">{r.manpower_source}</td>
                      <td className="p-2 text-right">{r.planned_count}</td>
                      <td className="p-2 text-right">{r.actual_count}</td>
                      <td className="p-2 text-right">{r.present_count}</td>
                      <td className="p-2 text-right">{r.absent_count}</td>
                      <td className="p-2 text-right">{fmt(r.regular_hours)}</td>
                      <td className="p-2 text-right">{fmt(r.overtime_hours)}</td>
                      <td className="p-2 text-right">{fmt(r.total_hours)}</td>
                      <td className="p-2"><Badge className={STATUS_STYLE[r.status] || ""}>{r.status}</Badge></td>
                      <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpenForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Archive this record?")) archiveMut.mutate(r.id); }}><Archive className="w-3.5 h-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-3 pt-3">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditPlan(null); setOpenPlanForm(true); }} disabled={!projectId}><Plus className="w-4 h-4 mr-1" />Add Plan</Button></div>
          <Card><CardContent className="p-0 overflow-auto">
            {plans.isLoading ? <div className="p-4"><Skeleton className="h-8" /></div> :
              (plans.data || []).length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">No plans yet.</div> :
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-left p-2">Date</th><th className="text-left p-2">Name</th><th className="text-left p-2">Trade</th>
                  <th className="text-right p-2">Planned</th><th className="text-right p-2">Hours</th><th className="text-right p-2">OT Hours</th>
                  <th className="text-left p-2">Status</th><th />
                </tr></thead>
                <tbody>{(plans.data || []).map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">{p.plan_date}</td><td className="p-2">{p.plan_name}</td>
                    <td className="p-2">{p.trade || "—"}</td>
                    <td className="p-2 text-right">{p.planned_count}</td>
                    <td className="p-2 text-right">{fmt(p.planned_hours)}</td>
                    <td className="p-2 text-right">{fmt(p.planned_overtime_hours)}</td>
                    <td className="p-2"><Badge>{p.status}</Badge></td>
                    <td className="p-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditPlan(p); setOpenPlanForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Archive plan?")) archivePlanMut.mutate(p.id); }}><Archive className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="workers" className="space-y-3 pt-3">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditWorker(null); setOpenWorkerForm(true); }}><Plus className="w-4 h-4 mr-1" />Add Worker</Button></div>
          <Card><CardContent className="p-0 overflow-auto">
            {workers.isLoading ? <div className="p-4"><Skeleton className="h-8" /></div> :
              (workers.data || []).length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">No workers yet.</div> :
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-left p-2">Code</th><th className="text-left p-2">Name</th><th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Trade</th><th className="text-left p-2">Skill</th><th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Status</th><th />
                </tr></thead>
                <tbody>{(workers.data || []).map((w: any) => (
                  <tr key={w.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{w.worker_code || "—"}</td>
                    <td className="p-2">{w.worker_name}</td>
                    <td className="p-2">{w.worker_type}</td>
                    <td className="p-2">{w.trade || "—"}</td>
                    <td className="p-2">{w.skill_level || "—"}</td>
                    <td className="p-2">{w.phone || "—"}</td>
                    <td className="p-2"><Badge>{w.status}</Badge></td>
                    <td className="p-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditWorker(w); setOpenWorkerForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Archive worker?")) archiveWorkerMut.mutate(w.id); }}><Archive className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <RecordForm open={openForm} onClose={() => { setOpenForm(false); setEditing(null); }} initial={editing} projectId={projectId} onSave={(d) => saveMut.mutate(d)} saving={saveMut.isPending} />
      <PlanForm open={openPlanForm} onClose={() => { setOpenPlanForm(false); setEditPlan(null); }} initial={editPlan} projectId={projectId} onSave={(d) => savePlanMut.mutate(d)} saving={savePlanMut.isPending} />
      <WorkerForm open={openWorkerForm} onClose={() => { setOpenWorkerForm(false); setEditWorker(null); }} initial={editWorker} projectId={projectId} onSave={(d) => saveWorkerMut.mutate(d)} saving={saveWorkerMut.isPending} />
      {openDetail && <DetailSheet id={openDetail} onClose={() => setOpenDetail(null)} onStatus={(status) => statusMut.mutate({ id: openDetail, status })} />}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return <Card><CardContent className="p-3 space-y-1">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"><Icon className="w-3 h-3" />{label}</div>
    <div className="text-xl font-bold">{value}</div>
  </CardContent></Card>;
}

function RecordForm({ open, onClose, initial, projectId, onSave, saving }: any) {
  const [f, setF] = useState<any>(() => initial || {});
  useMemo(() => setF(initial || {}), [initial, open]);
  const submit = () => {
    const payload: any = {
      ...(initial?.id ? { id: initial.id } : {}),
      project_id: projectId || initial?.project_id,
      record_date: f.record_date || new Date().toISOString().slice(0, 10),
      shift: f.shift || "Day",
      work_area: f.work_area || null,
      location: f.location || null,
      manpower_source: f.manpower_source || "Company",
      trade: f.trade || "General Labour",
      manpower_category: f.manpower_category || "Skilled",
      planned_count: Number(f.planned_count || 0),
      actual_count: Number(f.actual_count || 0),
      present_count: Number(f.present_count || 0),
      absent_count: Number(f.absent_count || 0),
      idle_count: Number(f.idle_count || 0),
      regular_hours: Number(f.regular_hours || 0),
      overtime_hours: Number(f.overtime_hours || 0),
      idle_hours: Number(f.idle_hours || 0),
      productivity_quantity: Number(f.productivity_quantity || 0),
      productivity_unit: f.productivity_unit || null,
      hourly_rate: Number(f.hourly_rate || 0),
      overtime_rate: Number(f.overtime_rate || 0),
      status: f.status || "Draft",
      remarks: f.remarks || null,
    };
    onSave(payload);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit" : "Add"} Manpower Record</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Fld label="Date"><Input type="date" value={f.record_date || ""} onChange={(e) => setF({ ...f, record_date: e.target.value })} /></Fld>
          <Fld label="Shift"><Sel value={f.shift || "Day"} onChange={(v) => setF({ ...f, shift: v })} options={SHIFTS as any} /></Fld>
          <Fld label="Source"><Sel value={f.manpower_source || "Company"} onChange={(v) => setF({ ...f, manpower_source: v })} options={SOURCES as any} /></Fld>
          <Fld label="Trade *"><Sel value={f.trade || "General Labour"} onChange={(v) => setF({ ...f, trade: v })} options={TRADES as any} /></Fld>
          <Fld label="Category"><Sel value={f.manpower_category || "Skilled"} onChange={(v) => setF({ ...f, manpower_category: v })} options={CATEGORIES as any} /></Fld>
          <Fld label="Status"><Sel value={f.status || "Draft"} onChange={(v) => setF({ ...f, status: v })} options={STATUSES as any} /></Fld>
          <Fld label="Work Area"><Input value={f.work_area || ""} onChange={(e) => setF({ ...f, work_area: e.target.value })} /></Fld>
          <Fld label="Location"><Input value={f.location || ""} onChange={(e) => setF({ ...f, location: e.target.value })} /></Fld>
          <div />
          <Fld label="Planned"><Input type="number" value={f.planned_count ?? ""} onChange={(e) => setF({ ...f, planned_count: e.target.value })} /></Fld>
          <Fld label="Actual"><Input type="number" value={f.actual_count ?? ""} onChange={(e) => setF({ ...f, actual_count: e.target.value })} /></Fld>
          <Fld label="Present"><Input type="number" value={f.present_count ?? ""} onChange={(e) => setF({ ...f, present_count: e.target.value })} /></Fld>
          <Fld label="Absent"><Input type="number" value={f.absent_count ?? ""} onChange={(e) => setF({ ...f, absent_count: e.target.value })} /></Fld>
          <Fld label="Idle"><Input type="number" value={f.idle_count ?? ""} onChange={(e) => setF({ ...f, idle_count: e.target.value })} /></Fld>
          <div />
          <Fld label="Regular Hours"><Input type="number" step="0.25" value={f.regular_hours ?? ""} onChange={(e) => setF({ ...f, regular_hours: e.target.value })} /></Fld>
          <Fld label="Overtime Hours"><Input type="number" step="0.25" value={f.overtime_hours ?? ""} onChange={(e) => setF({ ...f, overtime_hours: e.target.value })} /></Fld>
          <Fld label="Idle Hours"><Input type="number" step="0.25" value={f.idle_hours ?? ""} onChange={(e) => setF({ ...f, idle_hours: e.target.value })} /></Fld>
          <Fld label="Productivity Qty"><Input type="number" step="0.01" value={f.productivity_quantity ?? ""} onChange={(e) => setF({ ...f, productivity_quantity: e.target.value })} /></Fld>
          <Fld label="Productivity Unit"><Input value={f.productivity_unit || ""} onChange={(e) => setF({ ...f, productivity_unit: e.target.value })} placeholder="m2, m3, ton…" /></Fld>
          <div />
          <Fld label="Hourly Rate"><Input type="number" step="0.01" value={f.hourly_rate ?? ""} onChange={(e) => setF({ ...f, hourly_rate: e.target.value })} /></Fld>
          <Fld label="Overtime Rate"><Input type="number" step="0.01" value={f.overtime_rate ?? ""} onChange={(e) => setF({ ...f, overtime_rate: e.target.value })} /></Fld>
          <div className="col-span-2 md:col-span-3"><Fld label="Remarks"><Textarea rows={2} value={f.remarks || ""} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></Fld></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !projectId}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanForm({ open, onClose, initial, projectId, onSave, saving }: any) {
  const [f, setF] = useState<any>(() => initial || {});
  useMemo(() => setF(initial || {}), [initial, open]);
  const submit = () => onSave({
    ...(initial?.id ? { id: initial.id } : {}),
    project_id: projectId || initial?.project_id,
    plan_name: f.plan_name || "Main Manpower Plan",
    plan_date: f.plan_date || new Date().toISOString().slice(0, 10),
    week_start: f.week_start || null, week_end: f.week_end || null, month: f.month || null,
    trade: f.trade || null, manpower_category: f.manpower_category || "General",
    planned_count: Number(f.planned_count || 0),
    planned_hours: Number(f.planned_hours || 0),
    planned_overtime_hours: Number(f.planned_overtime_hours || 0),
    planned_cost: Number(f.planned_cost || 0),
    remarks: f.remarks || null,
    status: f.status || "Active",
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit" : "Add"} Manpower Plan</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Fld label="Plan Name"><Input value={f.plan_name || ""} onChange={(e) => setF({ ...f, plan_name: e.target.value })} /></Fld>
          <Fld label="Plan Date"><Input type="date" value={f.plan_date || ""} onChange={(e) => setF({ ...f, plan_date: e.target.value })} /></Fld>
          <Fld label="Trade"><Sel value={f.trade || ""} onChange={(v) => setF({ ...f, trade: v })} options={TRADES as any} allowEmpty /></Fld>
          <Fld label="Week Start"><Input type="date" value={f.week_start || ""} onChange={(e) => setF({ ...f, week_start: e.target.value })} /></Fld>
          <Fld label="Week End"><Input type="date" value={f.week_end || ""} onChange={(e) => setF({ ...f, week_end: e.target.value })} /></Fld>
          <Fld label="Month"><Input value={f.month || ""} onChange={(e) => setF({ ...f, month: e.target.value })} placeholder="2026-06" /></Fld>
          <Fld label="Planned Count"><Input type="number" value={f.planned_count ?? ""} onChange={(e) => setF({ ...f, planned_count: e.target.value })} /></Fld>
          <Fld label="Planned Hours"><Input type="number" step="0.25" value={f.planned_hours ?? ""} onChange={(e) => setF({ ...f, planned_hours: e.target.value })} /></Fld>
          <Fld label="Planned OT Hours"><Input type="number" step="0.25" value={f.planned_overtime_hours ?? ""} onChange={(e) => setF({ ...f, planned_overtime_hours: e.target.value })} /></Fld>
          <Fld label="Planned Cost"><Input type="number" step="0.01" value={f.planned_cost ?? ""} onChange={(e) => setF({ ...f, planned_cost: e.target.value })} /></Fld>
          <div className="col-span-2 md:col-span-3"><Fld label="Remarks"><Textarea rows={2} value={f.remarks || ""} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></Fld></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !projectId}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkerForm({ open, onClose, initial, projectId, onSave, saving }: any) {
  const [f, setF] = useState<any>(() => initial || {});
  useMemo(() => setF(initial || {}), [initial, open]);
  const submit = () => onSave({
    ...(initial?.id ? { id: initial.id } : {}),
    project_id: projectId || initial?.project_id || null,
    worker_code: f.worker_code || null,
    worker_name: f.worker_name || "",
    worker_type: f.worker_type || "Company Worker",
    trade: f.trade || null,
    skill_level: f.skill_level || null,
    designation: f.designation || null,
    phone: f.phone || null,
    id_number: f.id_number || null,
    joining_date: f.joining_date || null,
    status: f.status || "Active",
    hourly_rate: Number(f.hourly_rate || 0),
    overtime_rate: Number(f.overtime_rate || 0),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit" : "Add"} Worker</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Fld label="Code"><Input value={f.worker_code || ""} onChange={(e) => setF({ ...f, worker_code: e.target.value })} /></Fld>
          <Fld label="Name *"><Input value={f.worker_name || ""} onChange={(e) => setF({ ...f, worker_name: e.target.value })} /></Fld>
          <Fld label="Type"><Sel value={f.worker_type || "Company Worker"} onChange={(v) => setF({ ...f, worker_type: v })} options={WORKER_TYPES as any} /></Fld>
          <Fld label="Trade"><Sel value={f.trade || ""} onChange={(v) => setF({ ...f, trade: v })} options={TRADES as any} allowEmpty /></Fld>
          <Fld label="Skill Level"><Sel value={f.skill_level || ""} onChange={(v) => setF({ ...f, skill_level: v })} options={SKILL_LEVELS as any} allowEmpty /></Fld>
          <Fld label="Designation"><Input value={f.designation || ""} onChange={(e) => setF({ ...f, designation: e.target.value })} /></Fld>
          <Fld label="Phone"><Input value={f.phone || ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Fld>
          <Fld label="ID Number"><Input value={f.id_number || ""} onChange={(e) => setF({ ...f, id_number: e.target.value })} /></Fld>
          <Fld label="Joining Date"><Input type="date" value={f.joining_date || ""} onChange={(e) => setF({ ...f, joining_date: e.target.value })} /></Fld>
          <Fld label="Hourly Rate"><Input type="number" step="0.01" value={f.hourly_rate ?? ""} onChange={(e) => setF({ ...f, hourly_rate: e.target.value })} /></Fld>
          <Fld label="OT Rate"><Input type="number" step="0.01" value={f.overtime_rate ?? ""} onChange={(e) => setF({ ...f, overtime_rate: e.target.value })} /></Fld>
          <Fld label="Status"><Sel value={f.status || "Active"} onChange={(v) => setF({ ...f, status: v })} options={["Active","Inactive","On Leave","Terminated"] as any} /></Fld>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !f.worker_name}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailSheet({ id, onClose, onStatus }: { id: string; onClose: () => void; onStatus: (s: string) => void }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getManpower);
  const attFn = useServerFn(saveAttendance);
  const attDelFn = useServerFn(deleteAttendance);
  const prodFn = useServerFn(saveProductivity);
  const prodDelFn = useServerFn(deleteProductivity);
  const attchFn = useServerFn(addManpowerAttachment);
  const attchDelFn = useServerFn(deleteManpowerAttachment);
  const comFn = useServerFn(addManpowerComment);

  const q = useQuery({ queryKey: ["manpower-detail", id], queryFn: () => getFn({ data: { id } }) });
  const rec = q.data?.record;
  const inv = () => { qc.invalidateQueries({ queryKey: ["manpower-detail", id] }); qc.invalidateQueries({ queryKey: ["manpower"] }); };

  const [attF, setAttF] = useState<any>({});
  const [prodF, setProdF] = useState<any>({});
  const [attchF, setAttchF] = useState<any>({});
  const [comment, setComment] = useState("");

  const addAtt = useMutation({ mutationFn: () => attFn({ data: { project_id: rec.project_id, manpower_record_id: id, attendance_date: attF.attendance_date || new Date().toISOString().slice(0, 10), shift: attF.shift || "Day", status: attF.status || "Present", regular_hours: Number(attF.regular_hours || 0), overtime_hours: Number(attF.overtime_hours || 0), idle_hours: Number(attF.idle_hours || 0), trade: attF.trade || null, work_area: attF.work_area || null, remarks: attF.remarks || null } }), onSuccess: () => { toast.success("Attendance added"); setAttF({}); inv(); } });
  const addProd = useMutation({ mutationFn: () => prodFn({ data: { project_id: rec.project_id, manpower_record_id: id, record_date: prodF.record_date || new Date().toISOString().slice(0, 10), work_activity: prodF.work_activity || "Work", trade: prodF.trade || null, output_quantity: Number(prodF.output_quantity || 0), output_unit: prodF.output_unit || null, labour_hours: Number(prodF.labour_hours || 0), remarks: prodF.remarks || null } }), onSuccess: () => { toast.success("Productivity added"); setProdF({}); inv(); } });
  const addAttch = useMutation({ mutationFn: () => attchFn({ data: { project_id: rec.project_id, manpower_record_id: id, file_name: attchF.file_name, file_url: attchF.file_url, description: attchF.description || null } }), onSuccess: () => { toast.success("Attachment added"); setAttchF({}); inv(); } });
  const addCom = useMutation({ mutationFn: () => comFn({ data: { project_id: rec.project_id, manpower_record_id: id, comment } }), onSuccess: () => { toast.success("Comment added"); setComment(""); inv(); } });

  if (q.isLoading || !rec) {
    return <Sheet open onOpenChange={(o) => !o && onClose()}><SheetContent className="w-full sm:max-w-2xl"><div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div></SheetContent></Sheet>;
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {rec.record_number}
            <Badge className={STATUS_STYLE[rec.status] || ""}>{rec.status}</Badge>
          </SheetTitle>
        </SheetHeader>
        <div className="flex gap-2 my-3 flex-wrap">
          {rec.status === "Draft" && <Button size="sm" onClick={() => onStatus("Submitted")}><Send className="w-3.5 h-3.5 mr-1" />Submit</Button>}
          {rec.status === "Submitted" && <>
            <Button size="sm" onClick={() => onStatus("Approved")}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve</Button>
            <Button size="sm" variant="outline" onClick={() => onStatus("Rejected")}><XCircle className="w-3.5 h-3.5 mr-1" />Reject</Button>
          </>}
          {rec.status === "Approved" && <Button size="sm" variant="outline" onClick={() => onStatus("Closed")}>Close</Button>}
        </div>

        <Tabs defaultValue="overview">
          <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger><TabsTrigger value="productivity">Productivity</TabsTrigger><TabsTrigger value="attachments">Files</TabsTrigger><TabsTrigger value="comments">Comments</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
          <TabsContent value="overview" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Info label="Date" value={rec.record_date} />
              <Info label="Shift" value={rec.shift} />
              <Info label="Source" value={rec.manpower_source} />
              <Info label="Trade" value={rec.trade} />
              <Info label="Category" value={rec.manpower_category} />
              <Info label="Work Area" value={rec.work_area || "—"} />
              <Info label="Planned" value={rec.planned_count} />
              <Info label="Actual" value={rec.actual_count} />
              <Info label="Variance" value={(rec.actual_count || 0) - (rec.planned_count || 0)} />
              <Info label="Present" value={rec.present_count} />
              <Info label="Absent" value={rec.absent_count} />
              <Info label="Idle" value={rec.idle_count} />
              <Info label="Regular Hrs" value={fmt(rec.regular_hours)} />
              <Info label="OT Hrs" value={fmt(rec.overtime_hours)} />
              <Info label="Total Hrs" value={fmt(rec.total_hours)} />
              <Info label="Productivity" value={`${fmt(rec.productivity_quantity)} ${rec.productivity_unit || ""}`} />
              <Info label="Prod Rate" value={fmt(rec.productivity_rate)} />
              <Info label="Total Cost" value={fmt(rec.total_cost)} />
            </div>
            {rec.remarks && <div className="text-sm"><div className="text-xs uppercase text-muted-foreground mb-1">Remarks</div><div>{rec.remarks}</div></div>}
          </TabsContent>

          <TabsContent value="attendance" className="space-y-3 pt-3">
            <Card><CardContent className="p-3 space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Add Attendance</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input type="date" value={attF.attendance_date || ""} onChange={(e) => setAttF({ ...attF, attendance_date: e.target.value })} />
                <Sel value={attF.status || "Present"} onChange={(v) => setAttF({ ...attF, status: v })} options={ATTENDANCE_STATUSES as any} />
                <Input placeholder="Regular hrs" type="number" value={attF.regular_hours ?? ""} onChange={(e) => setAttF({ ...attF, regular_hours: e.target.value })} />
                <Input placeholder="OT hrs" type="number" value={attF.overtime_hours ?? ""} onChange={(e) => setAttF({ ...attF, overtime_hours: e.target.value })} />
              </div>
              <Button size="sm" onClick={() => addAtt.mutate()}>Add</Button>
            </CardContent></Card>
            <table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-left p-2">Date</th><th className="text-left p-2">Status</th><th className="text-right p-2">Reg</th><th className="text-right p-2">OT</th><th className="text-right p-2">Total</th><th /></tr></thead>
              <tbody>{q.data!.attendance.map((a: any) => (
                <tr key={a.id} className="border-t"><td className="p-2">{a.attendance_date}</td><td className="p-2">{a.status}</td><td className="p-2 text-right">{fmt(a.regular_hours)}</td><td className="p-2 text-right">{fmt(a.overtime_hours)}</td><td className="p-2 text-right">{fmt(a.total_hours)}</td><td className="p-2 text-right"><Button size="icon" variant="ghost" onClick={() => attDelFn({ data: { id: a.id } }).then(inv)}><Trash2 className="w-3.5 h-3.5" /></Button></td></tr>
              ))}</tbody>
            </table>
          </TabsContent>

          <TabsContent value="productivity" className="space-y-3 pt-3">
            <Card><CardContent className="p-3 space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Add Productivity</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input placeholder="Activity" value={prodF.work_activity || ""} onChange={(e) => setProdF({ ...prodF, work_activity: e.target.value })} />
                <Input placeholder="Qty" type="number" value={prodF.output_quantity ?? ""} onChange={(e) => setProdF({ ...prodF, output_quantity: e.target.value })} />
                <Input placeholder="Unit" value={prodF.output_unit || ""} onChange={(e) => setProdF({ ...prodF, output_unit: e.target.value })} />
                <Input placeholder="Labour hrs" type="number" value={prodF.labour_hours ?? ""} onChange={(e) => setProdF({ ...prodF, labour_hours: e.target.value })} />
              </div>
              <Button size="sm" onClick={() => addProd.mutate()}>Add</Button>
            </CardContent></Card>
            <table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-left p-2">Date</th><th className="text-left p-2">Activity</th><th className="text-right p-2">Qty</th><th className="text-left p-2">Unit</th><th className="text-right p-2">Hrs</th><th className="text-right p-2">Rate</th><th /></tr></thead>
              <tbody>{q.data!.productivity.map((p: any) => (
                <tr key={p.id} className="border-t"><td className="p-2">{p.record_date}</td><td className="p-2">{p.work_activity}</td><td className="p-2 text-right">{fmt(p.output_quantity)}</td><td className="p-2">{p.output_unit}</td><td className="p-2 text-right">{fmt(p.labour_hours)}</td><td className="p-2 text-right">{fmt(p.productivity_rate)}</td><td className="p-2 text-right"><Button size="icon" variant="ghost" onClick={() => prodDelFn({ data: { id: p.id } }).then(inv)}><Trash2 className="w-3.5 h-3.5" /></Button></td></tr>
              ))}</tbody>
            </table>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-3 pt-3">
            <Card><CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="File name" value={attchF.file_name || ""} onChange={(e) => setAttchF({ ...attchF, file_name: e.target.value })} />
                <Input placeholder="File URL" value={attchF.file_url || ""} onChange={(e) => setAttchF({ ...attchF, file_url: e.target.value })} />
              </div>
              <Button size="sm" onClick={() => addAttch.mutate()} disabled={!attchF.file_url}>Add Attachment</Button>
            </CardContent></Card>
            {q.data!.attachments.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between border-b py-2 text-sm">
                <a href={a.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{a.file_name}</a>
                <Button size="icon" variant="ghost" onClick={() => attchDelFn({ data: { id: a.id } }).then(inv)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="comments" className="space-y-3 pt-3">
            <div className="flex gap-2"><Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /><Button onClick={() => addCom.mutate()} disabled={!comment.trim()}>Post</Button></div>
            {q.data!.comments.map((c: any) => (
              <div key={c.id} className="border-l-2 pl-3 py-1 text-sm"><div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div><div>{c.comment}</div></div>
            ))}
          </TabsContent>

          <TabsContent value="history" className="space-y-2 pt-3">
            {q.data!.history.length === 0 ? <div className="text-sm text-muted-foreground">No status history.</div> : q.data!.history.map((h: any) => (
              <div key={h.id} className="text-sm border-l-2 pl-3 py-1"><div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div><div>{h.old_status || "—"} → <b>{h.new_status}</b></div>{h.remarks && <div className="text-xs">{h.remarks}</div>}</div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Fld({ label, children }: any) { return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>; }
function Info({ label, value }: any) { return <div><div className="text-[10px] uppercase text-muted-foreground">{label}</div><div className="font-medium">{value ?? "—"}</div></div>; }
function Sel({ value, onChange, options, allowEmpty }: { value: string; onChange: (v: string) => void; options: string[]; allowEmpty?: boolean }) {
  return <Select value={value || ""} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{allowEmpty && <SelectItem value="__none__">—</SelectItem>}{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>;
}

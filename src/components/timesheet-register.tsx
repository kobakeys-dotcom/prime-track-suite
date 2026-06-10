import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listTimesheets, getTimesheet, timesheetStats, createTimesheet, updateTimesheet, archiveTimesheet,
  submitTimesheet, approveTimesheet, rejectTimesheet, requestTimesheetRevision,
  addTimesheetEntry, updateTimesheetEntry, deleteTimesheetEntry,
  addTimesheetAttachment, deleteTimesheetAttachment, addTimesheetComment,
  pullFromManpower, recordPayrollExport, listProjectsLite, listManpowerForProject,
  STATUSES, TYPES, SHIFTS, TRADES, WORKER_TYPES, ATTENDANCE_STATUSES, SKILL_LEVELS, calcEntryHours,
} from "@/lib/timesheets.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Download, FileText, Trash2, CheckCircle, XCircle, RotateCcw, Send, Paperclip, MessageSquare, Users, Clock, AlertTriangle, DollarSign } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Submitted: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "Under Review": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "Payroll Exported": "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  Closed: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  Rejected: "bg-red-500/10 text-red-700 dark:text-red-300",
  "Revision Requested": "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  Cancelled: "bg-zinc-500/10 text-zinc-700",
  Archived: "bg-gray-500/10 text-gray-700",
};

function toCsv(rows: any[][]) {
  return rows.map(r => r.map(v => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}
function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export function TimesheetRegister({ projectId: fixedProjectId }: { projectId?: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listTimesheets);
  const stats = useServerFn(timesheetStats);
  const projsFn = useServerFn(listProjectsLite);
  const create = useServerFn(createTimesheet);
  const archive = useServerFn(archiveTimesheet);
  const submit = useServerFn(submitTimesheet);
  const approve = useServerFn(approveTimesheet);
  const reject = useServerFn(rejectTimesheet);
  const revise = useServerFn(requestTimesheetRevision);
  const payroll = useServerFn(recordPayrollExport);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const projects = useQuery({ queryKey: ["projects-lite"], queryFn: () => projsFn(), enabled: !fixedProjectId });
  const projectId = fixedProjectId || null;

  const tsQuery = useQuery({
    queryKey: ["timesheets", projectId],
    queryFn: () => list({ data: { projectId } }),
  });
  const statsQuery = useQuery({
    queryKey: ["timesheets-stats", projectId],
    queryFn: () => stats({ data: { projectId } }),
  });

  const filtered = useMemo(() => {
    const rows = (tsQuery.data as any[]) || [];
    return rows.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.timesheet_type !== typeFilter) return false;
      if (shiftFilter !== "all" && r.shift !== shiftFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return [r.timesheet_number, r.timesheet_title, r.work_area, r.location, r.remarks]
          .some((v: any) => String(v || "").toLowerCase().includes(q));
      }
      return true;
    });
  }, [tsQuery.data, search, statusFilter, typeFilter, shiftFilter]);

  const createMut = useMutation({
    mutationFn: (input: any) => create({ data: input }),
    onSuccess: () => {
      toast.success("Timesheet created");
      setOpenCreate(false);
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      qc.invalidateQueries({ queryKey: ["timesheets-stats"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create"),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => archive({ data: { id } }),
    onSuccess: () => { toast.success("Archived"); qc.invalidateQueries({ queryKey: ["timesheets"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ["timesheets"] });
    qc.invalidateQueries({ queryKey: ["timesheets-stats"] });
    if (openDetail) qc.invalidateQueries({ queryKey: ["timesheet", openDetail] });
  }

  const statusMut = (fn: any, msg: string) => useMutation({
    
    mutationFn: (vars: any) => fn({ data: vars }),
    onSuccess: () => { toast.success(msg); refreshAll(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const submitMut = statusMut(submit, "Submitted");
  const approveMut = statusMut(approve, "Approved");
  const rejectMut = statusMut(reject, "Rejected");
  const reviseMut = statusMut(revise, "Revision requested");

  const exportCsv = () => {
    const head = ["Timesheet No","Date","Type","Shift","Work Area","Workers","Regular","Overtime","Idle","Total","Cost","Status","Payroll Exported"];
    const rows = filtered.map(r => [
      r.timesheet_number, r.timesheet_date, r.timesheet_type, r.shift, r.work_area,
      r.total_workers, r.total_regular_hours, r.total_overtime_hours, r.total_idle_hours,
      r.total_hours, r.total_cost, r.status, r.payroll_exported ? "Yes" : "No",
    ]);
    downloadCsv(`timesheets-${Date.now()}.csv`, toCsv([head, ...rows]));
  };

  const payrollExport = useMutation({
    mutationFn: () => {
      const ids = Array.from(selected);
      const items = filtered.filter(r => ids.includes(r.id));
      if (!items.length) throw new Error("Select approved timesheets first");
      const approvedIds = items.filter(i => i.status === "Approved").map(i => i.id);
      if (!approvedIds.length) throw new Error("Only approved timesheets can be exported");
      const dates = items.map(i => i.timesheet_date).sort();
      return payroll({ data: {
        projectId, periodStart: dates[0], periodEnd: dates[dates.length - 1], timesheetIds: approvedIds,
      } });
    },
    onSuccess: () => {
      toast.success("Payroll export recorded");
      setSelected(new Set());
      refreshAll();
      const head = ["Worker Code","Worker Name","Project","Date","Regular","Overtime","Night","Weekend","Holiday","Idle","Leave","Total","Trade","Activity"];
      const rows: any[] = [];
      filtered.filter(r => selected.has(r.id) && r.status === "Approved").forEach(t => {
        rows.push([t.timesheet_number, "TOTAL", "", t.timesheet_date,
          t.total_regular_hours, t.total_overtime_hours, t.total_night_hours,
          t.total_weekend_hours, t.total_holiday_hours, t.total_idle_hours, t.total_leave_hours,
          t.total_hours, "", ""]);
      });
      downloadCsv(`payroll-export-${Date.now()}.csv`, toCsv([head, ...rows]));
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const s = (statsQuery.data as any) || {};

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard icon={<Clock className="w-4 h-4" />} label="Today" value={s.today ?? 0} />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Pending" value={s.pending ?? 0} />
        <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Approved" value={s.approved ?? 0} />
        <StatCard icon={<FileText className="w-4 h-4" />} label="Payroll Done" value={s.payrollExported ?? 0} />
        <StatCard icon={<Users className="w-4 h-4" />} label="Workers" value={s.totalWorkers ?? 0} />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Total Hrs" value={Number(s.totalHours || 0).toFixed(1)} />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Regular" value={Number(s.regularHours || 0).toFixed(1)} />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Overtime" value={Number(s.overtimeHours || 0).toFixed(1)} />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Idle" value={Number(s.idleHours || 0).toFixed(1)} />
        <StatCard icon={<DollarSign className="w-4 h-4" />} label="Cost" value={Number(s.totalCost || 0).toLocaleString()} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search timesheet number, area, remarks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={shiftFilter} onValueChange={setShiftFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Shift" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shifts</SelectItem>
            {SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-1" />CSV</Button>
        <Button variant="outline" size="sm" disabled={!selected.size || payrollExport.isPending} onClick={() => payrollExport.mutate()}>
          <FileText className="w-4 h-4 mr-1" />Payroll Export ({selected.size})
        </Button>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Timesheet</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CreateForm
              projects={(projects.data as any[]) || []}
              fixedProjectId={fixedProjectId}
              onSubmit={(v: any) => createMut.mutate(v)}
              pending={createMut.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {tsQuery.isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading timesheets…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No timesheets yet. Click <strong>New Timesheet</strong> to start tracking labour hours.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(r => r.id)) : new Set())} /></TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead className="text-right">Workers</TableHead>
                <TableHead className="text-right">Reg</TableHead>
                <TableHead className="text-right">OT</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenDetail(r.id)}>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={e => {
                      const next = new Set(selected);
                      e.target.checked ? next.add(r.id) : next.delete(r.id);
                      setSelected(next);
                    }} />
                  </TableCell>
                  <TableCell className="font-medium">{r.timesheet_number}</TableCell>
                  <TableCell>{r.timesheet_date}</TableCell>
                  <TableCell>{r.timesheet_type}</TableCell>
                  <TableCell>{r.shift}</TableCell>
                  <TableCell className="text-right">{r.total_workers}</TableCell>
                  <TableCell className="text-right">{Number(r.total_regular_hours).toFixed(1)}</TableCell>
                  <TableCell className="text-right">{Number(r.total_overtime_hours).toFixed(1)}</TableCell>
                  <TableCell className="text-right font-medium">{Number(r.total_hours).toFixed(1)}</TableCell>
                  <TableCell className="text-right">{Number(r.total_cost).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLOR[r.status] || ""} variant="secondary">{r.status}</Badge>
                    {r.payroll_exported && <Badge variant="outline" className="ml-1">PR</Badge>}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {r.status === "Draft" && (
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Archive this timesheet?")) archiveMut.mutate(r.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {openDetail && (
        <DetailDrawer
          id={openDetail}
          onClose={() => setOpenDetail(null)}
          onAction={{
            submit: (id: string) => submitMut.mutate({ id }),
            approve: (id: string) => approveMut.mutate({ id }),
            reject: (id: string, reason: string) => rejectMut.mutate({ id, reason }),
            revise: (id: string, notes: string) => reviseMut.mutate({ id, notes }),
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </Card>
  );
}

function CreateForm({ projects, fixedProjectId, onSubmit, pending }: any) {
  const [form, setForm] = useState<any>({
    project_id: fixedProjectId || "",
    timesheet_type: "Daily",
    timesheet_date: new Date().toISOString().slice(0, 10),
    shift: "Day",
    work_area: "",
    remarks: "",
  });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  return (
    <>
      <DialogHeader><DialogTitle>New Timesheet</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3 py-2">
        {!fixedProjectId && (
          <div className="col-span-2">
            <Label>Project *</Label>
            <Select value={form.project_id} onValueChange={(v) => set("project_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div><Label>Title</Label><Input value={form.timesheet_title || ""} onChange={e => set("timesheet_title", e.target.value)} /></div>
        <div><Label>Date *</Label><Input type="date" value={form.timesheet_date} onChange={e => set("timesheet_date", e.target.value)} /></div>
        <div>
          <Label>Type</Label>
          <Select value={form.timesheet_type} onValueChange={(v) => set("timesheet_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Shift</Label>
          <Select value={form.shift} onValueChange={(v) => set("shift", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {form.timesheet_type === "Weekly" && <>
          <div><Label>Week Start</Label><Input type="date" value={form.week_start || ""} onChange={e => set("week_start", e.target.value)} /></div>
          <div><Label>Week End</Label><Input type="date" value={form.week_end || ""} onChange={e => set("week_end", e.target.value)} /></div>
        </>}
        {form.timesheet_type === "Monthly" && (
          <div><Label>Month</Label><Input placeholder="YYYY-MM" value={form.month || ""} onChange={e => set("month", e.target.value)} /></div>
        )}
        <div><Label>Work Area</Label><Input value={form.work_area} onChange={e => set("work_area", e.target.value)} /></div>
        <div><Label>Location</Label><Input value={form.location || ""} onChange={e => set("location", e.target.value)} /></div>
        <div className="col-span-2"><Label>Remarks</Label><Textarea rows={2} value={form.remarks} onChange={e => set("remarks", e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button disabled={!form.project_id || !form.timesheet_date || pending} onClick={() => onSubmit(form)}>
          {pending ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </>
  );
}

function DetailDrawer({ id, onClose, onAction }: { id: string; onClose: () => void; onAction: any }) {
  const qc = useQueryClient();
  const get = useServerFn(getTimesheet);
  const addEntry = useServerFn(addTimesheetEntry);
  const updEntry = useServerFn(updateTimesheetEntry);
  const delEntry = useServerFn(deleteTimesheetEntry);
  const addAtt = useServerFn(addTimesheetAttachment);
  const delAtt = useServerFn(deleteTimesheetAttachment);
  const addCmt = useServerFn(addTimesheetComment);
  const pullMp = useServerFn(pullFromManpower);
  const listMp = useServerFn(listManpowerForProject);

  const q = useQuery({ queryKey: ["timesheet", id], queryFn: () => get({ data: { id } }) });
  const d = (q.data as any) || {};
  const ts = d.timesheet;

  const [rejectReason, setRejectReason] = useState("");
  const [reviseNotes, setReviseNotes] = useState("");
  const [newComment, setNewComment] = useState("");
  const [attUrl, setAttUrl] = useState({ file_name: "", file_url: "", description: "" });

  const mpQuery = useQuery({
    queryKey: ["manpower-lite", ts?.project_id],
    queryFn: () => listMp({ data: { projectId: ts.project_id } }),
    enabled: !!ts?.project_id,
  });

  function refresh() { qc.invalidateQueries({ queryKey: ["timesheet", id] }); qc.invalidateQueries({ queryKey: ["timesheets"] }); qc.invalidateQueries({ queryKey: ["timesheets-stats"] }); }

  const addEntryMut = useMutation({
    mutationFn: (v: any) => addEntry({ data: { ...v, timesheet_id: id } }),
    onSuccess: () => { toast.success("Entry added"); refresh(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });
  const updEntryMut = useMutation({
    mutationFn: ({ eid, patch }: any) => updEntry({ data: { id: eid, patch } }),
    onSuccess: () => refresh(),
  });
  const delEntryMut = useMutation({
    mutationFn: (eid: string) => delEntry({ data: { id: eid } }),
    onSuccess: () => { toast.success("Entry removed"); refresh(); },
  });
  const addAttMut = useMutation({
    mutationFn: (v: any) => addAtt({ data: { ...v, timesheet_id: id } }),
    onSuccess: () => { toast.success("Attachment added"); setAttUrl({ file_name: "", file_url: "", description: "" }); refresh(); },
  });
  const delAttMut = useMutation({
    mutationFn: (aid: string) => delAtt({ data: { id: aid } }),
    onSuccess: () => refresh(),
  });
  const addCmtMut = useMutation({
    mutationFn: () => addCmt({ data: { timesheet_id: id, comment: newComment } }),
    onSuccess: () => { setNewComment(""); refresh(); },
  });
  const pullMpMut = useMutation({
    mutationFn: (mid: string) => pullMp({ data: { timesheet_id: id, manpower_record_id: mid } }),
    onSuccess: () => { toast.success("Pulled from manpower"); refresh(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  if (!ts && !q.isLoading) return null;
  const locked = ts && ["Approved", "Payroll Exported", "Closed", "Archived"].includes(ts.status);

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        {q.isLoading ? <div className="p-8 text-center">Loading…</div> : ts && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 flex-wrap">
                <span>{ts.timesheet_number}</span>
                <Badge className={STATUS_COLOR[ts.status]} variant="secondary">{ts.status}</Badge>
                {ts.payroll_exported && <Badge variant="outline">Payroll Exported</Badge>}
              </SheetTitle>
            </SheetHeader>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm py-3">
              <Info label="Date" value={ts.timesheet_date} />
              <Info label="Type" value={ts.timesheet_type} />
              <Info label="Shift" value={ts.shift} />
              <Info label="Work Area" value={ts.work_area || "—"} />
              <Info label="Workers" value={ts.total_workers} />
              <Info label="Regular Hrs" value={Number(ts.total_regular_hours).toFixed(1)} />
              <Info label="Overtime" value={Number(ts.total_overtime_hours).toFixed(1)} />
              <Info label="Total Hrs" value={Number(ts.total_hours).toFixed(1)} />
              <Info label="Cost" value={`${ts.currency} ${Number(ts.total_cost).toLocaleString()}`} />
              <Info label="Idle Hrs" value={Number(ts.total_idle_hours).toFixed(1)} />
              <Info label="Leave Hrs" value={Number(ts.total_leave_hours).toFixed(1)} />
              <Info label="Night/Weekend" value={`${Number(ts.total_night_hours).toFixed(1)} / ${Number(ts.total_weekend_hours).toFixed(1)}`} />
            </div>

            {/* Status actions */}
            {!locked && (
              <div className="flex flex-wrap gap-2 py-2 border-y">
                {ts.status === "Draft" && (
                  <Button size="sm" onClick={() => onAction.submit(id)}><Send className="w-4 h-4 mr-1" />Submit</Button>
                )}
                {["Submitted", "Under Review"].includes(ts.status) && (
                  <>
                    <Button size="sm" onClick={() => onAction.approve(id)}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
                    <Dialog>
                      <DialogTrigger asChild><Button size="sm" variant="outline"><XCircle className="w-4 h-4 mr-1" />Reject</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Reject Timesheet</DialogTitle></DialogHeader>
                        <Textarea placeholder="Rejection reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                        <DialogFooter><Button disabled={!rejectReason} onClick={() => onAction.reject(id, rejectReason)}>Reject</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild><Button size="sm" variant="outline"><RotateCcw className="w-4 h-4 mr-1" />Revision</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Request Revision</DialogTitle></DialogHeader>
                        <Textarea placeholder="Revision notes" value={reviseNotes} onChange={e => setReviseNotes(e.target.value)} />
                        <DialogFooter><Button disabled={!reviseNotes} onClick={() => onAction.revise(id, reviseNotes)}>Request</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            )}

            <Tabs defaultValue="entries" className="mt-3">
              <TabsList>
                <TabsTrigger value="entries">Entries</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="entries" className="space-y-3">
                {!locked && (
                  <div className="flex gap-2 flex-wrap">
                    <EntryAdd onAdd={(v) => addEntryMut.mutate(v)} />
                    {mpQuery.data && (mpQuery.data as any[]).length > 0 && (
                      <Select onValueChange={(v) => pullMpMut.mutate(v)}>
                        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Pull from Manpower" /></SelectTrigger>
                        <SelectContent>
                          {(mpQuery.data as any[]).map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.record_number} · {m.trade} · {m.actual_count}w
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                <Card className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Worker</TableHead>
                        <TableHead>Trade</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Reg</TableHead>
                        <TableHead className="text-right">OT</TableHead>
                        <TableHead className="text-right">Idle</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(d.entries || []).length === 0 && (
                        <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">No entries yet.</TableCell></TableRow>
                      )}
                      {(d.entries || []).map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell>
                            <div className="font-medium">{e.worker_name}</div>
                            <div className="text-xs text-muted-foreground">{e.worker_code} · {e.worker_type}</div>
                          </TableCell>
                          <TableCell>{e.trade}</TableCell>
                          <TableCell>{e.work_activity}</TableCell>
                          <TableCell><Badge variant="outline">{e.attendance_status}</Badge></TableCell>
                          <TableCell className="text-right">{Number(e.regular_hours).toFixed(1)}</TableCell>
                          <TableCell className="text-right">{Number(e.overtime_hours).toFixed(1)}</TableCell>
                          <TableCell className="text-right">{Number(e.idle_hours).toFixed(1)}</TableCell>
                          <TableCell className="text-right font-medium">{Number(e.total_hours).toFixed(1)}</TableCell>
                          <TableCell className="text-right">{Number(e.cost_amount).toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline">{e.source}</Badge></TableCell>
                          <TableCell>
                            {!locked && (
                              <Button variant="ghost" size="sm" onClick={() => delEntryMut.mutate(e.id)}><Trash2 className="w-4 h-4" /></Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="attachments" className="space-y-3">
                {!locked && (
                  <Card className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder="File name" value={attUrl.file_name} onChange={e => setAttUrl({ ...attUrl, file_name: e.target.value })} />
                    <Input placeholder="File URL" value={attUrl.file_url} onChange={e => setAttUrl({ ...attUrl, file_url: e.target.value })} />
                    <div className="flex gap-2">
                      <Input placeholder="Description" value={attUrl.description} onChange={e => setAttUrl({ ...attUrl, description: e.target.value })} />
                      <Button disabled={!attUrl.file_name || !attUrl.file_url} onClick={() => addAttMut.mutate(attUrl)}><Paperclip className="w-4 h-4" /></Button>
                    </div>
                  </Card>
                )}
                <div className="space-y-1">
                  {(d.attachments || []).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-2 border rounded text-sm">
                      <a href={a.file_url} target="_blank" rel="noreferrer" className="underline">{a.file_name}</a>
                      <Button variant="ghost" size="sm" onClick={() => delAttMut.mutate(a.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  {(d.attachments || []).length === 0 && <p className="text-sm text-muted-foreground">No attachments.</p>}
                </div>
              </TabsContent>

              <TabsContent value="comments" className="space-y-3">
                <div className="flex gap-2">
                  <Textarea rows={2} placeholder="Add a comment…" value={newComment} onChange={e => setNewComment(e.target.value)} />
                  <Button disabled={!newComment} onClick={() => addCmtMut.mutate()}><MessageSquare className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2">
                  {(d.comments || []).map((c: any) => (
                    <div key={c.id} className="p-2 border rounded text-sm">
                      <p>{c.comment}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                  {(d.comments || []).length === 0 && <p className="text-sm text-muted-foreground">No comments.</p>}
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-2">
                {(d.history || []).map((h: any) => (
                  <div key={h.id} className="p-2 border rounded text-sm flex justify-between">
                    <div>
                      <Badge variant="outline">{h.old_status || "—"}</Badge> → <Badge>{h.new_status}</Badge>
                      {h.remarks && <span className="ml-2 text-muted-foreground">{h.remarks}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                ))}
                {(d.history || []).length === 0 && <p className="text-sm text-muted-foreground">No history.</p>}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function EntryAdd({ onAdd }: { onAdd: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({
    worker_name: "", worker_type: "Company Worker", trade: "General Labour",
    attendance_status: "Present", regular_hours: 8, overtime_hours: 0,
    night_hours: 0, weekend_hours: 0, holiday_hours: 0, idle_hours: 0, leave_hours: 0,
    hourly_rate: 0, overtime_rate: 0,
  });
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const calc = calcEntryHours(f);

  // auto compute from time
  useEffect(() => {
    if (f.check_in_time && f.check_out_time) {
      const [h1, m1] = f.check_in_time.split(":").map(Number);
      const [h2, m2] = f.check_out_time.split(":").map(Number);
      const mins = (h2 * 60 + m2) - (h1 * 60 + m1) - Number(f.break_hours || 0) * 60;
      if (mins > 0) set("regular_hours", +(mins / 60).toFixed(2));
    }
  }, [f.check_in_time, f.check_out_time, f.break_hours]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Worker</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Add Worker Entry</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div><Label>Worker Code</Label><Input value={f.worker_code || ""} onChange={e => set("worker_code", e.target.value)} /></div>
          <div className="col-span-2"><Label>Worker Name *</Label><Input value={f.worker_name} onChange={e => set("worker_name", e.target.value)} /></div>
          <div>
            <Label>Worker Type</Label>
            <Select value={f.worker_type} onValueChange={(v) => set("worker_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{WORKER_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Trade</Label>
            <Select value={f.trade} onValueChange={(v) => set("trade", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TRADES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Skill</Label>
            <Select value={f.skill_level || ""} onValueChange={(v) => set("skill_level", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{SKILL_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Attendance</Label>
            <Select value={f.attendance_status} onValueChange={(v) => set("attendance_status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ATTENDANCE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-3"><Label>Work Activity</Label><Input value={f.work_activity || ""} onChange={e => set("work_activity", e.target.value)} /></div>
          <div><Label>Check In</Label><Input type="time" value={f.check_in_time || ""} onChange={e => set("check_in_time", e.target.value)} /></div>
          <div><Label>Check Out</Label><Input type="time" value={f.check_out_time || ""} onChange={e => set("check_out_time", e.target.value)} /></div>
          <div><Label>Break (h)</Label><Input type="number" step="0.25" value={f.break_hours} onChange={e => set("break_hours", e.target.value)} /></div>
          <div><Label>Regular</Label><Input type="number" step="0.25" value={f.regular_hours} onChange={e => set("regular_hours", e.target.value)} /></div>
          <div><Label>Overtime</Label><Input type="number" step="0.25" value={f.overtime_hours} onChange={e => set("overtime_hours", e.target.value)} /></div>
          <div><Label>Night</Label><Input type="number" step="0.25" value={f.night_hours} onChange={e => set("night_hours", e.target.value)} /></div>
          <div><Label>Weekend</Label><Input type="number" step="0.25" value={f.weekend_hours} onChange={e => set("weekend_hours", e.target.value)} /></div>
          <div><Label>Holiday</Label><Input type="number" step="0.25" value={f.holiday_hours} onChange={e => set("holiday_hours", e.target.value)} /></div>
          <div><Label>Idle</Label><Input type="number" step="0.25" value={f.idle_hours} onChange={e => set("idle_hours", e.target.value)} /></div>
          <div><Label>Leave</Label><Input type="number" step="0.25" value={f.leave_hours} onChange={e => set("leave_hours", e.target.value)} /></div>
          <div><Label>Hourly Rate</Label><Input type="number" step="0.01" value={f.hourly_rate} onChange={e => set("hourly_rate", e.target.value)} /></div>
          <div><Label>OT Rate</Label><Input type="number" step="0.01" value={f.overtime_rate} onChange={e => set("overtime_rate", e.target.value)} /></div>
          <div className="col-span-3 flex justify-between items-center pt-2 border-t">
            <div className="text-sm">Total: <strong>{calc.total_hours.toFixed(2)}h</strong> · Cost: <strong>{calc.cost_amount.toFixed(2)}</strong></div>
          </div>
          <div className="col-span-3"><Label>Remarks</Label><Textarea rows={2} value={f.remarks || ""} onChange={e => set("remarks", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button disabled={!f.worker_name} onClick={() => { onAdd(f); setOpen(false); }}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

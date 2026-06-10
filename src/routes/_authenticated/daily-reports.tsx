import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  FileText, Search, Filter, CheckCircle2, XCircle, Clock, AlertTriangle, RotateCcw,
  Eye, Archive, Printer, Image as ImageIcon, Pencil, Plus,
} from "lucide-react";

import {
  listDailyReports, getDailyReport, approveDailyReport, rejectDailyReport,
  requestDailyReportRevision, markDailyReportUnderReview, archiveDailyReport,
  submitDailyReport, updateDailyReport,
} from "@/lib/daily-reports.functions";
import { getDownloadUrl } from "@/lib/documents.functions";
import { ProjectPicker } from "@/components/project-picker";
import { DailyReportsPanel } from "@/components/project/daily-reports-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/daily-reports")({
  head: () => ({ meta: [{ title: "Daily Reports — ProjectCore" }] }),
  component: DailyReportsPage,
});

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  revision_requested: "bg-orange-100 text-orange-700",
  archived: "bg-zinc-200 text-zinc-500",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  approved: "Approved", rejected: "Rejected", revision_requested: "Revision Requested",
  archived: "Archived",
};

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString();
}

function DailyReportsPage() {
  const [projectId, setProjectId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useServerFn(listDailyReports);
  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["daily-reports", projectId || "all"],
    queryFn: () => list({ data: { projectId: projectId || undefined } }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r: any) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.report_number, r.work_completed, r.issues, r.project_name, r.author_name, r.location]
        .some((v) => (v ?? "").toString().toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: rows.length,
      today: rows.filter((r: any) => r.report_date === today).length,
      pending: rows.filter((r: any) => ["submitted", "under_review"].includes(r.status)).length,
      approved: rows.filter((r: any) => r.status === "approved").length,
      revision: rows.filter((r: any) => ["rejected", "revision_requested"].includes(r.status)).length,
    };
  }, [rows]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Daily Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Site reports, approvals, and progress across all projects.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-64"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
          {projectId && <Button variant="ghost" size="sm" onClick={() => setProjectId("")}>Clear</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat icon={<FileText className="size-4" />} label="Total" value={stats.total} />
        <Stat icon={<Clock className="size-4 text-blue-600" />} label="Submitted today" value={stats.today} />
        <Stat icon={<AlertTriangle className="size-4 text-amber-600" />} label="Pending approval" value={stats.pending} />
        <Stat icon={<CheckCircle2 className="size-4 text-emerald-600" />} label="Approved" value={stats.approved} />
        <Stat icon={<RotateCcw className="size-4 text-orange-600" />} label="Needs revision" value={stats.revision} />
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input className="pl-9" placeholder="Search report no., work, issues, project, author…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {projectId && (
          <div className="ml-auto">
            <DailyReportsPanel projectId={projectId} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : isError ? (
        <Card><CardContent className="p-10 text-center space-y-3">
          <AlertTriangle className="size-8 mx-auto text-rose-600" />
          <p className="text-sm">Failed to load daily reports.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <FileText className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No daily reports found</p>
          <p className="text-xs text-muted-foreground mt-1">{projectId ? "Use the New Report button to add one." : "Select a project to create a new report."}</p>
        </CardContent></Card>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Report</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Project</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Weather</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Manpower</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Author</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => {
                const mp = r.manpower?.total ?? "—";
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{r.report_number ?? r.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs hidden md:table-cell">{r.project_name}</td>
                    <td className="px-4 py-3 text-xs">{fmtDate(r.report_date)}</td>
                    <td className="px-4 py-3 text-xs hidden lg:table-cell">{r.weather ?? "—"}{r.temperature_c != null && ` · ${r.temperature_c}°C`}</td>
                    <td className="px-4 py-3 text-xs hidden lg:table-cell">{mp}</td>
                    <td className="px-4 py-3 text-xs hidden md:table-cell">{r.author_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_STYLE[r.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      {r.is_client_visible && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">Client</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setOpenId(r.id)}><Eye className="size-4" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ReportDrawer id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </CardContent></Card>
  );
}

function ReportDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const getOne = useServerFn(getDailyReport);
  const dl = useServerFn(getDownloadUrl);
  const submitFn = useServerFn(submitDailyReport);
  const reviewFn = useServerFn(markDailyReportUnderReview);
  const approveFn = useServerFn(approveDailyReport);
  const rejectFn = useServerFn(rejectDailyReport);
  const reviseFn = useServerFn(requestDailyReportRevision);
  const archiveFn = useServerFn(archiveDailyReport);
  const updateFn = useServerFn(updateDailyReport);

  const { data: report, isLoading } = useQuery({
    queryKey: ["daily-report", id],
    queryFn: () => getOne({ data: { id: id! } }),
    enabled: !!id,
  });

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reviseOpen, setReviseOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["daily-reports"] });
    qc.invalidateQueries({ queryKey: ["daily-report", id] });
  };

  const mut = (fn: () => Promise<any>, ok: string) =>
    useMutation({ mutationFn: fn, onSuccess: () => { toast.success(ok); invalidate(); }, onError: (e: any) => toast.error(e?.message ?? "Failed") });

  const submitM = mut(() => submitFn({ data: { id: id! } }), "Report submitted");
  const reviewM = mut(() => reviewFn({ data: { id: id! } }), "Marked under review");
  const approveM = useMutation({
    mutationFn: (client_visible: boolean) => approveFn({ data: { id: id!, client_visible } }),
    onSuccess: () => { toast.success("Approved"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const rejectM = useMutation({
    mutationFn: () => rejectFn({ data: { id: id!, reason } }),
    onSuccess: () => { toast.success("Rejected"); setRejectOpen(false); setReason(""); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const reviseM = useMutation({
    mutationFn: () => reviseFn({ data: { id: id!, notes } }),
    onSuccess: () => { toast.success("Revision requested"); setReviseOpen(false); setNotes(""); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const archiveM = useMutation({
    mutationFn: () => archiveFn({ data: { id: id! } }),
    onSuccess: () => { toast.success("Archived"); setArchiveOpen(false); invalidate(); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  async function openPhoto(path: string) {
    try { const { url } = await dl({ data: { path } }); window.open(url, "_blank"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  const canEdit = report && ["draft", "rejected", "revision_requested"].includes(report.status);
  const canSubmit = canEdit;
  const canReview = report && ["submitted"].includes(report.status);
  const canApprove = report && ["submitted", "under_review"].includes(report.status);
  const canArchive = report && !report.is_archived;

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            {report?.report_number ?? "Daily Report"}
          </SheetTitle>
        </SheetHeader>

        {isLoading || !report ? (
          <div className="space-y-2 mt-6"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_STYLE[report.status]}`}>
                {STATUS_LABEL[report.status]}
              </span>
              {report.is_client_visible && <span className="text-[10px] px-2 py-0.5 rounded bg-sky-100 text-sky-700">Client visible</span>}
              <span className="text-xs text-muted-foreground ml-auto">{report.project_name}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <Field label="Date" value={fmtDate(report.report_date)} />
              <Field label="Weather" value={`${report.weather ?? "—"}${report.temperature_c != null ? ` · ${report.temperature_c}°C` : ""}`} />
              <Field label="Site condition" value={report.site_condition} />
              <Field label="Shift" value={report.shift} />
              <Field label="Working hours" value={report.working_hours} />
              <Field label="Location" value={report.location} />
              <Field label="Manpower" value={report.manpower?.total ?? "—"} />
              <Field label="Author" value={report.author_name} />
              <Field label="Submitted" value={report.submitted_at ? new Date(report.submitted_at).toLocaleString() : "—"} />
            </div>

            <Section title="Work summary">{report.work_completed}</Section>
            <Section title="Next day plan">{report.next_day_plan}</Section>
            <Section title="Equipment">{report.equipment?.notes}</Section>
            <Section title="Materials used">{report.materials_used?.notes}</Section>
            <Section title="Issues / delays">{report.issues}</Section>
            <Section title="Safety notes">{report.safety_notes}</Section>
            <Section title="Quality notes">{report.quality_notes}</Section>
            <Section title="Visitors">{report.visitors}</Section>
            <Section title="Instructions received">{report.instructions_received}</Section>

            {Array.isArray(report.photos) && report.photos.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Photos</h4>
                <div className="flex flex-wrap gap-2">
                  {report.photos.map((p: string) => (
                    <button key={p} onClick={() => openPhoto(p)} className="size-16 rounded border border-border bg-muted flex items-center justify-center hover:bg-muted/70">
                      <ImageIcon className="size-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {report.rejection_reason && (
              <div className="border border-rose-200 bg-rose-50 rounded p-3 text-xs">
                <p className="font-semibold text-rose-800 mb-1">Rejection reason</p>
                <p className="text-rose-700 whitespace-pre-wrap">{report.rejection_reason}</p>
              </div>
            )}
            {report.revision_notes && (
              <div className="border border-orange-200 bg-orange-50 rounded p-3 text-xs">
                <p className="font-semibold text-orange-800 mb-1">Revision notes</p>
                <p className="text-orange-700 whitespace-pre-wrap">{report.revision_notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4 mr-1" />Print</Button>
              {canEdit && <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}><Pencil className="size-4 mr-1" />Edit</Button>}
              {canSubmit && <Button size="sm" onClick={() => submitM.mutate()} disabled={submitM.isPending}>Submit</Button>}
              {canReview && <Button size="sm" variant="outline" onClick={() => reviewM.mutate()} disabled={reviewM.isPending}>Mark under review</Button>}
              {canApprove && (
                <>
                  <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => approveM.mutate(report.is_client_visible)} disabled={approveM.isPending}>
                    <CheckCircle2 className="size-4 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-rose-700 border-rose-200" onClick={() => setRejectOpen(true)}>
                    <XCircle className="size-4 mr-1" />Reject
                  </Button>
                  <Button size="sm" variant="outline" className="text-orange-700 border-orange-200" onClick={() => setReviseOpen(true)}>
                    <RotateCcw className="size-4 mr-1" />Request revision
                  </Button>
                </>
              )}
              {canApprove && (
                <Button size="sm" variant="outline" onClick={() => approveM.mutate(!report.is_client_visible)}>
                  {report.is_client_visible ? "Unshare from client" : "Share with client"}
                </Button>
              )}
              {canArchive && <Button size="sm" variant="ghost" className="text-rose-600 ml-auto" onClick={() => setArchiveOpen(true)}><Archive className="size-4 mr-1" />Archive</Button>}
            </div>
          </div>
        )}

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject report</DialogTitle></DialogHeader>
            <Label>Reason *</Label>
            <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this report is being rejected" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => rejectM.mutate()} disabled={reason.trim().length < 3 || rejectM.isPending}>Reject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={reviseOpen} onOpenChange={setReviseOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Request revision</DialogTitle></DialogHeader>
            <Label>Revision notes *</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe required changes" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviseOpen(false)}>Cancel</Button>
              <Button onClick={() => reviseM.mutate()} disabled={notes.trim().length < 3 || reviseM.isPending}>Send</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive daily report?</AlertDialogTitle>
              <AlertDialogDescription>The report will be hidden from default lists but data is preserved.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => archiveM.mutate()}>Archive</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {report && (
          <EditDialog open={editOpen} onClose={() => setEditOpen(false)} report={report} onSaved={invalidate} updateFn={updateFn} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  if (!children) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</h4>
      <p className="text-sm whitespace-pre-wrap">{children}</p>
    </div>
  );
}

function EditDialog({
  open, onClose, report, onSaved, updateFn,
}: { open: boolean; onClose: () => void; report: any; onSaved: () => void; updateFn: any }) {
  const [form, setForm] = useState({
    report_number: report.report_number ?? "",
    report_date: report.report_date,
    weather: report.weather ?? "",
    temperature_c: report.temperature_c?.toString() ?? "",
    site_condition: report.site_condition ?? "",
    shift: report.shift ?? "",
    working_hours: report.working_hours ?? "",
    location: report.location ?? "",
    manpower_count: report.manpower?.total?.toString() ?? "",
    work_completed: report.work_completed ?? "",
    next_day_plan: report.next_day_plan ?? "",
    equipment: report.equipment?.notes ?? "",
    materials_used: report.materials_used?.notes ?? "",
    issues: report.issues ?? "",
    safety_notes: report.safety_notes ?? "",
    quality_notes: report.quality_notes ?? "",
    visitors: report.visitors ?? "",
    instructions_received: report.instructions_received ?? "",
  });

  const save = useMutation({
    mutationFn: () => updateFn({ data: {
      id: report.id,
      project_id: report.project_id,
      report_number: form.report_number || null,
      report_date: form.report_date,
      weather: form.weather || null,
      temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
      site_condition: form.site_condition || null,
      shift: form.shift || null,
      working_hours: form.working_hours || null,
      location: form.location || null,
      manpower_count: form.manpower_count ? Number(form.manpower_count) : null,
      work_completed: form.work_completed || null,
      next_day_plan: form.next_day_plan || null,
      equipment: form.equipment || null,
      materials_used: form.materials_used || null,
      issues: form.issues || null,
      safety_notes: form.safety_notes || null,
      quality_notes: form.quality_notes || null,
      visitors: form.visitors || null,
      instructions_received: form.instructions_received || null,
    } }),
    onSuccess: () => { toast.success("Report updated"); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit daily report</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Fld label="Report no.">
            <Input value={form.report_number} onChange={(e) => setForm({ ...form, report_number: e.target.value })} />
          </Fld>
          <Fld label="Date *"><Input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} /></Fld>
          <Fld label="Manpower"><Input type="number" min="0" value={form.manpower_count} onChange={(e) => setForm({ ...form, manpower_count: e.target.value })} /></Fld>
          <Fld label="Weather"><Input value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} /></Fld>
          <Fld label="Temp °C"><Input type="number" value={form.temperature_c} onChange={(e) => setForm({ ...form, temperature_c: e.target.value })} /></Fld>
          <Fld label="Shift"><Input value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} placeholder="Day / Night" /></Fld>
          <Fld label="Working hours"><Input value={form.working_hours} onChange={(e) => setForm({ ...form, working_hours: e.target.value })} placeholder="07:00 – 17:00" /></Fld>
          <Fld label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Fld>
          <Fld label="Site condition"><Input value={form.site_condition} onChange={(e) => setForm({ ...form, site_condition: e.target.value })} /></Fld>
        </div>
        <Fld label="Work completed"><Textarea rows={3} value={form.work_completed} onChange={(e) => setForm({ ...form, work_completed: e.target.value })} /></Fld>
        <div className="grid md:grid-cols-2 gap-3">
          <Fld label="Equipment"><Textarea rows={2} value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} /></Fld>
          <Fld label="Materials used"><Textarea rows={2} value={form.materials_used} onChange={(e) => setForm({ ...form, materials_used: e.target.value })} /></Fld>
        </div>
        <Fld label="Issues"><Textarea rows={2} value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} /></Fld>
        <div className="grid md:grid-cols-2 gap-3">
          <Fld label="Safety notes"><Textarea rows={2} value={form.safety_notes} onChange={(e) => setForm({ ...form, safety_notes: e.target.value })} /></Fld>
          <Fld label="Quality notes"><Textarea rows={2} value={form.quality_notes} onChange={(e) => setForm({ ...form, quality_notes: e.target.value })} /></Fld>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Fld label="Visitors"><Textarea rows={2} value={form.visitors} onChange={(e) => setForm({ ...form, visitors: e.target.value })} /></Fld>
          <Fld label="Instructions received"><Textarea rows={2} value={form.instructions_received} onChange={(e) => setForm({ ...form, instructions_received: e.target.value })} /></Fld>
        </div>
        <Fld label="Next day plan"><Textarea rows={2} value={form.next_day_plan} onChange={(e) => setForm({ ...form, next_day_plan: e.target.value })} /></Fld>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.report_date}>{save.isPending ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fld({ label, children }: { label: string; children: any }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}

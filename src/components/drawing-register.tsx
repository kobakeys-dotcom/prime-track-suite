import { useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Search, Upload, Download, FileText, Archive, Send, CheckCircle2, X as XIcon,
  RotateCcw, History, MessageSquare, Share2, Eye, Shield,
} from "lucide-react";
import {
  listDrawings, getDrawing, saveDrawing, setDrawingStatus, archiveDrawing,
  addDrawingRevision, addDrawingComment, distributeDrawing, drawingStats,
  getDrawingUploadUrl, getDrawingDownloadUrl, logDrawingAccess,
  DRAWING_TYPES, DRAWING_CATEGORIES, DRAWING_DISCIPLINES, DRAWING_STATUSES,
  DRAWING_ISSUE_PURPOSES, DRAWING_SHEET_SIZES,
} from "@/lib/drawings.functions";
import { ProjectPicker } from "@/components/project-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-zinc-100 text-zinc-700",
  Submitted: "bg-blue-100 text-blue-700",
  "Under Review": "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Issued: "bg-emerald-100 text-emerald-700",
  Active: "bg-emerald-100 text-emerald-700",
  "For Construction": "bg-emerald-100 text-emerald-800",
  "For Information": "bg-sky-100 text-sky-700",
  "As-Built": "bg-violet-100 text-violet-700",
  Rejected: "bg-rose-100 text-rose-700",
  "Revision Requested": "bg-orange-100 text-orange-700",
  Superseded: "bg-zinc-200 text-zinc-500",
  Cancelled: "bg-rose-50 text-rose-500",
  Archived: "bg-zinc-100 text-zinc-400",
};

type Props = { projectId?: string };

export function DrawingRegister({ projectId: fixedProjectId }: Props) {
  const qc = useQueryClient();
  const list = useServerFn(listDrawings);
  const stats = useServerFn(drawingStats);
  const dl = useServerFn(getDrawingDownloadUrl);
  const logAccess = useServerFn(logDrawingAccess);
  const archive = useServerFn(archiveDrawing);

  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [typeF, setTypeF] = useState("all");
  const [disciplineF, setDisciplineF] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const drwQ = useQuery({
    queryKey: ["drawings", fixedProjectId ?? "all"],
    queryFn: () => list({ data: { projectId: fixedProjectId } }),
  });
  const statsQ = useQuery({
    queryKey: ["drawings-stats", fixedProjectId ?? "all"],
    queryFn: () => stats({ data: { projectId: fixedProjectId } }),
  });

  const rows = useMemo(() => {
    const all = drwQ.data ?? [];
    const ql = q.toLowerCase();
    return all.filter((r: any) => {
      if (ql && !(`${r.drawing_number ?? ""} ${r.drawing_title ?? ""} ${r.drawing_type ?? ""} ${r.discipline ?? ""} ${r.zone_area ?? ""} ${(r.tags ?? []).join(" ")}`.toLowerCase().includes(ql))) return false;
      if (statusF !== "all" && r.drawing_status !== statusF) return false;
      if (typeF !== "all" && r.drawing_type !== typeF) return false;
      if (disciplineF !== "all" && r.discipline !== disciplineF) return false;
      return true;
    });
  }, [drwQ.data, q, statusF, typeF, disciplineF]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["drawings"] });
    qc.invalidateQueries({ queryKey: ["drawings-stats"] });
    if (openId) qc.invalidateQueries({ queryKey: ["drawing", openId] });
  };

  async function open(path: string | null, fileUrl: string | null, drawingId: string) {
    try {
      let url = fileUrl;
      if (path) { const r = await dl({ data: { path } }); url = r.url; }
      if (!url) return toast.error("No file");
      logAccess({ data: { drawing_id: drawingId, action: "open" } }).catch(() => {});
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  async function onArchive(id: string) {
    if (!confirm("Archive this drawing?")) return;
    try { await archive({ data: { id } }); toast.success("Archived"); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  function exportCsv() {
    const headers = ["Drawing No","Project","Title","Type","Category","Discipline","Zone","Floor","Revision","Issue Purpose","Status","Approval","Prepared By","Approved By","Issue Date","Received Date","File","Client Visible","Confidential"];
    const lines = [headers.join(",")];
    for (const r of rows as any[]) {
      const row = [r.drawing_number, r.project_name, r.drawing_title, r.drawing_type, r.drawing_category, r.discipline, r.zone_area, r.floor_level, r.revision, r.issue_purpose, r.drawing_status, r.approval_status, r.prepared_by, r.approved_by, r.issue_date, r.received_date, r.file_name, r.is_client_visible, r.is_confidential];
      lines.push(row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `drawings-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const s = statsQ.data ?? { total: 0, draft: 0, submitted: 0, under_review: 0, approved: 0, issued: 0, for_construction: 0, rejected: 0, revision_requested: 0, superseded: 0, client_visible: 0, confidential: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Drawing Register</h1>
          <p className="text-sm text-muted-foreground mt-1">Drawing control with revisions, approvals, and distribution.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="size-4" /> CSV</Button>
          <Button onClick={() => setEditing({})} className="bg-accent text-white hover:bg-accent/90">
            <Plus className="size-4" /> New Drawing
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          ["Total", s.total],["Draft", s.draft],["Under Review", s.under_review],
          ["Approved", s.approved],["For Construction", s.for_construction],
          ["Superseded", s.superseded],
        ].map(([l, v]) => (
          <div key={String(l)} className="bg-card border border-border rounded-sm p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
            <div className="text-xl font-bold mt-1">{v as number}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-sm p-3 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search drawings…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {DRAWING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeF} onValueChange={setTypeF}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {DRAWING_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={disciplineF} onValueChange={setDisciplineF}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Discipline" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All disciplines</SelectItem>
            {DRAWING_DISCIPLINES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {drwQ.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-sm p-12 text-center">
          <FileText className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No drawings yet</p>
          <p className="text-xs text-muted-foreground mt-1">Register your first drawing to begin tracking revisions.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Number</th>
                  <th className="text-left px-4 py-3">Title</th>
                  {!fixedProjectId && <th className="text-left px-4 py-3">Project</th>}
                  <th className="text-left px-4 py-3">Discipline</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Rev</th>
                  <th className="text-left px-4 py-3">Issue</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Flags</th>
                  <th className="w-32"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => setOpenId(r.id)}>
                    <td className="px-4 py-3 font-mono text-xs">{r.drawing_number}</td>
                    <td className="px-4 py-3 font-medium">{r.drawing_title ?? "—"}</td>
                    {!fixedProjectId && <td className="px-4 py-3 text-xs text-muted-foreground">{r.project_name}</td>}
                    <td className="px-4 py-3 text-xs">{r.discipline ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{r.drawing_type ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono">{r.revision ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{r.issue_purpose ?? "—"}</td>
                    <td className="px-4 py-3"><Badge className={STATUS_STYLE[r.drawing_status] ?? "bg-zinc-100 text-zinc-700"}>{r.drawing_status ?? "Draft"}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {r.is_client_visible && <Badge variant="outline" className="text-[10px]"><Eye className="size-3" /></Badge>}
                        {r.is_confidential && <Badge variant="outline" className="text-[10px] text-rose-700"><Shield className="size-3" /></Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        {(r.file_path || r.file_url) && (
                          <button title="Open" onClick={() => open(r.file_path, r.file_url, r.id)} className="p-1 hover:bg-muted rounded">
                            <Download className="size-4 text-accent" />
                          </button>
                        )}
                        <button title="Edit" onClick={() => setEditing(r)} className="p-1 hover:bg-muted rounded">
                          <FileText className="size-4" />
                        </button>
                        <button title="Archive" onClick={() => onArchive(r.id)} className="p-1 hover:bg-muted rounded">
                          <Archive className="size-4 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <DrawingForm
          fixedProjectId={fixedProjectId}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
      {openId && (
        <DrawingDetail
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function DrawingForm({ initial, fixedProjectId, onClose, onSaved }: { initial: any; fixedProjectId?: string; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(saveDrawing);
  const getSigned = useServerFn(getDrawingUploadUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<any>({
    project_id: fixedProjectId ?? initial?.project_id ?? "",
    drawing_number: initial?.drawing_number ?? "",
    drawing_title: initial?.drawing_title ?? "",
    drawing_description: initial?.drawing_description ?? "",
    drawing_type: initial?.drawing_type ?? "General Arrangement",
    drawing_category: initial?.drawing_category ?? "Construction",
    discipline: initial?.discipline ?? "General",
    zone_area: initial?.zone_area ?? "",
    floor_level: initial?.floor_level ?? "",
    issue_purpose: initial?.issue_purpose ?? "For Information",
    revision: initial?.revision ?? "Rev 0",
    issue_date: initial?.issue_date ?? "",
    received_date: initial?.received_date ?? "",
    scale: initial?.scale ?? "",
    sheet_size: initial?.sheet_size ?? "A1",
    is_client_visible: initial?.is_client_visible ?? false,
    is_confidential: initial?.is_confidential ?? false,
    is_downloadable: initial?.is_downloadable ?? true,
    file_url: initial?.file_url ?? "",
    remarks: initial?.remarks ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.project_id || !f.drawing_title) return toast.error("Project and title required");
    setSaving(true);
    try {
      let upload: any = {};
      const file = fileRef.current?.files?.[0];
      if (file) {
        try {
          const { signedUrl, path, bucket } = await getSigned({ data: { filename: file.name, content_type: file.type, project_id: f.project_id } });
          const upRes = await fetch(signedUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
          if (!upRes.ok) throw new Error("Upload failed");
          upload = { file_name: file.name, file_path: path, file_type: file.type, file_size: file.size, storage_bucket: bucket, storage_path: path };
        } catch (err: any) {
          toast.error("Storage upload failed — saving with manual URL only");
        }
      }
      await save({ data: { id: initial?.id, ...f, ...upload } });
      toast.success(initial?.id ? "Updated" : "Drawing created");
      onSaved();
    } catch (err: any) { toast.error(err?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit drawing" : "New drawing"}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit}>
          {!fixedProjectId && (
            <div><Label>Project *</Label><ProjectPicker value={f.project_id} onChange={(v) => setF({ ...f, project_id: v })} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Drawing number</Label><Input value={f.drawing_number} onChange={(e) => setF({ ...f, drawing_number: e.target.value })} placeholder="Auto if blank" /></div>
            <div><Label>Revision</Label><Input value={f.revision} onChange={(e) => setF({ ...f, revision: e.target.value })} /></div>
          </div>
          <div><Label>Title *</Label><Input value={f.drawing_title} onChange={(e) => setF({ ...f, drawing_title: e.target.value })} required /></div>
          <div><Label>Description</Label><Textarea value={f.drawing_description} onChange={(e) => setF({ ...f, drawing_description: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={f.drawing_type} onValueChange={(v) => setF({ ...f, drawing_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRAWING_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={f.drawing_category} onValueChange={(v) => setF({ ...f, drawing_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRAWING_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Discipline</Label>
              <Select value={f.discipline} onValueChange={(v) => setF({ ...f, discipline: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRAWING_DISCIPLINES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Zone / Area</Label><Input value={f.zone_area} onChange={(e) => setF({ ...f, zone_area: e.target.value })} /></div>
            <div><Label>Floor / Level</Label><Input value={f.floor_level} onChange={(e) => setF({ ...f, floor_level: e.target.value })} /></div>
            <div>
              <Label>Issue purpose</Label>
              <Select value={f.issue_purpose} onValueChange={(v) => setF({ ...f, issue_purpose: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRAWING_ISSUE_PURPOSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Issue date</Label><Input type="date" value={f.issue_date ?? ""} onChange={(e) => setF({ ...f, issue_date: e.target.value })} /></div>
            <div><Label>Received date</Label><Input type="date" value={f.received_date ?? ""} onChange={(e) => setF({ ...f, received_date: e.target.value })} /></div>
            <div>
              <Label>Sheet size</Label>
              <Select value={f.sheet_size} onValueChange={(v) => setF({ ...f, sheet_size: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRAWING_SHEET_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Scale</Label><Input value={f.scale} onChange={(e) => setF({ ...f, scale: e.target.value })} placeholder="1:100" /></div>
            <div><Label>Manual file URL (fallback)</Label><Input value={f.file_url} onChange={(e) => setF({ ...f, file_url: e.target.value })} placeholder="https://…" /></div>
          </div>
          <div><Label>Upload file</Label><Input ref={fileRef} type="file" accept="application/pdf,image/*,.dwg,.dxf" /></div>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center justify-between gap-2 border border-border rounded-sm px-3 py-2">
              <span className="text-xs">Client visible</span>
              <Switch checked={f.is_client_visible} onCheckedChange={(v) => setF({ ...f, is_client_visible: v })} />
            </label>
            <label className="flex items-center justify-between gap-2 border border-border rounded-sm px-3 py-2">
              <span className="text-xs">Confidential</span>
              <Switch checked={f.is_confidential} onCheckedChange={(v) => setF({ ...f, is_confidential: v })} />
            </label>
            <label className="flex items-center justify-between gap-2 border border-border rounded-sm px-3 py-2">
              <span className="text-xs">Downloadable</span>
              <Switch checked={f.is_downloadable} onCheckedChange={(v) => setF({ ...f, is_downloadable: v })} />
            </label>
          </div>
          <div><Label>Remarks</Label><Textarea value={f.remarks ?? ""} onChange={(e) => setF({ ...f, remarks: e.target.value })} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-accent text-white hover:bg-accent/90">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DrawingDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const get = useServerFn(getDrawing);
  const setStatus = useServerFn(setDrawingStatus);
  const addRev = useServerFn(addDrawingRevision);
  const addCmt = useServerFn(addDrawingComment);
  const distribute = useServerFn(distributeDrawing);
  const getSigned = useServerFn(getDrawingUploadUrl);
  const dl = useServerFn(getDrawingDownloadUrl);

  const q = useQuery({ queryKey: ["drawing", id], queryFn: () => get({ data: { id } }) });
  const [tab, setTab] = useState("overview");
  const [revOpen, setRevOpen] = useState(false);
  const [distOpen, setDistOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [commentVis, setCommentVis] = useState<"internal" | "client_visible">("internal");

  const setStatusM = useMutation({
    mutationFn: async (vars: { drawing_status: string; rejection_reason?: string; revision_notes?: string; approval_status?: string }) =>
      setStatus({ data: { id, ...vars } }),
    onSuccess: () => { toast.success("Status updated"); q.refetch(); onChanged(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const drw = q.data?.drawing;
  const revisions = q.data?.revisions ?? [];
  const comments = q.data?.comments ?? [];
  const history = q.data?.history ?? [];
  const distributions = q.data?.distributions ?? [];

  async function openFile(path?: string | null, url?: string | null) {
    try {
      let final = url;
      if (path) { const r = await dl({ data: { path } }); final = r.url; }
      if (!final) return toast.error("No file");
      window.open(final, "_blank");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  async function onSubmitComment() {
    if (!comment.trim()) return;
    try { await addCmt({ data: { drawing_id: id, comment, visibility: commentVis } }); setComment(""); q.refetch(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="sm:max-w-3xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{drw?.drawing_number ?? "—"} · {drw?.drawing_title ?? ""}</SheetTitle>
        </SheetHeader>
        {q.isLoading ? <Skeleton className="h-32 mt-4" /> : drw && (
          <div className="space-y-4 mt-4">
            <div className="flex gap-2 flex-wrap">
              <Badge className={STATUS_STYLE[drw.drawing_status] ?? ""}>{drw.drawing_status}</Badge>
              <Badge variant="outline">{drw.discipline}</Badge>
              <Badge variant="outline">{drw.revision}</Badge>
              <Badge variant="outline">{drw.issue_purpose}</Badge>
              {drw.is_client_visible && <Badge variant="outline" className="text-emerald-700">Client visible</Badge>}
              {drw.is_confidential && <Badge variant="outline" className="text-rose-700">Confidential</Badge>}
            </div>

            <div className="flex gap-2 flex-wrap">
              {drw.drawing_status === "Draft" && (
                <Button size="sm" onClick={() => setStatusM.mutate({ drawing_status: "Submitted", approval_status: "Submitted" })}>
                  <Send className="size-3" /> Submit
                </Button>
              )}
              {(drw.drawing_status === "Submitted" || drw.drawing_status === "Under Review") && (
                <>
                  <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => setStatusM.mutate({ drawing_status: "Approved", approval_status: "Approved" })}>
                    <CheckCircle2 className="size-3" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-rose-700"
                    onClick={() => {
                      const reason = prompt("Rejection reason?");
                      if (reason) setStatusM.mutate({ drawing_status: "Rejected", approval_status: "Rejected", rejection_reason: reason });
                    }}>
                    <XIcon className="size-3" /> Reject
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => {
                      const notes = prompt("Revision notes?");
                      if (notes) setStatusM.mutate({ drawing_status: "Revision Requested", approval_status: "Revision Requested", revision_notes: notes });
                    }}>
                    <RotateCcw className="size-3" /> Request revision
                  </Button>
                </>
              )}
              {drw.drawing_status === "Approved" && (
                <Button size="sm" onClick={() => setStatusM.mutate({ drawing_status: "Issued" })}>Mark Issued</Button>
              )}
              {drw.drawing_status === "Issued" && (
                <Button size="sm" onClick={() => setStatusM.mutate({ drawing_status: "For Construction" })}>For Construction</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setRevOpen(true)}>
                <Upload className="size-3" /> New revision
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDistOpen(true)}>
                <Share2 className="size-3" /> Distribute
              </Button>
              {(drw.file_path || drw.file_url) && (
                <Button size="sm" variant="outline" onClick={() => openFile(drw.file_path, drw.file_url)}>
                  <Download className="size-3" /> Open file
                </Button>
              )}
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="revisions">Revisions ({revisions.length})</TabsTrigger>
                <TabsTrigger value="distribution">Distribution ({distributions.length})</TabsTrigger>
                <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-3 text-sm">
                <Field label="Project" value={(drw as any).projects?.name} />
                <Field label="Type / Category" value={`${drw.drawing_type} · ${drw.drawing_category}`} />
                <Field label="Zone / Floor" value={`${drw.zone_area ?? "—"} · ${drw.floor_level ?? "—"}`} />
                <Field label="Scale / Sheet" value={`${drw.scale ?? "—"} · ${drw.sheet_size ?? "—"}`} />
                <Field label="Issue / Received" value={`${drw.issue_date ?? "—"} · ${drw.received_date ?? "—"}`} />
                <Field label="Approval" value={`${drw.approval_status} ${drw.approved_date ? `(${drw.approved_date})` : ""}`} />
                {drw.rejection_reason && <Field label="Rejection reason" value={drw.rejection_reason} />}
                {drw.revision_notes && <Field label="Revision notes" value={drw.revision_notes} />}
                {drw.remarks && <Field label="Remarks" value={drw.remarks} />}
                {drw.drawing_description && <Field label="Description" value={drw.drawing_description} />}
              </TabsContent>
              <TabsContent value="revisions">
                {revisions.length === 0 ? <Empty label="No revisions" /> : (
                  <div className="space-y-2">
                    {revisions.map((r: any) => (
                      <div key={r.id} className="border border-border rounded-sm p-3 flex justify-between items-start gap-2">
                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold">{r.revision}</span>
                            <Badge variant="outline" className={r.is_current ? "text-emerald-700" : "text-zinc-500"}>{r.revision_status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{r.revision_date} · {r.file_name ?? "—"}</div>
                          {r.change_summary && <div className="text-xs mt-1">{r.change_summary}</div>}
                        </div>
                        {(r.file_path || r.file_url) && (
                          <Button size="sm" variant="ghost" onClick={() => openFile(r.file_path, r.file_url)}>
                            <Download className="size-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="distribution">
                {distributions.length === 0 ? <Empty label="No distributions" /> : (
                  <div className="space-y-2">
                    {distributions.map((d: any) => (
                      <div key={d.id} className="border border-border rounded-sm p-3 text-sm">
                        <div className="font-medium">{d.distributed_to_name ?? d.distributed_to_email ?? "Recipient"}</div>
                        <div className="text-xs text-muted-foreground mt-1">{d.distribution_method} · {new Date(d.distributed_at).toLocaleString()}</div>
                        {d.remarks && <div className="text-xs mt-1">{d.remarks}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="comments" className="space-y-3">
                <div className="space-y-2">
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add comment…" rows={2} />
                  <div className="flex items-center justify-between">
                    <Select value={commentVis} onValueChange={(v) => setCommentVis(v as any)}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="client_visible">Client visible</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={onSubmitComment}><MessageSquare className="size-3" /> Post</Button>
                  </div>
                </div>
                {comments.length === 0 ? <Empty label="No comments" /> : (
                  <div className="space-y-2">
                    {comments.map((c: any) => (
                      <div key={c.id} className="border border-border rounded-sm p-3 text-sm">
                        <div className="flex justify-between items-center">
                          <Badge variant="outline" className="text-[10px]">{c.visibility}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <div className="mt-1">{c.comment}</div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="history">
                {history.length === 0 ? <Empty label="No status changes" /> : (
                  <div className="space-y-2">
                    {history.map((h: any) => (
                      <div key={h.id} className="border border-border rounded-sm p-3 text-sm">
                        <div className="flex items-center gap-2"><History className="size-3" />
                          <span>{h.old_status ?? "—"} → <strong>{h.new_status}</strong></span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{new Date(h.created_at).toLocaleString()}</div>
                        {h.remarks && <div className="text-xs mt-1">{h.remarks}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {revOpen && drw && (
          <NewRevisionDialog
            drawing={drw}
            onClose={() => setRevOpen(false)}
            onSaved={() => { setRevOpen(false); q.refetch(); onChanged(); }}
            addRev={addRev}
            getSigned={getSigned}
          />
        )}
        {distOpen && drw && (
          <DistributeDialog
            drawing={drw}
            revisions={revisions}
            onClose={() => setDistOpen(false)}
            onSaved={() => { setDistOpen(false); q.refetch(); }}
            distribute={distribute}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex gap-3 text-sm">
      <div className="w-32 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex-1">{value ?? "—"}</div>
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return <div className="text-center text-sm text-muted-foreground py-6">{label}</div>;
}

function NewRevisionDialog({ drawing, onClose, onSaved, addRev, getSigned }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ revision: "", revision_title: "", change_summary: "", issue_purpose: drawing.issue_purpose ?? "For Information", file_url: "" });
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.revision) return toast.error("Revision label required");
    setSaving(true);
    try {
      let upload: any = {};
      const file = fileRef.current?.files?.[0];
      if (file) {
        try {
          const { signedUrl, path, bucket } = await getSigned({ data: { filename: file.name, content_type: file.type, project_id: drawing.project_id, drawing_id: drawing.id, revision: f.revision } });
          const upRes = await fetch(signedUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
          if (!upRes.ok) throw new Error("Upload failed");
          upload = { file_name: file.name, file_path: path, file_type: file.type, file_size: file.size, storage_bucket: bucket, storage_path: path };
        } catch { toast.error("Storage upload failed — using manual URL only"); }
      }
      await addRev({ data: { drawing_id: drawing.id, ...f, ...upload } });
      toast.success("Revision uploaded");
      onSaved();
    } catch (err: any) { toast.error(err?.message ?? "Failed"); }
    finally { setSaving(false); }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>New revision</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Revision *</Label><Input value={f.revision} onChange={(e) => setF({ ...f, revision: e.target.value })} placeholder="Rev 1" required /></div>
            <div>
              <Label>Issue purpose</Label>
              <Select value={f.issue_purpose} onValueChange={(v) => setF({ ...f, issue_purpose: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRAWING_ISSUE_PURPOSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Revision title</Label><Input value={f.revision_title} onChange={(e) => setF({ ...f, revision_title: e.target.value })} /></div>
          <div><Label>Change summary</Label><Textarea value={f.change_summary} onChange={(e) => setF({ ...f, change_summary: e.target.value })} rows={2} /></div>
          <div><Label>Manual file URL (fallback)</Label><Input value={f.file_url} onChange={(e) => setF({ ...f, file_url: e.target.value })} /></div>
          <div><Label>Upload file</Label><Input ref={fileRef} type="file" accept="application/pdf,image/*,.dwg,.dxf" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-accent text-white hover:bg-accent/90">{saving ? "Uploading…" : "Save revision"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DistributeDialog({ drawing, revisions, onClose, onSaved, distribute }: any) {
  const [f, setF] = useState({ revision_id: revisions.find((r: any) => r.is_current)?.id ?? "", distributed_to_name: "", distributed_to_email: "", distribution_method: "Email", remarks: "" });
  const [saving, setSaving] = useState(false);
  const msg = `Drawing ${drawing.drawing_number} — ${drawing.drawing_title}\nRevision: ${drawing.revision}\nIssue purpose: ${drawing.issue_purpose}\nProject: ${(drawing as any).projects?.name ?? ""}`;
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await distribute({ data: { drawing_id: drawing.id, revision_id: f.revision_id || null, distributed_to_name: f.distributed_to_name || null, distributed_to_email: f.distributed_to_email || null, distribution_method: f.distribution_method, remarks: f.remarks || null } });
      toast.success("Distribution logged");
      onSaved();
    } catch (err: any) { toast.error(err?.message ?? "Failed"); }
    finally { setSaving(false); }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Distribute drawing</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Recipient name</Label><Input value={f.distributed_to_name} onChange={(e) => setF({ ...f, distributed_to_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={f.distributed_to_email} onChange={(e) => setF({ ...f, distributed_to_email: e.target.value })} /></div>
          </div>
          <div><Label>Method</Label>
            <Select value={f.distribution_method} onValueChange={(v) => setF({ ...f, distribution_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Email","System","Hand Delivery","Courier","Portal"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Remarks</Label><Textarea value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} rows={2} /></div>
          <div className="bg-muted/40 rounded-sm p-3 text-xs">
            <div className="flex justify-between mb-1"><span className="font-semibold">Distribution message</span>
              <button type="button" className="text-accent underline" onClick={() => { navigator.clipboard.writeText(msg); toast.success("Copied"); }}>Copy</button>
            </div>
            <pre className="whitespace-pre-wrap">{msg}</pre>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-accent text-white hover:bg-accent/90">{saving ? "Saving…" : "Log distribution"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

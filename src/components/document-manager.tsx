import { useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Search, Upload, Download, FileText, Archive, Send, CheckCircle2, X as XIcon,
  RotateCcw, AlertTriangle, Shield, Eye, History, MessageSquare, FolderOpen,
} from "lucide-react";
import {
  listDocuments, getDocument, saveDocument, setDocumentStatus, archiveDocument,
  addDocumentRevision, addDocumentComment, documentStats,
  getUploadSignedUrl, getDownloadUrl,
  DOCUMENT_TYPES, DOCUMENT_CATEGORIES, DISCIPLINES, DOCUMENT_STATUSES,
} from "@/lib/documents.functions";
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
  Published: "bg-emerald-100 text-emerald-700",
  Active: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
  "Revision Requested": "bg-orange-100 text-orange-700",
  Superseded: "bg-zinc-200 text-zinc-500",
  Expired: "bg-rose-100 text-rose-700",
  Cancelled: "bg-rose-50 text-rose-500",
  Archived: "bg-zinc-100 text-zinc-400",
};

type Props = { projectId?: string };

export function DocumentManager({ projectId: fixedProjectId }: Props) {
  const qc = useQueryClient();
  const list = useServerFn(listDocuments);
  const stats = useServerFn(documentStats);
  const dl = useServerFn(getDownloadUrl);
  const archive = useServerFn(archiveDocument);

  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string>("all");
  const [typeF, setTypeF] = useState<string>("all");
  const [disciplineF, setDisciplineF] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const docsQ = useQuery({
    queryKey: ["documents", fixedProjectId ?? "all"],
    queryFn: () => list({ data: { projectId: fixedProjectId } }),
  });
  const statsQ = useQuery({
    queryKey: ["documents-stats", fixedProjectId ?? "all"],
    queryFn: () => stats({ data: { projectId: fixedProjectId } }),
  });

  const rows = useMemo(() => {
    const all = docsQ.data ?? [];
    const ql = q.toLowerCase();
    return all.filter((r: any) => {
      if (ql && !(`${r.document_number ?? ""} ${r.document_title ?? ""} ${r.document_type ?? ""} ${r.discipline ?? ""} ${r.folder_path ?? ""}`.toLowerCase().includes(ql))) return false;
      if (statusF !== "all" && r.document_status !== statusF) return false;
      if (typeF !== "all" && r.document_type !== typeF) return false;
      if (disciplineF !== "all" && r.discipline !== disciplineF) return false;
      return true;
    });
  }, [docsQ.data, q, statusF, typeF, disciplineF]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["documents"] });
    qc.invalidateQueries({ queryKey: ["documents-stats"] });
  };

  async function openFile(r: any) {
    try {
      if (r.storage_path) {
        const { url } = await dl({ data: { path: r.storage_path, bucket: r.storage_bucket ?? undefined } });
        window.open(url, "_blank");
      } else if (r.file_url) {
        window.open(r.file_url, "_blank");
      } else toast.error("No file attached");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  function exportCsv() {
    const headers = ["Document No.","Title","Project","Type","Category","Discipline","Folder","Revision","Status","Approval","Issue Date","Expiry","File","Confidential","Client Visible"];
    const lines = [headers.join(",")];
    for (const r of rows as any[]) {
      lines.push([r.document_number,r.document_title,r.project_name,r.document_type,r.document_category,r.discipline,r.folder_path,r.revision,r.document_status,r.approval_status,r.issue_date,r.expiry_date,r.file_name,r.is_confidential?"Y":"",r.is_client_visible?"Y":""]
        .map((v) => `"${String(v ?? "").replace(/"/g,'""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `documents-${Date.now()}.csv`;
    a.click();
  }

  const s = statsQ.data ?? { total: 0, draft: 0, under_review: 0, approved: 0, published: 0, expired: 0, expiring: 0, client_visible: 0, confidential: 0 };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-bold">Document Manager</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Upload, classify, revise, approve and control all project documents.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="size-4" /> CSV</Button>
          <Button className="bg-accent text-white hover:bg-accent/90" onClick={() => setEditing({})}>
            <Plus className="size-4" /> New document
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Stat label="Total" value={s.total} />
        <Stat label="Draft" value={s.draft} />
        <Stat label="In Review" value={s.under_review} />
        <Stat label="Approved" value={s.approved} />
        <Stat label="Expiring" value={s.expiring} tone={s.expiring > 0 ? "warn" : undefined} />
        <Stat label="Expired" value={s.expired} tone={s.expired > 0 ? "danger" : undefined} />
      </div>

      <div className="bg-card border border-border rounded-sm p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number, title, type, folder…" className="pl-8" />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {DOCUMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeF} onValueChange={setTypeF}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={disciplineF} onValueChange={setDisciplineF}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Discipline" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All disciplines</SelectItem>
            {DISCIPLINES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {docsQ.isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No documents yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first document record to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2.5">Document #</th>
                  <th className="text-left px-3 py-2.5">Title</th>
                  {!fixedProjectId && <th className="text-left px-3 py-2.5">Project</th>}
                  <th className="text-left px-3 py-2.5">Type</th>
                  <th className="text-left px-3 py-2.5">Disc.</th>
                  <th className="text-left px-3 py-2.5">Rev</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                  <th className="text-left px-3 py-2.5">Expiry</th>
                  <th className="text-left px-3 py-2.5">Flags</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const expiring = r.expiry_date && new Date(r.expiry_date).getTime() < Date.now() + 30 * 86400000;
                  const expired = r.expiry_date && new Date(r.expiry_date).getTime() < Date.now();
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => setOpenId(r.id)}>
                      <td className="px-3 py-2.5 font-mono text-xs">{r.document_number ?? "—"}</td>
                      <td className="px-3 py-2.5 font-medium">{r.document_title}</td>
                      {!fixedProjectId && <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.project_name}</td>}
                      <td className="px-3 py-2.5 text-xs">{r.document_type}</td>
                      <td className="px-3 py-2.5 text-xs">{r.discipline ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs font-mono">{r.revision}</td>
                      <td className="px-3 py-2.5"><Badge className={`${STATUS_STYLE[r.document_status] ?? ""} text-[10px]`}>{r.document_status}</Badge></td>
                      <td className={`px-3 py-2.5 text-xs ${expired ? "text-rose-600 font-semibold" : expiring ? "text-amber-600" : ""}`}>
                        {r.expiry_date ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <div className="flex gap-1">
                          {r.is_confidential && <Shield className="size-3.5 text-rose-500" />}
                          {r.is_client_visible && <Eye className="size-3.5 text-blue-500" />}
                          {(r.storage_path || r.file_url) && <FileText className="size-3.5 text-emerald-600" />}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {(r.storage_path || r.file_url) && (
                          <button onClick={(e) => { e.stopPropagation(); openFile(r); }} className="text-accent hover:text-accent/80 mr-2">
                            <Download className="size-4 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <DocumentForm
          initial={editing}
          fixedProjectId={fixedProjectId}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
      {openId && (
        <DocumentDetail
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
          onEdit={(d) => { setOpenId(null); setEditing(d); }}
          onArchive={async (id) => {
            if (!confirm("Archive this document?")) return;
            await archive({ data: { id } });
            toast.success("Archived");
            setOpenId(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "danger" }) {
  const t = tone === "danger" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : "";
  return (
    <div className="bg-card border border-border rounded-sm p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-2xl font-display font-bold ${t}`}>{value}</p>
    </div>
  );
}

function DocumentForm({ initial, fixedProjectId, onClose, onSaved }: {
  initial: any; fixedProjectId?: string; onClose: () => void; onSaved: () => void;
}) {
  const save = useServerFn(saveDocument);
  const getSigned = useServerFn(getUploadSignedUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<any>({
    project_id: initial.project_id ?? fixedProjectId ?? null,
    document_title: initial.document_title ?? "",
    document_number: initial.document_number ?? "",
    document_description: initial.document_description ?? "",
    document_type: initial.document_type ?? "General Document",
    document_category: initial.document_category ?? "General",
    discipline: initial.discipline ?? "General",
    folder_path: initial.folder_path ?? "",
    revision: initial.revision ?? "Rev 0",
    issue_date: initial.issue_date ?? "",
    expiry_date: initial.expiry_date ?? "",
    is_confidential: initial.is_confidential ?? false,
    is_client_visible: initial.is_client_visible ?? false,
    is_downloadable: initial.is_downloadable ?? true,
    remarks: initial.remarks ?? "",
    file_url: initial.file_url ?? "",
    file_name: initial.file_name ?? "",
    file_type: initial.file_type ?? "",
    file_size: initial.file_size ?? null,
    storage_bucket: initial.storage_bucket ?? null,
    storage_path: initial.storage_path ?? null,
  });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.document_title) { toast.error("Title is required"); return; }
    setBusy(true);
    try {
      const file = fileRef.current?.files?.[0];
      let upload: any = {};
      if (file) {
        try {
          const { signedUrl, path, bucket } = await getSigned({ data: { filename: file.name, content_type: file.type, project_id: form.project_id || undefined } });
          const r = await fetch(signedUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
          if (!r.ok) throw new Error("Upload failed");
          upload = { storage_bucket: bucket, storage_path: path, file_name: file.name, file_type: file.type, file_size: file.size };
        } catch (err: any) {
          toast.warning("Storage upload failed — saving metadata only. " + (err?.message ?? ""));
        }
      }
      await save({ data: { ...(initial.id ? { id: initial.id } : {}), ...form, ...upload } });
      toast.success(initial.id ? "Document updated" : "Document created");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial.id ? "Edit document" : "New document"}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {!fixedProjectId && (
            <div><Label>Project</Label><ProjectPicker value={form.project_id ?? ""} onChange={(v) => setForm({ ...form, project_id: v || null })} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Document #</Label><Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} placeholder="Auto-generate" /></div>
            <div><Label>Revision *</Label><Input value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} required /></div>
          </div>
          <div><Label>Title *</Label><Input value={form.document_title} onChange={(e) => setForm({ ...form, document_title: e.target.value })} required /></div>
          <div><Label>Description</Label><Textarea rows={2} value={form.document_description} onChange={(e) => setForm({ ...form, document_description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Type</Label>
              <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label>
              <Select value={form.document_category} onValueChange={(v) => setForm({ ...form, document_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Discipline</Label>
              <Select value={form.discipline} onValueChange={(v) => setForm({ ...form, discipline: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DISCIPLINES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Folder path</Label><Input value={form.folder_path} onChange={(e) => setForm({ ...form, folder_path: e.target.value })} placeholder="01 Contracts" /></div>
            <div><Label>Issue date</Label><Input type="date" value={form.issue_date ?? ""} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
            <div><Label>Expiry date</Label><Input type="date" value={form.expiry_date ?? ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3 items-center">
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_confidential} onCheckedChange={(v) => setForm({ ...form, is_confidential: v })} /> Confidential</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_client_visible} onCheckedChange={(v) => setForm({ ...form, is_client_visible: v })} /> Client visible</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_downloadable} onCheckedChange={(v) => setForm({ ...form, is_downloadable: v })} /> Downloadable</label>
          </div>
          <div className="border-t border-border pt-3 space-y-3">
            <div><Label>Upload file</Label><Input ref={fileRef} type="file" /></div>
            <div className="text-[11px] text-muted-foreground -mt-1">If upload fails, you can paste a manual URL below.</div>
            <div><Label>Manual file URL</Label><Input value={form.file_url ?? ""} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://…" /></div>
          </div>
          <div><Label>Remarks</Label><Textarea rows={2} value={form.remarks ?? ""} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-accent text-white hover:bg-accent/90">{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DocumentDetail({ id, onClose, onChanged, onEdit, onArchive }: {
  id: string; onClose: () => void; onChanged: () => void;
  onEdit: (d: any) => void; onArchive: (id: string) => void;
}) {
  const qc = useQueryClient();
  const get = useServerFn(getDocument);
  const setStatus = useServerFn(setDocumentStatus);
  const addRev = useServerFn(addDocumentRevision);
  const addCmt = useServerFn(addDocumentComment);
  const dl = useServerFn(getDownloadUrl);
  const getSigned = useServerFn(getUploadSignedUrl);

  const detailQ = useQuery({ queryKey: ["document", id], queryFn: () => get({ data: { id } }) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["document", id] }); onChanged(); };

  const [comment, setComment] = useState("");
  const [showRev, setShowRev] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reqRev, setReqRev] = useState(false);

  if (!detailQ.data) {
    return (
      <Sheet open onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>Loading…</SheetTitle></SheetHeader>
          <div className="space-y-2 mt-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        </SheetContent>
      </Sheet>
    );
  }

  const { doc, revisions, comments, history } = detailQ.data as any;

  async function transition(status: string, extra: any = {}) {
    try {
      await setStatus({ data: { id, document_status: status, ...extra } });
      toast.success(`Status: ${status}`);
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  async function openFile(r: any) {
    try {
      if (r.storage_path) {
        const { url } = await dl({ data: { path: r.storage_path, bucket: r.storage_bucket ?? undefined } });
        window.open(url, "_blank");
      } else if (r.file_url) window.open(r.file_url, "_blank");
      else toast.error("No file");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">{doc.document_number}</span>
            <span>{doc.document_title}</span>
            <Badge className={`${STATUS_STYLE[doc.document_status] ?? ""} text-[10px]`}>{doc.document_status}</Badge>
            <Badge variant="outline" className="text-[10px] font-mono">{doc.revision}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 mt-4">
          {(doc.storage_path || doc.file_url) && (
            <Button size="sm" variant="outline" onClick={() => openFile(doc)}><Download className="size-3.5" /> Open file</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onEdit(doc)}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => setShowRev(true)}><Upload className="size-3.5" /> New revision</Button>
          {doc.document_status === "Draft" && (
            <Button size="sm" onClick={() => transition("Submitted", { approval_status: "Submitted" })}><Send className="size-3.5" /> Submit</Button>
          )}
          {(doc.document_status === "Submitted" || doc.document_status === "Under Review") && (
            <>
              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => transition("Approved", { approval_status: "Approved" })}>
                <CheckCircle2 className="size-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejecting(true)}><XIcon className="size-3.5" /> Reject</Button>
              <Button size="sm" variant="outline" onClick={() => setReqRev(true)}><RotateCcw className="size-3.5" /> Request revision</Button>
            </>
          )}
          {doc.document_status === "Approved" && (
            <Button size="sm" onClick={() => transition("Published")}>Publish</Button>
          )}
          <Button size="sm" variant="outline" className="text-rose-600" onClick={() => onArchive(doc.id)}><Archive className="size-3.5" /> Archive</Button>
        </div>

        <Tabs defaultValue="overview" className="mt-5">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revisions"><History className="size-3.5 mr-1" />Revisions ({revisions.length})</TabsTrigger>
            <TabsTrigger value="comments"><MessageSquare className="size-3.5 mr-1" />Comments ({comments.length})</TabsTrigger>
            <TabsTrigger value="history">Status history</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Project" value={doc.projects?.name ?? "—"} />
              <Field label="Type" value={doc.document_type} />
              <Field label="Category" value={doc.document_category} />
              <Field label="Discipline" value={doc.discipline ?? "—"} />
              <Field label="Folder" value={doc.folder_path ?? "—"} />
              <Field label="Approval" value={doc.approval_status} />
              <Field label="Issue date" value={doc.issue_date ?? "—"} />
              <Field label="Expiry" value={doc.expiry_date ?? "—"} />
              <Field label="Confidential" value={doc.is_confidential ? "Yes" : "No"} />
              <Field label="Client visible" value={doc.is_client_visible ? "Yes" : "No"} />
              <Field label="Downloadable" value={doc.is_downloadable ? "Yes" : "No"} />
              <Field label="File" value={doc.file_name ?? "—"} />
            </div>
            {doc.document_description && (
              <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</div><p className="text-sm whitespace-pre-wrap">{doc.document_description}</p></div>
            )}
            {doc.rejection_reason && (
              <div className="bg-rose-50 border border-rose-200 rounded-sm p-3 text-sm"><b>Rejection reason:</b> {doc.rejection_reason}</div>
            )}
            {doc.revision_notes && (
              <div className="bg-orange-50 border border-orange-200 rounded-sm p-3 text-sm"><b>Revision notes:</b> {doc.revision_notes}</div>
            )}
            {doc.remarks && <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Remarks</div><p className="text-sm whitespace-pre-wrap">{doc.remarks}</p></div>}
          </TabsContent>
          <TabsContent value="revisions" className="pt-3">
            {revisions.length === 0 ? <p className="text-sm text-muted-foreground">No revisions yet.</p> : (
              <div className="space-y-2">
                {revisions.map((r: any) => (
                  <div key={r.id} className="border border-border rounded-sm p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{r.revision}</span>
                        <Badge className={`${r.is_current ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"} text-[10px]`}>{r.revision_status}</Badge>
                        {r.is_current && <Badge variant="outline" className="text-[10px]">Current</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{r.file_name ?? "—"} · {new Date(r.created_at).toLocaleString()}</div>
                      {r.change_summary && <div className="text-xs mt-1">{r.change_summary}</div>}
                    </div>
                    {(r.storage_path || r.file_url) && (
                      <Button size="sm" variant="outline" onClick={() => openFile(r)}><Download className="size-3.5" /></Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="comments" className="pt-3 space-y-3">
            <div className="space-y-2">
              {comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> :
                comments.map((c: any) => (
                  <div key={c.id} className="border border-border rounded-sm p-3">
                    <div className="text-xs text-muted-foreground">{c.visibility === "client_visible" ? "Client-visible" : "Internal"} · {new Date(c.created_at).toLocaleString()}</div>
                    <p className="text-sm whitespace-pre-wrap mt-1">{c.comment}</p>
                  </div>
                ))}
            </div>
            <div className="border-t pt-3 space-y-2">
              <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" />
              <Button size="sm" disabled={!comment} onClick={async () => {
                try { await addCmt({ data: { document_id: id, comment } }); setComment(""); refresh(); }
                catch (e: any) { toast.error(e?.message ?? "Failed"); }
              }}>Post comment</Button>
            </div>
          </TabsContent>
          <TabsContent value="history" className="pt-3">
            {history.length === 0 ? <p className="text-sm text-muted-foreground">No status changes yet.</p> : (
              <div className="space-y-2">
                {history.map((h: any) => (
                  <div key={h.id} className="text-sm border border-border rounded-sm p-2">
                    <span className="font-medium">{h.old_status ?? "—"} → {h.new_status}</span>
                    <span className="text-xs text-muted-foreground ml-2">{new Date(h.created_at).toLocaleString()}</span>
                    {h.remarks && <div className="text-xs mt-1">{h.remarks}</div>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {showRev && (
          <NewRevisionDialog
            documentId={id}
            currentRevision={doc.revision ?? "Rev 0"}
            projectId={doc.project_id}
            onClose={() => setShowRev(false)}
            onSaved={() => { setShowRev(false); refresh(); }}
          />
        )}
        <Dialog open={rejecting} onOpenChange={setRejecting}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject document</DialogTitle></DialogHeader>
            <Textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason (required)" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejecting(false)}>Cancel</Button>
              <Button disabled={!rejectReason} onClick={async () => {
                await transition("Rejected", { approval_status: "Rejected", rejection_reason: rejectReason });
                setRejecting(false); setRejectReason("");
              }}>Reject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={reqRev} onOpenChange={setReqRev}>
          <DialogContent>
            <DialogHeader><DialogTitle>Request revision</DialogTitle></DialogHeader>
            <Textarea rows={4} value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} placeholder="Revision notes (required)" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setReqRev(false)}>Cancel</Button>
              <Button disabled={!revisionNotes} onClick={async () => {
                await transition("Revision Requested", { approval_status: "Revision Requested", revision_notes: revisionNotes });
                setReqRev(false); setRevisionNotes("");
              }}>Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function NewRevisionDialog({ documentId, currentRevision, projectId, onClose, onSaved }: {
  documentId: string; currentRevision: string; projectId: string | null; onClose: () => void; onSaved: () => void;
}) {
  const addRev = useServerFn(addDocumentRevision);
  const getSigned = useServerFn(getUploadSignedUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ revision: bumpRev(currentRevision), change_summary: "", file_url: "" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const file = fileRef.current?.files?.[0];
      let upload: any = {};
      if (file) {
        try {
          const { signedUrl, path, bucket } = await getSigned({ data: { filename: file.name, content_type: file.type, project_id: projectId ?? undefined } });
          const r = await fetch(signedUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
          if (!r.ok) throw new Error("Upload failed");
          upload = { storage_bucket: bucket, storage_path: path, file_name: file.name, file_type: file.type, file_size: file.size };
        } catch (err: any) { toast.warning("Upload failed — saving metadata only"); }
      }
      await addRev({ data: { document_id: documentId, revision: form.revision, change_summary: form.change_summary, file_url: form.file_url || null, ...upload } });
      toast.success("Revision added");
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload new revision</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div><Label>Revision label *</Label><Input value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} required /></div>
          <div><Label>Change summary</Label><Textarea rows={3} value={form.change_summary} onChange={(e) => setForm({ ...form, change_summary: e.target.value })} /></div>
          <div><Label>File</Label><Input ref={fileRef} type="file" /></div>
          <div><Label>or manual URL</Label><Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://…" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-accent text-white hover:bg-accent/90">{busy ? "Saving…" : "Save revision"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function bumpRev(rev: string): string {
  const m = rev?.match(/(\D*?)(\d+)$/);
  if (m) return `${m[1]}${Number(m[2]) + 1}`;
  const a = rev?.match(/^([A-Z])$/);
  if (a) return String.fromCharCode(a[1].charCodeAt(0) + 1);
  return "Rev 1";
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium text-sm">{String(value ?? "—")}</div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Search, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ProjectPicker } from "@/components/project-picker";
import { listRegister, upsertRegister, deleteRegister } from "@/lib/registers.functions";
import { PhotoUploader } from "@/components/photo-uploader";
import { CommentsThread } from "@/components/comments-thread";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const APPROVAL_TABLES = new Set(["procurement_requests", "variations", "payment_claims", "purchase_orders", "rfis", "submittals", "quality_inspections", "safety_inspections", "ncrs"]);

export type RegisterField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "select" | "photos";
  options?: { value: string; label: string }[];
  required?: boolean;
  hideInTable?: boolean;
  width?: string;
};

export type RegisterPageProps = {
  table: string;
  title: string;
  description?: string;
  fields: RegisterField[];
  projectScoped?: boolean;
  fixedProjectId?: string;            // when used inside a project tab
  statusField?: string;               // column used for colored badge
  statusStyles?: Record<string, string>;
  defaultValues?: Record<string, any>;
};

export function RegisterPage(props: RegisterPageProps) {
  const { table, title, description, fields, projectScoped, fixedProjectId, statusField, statusStyles, defaultValues } = props;

  const [projectId, setProjectId] = useState<string>(fixedProjectId ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("__all");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const qc = useQueryClient();
  const list = useServerFn(listRegister);
  const upsert = useServerFn(upsertRegister);
  const remove = useServerFn(deleteRegister);

  const effectiveProjectId = fixedProjectId ?? projectId;
  const queryKey = ["register", table, effectiveProjectId];

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => list({ data: { table: table as any, projectId: effectiveProjectId || undefined } }) as any,
    enabled: !projectScoped || !!effectiveProjectId || !fixedProjectId,
  });

  const saveMut = useMutation({
    mutationFn: (vars: { id?: string; values: any }) =>
      upsert({ data: { table: table as any, id: vars.id, values: vars.values } }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey }); setOpen(false); setEditing(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { table: table as any, id } }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const tableFields = useMemo(() => fields.filter((f) => !f.hideInTable).slice(0, 6), [fields]);
  const statusOptions = useMemo(() => {
    if (!statusField) return [] as string[];
    const f = fields.find((x) => x.name === statusField);
    return f?.options?.map((o) => o.value) ?? Array.from(new Set((rows as any[]).map((r) => r[statusField]).filter(Boolean)));
  }, [fields, statusField, rows]);

  const filtered = useMemo(() => {
    let out = rows as any[];
    if (statusField && statusFilter !== "__all") out = out.filter((r) => r[statusField] === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((r) => Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(q)));
    }
    return out;
  }, [rows, search, statusFilter, statusField]);

  function openCreate() {
    const base: Record<string, any> = { ...(defaultValues ?? {}) };
    if (effectiveProjectId) base.project_id = effectiveProjectId;
    setEditing(base);
    setOpen(true);
  }

  function openEdit(row: any) { setEditing(row); setOpen(true); }

  function handleSave() {
    if (!editing) return;
    const values: Record<string, any> = {};
    for (const f of fields) {
      const v = editing[f.name];
      if (f.required && (v == null || v === "")) {
        toast.error(`${f.label} is required`); return;
      }
      values[f.name] = f.type === "number" ? (v === "" || v == null ? null : Number(v))
        : f.type === "photos" ? (Array.isArray(v) ? v : [])
        : v;
    }
    if (projectScoped) {
      const pid = effectiveProjectId || editing.project_id;
      if (!pid) { toast.error("Select a project"); return; }
      values.project_id = pid;
    }
    saveMut.mutate({ id: editing.id, values });
  }

  function submitForApproval(row: any) {
    if (!APPROVAL_TABLES.has(table)) return;
    saveMut.mutate({ id: row.id, values: { ...row, status: "submitted" } });
    toast.success("Submitted for approval");
  }

  function exportCsv() {
    const cols = fields.map((f) => f.name);
    const header = cols.join(",");
    const escape = (v: any) => v == null ? "" : `"${String(v).replace(/"/g, '""')}"`;
    const body = (filtered as any[]).map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${table}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className={cn("space-y-4", !fixedProjectId && "p-8")}>
      {!fixedProjectId && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold">{title}</h1>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {projectScoped && <div className="w-56"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>}
            {statusField && statusOptions.length > 0 && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All statuses</SelectItem>
                  {statusOptions.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 w-56" />
            </div>
            <Button variant="outline" onClick={exportCsv} title="Export CSV"><Download className="size-4" /> CSV</Button>
            <Button onClick={openCreate} className="bg-accent text-white hover:bg-accent/90" disabled={projectScoped && !effectiveProjectId}>
              <Plus className="size-4" /> New
            </Button>
          </div>
        </div>
      )}

      {fixedProjectId && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {statusField && statusOptions.length > 0 && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All statuses</SelectItem>
                  {statusOptions.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 w-56" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-4" /> CSV</Button>
            <Button onClick={openCreate} className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> New</Button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin inline mr-2" />Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium">No records yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click New to add the first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                {tableFields.map((f) => <th key={f.name} className={cn("text-left px-4 py-3", f.width)}>{f.label}</th>)}
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  {tableFields.map((f) => (
                    <td key={f.name} className="px-4 py-3">
                      {statusField === f.name ? (
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", statusStyles?.[r[f.name]] ?? "bg-zinc-100 text-zinc-700")}>
                          {String(r[f.name] ?? "—").replace(/_/g, " ")}
                        </span>
                      ) : (
                        <span className={cn(f.type === "number" && "font-mono", "truncate block max-w-xs")}>
                          {formatCell(r[f.name], f.type)}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    {APPROVAL_TABLES.has(table) && (r.status === "draft" || !r.status) && (
                      <button onClick={() => submitForApproval(r)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded" title="Submit for approval"><Send className="size-3.5" /></button>
                    )}
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-muted rounded" title="Edit"><Pencil className="size-3.5" /></button>
                    <button onClick={() => confirm("Delete?") && delMut.mutate(r.id)} className="p-1.5 hover:bg-rose-100 text-rose-600 rounded" title="Delete"><Trash2 className="size-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} — {title}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
              {fields.map((f) => (
                <div key={f.name} className={cn((f.type === "textarea" || f.type === "photos") && "col-span-2")}>
                  <Label className="text-xs">{f.label}{f.required && <span className="text-rose-600"> *</span>}</Label>
                  {f.type === "textarea" ? (
                    <Textarea value={editing[f.name] ?? ""} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} rows={3} />
                  ) : f.type === "select" ? (
                    <Select value={editing[f.name] ?? ""} onValueChange={(v) => setEditing({ ...editing, [f.name]: v })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : f.type === "photos" ? (
                    <PhotoUploader value={editing[f.name] ?? []} onChange={(urls) => setEditing({ ...editing, [f.name]: urls })} />
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      value={editing[f.name] ?? ""}
                      onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          {editing?.id && (
            <div className="border-t border-border pt-4 mt-2">
              <Tabs defaultValue="comments">
                <TabsList>
                  <TabsTrigger value="comments">Comments</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="comments" className="mt-3">
                  <CommentsThread entityType={table} entityId={editing.id} />
                </TabsContent>
                <TabsContent value="activity" className="mt-3">
                  <ActivityTimeline entityType={table} entityId={editing.id} />
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMut.isPending} className="bg-accent text-white hover:bg-accent/90">
              {saveMut.isPending && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCell(v: any, type?: string) {
  if (v == null || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  if (type === "date" && typeof v === "string" && v.length >= 10) return v.slice(0, 10);
  return String(v);
}

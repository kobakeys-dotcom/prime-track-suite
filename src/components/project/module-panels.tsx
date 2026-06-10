import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { listSubmittals, createSubmittal, updateSubmittalStatus } from "@/lib/workflows.functions";
import { listDocuments } from "@/lib/documents.functions";
import { listBoqItems, createBoqItem, updateBoqProgress } from "@/lib/boq.functions";
import { APPROVAL_STATUSES, APPROVAL_STATUS_STYLES, statusLabel } from "@/lib/status";
import { RfiRegister } from "@/components/rfi-register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export function ProjectRfisPanel({ projectId }: { projectId: string }) {
  const fetcher = useServerFn(listRfis);
  const update = useServerFn(updateRfi);
  const create = useServerFn(createRfi);
  const qc = useQueryClient();
  const key = ["rfis", projectId];
  const { data: rows = [] } = useQuery({ queryKey: key, queryFn: () => fetcher({ data: { projectId } }) });
  const mut = useMutation({
    mutationFn: (v: { id: string; status: any }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ number: "", subject: "", question: "", due_date: "" });
  const createMut = useMutation({
    mutationFn: () => create({ data: { project_id: projectId, subject: form.subject, number: form.number || null, question: form.question || null, due_date: form.due_date || null } }),
    onSuccess: () => { toast.success("RFI created"); qc.invalidateQueries({ queryKey: key }); setOpen(false); setForm({ number: "", subject: "", question: "", due_date: "" }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> New RFI</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New RFI</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!form.subject) return; createMut.mutate(); }}>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>RFI #</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
                <div><Label>Due</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <div><Label>Subject *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
              <div><Label>Question</Label><Textarea rows={4} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending} className="bg-accent text-white hover:bg-accent/90">{createMut.isPending ? "Creating…" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {rows.length === 0 ? <EmptyState label="No RFIs yet" /> : (
        <TableShell headers={["#", "Subject", "Due", "Status"]}>
          {(rows as any[]).map((r) => (
            <tr key={r.id} className="border-t border-border hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs">{r.number ?? "—"}</td>
              <td className="px-4 py-3 font-medium">{r.subject}</td>
              <td className="px-4 py-3 text-xs">{r.due_date ?? "—"}</td>
              <td className="px-4 py-3 w-44">
                <Select value={r.status} onValueChange={(v) => mut.mutate({ id: r.id, status: v })}>
                  <SelectTrigger className={`h-8 text-xs ${APPROVAL_STATUS_STYLES[r.status]}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{APPROVAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </TableShell>
      )}
    </div>
  );
}

export function ProjectSubmittalsPanel({ projectId }: { projectId: string }) {
  const fetcher = useServerFn(listSubmittals);
  const update = useServerFn(updateSubmittalStatus);
  const create = useServerFn(createSubmittal);
  const qc = useQueryClient();
  const key = ["submittals", projectId];
  const { data: rows = [] } = useQuery({ queryKey: key, queryFn: () => fetcher({ data: { projectId } }) });
  const mut = useMutation({ mutationFn: (v: { id: string; status: any }) => update({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: key }) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ number: "", title: "", spec_section: "", due_date: "" });
  const createMut = useMutation({
    mutationFn: () => create({ data: { project_id: projectId, title: form.title, number: form.number || null, spec_section: form.spec_section || null, due_date: form.due_date || null } }),
    onSuccess: () => { toast.success("Submittal created"); qc.invalidateQueries({ queryKey: key }); setOpen(false); setForm({ number: "", title: "", spec_section: "", due_date: "" }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> New Submittal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New submittal</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!form.title) return; createMut.mutate(); }}>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>#</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
                <div><Label>Spec section</Label><Input value={form.spec_section} onChange={(e) => setForm({ ...form, spec_section: e.target.value })} /></div>
              </div>
              <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div><Label>Due</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending} className="bg-accent text-white hover:bg-accent/90">{createMut.isPending ? "Creating…" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {rows.length === 0 ? <EmptyState label="No submittals yet" /> : (
        <TableShell headers={["#", "Title", "Spec", "Due", "Status"]}>
          {(rows as any[]).map((r) => (
            <tr key={r.id} className="border-t border-border hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs">{r.number ?? "—"}</td>
              <td className="px-4 py-3 font-medium">{r.title}</td>
              <td className="px-4 py-3 text-xs">{r.spec_section ?? "—"}</td>
              <td className="px-4 py-3 text-xs">{r.due_date ?? "—"}</td>
              <td className="px-4 py-3 w-44">
                <Select value={r.status} onValueChange={(v) => mut.mutate({ id: r.id, status: v })}>
                  <SelectTrigger className={`h-8 text-xs ${APPROVAL_STATUS_STYLES[r.status]}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{APPROVAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </TableShell>
      )}
    </div>
  );
}

export function ProjectDocumentsPanel({ projectId }: { projectId: string }) {
  const fetcher = useServerFn(listDocuments);
  const { data: rows = [] } = useQuery({ queryKey: ["documents", projectId], queryFn: () => fetcher({ data: { projectId } }) });

  return rows.length === 0 ? <EmptyState label="No documents linked to this project yet" /> : (
    <TableShell headers={["Name", "Category", "Expires", "Uploaded"]}>
      {(rows as any[]).map((r) => {
        const expiring = r.expires_at && new Date(r.expires_at).getTime() < Date.now() + 30 * 86400000;
        return (
          <tr key={r.id} className="border-t border-border hover:bg-muted/30">
            <td className="px-4 py-3 font-medium">{r.name}</td>
            <td className="px-4 py-3 text-xs">{r.category ?? "—"}</td>
            <td className={`px-4 py-3 text-xs ${expiring ? "text-rose-600 font-semibold" : ""}`}>{r.expires_at ?? "—"}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
          </tr>
        );
      })}
    </TableShell>
  );
}

export function ProjectBoqPanel({ projectId }: { projectId: string }) {
  const fetcher = useServerFn(listBoqItems);
  const create = useServerFn(createBoqItem);
  const upd = useServerFn(updateBoqProgress);
  const qc = useQueryClient();
  const key = ["boq", projectId];
  const { data: rows = [] } = useQuery({ queryKey: key, queryFn: () => fetcher({ data: { projectId } }) });
  const mut = useMutation({ mutationFn: (v: { id: string; completed_qty: number }) => upd({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: key }) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ item_code: "", description: "", category: "", unit: "", quantity: "", unit_rate: "" });
  const createMut = useMutation({
    mutationFn: () => create({ data: {
      project_id: projectId,
      item_code: form.item_code || null,
      description: form.description,
      category: form.category || null,
      unit: form.unit || null,
      quantity: Number(form.quantity) || 0,
      unit_rate: Number(form.unit_rate) || 0,
    } }),
    onSuccess: () => { toast.success("BOQ item added"); qc.invalidateQueries({ queryKey: key }); setOpen(false); setForm({ item_code: "", description: "", category: "", unit: "", quantity: "", unit_rate: "" }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> New Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New BOQ item</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!form.description) return; createMut.mutate(); }}>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} /></div>
                <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              </div>
              <div><Label>Description *</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="m³" /></div>
                <div><Label>Qty</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>Rate</Label><Input type="number" value={form.unit_rate} onChange={(e) => setForm({ ...form, unit_rate: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending} className="bg-accent text-white hover:bg-accent/90">{createMut.isPending ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {rows.length === 0 ? <EmptyState label="No BOQ items yet" /> : (
        <TableShell headers={["Code", "Description", "Unit", "Qty", "Done", "Rate", "Earned"]}>
          {(rows as any[]).map((r) => {
            const earned = (Number(r.completed_qty) || 0) * (Number(r.unit_rate) || 0);
            return (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{r.item_code ?? "—"}</td>
                <td className="px-4 py-3 text-sm">{r.description}</td>
                <td className="px-4 py-3 text-xs">{r.unit ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{r.quantity}</td>
                <td className="px-4 py-3">
                  <Input type="number" defaultValue={r.completed_qty}
                    onBlur={(e) => { const v = Number(e.target.value); if (v !== r.completed_qty) mut.mutate({ id: r.id, completed_qty: v }); }}
                    className="h-8 w-20 text-xs" />
                </td>
                <td className="px-4 py-3 text-xs">{Number(r.unit_rate).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs font-medium">${earned.toLocaleString()}</td>
              </tr>
            );
          })}
        </TableShell>
      )}
    </div>
  );
}

function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
          <tr>{headers.map((h) => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="bg-card border border-border rounded-sm p-10 text-center text-sm text-muted-foreground">{label}</div>;
}

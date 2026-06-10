import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { listRfis, createRfi, updateRfi } from "@/lib/workflows.functions";
import { APPROVAL_STATUSES, APPROVAL_STATUS_STYLES, statusLabel } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ProjectPicker } from "@/components/project-picker";

export const Route = createFileRoute("/_authenticated/rfis")({
  head: () => ({ meta: [{ title: "RFIs — ProjectCore" }] }),
  component: RfisPage,
});

function RfisPage() {
  const fetcher = useServerFn(listRfis);
  const update = useServerFn(updateRfi);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["rfis"], queryFn: () => fetcher() });
  const mut = useMutation({
    mutationFn: (v: { id: string; status: any }) => update({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rfis"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">RFIs</h1>
          <p className="text-sm text-muted-foreground mt-1">Requests for information across all projects.</p>
        </div>
        <NewRfiDialog onCreated={() => qc.invalidateQueries({ queryKey: ["rfis"] })} />
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-12 text-center">
            <HelpCircle className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No RFIs yet</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr><th className="text-left px-4 py-3">#</th><th className="text-left px-4 py-3">Subject</th><th className="text-left px-4 py-3">Project</th><th className="text-left px-4 py-3">Due</th><th className="text-left px-4 py-3 w-44">Status</th></tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{r.number ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">{r.subject}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.project_name}</td>
                    <td className="px-4 py-3 text-xs">{r.due_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Select value={r.status} onValueChange={(v) => mut.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className={`h-8 text-xs ${APPROVAL_STATUS_STYLES[r.status]}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{APPROVAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function NewRfiDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ project_id: "", number: "", subject: "", question: "", due_date: "" });
  const create = useServerFn(createRfi);
  const mut = useMutation({
    mutationFn: () => create({ data: {
      project_id: form.project_id, subject: form.subject,
      number: form.number || null, question: form.question || null,
      due_date: form.due_date || null,
    } }),
    onSuccess: () => { toast.success("RFI created"); onCreated(); setOpen(false); setForm({ project_id: "", number: "", subject: "", question: "", due_date: "" }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> New RFI</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New RFI</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!form.project_id || !form.subject) return; mut.mutate(); }}>
          <div><Label>Project *</Label><ProjectPicker value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>RFI #</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="RFI-001" /></div>
            <div><Label>Due</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div><Label>Subject *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
          <div><Label>Question</Label><Textarea rows={4} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">{mut.isPending ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

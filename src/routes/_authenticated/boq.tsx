import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Calculator } from "lucide-react";
import { toast } from "sonner";
import { listBoqItems, createBoqItem, updateBoqProgress } from "@/lib/boq.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ProjectPicker } from "@/components/project-picker";

export const Route = createFileRoute("/_authenticated/boq")({
  head: () => ({ meta: [{ title: "BOQ Progress — ProjectCore" }] }),
  component: BoqPage,
});

function BoqPage() {
  const fetcher = useServerFn(listBoqItems);
  const updateProgress = useServerFn(updateBoqProgress);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["boq"], queryFn: () => fetcher({ data: {} }) });

  const totalValue = rows.reduce((sum: number, r: any) => sum + Number(r.quantity) * Number(r.unit_rate), 0);
  const earnedValue = rows.reduce((sum: number, r: any) => sum + Number(r.completed_qty) * Number(r.unit_rate), 0);

  const mut = useMutation({
    mutationFn: (v: { id: string; completed_qty: number }) => updateProgress({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boq"] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">BOQ Progress</h1>
          <p className="text-sm text-muted-foreground mt-1">Bill of quantities with planned-vs-actual tracking.</p>
        </div>
        <NewBoqDialog onCreated={() => qc.invalidateQueries({ queryKey: ["boq"] })} />
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total contract" value={`$${totalValue.toLocaleString()}`} />
          <Stat label="Earned value" value={`$${earnedValue.toLocaleString()}`} />
          <Stat label="Overall progress" value={`${totalValue > 0 ? Math.round((earnedValue / totalValue) * 100) : 0}%`} />
        </div>
      )}

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-12 text-center">
            <Calculator className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No BOQ items yet</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-left px-4 py-3">Project</th>
                  <th className="text-right px-4 py-3">Unit</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3 w-32">Completed</th>
                  <th className="text-right px-4 py-3">Rate</th>
                  <th className="text-right px-4 py-3 w-24">Progress</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const pct = Number(r.quantity) > 0 ? Math.round((Number(r.completed_qty) / Number(r.quantity)) * 100) : 0;
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{r.item_code ?? "—"}</td>
                      <td className="px-4 py-3">{r.description}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.project_name}</td>
                      <td className="px-4 py-3 text-right text-xs">{r.unit ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{r.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="number" step="0.01"
                          defaultValue={r.completed_qty}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val !== Number(r.completed_qty)) mut.mutate({ id: r.id, completed_qty: val });
                          }}
                          className="h-7 text-xs text-right"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">${Number(r.unit_rate).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-accent" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className="text-[10px] font-mono w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-sm p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-display font-bold">{value}</p>
    </div>
  );
}

function NewBoqDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ project_id: "", item_code: "", description: "", category: "", unit: "", quantity: "", unit_rate: "" });
  const create = useServerFn(createBoqItem);
  const mut = useMutation({
    mutationFn: () => create({ data: {
      project_id: form.project_id, description: form.description,
      item_code: form.item_code || null, category: form.category || null,
      unit: form.unit || null,
      quantity: Number(form.quantity || 0), unit_rate: Number(form.unit_rate || 0),
    } }),
    onSuccess: () => { toast.success("Item added"); onCreated(); setOpen(false); setForm({ project_id: "", item_code: "", description: "", category: "", unit: "", quantity: "", unit_rate: "" }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> New BOQ Item</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New BOQ item</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!form.project_id || !form.description) return; mut.mutate(); }}>
          <div><Label>Project *</Label><ProjectPicker value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Code</Label><Input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} placeholder="01.001" /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          </div>
          <div><Label>Description *</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="m³" /></div>
            <div><Label>Quantity</Label><Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div><Label>Unit rate</Label><Input type="number" step="0.01" value={form.unit_rate} onChange={(e) => setForm({ ...form, unit_rate: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">{mut.isPending ? "Adding…" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

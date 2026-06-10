import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Download, RefreshCw, Trash2, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ProjectPicker } from "@/components/project-picker";
import {
  listCashFlowPlans, upsertCashFlowPlan, archiveCashFlowPlan, generateCashFlowPeriods,
  listCashFlowEntries, upsertCashFlowEntry, archiveCashFlowEntry,
  listReceivables, upsertReceivable, archiveReceivable,
  listPayables, upsertPayable, archivePayable,
  pullReceivablesFromPaymentClaims, pullPayablesFromPOs,
  getCashFlowDashboard,
} from "@/lib/cash-flow.functions";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

const fmt = (n: number) => Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function toCSV(rows: any[], cols: { key: string; label: string }[]) {
  const head = cols.map((c) => c.label).join(",");
  const body = rows.map((r) => cols.map((c) => {
    const v = r[c.key];
    const s = v == null ? "" : String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([head + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "cash-flow.csv"; a.click(); URL.revokeObjectURL(url);
}

export function CashFlowModule({ fixedProjectId, compact = false }: { fixedProjectId?: string; compact?: boolean }) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const [planId, setPlanId] = useState<string>("");
  const [tab, setTab] = useState("dashboard");

  const listPlansFn = useServerFn(listCashFlowPlans);
  const { data: plans = [] } = useQuery({
    queryKey: ["cf-plans", projectId],
    queryFn: () => listPlansFn({ data: { projectId: projectId || undefined } }) as any,
  });

  const listEntriesFn = useServerFn(listCashFlowEntries);
  const { data: entries = [] } = useQuery({
    queryKey: ["cf-entries", projectId, planId],
    queryFn: () => listEntriesFn({ data: { projectId: projectId || undefined, planId: planId || undefined } }) as any,
    enabled: !!projectId,
  });

  const listRecvFn = useServerFn(listReceivables);
  const { data: receivables = [] } = useQuery({
    queryKey: ["cf-recv", projectId],
    queryFn: () => listRecvFn({ data: { projectId: projectId || undefined } }) as any,
    enabled: !!projectId,
  });

  const listPayFn = useServerFn(listPayables);
  const { data: payables = [] } = useQuery({
    queryKey: ["cf-pay", projectId],
    queryFn: () => listPayFn({ data: { projectId: projectId || undefined } }) as any,
    enabled: !!projectId,
  });

  const dashFn = useServerFn(getCashFlowDashboard);
  const { data: dash } = useQuery({
    queryKey: ["cf-dash", projectId],
    queryFn: () => dashFn({ data: { projectId: projectId || undefined } }) as any,
    enabled: !!projectId,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["cf-plans"] });
    qc.invalidateQueries({ queryKey: ["cf-entries"] });
    qc.invalidateQueries({ queryKey: ["cf-recv"] });
    qc.invalidateQueries({ queryKey: ["cf-pay"] });
    qc.invalidateQueries({ queryKey: ["cf-dash"] });
  };

  // mutations
  const upsertPlanFn = useServerFn(upsertCashFlowPlan);
  const archivePlanFn = useServerFn(archiveCashFlowPlan);
  const genPeriodsFn = useServerFn(generateCashFlowPeriods);
  const upsertEntryFn = useServerFn(upsertCashFlowEntry);
  const archiveEntryFn = useServerFn(archiveCashFlowEntry);
  const upsertRecvFn = useServerFn(upsertReceivable);
  const archiveRecvFn = useServerFn(archiveReceivable);
  const upsertPayFn_ = useServerFn(upsertPayable);
  const archivePayFn = useServerFn(archivePayable);
  const pullRecvFn = useServerFn(pullReceivablesFromPaymentClaims);
  const pullPayFn = useServerFn(pullPayablesFromPOs);

  const pullRecv = useMutation({
    mutationFn: () => pullRecvFn({ data: { projectId, planId: planId || null } }) as any,
    onSuccess: (r: any) => { toast.success(`Imported ${r.imported} receivables`); invalidateAll(); },
    onError: (e: any) => toast.error(e?.message ?? "Pull failed"),
  });
  const pullPay = useMutation({
    mutationFn: () => pullPayFn({ data: { projectId, planId: planId || null } }) as any,
    onSuccess: (r: any) => { toast.success(`Imported ${r.imported} payables`); invalidateAll(); },
    onError: (e: any) => toast.error(e?.message ?? "Pull failed"),
  });

  // dialogs
  const [planOpen, setPlanOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [recvOpen, setRecvOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editingRecv, setEditingRecv] = useState<any>(null);
  const [editingPay, setEditingPay] = useState<any>(null);

  const summary = dash?.summary ?? {};
  const series = dash?.series ?? [];

  const cards = useMemo(() => ([
    { label: "Opening", value: summary.opening_balance },
    { label: "Planned Inflow", value: summary.planned_inflow },
    { label: "Actual Inflow", value: summary.actual_inflow },
    { label: "Forecast Inflow", value: summary.forecast_inflow },
    { label: "Planned Outflow", value: summary.planned_outflow },
    { label: "Actual Outflow", value: summary.actual_outflow },
    { label: "Forecast Outflow", value: summary.forecast_outflow },
    { label: "Net Actual", value: summary.net_actual, accent: true },
    { label: "Net Forecast", value: summary.net_forecast, accent: true },
    { label: "Closing Balance", value: summary.closing_balance, accent: true },
    { label: "Outstanding Receivables", value: summary.outstanding_receivables },
    { label: "Outstanding Payables", value: summary.outstanding_payables },
  ]), [summary]);

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Cash Flow</h1>
            <p className="text-sm text-muted-foreground">Plan, forecast and monitor project cash inflow, outflow, receivables and payables.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        {!fixedProjectId && (
          <div className="w-64"><Label className="text-xs">Project</Label><ProjectPicker value={projectId} onChange={(v) => { setProjectId(v); setPlanId(""); }} /></div>
        )}
        <div className="w-60">
          <Label className="text-xs">Plan</Label>
          <Select value={planId || "all"} onValueChange={(v) => setPlanId(v === "all" ? "" : v)} disabled={!projectId}>
            <SelectTrigger><SelectValue placeholder="All plans" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.plan_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!projectId} onClick={() => setPlanOpen(true)}><Plus className="h-4 w-4 mr-1" />Plan</Button>
          <Button size="sm" variant="outline" disabled={!projectId} onClick={() => { setEditingEntry(null); setEntryOpen(true); }}><Plus className="h-4 w-4 mr-1" />Entry</Button>
          <Button size="sm" variant="outline" disabled={!projectId} onClick={() => { setEditingRecv(null); setRecvOpen(true); }}><Plus className="h-4 w-4 mr-1" />Receivable</Button>
          <Button size="sm" variant="outline" disabled={!projectId} onClick={() => { setEditingPay(null); setPayOpen(true); }}><Plus className="h-4 w-4 mr-1" />Payable</Button>
          <Button size="sm" variant="outline" disabled={!projectId || pullRecv.isPending} onClick={() => pullRecv.mutate()}><RefreshCw className="h-4 w-4 mr-1" />Pull Claims</Button>
          <Button size="sm" variant="outline" disabled={!projectId || pullPay.isPending} onClick={() => pullPay.mutate()}><RefreshCw className="h-4 w-4 mr-1" />Pull POs</Button>
          <Button size="sm" variant="outline" disabled={!entries.length} onClick={() => toCSV(entries, [
            { key: "period_label", label: "Period" }, { key: "category", label: "Category" },
            { key: "planned_inflow", label: "Planned In" }, { key: "actual_inflow", label: "Actual In" },
            { key: "forecast_inflow", label: "Forecast In" }, { key: "planned_outflow", label: "Planned Out" },
            { key: "actual_outflow", label: "Actual Out" }, { key: "forecast_outflow", label: "Forecast Out" },
            { key: "net_actual", label: "Net Actual" }, { key: "cumulative_forecast", label: "Cum. Forecast" },
          ])}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>
      </div>

      {!projectId ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a project to view cash flow.</CardContent></Card>
      ) : (
      <>
        {(summary.funding_gap ?? 0) > 0 || (summary.negative_periods ?? 0) > 0 ? (
          <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-3 py-2">
            <AlertTriangle className="h-4 w-4" />
            {summary.funding_gap > 0 && <span>Funding gap: <strong>{fmt(summary.funding_gap)}</strong>.</span>}
            {summary.negative_periods > 0 && <span>{summary.negative_periods} period(s) with negative forecast cash flow.</span>}
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className={`text-lg font-semibold ${c.accent ? (Number(c.value) < 0 ? "text-rose-600" : "text-emerald-600") : ""}`}>{fmt(Number(c.value ?? 0))}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="entries">Entries ({entries.length})</TabsTrigger>
            <TabsTrigger value="receivables">Receivables ({receivables.length})</TabsTrigger>
            <TabsTrigger value="payables">Payables ({payables.length})</TabsTrigger>
            <TabsTrigger value="plans">Plans ({plans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 pt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Inflow vs Outflow</CardTitle></CardHeader>
              <CardContent className="h-72">
                {series.length === 0 ? <Empty msg="No cash flow data yet." /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="period" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
                      <Bar dataKey="actual_inflow" name="Actual In" fill="#10b981" />
                      <Bar dataKey="actual_outflow" name="Actual Out" fill="#ef4444" />
                      <Bar dataKey="forecast_inflow" name="Forecast In" fill="#3b82f6" />
                      <Bar dataKey="forecast_outflow" name="Forecast Out" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Cumulative Cash Flow Curve</CardTitle></CardHeader>
              <CardContent className="h-72">
                {series.length === 0 ? <Empty msg="No data." /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="period" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
                      <Line type="monotone" dataKey="cumulative_actual" name="Cum. Actual" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="cumulative_forecast" name="Cum. Forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entries" className="pt-4">
            <Card><CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr><Th>Period</Th><Th>Category</Th><Th className="text-right">Planned In</Th><Th className="text-right">Actual In</Th><Th className="text-right">Forecast In</Th><Th className="text-right">Planned Out</Th><Th className="text-right">Actual Out</Th><Th className="text-right">Forecast Out</Th><Th className="text-right">Net Actual</Th><Th className="text-right">Cum. Forecast</Th><Th></Th></tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">No entries yet.</td></tr> :
                  entries.map((e: any) => (
                    <tr key={e.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => { setEditingEntry(e); setEntryOpen(true); }}>
                      <Td>{e.period_label}</Td><Td>{e.category}</Td>
                      <Td className="text-right">{fmt(e.planned_inflow)}</Td><Td className="text-right text-emerald-700">{fmt(e.actual_inflow)}</Td><Td className="text-right">{fmt(e.forecast_inflow)}</Td>
                      <Td className="text-right">{fmt(e.planned_outflow)}</Td><Td className="text-right text-rose-700">{fmt(e.actual_outflow)}</Td><Td className="text-right">{fmt(e.forecast_outflow)}</Td>
                      <Td className={`text-right font-medium ${Number(e.net_actual) < 0 ? "text-rose-600" : ""}`}>{fmt(e.net_actual)}</Td>
                      <Td className={`text-right ${Number(e.cumulative_forecast) < 0 ? "text-rose-600" : ""}`}>{fmt(e.cumulative_forecast)}</Td>
                      <Td><Button size="icon" variant="ghost" onClick={(ev) => { ev.stopPropagation(); if (confirm("Archive entry?")) archiveEntryFn({ data: { id: e.id } }).then(() => { toast.success("Archived"); invalidateAll(); }); }}><Trash2 className="h-4 w-4" /></Button></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="receivables" className="pt-4">
            <Card><CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase"><tr><Th>Claim/Invoice</Th><Th>Expected</Th><Th className="text-right">Claimed</Th><Th className="text-right">Certified</Th><Th className="text-right">Received</Th><Th className="text-right">Outstanding</Th><Th>Status</Th><Th></Th></tr></thead>
                <tbody>
                  {receivables.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No receivables. Use "Pull Claims" to import from payment claims.</td></tr> :
                  receivables.map((r: any) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => { setEditingRecv(r); setRecvOpen(true); }}>
                      <Td>{r.claim_number || r.invoice_number || r.description || "—"}</Td>
                      <Td>{r.expected_receipt_date ?? "—"}</Td>
                      <Td className="text-right">{fmt(r.claimed_amount)}</Td>
                      <Td className="text-right">{fmt(r.certified_amount)}</Td>
                      <Td className="text-right text-emerald-700">{fmt(r.received_amount)}</Td>
                      <Td className="text-right font-medium">{fmt(r.outstanding_amount)}</Td>
                      <Td><Badge variant="outline">{r.status}</Badge></Td>
                      <Td><Button size="icon" variant="ghost" onClick={(ev) => { ev.stopPropagation(); if (confirm("Archive?")) archiveRecvFn({ data: { id: r.id } }).then(() => { toast.success("Archived"); invalidateAll(); }); }}><Trash2 className="h-4 w-4" /></Button></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="payables" className="pt-4">
            <Card><CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase"><tr><Th>Supplier/Reference</Th><Th>Expected</Th><Th className="text-right">Committed</Th><Th className="text-right">Paid</Th><Th className="text-right">Outstanding</Th><Th>Status</Th><Th></Th></tr></thead>
                <tbody>
                  {payables.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No payables. Use "Pull POs" to import from purchase orders.</td></tr> :
                  payables.map((p: any) => (
                    <tr key={p.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => { setEditingPay(p); setPayOpen(true); }}>
                      <Td>{p.payment_reference || p.suppliers?.name || p.description || "—"}</Td>
                      <Td>{p.expected_payment_date ?? "—"}</Td>
                      <Td className="text-right">{fmt(p.committed_amount)}</Td>
                      <Td className="text-right text-emerald-700">{fmt(p.paid_amount)}</Td>
                      <Td className="text-right font-medium">{fmt(p.outstanding_amount)}</Td>
                      <Td><Badge variant="outline">{p.status}</Badge></Td>
                      <Td><Button size="icon" variant="ghost" onClick={(ev) => { ev.stopPropagation(); if (confirm("Archive?")) archivePayFn({ data: { id: p.id } }).then(() => { toast.success("Archived"); invalidateAll(); }); }}><Trash2 className="h-4 w-4" /></Button></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="plans" className="pt-4">
            <Card><CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase"><tr><Th>Plan</Th><Th>Type</Th><Th>Range</Th><Th className="text-right">Opening</Th><Th className="text-right">Net Actual</Th><Th className="text-right">Closing</Th><Th>Status</Th><Th></Th></tr></thead>
                <tbody>
                  {plans.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No plans yet.</td></tr> :
                  plans.map((p: any) => (
                    <tr key={p.id} className="border-t">
                      <Td>{p.plan_name}</Td><Td>{p.plan_type}</Td><Td>{p.start_date} → {p.end_date}</Td>
                      <Td className="text-right">{fmt(p.opening_balance)}</Td>
                      <Td className={`text-right ${Number(p.net_actual_cash_flow) < 0 ? "text-rose-600" : "text-emerald-700"}`}>{fmt(p.net_actual_cash_flow)}</Td>
                      <Td className="text-right">{fmt(p.closing_balance)}</Td>
                      <Td><Badge variant="outline">{p.status}</Badge></Td>
                      <Td>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => genPeriodsFn({ data: { planId: p.id } }).then((r: any) => { toast.success(`Generated ${r.inserted} periods`); invalidateAll(); })}><FileText className="h-3 w-3 mr-1" />Generate</Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Archive plan?")) archivePlanFn({ data: { id: p.id } }).then(() => { toast.success("Archived"); invalidateAll(); }); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </>
      )}

      <PlanDialog open={planOpen} onOpenChange={setPlanOpen} projectId={projectId} onSaved={() => { setPlanOpen(false); invalidateAll(); }} upsertFn={upsertPlanFn} />
      <EntryDialog open={entryOpen} onOpenChange={setEntryOpen} projectId={projectId} planId={planId} editing={editingEntry} onSaved={() => { setEntryOpen(false); invalidateAll(); }} upsertFn={upsertEntryFn} />
      <RecvDialog open={recvOpen} onOpenChange={setRecvOpen} projectId={projectId} planId={planId} editing={editingRecv} onSaved={() => { setRecvOpen(false); invalidateAll(); }} upsertFn={upsertRecvFn} />
      <PayDialog open={payOpen} onOpenChange={setPayOpen} projectId={projectId} planId={planId} editing={editingPay} onSaved={() => { setPayOpen(false); invalidateAll(); }} upsertFn={upsertPayFn_} />
    </div>
  );
}

function Th({ children, className = "" }: any) { return <th className={`px-3 py-2 text-left font-medium ${className}`}>{children}</th>; }
function Td({ children, className = "" }: any) { return <td className={`px-3 py-2 ${className}`}>{children}</td>; }
function Empty({ msg }: { msg: string }) { return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{msg}</div>; }

function defaultPlanForm() {
  const today = new Date();
  const end = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  return {
    plan_name: "Main Cash Flow Plan",
    plan_type: "Monthly",
    start_date: today.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    currency: "MVR",
    opening_balance: 0,
    description: "",
    status: "Active",
  };
}

function PlanDialog({ open, onOpenChange, projectId, onSaved, upsertFn }: any) {
  const [f, setF] = useState<any>(defaultPlanForm());
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setF(defaultPlanForm()); }, [open]);
  const save = async () => {
    if (!f.plan_name?.trim()) return toast.error("Plan name is required");
    if (!f.start_date || !f.end_date) return toast.error("Start and end dates required");
    if (f.end_date < f.start_date) return toast.error("End date cannot be before start date");
    setSaving(true);
    try {
      await upsertFn({ data: { ...f, project_id: projectId, opening_balance: Number(f.opening_balance) || 0 } });
      toast.success("Plan saved"); onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? e?.toString?.() ?? "Failed to save plan");
    } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Cash Flow Plan</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Plan Name</Label><Input value={f.plan_name} onChange={(e) => setF({ ...f, plan_name: e.target.value })} /></div>
          <div><Label>Type</Label>
            <Select value={f.plan_type} onValueChange={(v) => setF({ ...f, plan_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Quarterly">Quarterly</SelectItem><SelectItem value="Custom">Custom</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Currency</Label><Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></div>
          <div><Label>Start Date</Label><Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
          <div><Label>End Date</Label><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
          <div className="col-span-2"><Label>Opening Balance</Label><Input type="number" value={f.opening_balance} onChange={(e) => setF({ ...f, opening_balance: e.target.value })} /></div>
          <div className="col-span-2"><Label>Description</Label><Textarea value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultEntryForm() {
  const today = new Date().toISOString().slice(0, 10);
  const monthEnd = new Date(); monthEnd.setMonth(monthEnd.getMonth() + 1); monthEnd.setDate(0);
  return {
    period_label: today.slice(0, 7),
    period_start: today.slice(0, 8) + "01",
    period_end: monthEnd.toISOString().slice(0, 10),
    entry_type: "Both", category: "General", description: "",
    planned_inflow: 0, actual_inflow: 0, forecast_inflow: 0,
    planned_outflow: 0, actual_outflow: 0, forecast_outflow: 0,
    status: "Active", remarks: "",
  };
}

function EntryDialog({ open, onOpenChange, projectId, planId, editing, onSaved, upsertFn }: any) {
  const [f, setF] = useState<any>(defaultEntryForm());
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setF(editing ?? defaultEntryForm()); }, [open, editing]);
  const save = async () => {
    if (!f.period_label?.trim()) return toast.error("Period label is required");
    if (!f.period_start || !f.period_end) return toast.error("Period start and end dates are required");
    if (f.period_end < f.period_start) return toast.error("Period end before start");
    setSaving(true);
    try {
      const payload: any = { ...f, project_id: projectId, cash_flow_plan_id: f.cash_flow_plan_id ?? planId ?? null };
      ["planned_inflow", "actual_inflow", "forecast_inflow", "planned_outflow", "actual_outflow", "forecast_outflow"].forEach((k) => payload[k] = Number(payload[k]) || 0);
      await upsertFn({ data: payload });
      toast.success(editing ? "Entry updated" : "Entry created"); onSaved();
    } catch (e: any) { toast.error(e?.message ?? e?.toString?.() ?? "Failed to save entry"); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Cash Flow Entry</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Period Label</Label><Input value={f.period_label} onChange={(e) => setF({ ...f, period_label: e.target.value })} /></div>
          <div><Label>Period Start</Label><Input type="date" value={f.period_start ?? ""} onChange={(e) => setF({ ...f, period_start: e.target.value })} /></div>
          <div><Label>Period End</Label><Input type="date" value={f.period_end ?? ""} onChange={(e) => setF({ ...f, period_end: e.target.value })} /></div>
          <div><Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["General","Payment Claim Receipt","Client Payment","Advance Payment","Retention Release","Variation Receipt","Supplier Payment","Subcontractor Payment","Labour Cost","Material Cost","Equipment Cost","Overhead","Tax","Finance Cost","Other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Type</Label>
            <Select value={f.entry_type} onValueChange={(v) => setF({ ...f, entry_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Inflow">Inflow</SelectItem><SelectItem value="Outflow">Outflow</SelectItem><SelectItem value="Both">Both</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label><Input value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} /></div>
          {["planned_inflow","actual_inflow","forecast_inflow","planned_outflow","actual_outflow","forecast_outflow"].map((k) => (
            <div key={k}><Label className="text-xs">{k.replace(/_/g, " ")}</Label><Input type="number" value={f[k] ?? 0} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
          ))}
          <div className="col-span-3"><Label>Description</Label><Input value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="col-span-3"><Label>Remarks</Label><Textarea value={f.remarks ?? ""} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultRecvForm() {
  return { invoice_number: "", claim_number: "", description: "", expected_receipt_date: "", actual_receipt_date: "", claimed_amount: 0, certified_amount: 0, received_amount: 0, status: "Expected" };
}

function RecvDialog({ open, onOpenChange, projectId, planId, editing, onSaved, upsertFn }: any) {
  const [f, setF] = useState<any>(defaultRecvForm());
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setF(editing ?? defaultRecvForm()); }, [open, editing]);
  const save = async () => {
    if (!f.claim_number && !f.invoice_number && !f.description) return toast.error("Provide a claim number, invoice number, or description");
    if (Number(f.claimed_amount) <= 0 && Number(f.certified_amount) <= 0) return toast.error("Enter a claimed or certified amount");
    setSaving(true);
    try {
      const payload: any = { ...f, project_id: projectId, cash_flow_plan_id: f.cash_flow_plan_id ?? planId ?? null };
      ["claimed_amount","certified_amount","received_amount"].forEach((k) => payload[k] = Number(payload[k]) || 0);
      ["expected_receipt_date","actual_receipt_date"].forEach((k) => { if (!payload[k]) payload[k] = null; });
      await upsertFn({ data: payload });
      toast.success(editing ? "Receivable updated" : "Receivable created"); onSaved();
    } catch (e: any) { toast.error(e?.message ?? e?.toString?.() ?? "Failed to save receivable"); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Receivable</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Claim Number</Label><Input value={f.claim_number ?? ""} onChange={(e) => setF({ ...f, claim_number: e.target.value })} /></div>
          <div><Label>Invoice Number</Label><Input value={f.invoice_number ?? ""} onChange={(e) => setF({ ...f, invoice_number: e.target.value })} /></div>
          <div><Label>Expected Date</Label><Input type="date" value={f.expected_receipt_date ?? ""} onChange={(e) => setF({ ...f, expected_receipt_date: e.target.value })} /></div>
          <div><Label>Actual Date</Label><Input type="date" value={f.actual_receipt_date ?? ""} onChange={(e) => setF({ ...f, actual_receipt_date: e.target.value })} /></div>
          <div><Label>Claimed</Label><Input type="number" value={f.claimed_amount} onChange={(e) => setF({ ...f, claimed_amount: e.target.value })} /></div>
          <div><Label>Certified</Label><Input type="number" value={f.certified_amount} onChange={(e) => setF({ ...f, certified_amount: e.target.value })} /></div>
          <div><Label>Received</Label><Input type="number" value={f.received_amount} onChange={(e) => setF({ ...f, received_amount: e.target.value })} /></div>
          <div><Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Expected","Submitted","Certified","Partially Received","Received","Overdue","Cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Description</Label><Input value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultPayForm() {
  return { payment_reference: "", description: "", expected_payment_date: "", actual_payment_date: "", committed_amount: 0, paid_amount: 0, status: "Expected" };
}

function PayDialog({ open, onOpenChange, projectId, planId, editing, onSaved, upsertFn }: any) {
  const [f, setF] = useState<any>(defaultPayForm());
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setF(editing ?? defaultPayForm()); }, [open, editing]);
  const save = async () => {
    if (!f.payment_reference && !f.description) return toast.error("Provide a reference or description");
    if (Number(f.committed_amount) <= 0) return toast.error("Enter a committed amount");
    setSaving(true);
    try {
      const payload: any = { ...f, project_id: projectId, cash_flow_plan_id: f.cash_flow_plan_id ?? planId ?? null };
      ["committed_amount","paid_amount"].forEach((k) => payload[k] = Number(payload[k]) || 0);
      ["expected_payment_date","actual_payment_date"].forEach((k) => { if (!payload[k]) payload[k] = null; });
      delete payload.suppliers;
      await upsertFn({ data: payload });
      toast.success(editing ? "Payable updated" : "Payable created"); onSaved();
    } catch (e: any) { toast.error(e?.message ?? e?.toString?.() ?? "Failed to save payable"); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Payable</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Reference (PO / Invoice)</Label><Input value={f.payment_reference ?? ""} onChange={(e) => setF({ ...f, payment_reference: e.target.value })} /></div>
          <div><Label>Expected Date</Label><Input type="date" value={f.expected_payment_date ?? ""} onChange={(e) => setF({ ...f, expected_payment_date: e.target.value })} /></div>
          <div><Label>Actual Date</Label><Input type="date" value={f.actual_payment_date ?? ""} onChange={(e) => setF({ ...f, actual_payment_date: e.target.value })} /></div>
          <div><Label>Committed</Label><Input type="number" value={f.committed_amount} onChange={(e) => setF({ ...f, committed_amount: e.target.value })} /></div>
          <div><Label>Paid</Label><Input type="number" value={f.paid_amount} onChange={(e) => setF({ ...f, paid_amount: e.target.value })} /></div>
          <div><Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Expected","Committed","Due","Partially Paid","Paid","Overdue","Cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Description</Label><Input value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

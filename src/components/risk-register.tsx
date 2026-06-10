import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus, Search, Archive, Pencil, CheckCircle2, X as XIcon, Download,
  AlertTriangle, Paperclip, Trash2, Send, ShieldAlert, ArrowUpCircle,
} from "lucide-react";

import {
  listRisks, getRisk, saveRisk, setRiskStatus, archiveRisk,
  saveRiskAction, setRiskActionStatus, archiveRiskAction,
  addRiskAttachment, deleteRiskAttachment, addRiskComment, addRiskReview,
  escalateRisk, convertRiskToIssue, riskStats, listRiskProjectMembers,
  STATUSES, CATEGORIES, RISK_TYPES, RESPONSE_STRATEGIES, ACTION_TYPES, ACTION_STATUSES, ATTACHMENT_TYPES,
  calcLevel,
} from "@/lib/risks.functions";
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
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LEVEL_STYLE: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-rose-100 text-rose-700",
};
const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-zinc-100 text-zinc-700",
  Open: "bg-amber-100 text-amber-700",
  "Under Review": "bg-blue-100 text-blue-700",
  "Mitigation In Progress": "bg-indigo-100 text-indigo-700",
  Monitoring: "bg-violet-100 text-violet-700",
  Escalated: "bg-rose-100 text-rose-700",
  "Occurred / Converted to Issue": "bg-rose-200 text-rose-800",
  Accepted: "bg-zinc-200 text-zinc-700",
  Avoided: "bg-zinc-200 text-zinc-700",
  Transferred: "bg-zinc-200 text-zinc-700",
  Closed: "bg-zinc-200 text-zinc-600",
  Cancelled: "bg-rose-50 text-rose-500",
  Archived: "bg-zinc-100 text-zinc-400",
};

function isOverdue(r: any): boolean {
  if (!r.target_mitigation_date) return false;
  if (["Closed","Cancelled","Archived","Accepted","Avoided","Transferred"].includes(r.status)) return false;
  return r.target_mitigation_date < new Date().toISOString().slice(0, 10);
}

function csvExport(rows: any[]) {
  const headers = ["Risk No.","Title","Project","Category","Type","Owner","Probability","Impact","Risk Score","Risk Level","Response","Mitigation Plan","Residual Level","Target Date","Review Date","Status","Escalation","Cost Impact","Time Impact","Converted"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.risk_number, r.title, r.project_id, r.risk_category ?? r.category, r.risk_type,
      r.risk_owner_id ?? "", r.probability, r.impact, r.risk_score, r.risk_level,
      r.response_strategy, r.mitigation_plan ?? "", r.residual_risk_level ?? "",
      r.target_mitigation_date ?? "", r.review_date ?? "", r.status, r.escalation_status,
      r.cost_impact ? r.cost_impact_amount : "", r.time_impact ? r.time_impact_days : "",
      r.converted_to_issue ? "Yes" : "",
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `risks-${Date.now()}.csv`;
  a.click();
}

export function RiskRegister({ projectId }: { projectId?: string }) {
  const [filterProject, setFilterProject] = useState(projectId ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [escalateFor, setEscalateFor] = useState<string | null>(null);
  const [convertFor, setConvertFor] = useState<string | null>(null);

  const effectiveProject = projectId ?? filterProject;
  const qc = useQueryClient();

  const fetchList = useServerFn(listRisks);
  const fetchStats = useServerFn(riskStats);

  const listQ = useQuery({
    queryKey: ["risks", effectiveProject || "all", statusFilter],
    queryFn: () => fetchList({ data: { projectId: effectiveProject || null, status: statusFilter } }),
  });
  const statsQ = useQuery({
    queryKey: ["risk-stats", effectiveProject || "all"],
    queryFn: () => fetchStats({ data: { projectId: effectiveProject || null } }),
  });

  const rows = useMemo(() => {
    let r = listQ.data ?? [];
    if (levelFilter !== "all") r = r.filter((x: any) => x.risk_level === levelFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      r = r.filter((x: any) =>
        [x.risk_number, x.title, x.description, x.risk_category, x.risk_source, x.mitigation_plan]
          .some((v) => String(v ?? "").toLowerCase().includes(s)));
    }
    return r;
  }, [listQ.data, levelFilter, search]);

  const archiveMut = useMutation({
    mutationFn: useServerFn(archiveRisk),
    onSuccess: () => { toast.success("Risk archived"); qc.invalidateQueries({ queryKey: ["risks"] }); qc.invalidateQueries({ queryKey: ["risk-stats"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["risks"] });
    qc.invalidateQueries({ queryKey: ["risk-stats"] });
    if (detailId) qc.invalidateQueries({ queryKey: ["risk", detailId] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold flex-1">Risk Register</h2>
        {!projectId && <ProjectPicker value={filterProject} onChange={setFilterProject} placeholder="All projects" />}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 w-56" placeholder="Search risks…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {["Low","Medium","High","Critical"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => csvExport(rows)}><Download className="h-4 w-4 mr-1" />CSV</Button>
        <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }} disabled={!effectiveProject && !projectId}>
          <Plus className="h-4 w-4 mr-1" />New Risk
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard label="Total" value={statsQ.data?.total ?? 0} />
        <StatCard label="Open" value={statsQ.data?.open ?? 0} />
        <StatCard label="High" value={statsQ.data?.high ?? 0} tone="orange" />
        <StatCard label="Critical" value={statsQ.data?.critical ?? 0} tone="rose" />
        <StatCard label="Overdue" value={statsQ.data?.overdue ?? 0} tone="rose" />
        <StatCard label="Escalated" value={statsQ.data?.escalated ?? 0} tone="orange" />
        <StatCard label="To Issues" value={statsQ.data?.converted ?? 0} />
        <StatCard label="Closed" value={statsQ.data?.closed ?? 0} />
      </div>

      <RiskMatrix rows={listQ.data ?? []} />

      <Card>
        <CardContent className="p-0">
          {listQ.isLoading ? (
            <div className="p-4 space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No risks found.{!effectiveProject && !projectId && " Select a project or click New Risk."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2">No.</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">P</th>
                    <th className="px-3 py-2">I</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Level</th>
                    <th className="px-3 py-2">Residual</th>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDetailId(r.id)}>
                      <td className="px-3 py-2 font-mono text-xs">{r.risk_number}</td>
                      <td className="px-3 py-2 font-medium">{r.title}
                        {isOverdue(r) && <Badge className="ml-2 bg-rose-100 text-rose-700">Overdue</Badge>}
                        {r.escalation_status === "Escalated" && <Badge className="ml-1 bg-orange-100 text-orange-700">Escalated</Badge>}
                        {r.converted_to_issue && <Badge className="ml-1 bg-purple-100 text-purple-700">Issue</Badge>}
                      </td>
                      <td className="px-3 py-2">{r.risk_category ?? r.category}</td>
                      <td className="px-3 py-2 text-center">{r.probability}</td>
                      <td className="px-3 py-2 text-center">{r.impact}</td>
                      <td className="px-3 py-2 text-center font-semibold">{r.risk_score}</td>
                      <td className="px-3 py-2"><Badge className={LEVEL_STYLE[r.risk_level] ?? ""}>{r.risk_level}</Badge></td>
                      <td className="px-3 py-2">{r.residual_risk_level ? <Badge className={LEVEL_STYLE[r.residual_risk_level] ?? ""}>{r.residual_risk_level}</Badge> : "—"}</td>
                      <td className="px-3 py-2 text-xs">{r.target_mitigation_date ?? "—"}</td>
                      <td className="px-3 py-2"><Badge className={STATUS_STYLE[r.status] ?? ""}>{r.status}</Badge></td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpenForm(true); }}><Pencil className="h-3.5 w-3.5"/></Button>
                          {(r.risk_level === "High" || r.risk_level === "Critical") && r.escalation_status !== "Escalated" && (
                            <Button size="sm" variant="ghost" onClick={() => setEscalateFor(r.id)} title="Escalate"><ArrowUpCircle className="h-3.5 w-3.5 text-orange-600"/></Button>
                          )}
                          {!r.converted_to_issue && (
                            <Button size="sm" variant="ghost" onClick={() => setConvertFor(r.id)} title="Convert to Issue"><ShieldAlert className="h-3.5 w-3.5 text-rose-600"/></Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setConfirmArchive(r.id)}><Archive className="h-3.5 w-3.5"/></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <RiskFormDialog
        open={openForm}
        onOpenChange={(o) => { setOpenForm(o); if (!o) setEditing(null); }}
        projectId={projectId ?? effectiveProject}
        editing={editing}
        onSaved={() => { invalidateAll(); setOpenForm(false); setEditing(null); }}
      />

      <RiskDetailSheet
        riskId={detailId}
        onOpenChange={(o) => { if (!o) setDetailId(null); }}
        onChange={invalidateAll}
        onEdit={(r) => { setEditing(r); setOpenForm(true); setDetailId(null); }}
        onEscalate={(id) => setEscalateFor(id)}
        onConvert={(id) => setConvertFor(id)}
      />

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive risk?</AlertDialogTitle>
            <AlertDialogDescription>The risk will be hidden from the register. You can restore it later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmArchive) archiveMut.mutate({ data: { id: confirmArchive } }); setConfirmArchive(null); }}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EscalateDialog id={escalateFor} onClose={() => setEscalateFor(null)} onDone={invalidateAll} />
      <ConvertDialog id={convertFor} onClose={() => setConvertFor(null)} onDone={invalidateAll} />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "rose"|"orange" }) {
  const cls = tone === "rose" ? "text-rose-700" : tone === "orange" ? "text-orange-700" : "";
  return (
    <Card><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}

function RiskMatrix({ rows }: { rows: any[] }) {
  // 5x5 matrix; rows = impact (5 top), cols = probability (1..5)
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const key = `${r.impact}-${r.probability}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const cellBg = (score: number) => {
    if (score >= 16) return "bg-rose-200 text-rose-900";
    if (score >= 10) return "bg-orange-200 text-orange-900";
    if (score >= 5) return "bg-blue-200 text-blue-900";
    return "bg-emerald-200 text-emerald-900";
  };
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs font-semibold mb-2">Risk Matrix (Impact × Probability)</div>
      <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-1 text-xs">
        <div></div>
        {[1,2,3,4,5].map((p) => <div key={p} className="text-center font-semibold">P{p}</div>)}
        {[5,4,3,2,1].map((i) => (
          <FragmentRow key={i} i={i} counts={counts} cellBg={cellBg} />
        ))}
      </div>
    </CardContent></Card>
  );
}
function FragmentRow({ i, counts, cellBg }: { i: number; counts: Record<string, number>; cellBg: (s: number) => string }) {
  return (
    <>
      <div className="font-semibold pr-2 self-center">I{i}</div>
      {[1,2,3,4,5].map((p) => {
        const c = counts[`${i}-${p}`] ?? 0;
        return <div key={p} className={`h-10 rounded flex items-center justify-center font-bold ${cellBg(i*p)}`}>{c || ""}</div>;
      })}
    </>
  );
}

// ----- Form Dialog -----
function RiskFormDialog({ open, onOpenChange, projectId, editing, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; projectId?: string; editing: any | null; onSaved: () => void;
}) {
  const e = editing;
  const [form, setForm] = useState<any>(() => initForm(e, projectId));
  const fetchMembers = useServerFn(listRiskProjectMembers);
  const members = useQuery({ queryKey: ["risk-members", projectId], queryFn: () => fetchMembers({ data: { projectId: projectId ?? null } }) });

  // reset form when opening with new editing
  const formKey = `${editing?.id ?? "new"}-${projectId ?? ""}`;
  const [keyRef, setKeyRef] = useState(formKey);
  if (keyRef !== formKey && open) {
    setKeyRef(formKey);
    setForm(initForm(editing, projectId));
  }

  const score = (form.probability ?? 3) * (form.impact ?? 3);
  const level = calcLevel(score);
  const rScore = form.residual_probability && form.residual_impact ? form.residual_probability * form.residual_impact : null;
  const rLevel = rScore ? calcLevel(rScore) : null;

  const mut = useMutation({
    mutationFn: (data: any) => sb({ data }),
    onSuccess: () => { toast.success(editing ? "Risk updated" : "Risk created"); onSaved(); },
    onError: (er: any) => toast.error(er.message),
  });

  const submit = (status?: string) => {
    if (!form.project_id) return toast.error("Project required");
    if (!form.risk_title?.trim()) return toast.error("Title required");
    mut.mutate({ ...form, status: status ?? form.status });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Risk" : "New Risk"}</DialogTitle></DialogHeader>

        <div className="grid md:grid-cols-2 gap-3">
          {!projectId && (
            <div className="md:col-span-2">
              <Label>Project</Label>
              <ProjectPicker value={form.project_id ?? ""} onChange={(v) => setForm({ ...form, project_id: v })} />
            </div>
          )}
          <div className="md:col-span-2">
            <Label>Risk title*</Label>
            <Input value={form.risk_title ?? ""} onChange={(ev) => setForm({ ...form, risk_title: ev.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={form.risk_description ?? ""} onChange={(ev) => setForm({ ...form, risk_description: ev.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.risk_category} onValueChange={(v) => setForm({ ...form, risk_category: v })}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.risk_type} onValueChange={(v) => setForm({ ...form, risk_type: v })}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{RISK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Source</Label>
            <Input value={form.risk_source ?? ""} onChange={(ev) => setForm({ ...form, risk_source: ev.target.value })} />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location ?? ""} onChange={(ev) => setForm({ ...form, location: ev.target.value })} />
          </div>
          <div>
            <Label>Risk owner</Label>
            <Select value={form.risk_owner_id ?? "none"} onValueChange={(v) => setForm({ ...form, risk_owner_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Select…"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {(members.data ?? []).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assigned to</Label>
            <Select value={form.assigned_to ?? "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Select…"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {(members.data ?? []).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Probability (1–5)</Label>
            <Input type="number" min={1} max={5} value={form.probability} onChange={(ev) => setForm({ ...form, probability: Number(ev.target.value) })}/>
          </div>
          <div>
            <Label>Impact (1–5)</Label>
            <Input type="number" min={1} max={5} value={form.impact} onChange={(ev) => setForm({ ...form, impact: Number(ev.target.value) })}/>
          </div>
          <div className="md:col-span-2 flex items-center gap-3 p-2 rounded bg-muted/40">
            <span className="text-sm">Risk Score: <strong>{score}</strong></span>
            <Badge className={LEVEL_STYLE[level]}>{level}</Badge>
            {rScore && <><span className="text-sm">Residual: <strong>{rScore}</strong></span><Badge className={LEVEL_STYLE[rLevel!]}>{rLevel}</Badge></>}
          </div>

          <div>
            <Label>Response strategy</Label>
            <Select value={form.response_strategy} onValueChange={(v) => setForm({ ...form, response_strategy: v })}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{RESPONSE_STRATEGIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target mitigation date</Label>
            <Input type="date" value={form.target_mitigation_date ?? ""} onChange={(ev) => setForm({ ...form, target_mitigation_date: ev.target.value || null })}/>
          </div>
          <div className="md:col-span-2">
            <Label>Mitigation plan</Label>
            <Textarea rows={2} value={form.mitigation_plan ?? ""} onChange={(ev) => setForm({ ...form, mitigation_plan: ev.target.value })}/>
          </div>
          <div className="md:col-span-2">
            <Label>Contingency plan</Label>
            <Textarea rows={2} value={form.contingency_plan ?? ""} onChange={(ev) => setForm({ ...form, contingency_plan: ev.target.value })}/>
          </div>
          <div>
            <Label>Trigger condition</Label>
            <Input value={form.trigger_condition ?? ""} onChange={(ev) => setForm({ ...form, trigger_condition: ev.target.value })}/>
          </div>
          <div>
            <Label>Early warning signs</Label>
            <Input value={form.early_warning_signs ?? ""} onChange={(ev) => setForm({ ...form, early_warning_signs: ev.target.value })}/>
          </div>

          <div>
            <Label>Residual probability</Label>
            <Input type="number" min={1} max={5} value={form.residual_probability ?? ""} onChange={(ev) => setForm({ ...form, residual_probability: ev.target.value ? Number(ev.target.value) : null })}/>
          </div>
          <div>
            <Label>Residual impact</Label>
            <Input type="number" min={1} max={5} value={form.residual_impact ?? ""} onChange={(ev) => setForm({ ...form, residual_impact: ev.target.value ? Number(ev.target.value) : null })}/>
          </div>
          <div>
            <Label>Review date</Label>
            <Input type="date" value={form.review_date ?? ""} onChange={(ev) => setForm({ ...form, review_date: ev.target.value || null })}/>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status ?? "Open"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{STATUSES.filter((s) => s !== "Archived").map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3 p-2 rounded bg-muted/30">
            <ImpactToggle label="Cost" v={form.cost_impact} onChange={(b) => setForm({ ...form, cost_impact: b })}/>
            {form.cost_impact && <Input type="number" min={0} placeholder="Amount" value={form.cost_impact_amount} onChange={(ev) => setForm({ ...form, cost_impact_amount: Number(ev.target.value) })}/>}
            <ImpactToggle label="Time" v={form.time_impact} onChange={(b) => setForm({ ...form, time_impact: b })}/>
            {form.time_impact && <Input type="number" min={0} placeholder="Days" value={form.time_impact_days} onChange={(ev) => setForm({ ...form, time_impact_days: Number(ev.target.value) })}/>}
            <ImpactToggle label="Safety" v={form.safety_impact} onChange={(b) => setForm({ ...form, safety_impact: b })}/>
            <ImpactToggle label="Quality" v={form.quality_impact} onChange={(b) => setForm({ ...form, quality_impact: b })}/>
            <ImpactToggle label="Client" v={form.client_impact} onChange={(b) => setForm({ ...form, client_impact: b })}/>
            <ImpactToggle label="Client visible" v={form.is_client_visible} onChange={(b) => setForm({ ...form, is_client_visible: b })}/>
          </div>

          <div className="md:col-span-2">
            <Label>Remarks</Label>
            <Textarea rows={2} value={form.remarks ?? ""} onChange={(ev) => setForm({ ...form, remarks: ev.target.value })}/>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {!editing && <Button variant="secondary" onClick={() => submit("Draft")} disabled={mut.isPending}>Save Draft</Button>}
          <Button onClick={() => submit()} disabled={mut.isPending}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImpactToggle({ label, v, onChange }: { label: string; v: boolean; onChange: (b: boolean) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm"><Switch checked={!!v} onCheckedChange={onChange}/><span>{label}</span></div>
  );
}

function initForm(e: any | null, projectId?: string): any {
  if (e) return {
    id: e.id, project_id: e.project_id,
    risk_number: e.risk_number, risk_title: e.title, risk_description: e.description,
    risk_category: e.risk_category ?? e.category ?? "General", risk_type: e.risk_type ?? "Threat",
    risk_source: e.risk_source, location: e.location,
    risk_owner_id: e.risk_owner_id, assigned_to: e.assigned_to, identified_by: e.identified_by,
    probability: e.probability ?? 3, impact: e.impact ?? 3,
    response_strategy: e.response_strategy ?? "Mitigate",
    mitigation_plan: e.mitigation_plan ?? e.mitigation_action, contingency_plan: e.contingency_plan,
    trigger_condition: e.trigger_condition, early_warning_signs: e.early_warning_signs,
    residual_probability: e.residual_probability, residual_impact: e.residual_impact,
    target_mitigation_date: e.target_mitigation_date, review_date: e.review_date,
    cost_impact: !!e.cost_impact, cost_impact_amount: Number(e.cost_impact_amount ?? 0),
    time_impact: !!e.time_impact, time_impact_days: Number(e.time_impact_days ?? 0),
    safety_impact: !!e.safety_impact, quality_impact: !!e.quality_impact, client_impact: !!e.client_impact,
    remarks: e.remarks, is_client_visible: !!e.is_client_visible, status: e.status ?? "Open",
  };
  return {
    project_id: projectId ?? "", risk_title: "", risk_description: "",
    risk_category: "General", risk_type: "Threat",
    probability: 3, impact: 3, response_strategy: "Mitigate",
    cost_impact: false, cost_impact_amount: 0, time_impact: false, time_impact_days: 0,
    safety_impact: false, quality_impact: false, client_impact: false,
    is_client_visible: false, status: "Open",
  };
}

// helper because TanStack useServerFn binds with hook semantics; use directly via callback
function useServerFnCall<T>(_fn: any, _data: any): Promise<T> {
  // dummy — kept for satisfying hook signature; replaced by actual useServerFn call below
  return Promise.resolve(_fn) as any;
}

// ----- Detail Sheet -----
function RiskDetailSheet({ riskId, onOpenChange, onChange, onEdit, onEscalate, onConvert }: {
  riskId: string | null;
  onOpenChange: (o: boolean) => void;
  onChange: () => void;
  onEdit: (r: any) => void;
  onEscalate: (id: string) => void;
  onConvert: (id: string) => void;
}) {
  const fetchOne = useServerFn(getRisk);
  const q = useQuery({
    queryKey: ["risk", riskId],
    queryFn: () => fetchOne({ data: { id: riskId! } }),
    enabled: !!riskId,
  });
  const r = q.data?.risk as any;

  const setStatus = useServerFn(setRiskStatus);
  const statusMut = useMutation({
    mutationFn: (data: any) => setStatus({ data }),
    onSuccess: () => { toast.success("Status updated"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open={!!riskId} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{r?.risk_number} — {r?.title}</SheetTitle></SheetHeader>
        {q.isLoading || !r ? <Skeleton className="h-40 w-full mt-4"/> : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className={LEVEL_STYLE[r.risk_level]}>{r.risk_level}</Badge>
              <Badge className={STATUS_STYLE[r.status]}>{r.status}</Badge>
              <Badge variant="outline">{r.risk_category ?? r.category}</Badge>
              <Badge variant="outline">{r.risk_type}</Badge>
              <Badge variant="outline">{r.response_strategy}</Badge>
              {isOverdue(r) && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
              {r.escalation_status === "Escalated" && <Badge className="bg-orange-100 text-orange-700">Escalated</Badge>}
              {r.converted_to_issue && <Badge className="bg-purple-100 text-purple-700">Converted</Badge>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(r)}><Pencil className="h-3.5 w-3.5 mr-1"/>Edit</Button>
              <Select value={r.status} onValueChange={(v) => statusMut.mutate({ id: r.id, status: v })}>
                <SelectTrigger className="w-56"><SelectValue/></SelectTrigger>
                <SelectContent>{STATUSES.filter((s) => s !== "Archived").map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              {(r.risk_level === "High" || r.risk_level === "Critical") && r.escalation_status !== "Escalated" && (
                <Button size="sm" variant="outline" onClick={() => onEscalate(r.id)}><ArrowUpCircle className="h-3.5 w-3.5 mr-1"/>Escalate</Button>
              )}
              {!r.converted_to_issue && (
                <Button size="sm" variant="outline" onClick={() => onConvert(r.id)}><ShieldAlert className="h-3.5 w-3.5 mr-1"/>Convert to Issue</Button>
              )}
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="flex-wrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="actions">Actions ({q.data?.actions.length ?? 0})</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({q.data?.reviews.length ?? 0})</TabsTrigger>
                <TabsTrigger value="attachments">Files ({q.data?.attachments.length ?? 0})</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-2 pt-3 text-sm">
                <Row k="Description" v={r.description}/>
                <Row k="Source" v={r.risk_source}/>
                <Row k="Location" v={r.location}/>
                <Row k="Probability × Impact" v={`${r.probability} × ${r.impact} = ${r.risk_score}`}/>
                <Row k="Residual" v={r.residual_risk_score ? `${r.residual_probability} × ${r.residual_impact} = ${r.residual_risk_score} (${r.residual_risk_level})` : "—"}/>
                <Row k="Mitigation plan" v={r.mitigation_plan}/>
                <Row k="Contingency plan" v={r.contingency_plan}/>
                <Row k="Trigger" v={r.trigger_condition}/>
                <Row k="Warning signs" v={r.early_warning_signs}/>
                <Row k="Target date" v={r.target_mitigation_date}/>
                <Row k="Actual date" v={r.actual_mitigation_date}/>
                <Row k="Review date" v={r.review_date}/>
                <Row k="Cost impact" v={r.cost_impact ? r.cost_impact_amount : "No"}/>
                <Row k="Time impact" v={r.time_impact ? `${r.time_impact_days} days` : "No"}/>
                <Row k="Escalation reason" v={r.escalation_reason}/>
                <Row k="Remarks" v={r.remarks}/>
              </TabsContent>

              <TabsContent value="actions" className="pt-3"><ActionsPanel riskId={r.id} actions={q.data?.actions ?? []} onChange={onChange}/></TabsContent>
              <TabsContent value="reviews" className="pt-3"><ReviewsPanel riskId={r.id} reviews={q.data?.reviews ?? []} onChange={onChange}/></TabsContent>
              <TabsContent value="attachments" className="pt-3"><AttachmentsPanel riskId={r.id} items={q.data?.attachments ?? []} onChange={onChange}/></TabsContent>
              <TabsContent value="comments" className="pt-3"><CommentsPanel riskId={r.id} items={q.data?.comments ?? []} onChange={onChange}/></TabsContent>
              <TabsContent value="history" className="pt-3">
                <div className="space-y-1 text-xs">
                  {(q.data?.history ?? []).map((h: any) => (
                    <div key={h.id} className="flex gap-2 border-l-2 pl-2">
                      <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                      <span>{h.old_status ?? "—"} → <strong>{h.new_status}</strong></span>
                      {h.remarks && <span className="text-muted-foreground">— {h.remarks}</span>}
                    </div>
                  ))}
                  {(q.data?.history ?? []).length === 0 && <div className="text-muted-foreground">No history</div>}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b pb-1">
      <div className="text-muted-foreground text-xs uppercase tracking-wider">{k}</div>
      <div className="col-span-2 whitespace-pre-wrap">{v == null || v === "" ? "—" : String(v)}</div>
    </div>
  );
}

function ActionsPanel({ riskId, actions, onChange }: { riskId: string; actions: any[]; onChange: () => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<any>({ action_title: "", action_type: "Mitigation", status: "Open", priority: "Medium", progress_percentage: 0 });
  const save = useServerFn(saveRiskAction);
  const setStatus = useServerFn(setRiskActionStatus);
  const arch = useServerFn(archiveRiskAction);
  const saveMut = useMutation({ mutationFn: (d: any) => save({ data: d }), onSuccess: () => { toast.success("Saved"); onChange(); setAdding(false); setForm({ action_title: "", action_type: "Mitigation", status: "Open", priority: "Medium", progress_percentage: 0 }); }, onError: (e: any) => toast.error(e.message) });
  const statusMut = useMutation({ mutationFn: (d: any) => setStatus({ data: d }), onSuccess: () => onChange() });
  const archMut = useMutation({ mutationFn: (d: any) => arch({ data: d }), onSuccess: () => onChange() });

  return (
    <div className="space-y-2">
      {actions.map((a) => {
        const overdue = a.target_date && a.target_date < new Date().toISOString().slice(0, 10) && !["Completed","Cancelled"].includes(a.status);
        return (
          <div key={a.id} className="border rounded p-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="font-medium flex-1">{a.action_title}</div>
              <Badge variant="outline">{a.action_type}</Badge>
              <Badge className={a.status === "Completed" ? "bg-emerald-100 text-emerald-700" : ""}>{a.status}</Badge>
              {overdue && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
            </div>
            {a.action_description && <div className="text-xs text-muted-foreground mt-1">{a.action_description}</div>}
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span>Target: {a.target_date ?? "—"}</span>
              <span>Progress: {a.progress_percentage}%</span>
              <Select value={a.status} onValueChange={(v) => statusMut.mutate({ id: a.id, status: v })}>
                <SelectTrigger className="h-7 w-36"><SelectValue/></SelectTrigger>
                <SelectContent>{ACTION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => archMut.mutate({ id: a.id })}><Trash2 className="h-3.5 w-3.5"/></Button>
            </div>
          </div>
        );
      })}
      {adding ? (
        <div className="border rounded p-2 space-y-2">
          <Input placeholder="Action title*" value={form.action_title} onChange={(e) => setForm({ ...form, action_title: e.target.value })}/>
          <Textarea rows={2} placeholder="Description" value={form.action_description ?? ""} onChange={(e) => setForm({ ...form, action_description: e.target.value })}/>
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{ACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={form.target_date ?? ""} onChange={(e) => setForm({ ...form, target_date: e.target.value || null })}/>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { if (!form.action_title) return toast.error("Title required"); saveMut.mutate({ ...form, risk_id: riskId }); }}>Save</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5 mr-1"/>Add action</Button>
      )}
    </div>
  );
}

function ReviewsPanel({ riskId, reviews, onChange }: { riskId: string; reviews: any[]; onChange: () => void }) {
  const [form, setForm] = useState<any>({ probability: 3, impact: 3, applyToRisk: true });
  const add = useServerFn(addRiskReview);
  const mut = useMutation({ mutationFn: (d: any) => add({ data: d }), onSuccess: () => { toast.success("Review added"); onChange(); }, onError: (e: any) => toast.error(e.message) });
  return (
    <div className="space-y-2">
      {reviews.map((rv) => (
        <div key={rv.id} className="border rounded p-2 text-sm">
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground">{rv.review_date}</span>
            <Badge className={LEVEL_STYLE[rv.risk_level] ?? ""}>{rv.risk_level}</Badge>
            <span>P{rv.probability} × I{rv.impact} = {rv.risk_score}</span>
          </div>
          {rv.review_notes && <div className="text-xs mt-1">{rv.review_notes}</div>}
        </div>
      ))}
      <div className="border rounded p-2 space-y-2">
        <div className="text-xs font-semibold">Add review</div>
        <div className="grid grid-cols-3 gap-2">
          <Input type="number" min={1} max={5} value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}/>
          <Input type="number" min={1} max={5} value={form.impact} onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })}/>
          <Input type="date" placeholder="Next review" value={form.next_review_date ?? ""} onChange={(e) => setForm({ ...form, next_review_date: e.target.value || null })}/>
        </div>
        <Textarea rows={2} placeholder="Notes" value={form.review_notes ?? ""} onChange={(e) => setForm({ ...form, review_notes: e.target.value })}/>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs"><Switch checked={form.applyToRisk} onCheckedChange={(b) => setForm({ ...form, applyToRisk: b })}/>Apply to risk</label>
          <Button size="sm" onClick={() => mut.mutate({ ...form, risk_id: riskId })}>Add</Button>
        </div>
      </div>
    </div>
  );
}

function AttachmentsPanel({ riskId, items, onChange }: { riskId: string; items: any[]; onChange: () => void }) {
  const [form, setForm] = useState<any>({ file_name: "", file_url: "", attachment_type: "Risk Document" });
  const add = useServerFn(addRiskAttachment);
  const del = useServerFn(deleteRiskAttachment);
  const addMut = useMutation({ mutationFn: (d: any) => add({ data: d }), onSuccess: () => { toast.success("Added"); onChange(); setForm({ file_name: "", file_url: "", attachment_type: "Risk Document" }); }, onError: (e: any) => toast.error(e.message) });
  const delMut = useMutation({ mutationFn: (d: any) => del({ data: d }), onSuccess: () => onChange() });
  return (
    <div className="space-y-2">
      {items.map((a) => (
        <div key={a.id} className="flex items-center gap-2 border rounded p-2 text-sm">
          <Paperclip className="h-3.5 w-3.5"/>
          <a href={a.file_url} target="_blank" rel="noreferrer" className="flex-1 underline">{a.file_name}</a>
          <Badge variant="outline" className="text-xs">{a.attachment_type}</Badge>
          <Button size="sm" variant="ghost" onClick={() => delMut.mutate({ id: a.id })}><Trash2 className="h-3.5 w-3.5"/></Button>
        </div>
      ))}
      <div className="border rounded p-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="File name" value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })}/>
          <Select value={form.attachment_type} onValueChange={(v) => setForm({ ...form, attachment_type: v })}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{ATTACHMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Input placeholder="File URL" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })}/>
        <Button size="sm" onClick={() => { if (!form.file_name || !form.file_url) return toast.error("Name and URL required"); addMut.mutate({ ...form, risk_id: riskId }); }}>Add file</Button>
      </div>
    </div>
  );
}

function CommentsPanel({ riskId, items, onChange }: { riskId: string; items: any[]; onChange: () => void }) {
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState("internal");
  const add = useServerFn(addRiskComment);
  const mut = useMutation({ mutationFn: (d: any) => add({ data: d }), onSuccess: () => { setText(""); onChange(); }, onError: (e: any) => toast.error(e.message) });
  return (
    <div className="space-y-2">
      {items.map((c) => (
        <div key={c.id} className="border rounded p-2 text-sm">
          <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()} {c.visibility === "client_visible" && <Badge variant="outline" className="ml-1">client</Badge>}</div>
          <div className="whitespace-pre-wrap">{c.comment}</div>
        </div>
      ))}
      <div className="border rounded p-2 space-y-2">
        <Textarea rows={2} placeholder="Add comment…" value={text} onChange={(e) => setText(e.target.value)}/>
        <div className="flex items-center justify-between">
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="client_visible">Client visible</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { if (!text.trim()) return; mut.mutate({ risk_id: riskId, comment: text, visibility }); }}><Send className="h-3.5 w-3.5 mr-1"/>Post</Button>
        </div>
      </div>
    </div>
  );
}

function EscalateDialog({ id, onClose, onDone }: { id: string | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const fn = useServerFn(escalateRisk);
  const mut = useMutation({ mutationFn: (d: any) => fn({ data: d }), onSuccess: () => { toast.success("Risk escalated"); onDone(); onClose(); setReason(""); }, onError: (e: any) => toast.error(e.message) });
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Escalate Risk</DialogTitle></DialogHeader>
        <Label>Reason*</Label>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being escalated?"/>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { if (!reason.trim()) return toast.error("Reason required"); if (id) mut.mutate({ id, reason }); }}>Escalate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConvertDialog({ id, onClose, onDone }: { id: string | null; onClose: () => void; onDone: () => void }) {
  const fn = useServerFn(convertRiskToIssue);
  const mut = useMutation({ mutationFn: (d: any) => fn({ data: d }), onSuccess: (res: any) => {
    if (res?.issueId) toast.success("Risk converted to issue");
    else toast.success("Risk marked as occurred. Issues module will link when available.");
    onDone(); onClose();
  }, onError: (e: any) => toast.error(e.message) });
  return (
    <AlertDialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert risk to issue?</AlertDialogTitle>
          <AlertDialogDescription>This will mark the risk as occurred and create a linked issue if the Issues module is available.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => id && mut.mutate({ id })}>Convert</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

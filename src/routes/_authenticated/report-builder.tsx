import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileBarChart, Sparkles, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProjectPicker } from "@/components/project-picker";
import { buildReportData } from "@/lib/report-builder.functions";

export const Route = createFileRoute("/_authenticated/report-builder")({
  head: () => ({ meta: [{ title: "Custom Reports — ProjectCore" }] }),
  component: ReportBuilder,
});

const TEMPLATES = [
  { id: "weekly", title: "Weekly Progress Report", desc: "Tasks completed, open RFIs and risks for the past 7 days." },
  { id: "monthly", title: "Monthly Owner's Report", desc: "Executive summary, financial position, KPIs." },
  { id: "qhse", title: "QHSE Dashboard", desc: "Quality inspections, safety incidents, NCRs and snag close-out." },
  { id: "cost", title: "Cost Performance", desc: "Budget vs actual, approved variations and cash flow." },
  { id: "procurement", title: "Procurement Status", desc: "Open material requests, POs and pending deliveries." },
  { id: "stakeholder", title: "Stakeholder Pack", desc: "Milestone progress and outstanding approvals." },
];

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function ReportBuilder() {
  const [picked, setPicked] = useState<string[]>([]);
  const [projectId, setProjectId] = useState("");
  const [report, setReport] = useState<any | null>(null);
  const build = useServerFn(buildReportData);
  const toggle = (id: string) => setPicked((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);

  const mut = useMutation({
    mutationFn: () => build({ data: { projectId: projectId || undefined, sections: picked } }) as any,
    onSuccess: (d) => { setReport(d); toast.success("Report generated. Use Print to export as PDF."); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="p-8 space-y-6 max-w-5xl print:p-0 print:max-w-none">
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><FileBarChart className="size-6 text-accent" /> Custom Report Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick sections and a project, then generate and print or save as PDF.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 print:hidden">
        {TEMPLATES.map((t) => {
          const active = picked.includes(t.id);
          return (
            <button key={t.id} onClick={() => toggle(t.id)} className={`text-left p-4 border rounded-sm transition ${active ? "border-accent bg-accent/5" : "border-border bg-card hover:border-accent/50"}`}>
              <div className="font-display font-bold text-sm">{t.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
              {active && <div className="text-[10px] font-bold uppercase tracking-widest text-accent mt-2">Selected</div>}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <div className="w-64"><ProjectPicker value={projectId} onChange={setProjectId} placeholder="All projects" /></div>
        <Button disabled={picked.length === 0 || mut.isPending} onClick={() => mut.mutate()} className="bg-accent text-white hover:bg-accent/90">
          {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate ({picked.length})
        </Button>
        {report && <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Print / save PDF</Button>}
      </div>

      {report && (
        <article className="bg-white text-zinc-900 border border-border rounded-sm p-8 space-y-6 print:border-0 print:p-0">
          <header className="border-b pb-4">
            <h2 className="font-display text-xl font-bold">ProjectCore — Custom Report</h2>
            <p className="text-xs text-zinc-500">Generated {new Date(report.generated_at).toLocaleString()}</p>
          </header>

          {report.sections.weekly && (
            <Section title="Weekly Progress">
              <Sub label="Tasks completed (7d)" value={report.sections.weekly.tasksDone.length} />
              <Sub label="Open RFIs" value={report.sections.weekly.openRfis.length} />
              <Sub label="Open Risks" value={report.sections.weekly.openRisks.length} />
            </Section>
          )}

          {report.sections.cost && (
            <Section title="Cost Performance">
              <Sub label="BOQ Budget" value={money(report.sections.cost.budget)} />
              <Sub label="Work Done" value={money(report.sections.cost.actual)} />
              <Sub label="Approved Variations" value={money(report.sections.cost.approvedVars)} />
              <Sub label="Certified Payments" value={money(report.sections.cost.certified)} />
            </Section>
          )}

          {report.sections.qhse && (
            <Section title="QHSE">
              <Sub label="Inspections" value={report.sections.qhse.inspections.length} />
              <Sub label="Open NCRs" value={report.sections.qhse.ncrs.filter((n: any) => n.status !== "closed").length} />
              <Sub label="Open Snags" value={report.sections.qhse.snags.filter((s: any) => s.status !== "closed").length} />
              <Sub label="Safety Inspections" value={report.sections.qhse.safety.length} />
            </Section>
          )}

          {report.sections.procurement && (
            <Section title="Procurement">
              <Sub label="Material Requests" value={report.sections.procurement.requests.length} />
              <Sub label="Purchase Orders" value={report.sections.procurement.orders.length} />
              <Sub label="Deliveries" value={report.sections.procurement.deliveries.length} />
            </Section>
          )}

          {report.sections.stakeholder && (
            <Section title="Milestones & Approvals">
              <table className="w-full text-sm mt-2">
                <thead><tr className="text-left text-xs text-zinc-500"><th>Milestone</th><th>Due</th><th className="text-right">Status</th></tr></thead>
                <tbody>{report.sections.stakeholder.milestones.map((m: any, i: number) => (
                  <tr key={i} className="border-t"><td className="py-1">{m.name}</td><td className="py-1 text-xs">{m.due_date ?? "—"}</td><td className="py-1 text-right text-xs">{m.completed_at ? "Done" : "Pending"}</td></tr>
                ))}</tbody>
              </table>
            </Section>
          )}
        </article>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-display font-bold uppercase tracking-tight text-sm border-b pb-1 mb-3">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{children}</div>
    </section>
  );
}

function Sub({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="text-lg font-display font-bold mt-0.5">{value}</div>
    </div>
  );
}

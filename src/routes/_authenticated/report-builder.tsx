import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileBarChart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/report-builder")({
  head: () => ({ meta: [{ title: "Custom Reports — ProjectCore" }] }),
  component: ReportBuilder,
});

const TEMPLATES = [
  { id: "weekly", title: "Weekly Progress Report", desc: "Tasks completed, BOQ progress, open RFIs and risks for the past 7 days." },
  { id: "monthly", title: "Monthly Owner's Report", desc: "Executive summary, financial position, KPIs and look-ahead." },
  { id: "qhse", title: "QHSE Dashboard", desc: "Quality inspections, safety incidents, NCRs and snag close-out." },
  { id: "cost", title: "Cost Performance", desc: "Budget vs actual, approved variations and cash flow forecast." },
  { id: "procurement", title: "Procurement Status", desc: "Open material requests, RFQs, POs and pending deliveries." },
  { id: "stakeholder", title: "Stakeholder Pack", desc: "Photo summary, milestone progress and outstanding approvals." },
];

function ReportBuilder() {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><FileBarChart className="size-6 text-accent" /> Custom Report Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick sections to assemble a tailored PDF report. Standard PDF exports are available from the Reports page.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
      <div className="flex items-center gap-3">
        <Button disabled={picked.length === 0} className="bg-accent text-white hover:bg-accent/90">
          <Sparkles className="size-4" /> Generate report ({picked.length})
        </Button>
        <span className="text-xs text-muted-foreground">Generation runs against your live project data. Connect a delivery channel in Settings → Integrations to email PDFs automatically.</span>
      </div>
    </div>
  );
}

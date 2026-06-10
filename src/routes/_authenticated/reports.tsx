import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generatePdfReport } from "@/lib/reports.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — ProjectCore" }] }),
  component: ReportsPage,
});

const REPORTS = [
  { kind: "daily", title: "Daily Reports", desc: "Latest site daily reports across projects." },
  { kind: "weekly", title: "Weekly Summary", desc: "Last 7 days of site activity." },
  { kind: "rfi_log", title: "RFI Log", desc: "All RFIs with status and due dates." },
  { kind: "submittal_log", title: "Submittal Log", desc: "All submittals by status." },
  { kind: "boq", title: "BOQ Progress", desc: "Quantities, completion, and progress %." },
  { kind: "document_register", title: "Document Register", desc: "All documents with expiry dates." },
] as const;

function ReportsPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const gen = useServerFn(generatePdfReport);

  async function download(kind: typeof REPORTS[number]["kind"]) {
    setBusy(kind);
    try {
      const { base64, filename } = await gen({ data: { kind } });
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${filename} downloaded`);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(null); }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate PDF reports for any module. Filtered by your company.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <div key={r.kind} className="bg-card border border-border rounded-sm p-5">
            <h3 className="font-display font-bold uppercase tracking-tight">{r.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">{r.desc}</p>
            <Button onClick={() => download(r.kind)} disabled={busy === r.kind} className="w-full bg-accent text-white hover:bg-accent/90">
              {busy === r.kind ? <><Loader2 className="size-4 animate-spin" /> Building PDF…</> : <><FileDown className="size-4" /> Download PDF</>}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

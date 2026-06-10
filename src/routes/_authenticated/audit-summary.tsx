import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "complete" | "partial" | "planned";
type Row = { module: string; route: string; create: Status; read: Status; update: Status; del: Status; search: Status; filter: Status; approve: Status; export: Status; notes?: string };

const ROWS: Row[] = [
  { module: "Projects", route: "/projects", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "planned" },
  { module: "Tasks", route: "/tasks", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "complete" },
  { module: "Daily Reports", route: "/daily-reports", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "complete", export: "planned" },
  { module: "BOQ", route: "/boq", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "partial", approve: "planned", export: "complete" },
  { module: "Cost Codes", route: "/cost-codes", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "partial", approve: "planned", export: "complete" },
  { module: "RFIs", route: "/rfis", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "partial", export: "complete", notes: "Approval via Approvals inbox" },
  { module: "Submittals", route: "/submittals", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "partial", export: "complete" },
  { module: "Drawings", route: "/drawings", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "partial", export: "complete" },
  { module: "Documents", route: "/documents", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "partial", export: "complete" },
  { module: "Procurement", route: "/procurement", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "complete", export: "complete", notes: "Auto-approval on submit" },
  { module: "RFQs", route: "/rfqs", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "complete" },
  { module: "Purchase Orders", route: "/purchase-orders", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "complete", export: "complete" },
  { module: "Deliveries", route: "/deliveries", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "complete" },
  { module: "Suppliers", route: "/suppliers", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "partial", approve: "planned", export: "complete" },
  { module: "Variations", route: "/variations", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "complete", export: "complete", notes: "Auto-approval trigger" },
  { module: "Payment Claims", route: "/payment-claims", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "complete", export: "complete", notes: "Calc helper available" },
  { module: "Quality Inspections", route: "/quality", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "complete" },
  { module: "Safety Inspections", route: "/safety", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "complete" },
  { module: "NCRs", route: "/ncrs", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "complete" },
  { module: "Snags", route: "/snags", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "complete" },
  { module: "Risks", route: "/risks", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "complete" },
  { module: "Issues", route: "/issues", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "complete" },
  { module: "Meetings", route: "/meetings", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "partial", approve: "planned", export: "complete" },
  { module: "Action Items", route: "/action-items", create: "complete", read: "complete", update: "complete", del: "complete", search: "partial", filter: "partial", approve: "planned", export: "planned", notes: "Promote-to-task wired" },
  { module: "Milestones", route: "/milestones", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "partial", approve: "planned", export: "complete" },
  { module: "Resources / Manpower", route: "/resources", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "complete" },
  { module: "Equipment", route: "/equipment", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "complete", approve: "planned", export: "complete" },
  { module: "Timesheets", route: "/timesheets", create: "complete", read: "complete", update: "complete", del: "complete", search: "complete", filter: "partial", approve: "partial", export: "complete" },
  { module: "Approvals Inbox", route: "/approvals", create: "complete", read: "complete", update: "complete", del: "partial", search: "complete", filter: "complete", approve: "complete", export: "planned" },
  { module: "Notifications", route: "—", create: "complete", read: "complete", update: "complete", del: "complete", search: "partial", filter: "partial", approve: "planned", export: "planned", notes: "In-app bell; no email transport" },
  { module: "Audit Log", route: "/audit", create: "complete", read: "complete", update: "planned", del: "planned", search: "complete", filter: "complete", approve: "planned", export: "complete", notes: "Auto-logged via triggers" },
  { module: "Reports", route: "/reports", create: "complete", read: "complete", update: "partial", del: "partial", search: "partial", filter: "complete", approve: "planned", export: "complete" },
  { module: "Report Builder", route: "/report-builder", create: "complete", read: "complete", update: "partial", del: "partial", search: "planned", filter: "complete", approve: "planned", export: "partial", notes: "Browser print; no PDF lib" },
  { module: "Budget vs Actual", route: "/budget", create: "complete", read: "complete", update: "complete", del: "complete", search: "partial", filter: "complete", approve: "planned", export: "planned" },
  { module: "Cash Flow", route: "/cash-flow", create: "complete", read: "complete", update: "complete", del: "complete", search: "partial", filter: "complete", approve: "planned", export: "planned" },
  { module: "Client Portal", route: "/client", create: "complete", read: "complete", update: "complete", del: "complete", search: "partial", filter: "complete", approve: "complete", export: "planned" },
  { module: "Permissions Matrix", route: "/permissions", create: "complete", read: "complete", update: "complete", del: "complete", search: "partial", filter: "partial", approve: "planned", export: "planned" },
  { module: "AI Assistant", route: "/ai", create: "complete", read: "complete", update: "complete", del: "complete", search: "planned", filter: "planned", approve: "planned", export: "planned" },
  { module: "Settings", route: "/settings", create: "complete", read: "complete", update: "complete", del: "partial", search: "planned", filter: "planned", approve: "planned", export: "planned" },
];

const Icon = ({ s }: { s: Status }) =>
  s === "complete" ? <CheckCircle2 className="size-4 text-emerald-600" /> :
  s === "partial" ? <AlertCircle className="size-4 text-amber-600" /> :
  <MinusCircle className="size-4 text-zinc-400" />;

export const Route = createFileRoute("/_authenticated/audit-summary")({
  head: () => ({ meta: [{ title: "Audit Summary — ProjectCore" }] }),
  component: AuditSummary,
});

function AuditSummary() {
  const total = ROWS.length;
  const allComplete = ROWS.filter((r) => ["create","read","update","del","search"].every((k) => (r as any)[k] === "complete")).length;
  const cols: { key: keyof Row; label: string }[] = [
    { key: "create", label: "Create" }, { key: "read", label: "Read" }, { key: "update", label: "Update" },
    { key: "del", label: "Delete" }, { key: "search", label: "Search" }, { key: "filter", label: "Filter" },
    { key: "approve", label: "Approve" }, { key: "export", label: "Export" },
  ];
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Functional Audit Summary</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {allComplete} of {total} modules have full core CRUD. Items marked partial or planned have known limitations listed.
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-600" /> Complete</span>
        <span className="flex items-center gap-1.5"><AlertCircle className="size-3.5 text-amber-600" /> Partial</span>
        <span className="flex items-center gap-1.5"><MinusCircle className="size-3.5 text-zinc-400" /> Planned / future</span>
      </div>
      <div className="bg-card border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Module</th>
              <th className="text-left px-4 py-3">Route</th>
              {cols.map((c) => <th key={c.key} className="px-2 py-3 text-center">{c.label}</th>)}
              <th className="text-left px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.module} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{r.module}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.route}</td>
                {cols.map((c) => (
                  <td key={c.key} className={cn("px-2 py-2.5 text-center")}><div className="inline-flex"><Icon s={(r as any)[c.key]} /></div></td>
                ))}
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Known future / advanced items:</strong> external integrations (MS Project, Primavera, Outlook, Teams, Slack, Xero, QuickBooks, SAP), e-signature, biometric attendance, WhatsApp/SMS transport, native PDF generation, offline-first PWA sync, multi-language UI.</p>
        <p>Comments thread now embedded on every register edit dialog. Submit-for-approval action available on Procurement Requests, Variations, Payment Claims, and Purchase Orders (auto-creates approval record).</p>
      </div>
    </div>
  );
}

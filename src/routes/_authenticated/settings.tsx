import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Save, RotateCcw, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  getAllSettings, updateCompanySettings, updateModuleSetting,
  updateNumberingSetting, resetNumberingSequence, upsertApprovalSetting,
  updateClientPortalSettings, upsertIntegrationSetting, listSettingsAuditLogs,
  previewNumbering,
} from "@/lib/settings.functions";
import { useMyPermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ProjectCore" }] }),
  component: SettingsPage,
});

const CURRENCIES = ["MVR","USD","EUR","GBP","INR","LKR","AED","SGD"];
const TIMEZONES = ["Indian/Maldives","UTC","Asia/Dubai","Asia/Colombo","Asia/Kolkata","Asia/Singapore","Europe/London","America/New_York"];
const DATE_FORMATS = ["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD","DD-MMM-YYYY"];
const TIME_FORMATS = ["12h","24h"];
const WEEKDAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const APPROVAL_MODULES = ["Variations","Payment Claims","Purchase Orders","Material Requests","RFQs","Submittals","Documents","Drawings","Quality Inspections","Safety Inspections","NCR","Timesheets","Manpower","Reports"];
const INTEGRATIONS_LIST = [
  { name: "Lovable AI", type: "AI" }, { name: "Email (SMTP)", type: "Notification" },
  { name: "WhatsApp", type: "Notification" }, { name: "Google Drive", type: "Storage" },
  { name: "Microsoft Teams", type: "Collaboration" }, { name: "Google Calendar", type: "Calendar" },
  { name: "Biometric / HRM", type: "HR" }, { name: "Accounting (Xero/QB)", type: "Finance" },
  { name: "E-Signature", type: "Document" },
];

function SettingsPage() {
  const perms = useMyPermissions();
  const isAdmin = perms.roles?.includes("company_admin");
  const allFn = useServerFn(getAllSettings);
  const { data, isLoading, error } = useQuery({ queryKey: ["settings:all"], queryFn: () => allFn() });

  if (!isAdmin && !perms.loading) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="border border-border rounded-sm p-8 text-center bg-card">
          <Shield className="size-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="font-display font-bold text-xl">Restricted</h1>
          <p className="text-sm text-muted-foreground mt-2">Only company admins can access Settings.</p>
        </div>
      </div>
    );
  }
  if (isLoading || perms.loading) return <div className="p-8 text-sm text-muted-foreground">Loading settings…</div>;
  if (error) return <div className="p-8 text-sm text-red-600">Failed to load settings.</div>;
  if (!data) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Company configuration, modules, numbering, workflows and integrations.</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="portal">Client Portal</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="company"><CompanyTab company={data.company} /></TabsContent>
        <TabsContent value="general"><GeneralTab company={data.company} /></TabsContent>
        <TabsContent value="modules"><ModulesTab modules={data.modules} /></TabsContent>
        <TabsContent value="numbering"><NumberingTab numbering={data.numbering} /></TabsContent>
        <TabsContent value="approvals"><ApprovalsTab approvals={data.approvals} /></TabsContent>
        <TabsContent value="portal"><PortalTab portal={data.portal} /></TabsContent>
        <TabsContent value="integrations"><IntegrationsTab integrations={data.integrations} /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, children, desc }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-sm p-6 mt-4 space-y-4">
      <div>
        <h2 className="font-display font-bold uppercase tracking-tight">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function CompanyTab({ company }: { company: any }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateCompanySettings);
  const [f, setF] = useState(company);
  useEffect(() => setF(company), [company]);
  const mut = useMutation({
    mutationFn: () => updateFn({ data: {
      company_name: f.company_name, legal_name: f.legal_name, registration_number: f.registration_number,
      tax_number: f.tax_number, address: f.address, country: f.country, city: f.city,
      phone: f.phone, email: f.email, website: f.website, logo_url: f.logo_url,
      default_currency: f.default_currency, default_timezone: f.default_timezone,
      date_format: f.date_format, time_format: f.time_format, number_format: f.number_format,
      financial_year_start_month: f.financial_year_start_month,
      working_days: f.working_days, working_hours_start: f.working_hours_start, working_hours_end: f.working_hours_end,
    } }),
    onSuccess: () => { toast.success("Company profile saved"); qc.invalidateQueries({ queryKey: ["settings:all"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Section title="Company Profile">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Company name *"><Input value={f.company_name ?? ""} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></Field>
        <Field label="Legal name"><Input value={f.legal_name ?? ""} onChange={(e) => setF({ ...f, legal_name: e.target.value })} /></Field>
        <Field label="Registration #"><Input value={f.registration_number ?? ""} onChange={(e) => setF({ ...f, registration_number: e.target.value })} /></Field>
        <Field label="Tax / VAT #"><Input value={f.tax_number ?? ""} onChange={(e) => setF({ ...f, tax_number: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Phone"><Input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Website"><Input value={f.website ?? ""} onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
        <Field label="Country"><Input value={f.country ?? ""} onChange={(e) => setF({ ...f, country: e.target.value })} /></Field>
        <Field label="City"><Input value={f.city ?? ""} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="Address"><Textarea rows={2} value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field></div>
        <div className="md:col-span-2">
          <Field label="Company logo URL">
            <Input placeholder="https://…/logo.png" value={f.logo_url ?? ""} onChange={(e) => setF({ ...f, logo_url: e.target.value })} />
          </Field>
          {f.logo_url && <img src={f.logo_url} alt="logo" className="mt-2 h-16 object-contain border border-border rounded-sm bg-white p-1" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
        </div>
      </div>
      <Button onClick={() => mut.mutate()} disabled={mut.isPending || !f.company_name?.trim()} className="bg-accent text-white hover:bg-accent/90"><Save className="size-4" /> {mut.isPending ? "Saving…" : "Save"}</Button>
    </Section>
  );
}

function GeneralTab({ company }: { company: any }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateCompanySettings);
  const [f, setF] = useState(company);
  useEffect(() => setF(company), [company]);
  const mut = useMutation({
    mutationFn: () => updateFn({ data: {
      company_name: f.company_name, legal_name: f.legal_name, registration_number: f.registration_number,
      tax_number: f.tax_number, address: f.address, country: f.country, city: f.city,
      phone: f.phone, email: f.email, website: f.website, logo_url: f.logo_url,
      default_currency: f.default_currency, default_timezone: f.default_timezone,
      date_format: f.date_format, time_format: f.time_format, number_format: f.number_format,
      financial_year_start_month: Number(f.financial_year_start_month) || 1,
      working_days: f.working_days, working_hours_start: f.working_hours_start, working_hours_end: f.working_hours_end,
    } }),
    onSuccess: () => { toast.success("Preferences saved"); qc.invalidateQueries({ queryKey: ["settings:all"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const toggleDay = (d: string) => {
    const cur = (f.working_days ?? []) as string[];
    setF({ ...f, working_days: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d] });
  };
  return (
    <Section title="General Preferences">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Default currency">
          <Select value={f.default_currency} onValueChange={(v) => setF({ ...f, default_currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Timezone">
          <Select value={f.default_timezone} onValueChange={(v) => setF({ ...f, default_timezone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIMEZONES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Date format">
          <Select value={f.date_format} onValueChange={(v) => setF({ ...f, date_format: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DATE_FORMATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Time format">
          <Select value={f.time_format} onValueChange={(v) => setF({ ...f, time_format: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIME_FORMATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Number format"><Input value={f.number_format} onChange={(e) => setF({ ...f, number_format: e.target.value })} /></Field>
        <Field label="Financial year start month (1-12)">
          <Input type="number" min={1} max={12} value={f.financial_year_start_month}
            onChange={(e) => setF({ ...f, financial_year_start_month: Number(e.target.value) })} />
        </Field>
        <Field label="Working hours start"><Input type="time" value={f.working_hours_start ?? ""} onChange={(e) => setF({ ...f, working_hours_start: e.target.value })} /></Field>
        <Field label="Working hours end"><Input type="time" value={f.working_hours_end ?? ""} onChange={(e) => setF({ ...f, working_hours_end: e.target.value })} /></Field>
        <div className="md:col-span-2">
          <Label>Working days</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {WEEKDAYS.map((d) => {
              const on = (f.working_days ?? []).includes(d);
              return (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-3 py-1 text-xs border rounded-sm ${on ? "bg-accent text-white border-accent" : "border-border bg-card"}`}>{d}</button>
              );
            })}
          </div>
        </div>
      </div>
      <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90"><Save className="size-4" /> {mut.isPending ? "Saving…" : "Save"}</Button>
    </Section>
  );
}

function ModulesTab({ modules }: { modules: any[] }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateModuleSetting);
  const [search, setSearch] = useState("");
  const filtered = modules.filter((m) => m.module_name.toLowerCase().includes(search.toLowerCase()));
  const mut = useMutation({
    mutationFn: (v: { id: string; is_enabled?: boolean; module_label?: string }) => updateFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings:all"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  return (
    <Section title="Modules" desc="Enable, disable or rename modules. Core modules (Dashboard, Settings, Role Permissions, Audit Log) cannot be disabled.">
      <Input placeholder="Search modules…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <div className="border border-border rounded-sm divide-y divide-border">
        {filtered.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-3 gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{m.module_name}</div>
              <Input className="mt-1 text-xs h-7" value={m.module_label ?? m.module_name}
                onBlur={(e) => { if (e.target.value !== m.module_label) mut.mutate({ id: m.id, module_label: e.target.value }); }}
                onChange={(e) => { m.module_label = e.target.value; }} />
            </div>
            <Switch checked={m.is_enabled} onCheckedChange={(v) => mut.mutate({ id: m.id, is_enabled: v })} />
          </div>
        ))}
        {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No modules.</div>}
      </div>
    </Section>
  );
}

function NumberingTab({ numbering }: { numbering: any[] }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateNumberingSetting);
  const resetFn = useServerFn(resetNumberingSequence);
  const previewFn = useServerFn(previewNumbering);
  const mut = useMutation({
    mutationFn: (v: any) => updateFn({ data: v }),
    onSuccess: () => { toast.success("Numbering saved"); qc.invalidateQueries({ queryKey: ["settings:all"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const resetMut = useMutation({
    mutationFn: (id: string) => resetFn({ data: { id } }),
    onSuccess: () => { toast.success("Sequence reset"); qc.invalidateQueries({ queryKey: ["settings:all"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  return (
    <Section title="Numbering Formats" desc="Tokens: [PROJECT] [YEAR] [MONTH] [###] [SEQ] [YYYYMMDD] [DISCIPLINE]">
      <div className="space-y-3">
        {numbering.map((n) => <NumberingRow key={n.id} row={n} onSave={(d) => mut.mutate({ id: n.id, ...d })} onReset={() => resetMut.mutate(n.id)} previewFn={previewFn} />)}
      </div>
    </Section>
  );
}

function NumberingRow({ row, onSave, onReset, previewFn }: { row: any; onSave: (d: any) => void; onReset: () => void; previewFn: any }) {
  const [f, setF] = useState(row);
  useEffect(() => setF(row), [row]);
  const [preview, setPreview] = useState(row.sample_output ?? "");
  useEffect(() => {
    previewFn({ data: { prefix: f.prefix, format_pattern: f.format_pattern, sequence_padding: f.sequence_padding,
      next_sequence: f.next_sequence, separator: f.separator, include_year: f.include_year, include_month: f.include_month }})
      .then((r: any) => setPreview(r.sample)).catch(() => {});
  }, [f.prefix, f.format_pattern, f.sequence_padding, f.next_sequence]);
  return (
    <div className="border border-border rounded-sm p-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-end text-xs">
      <div className="font-medium text-sm md:col-span-1">{row.module_name}</div>
      <Field label="Prefix"><Input className="h-8" value={f.prefix} onChange={(e) => setF({ ...f, prefix: e.target.value })} /></Field>
      <Field label="Format"><Input className="h-8" value={f.format_pattern} onChange={(e) => setF({ ...f, format_pattern: e.target.value })} /></Field>
      <Field label="Padding"><Input className="h-8" type="number" min={1} max={10} value={f.sequence_padding} onChange={(e) => setF({ ...f, sequence_padding: Number(e.target.value) })} /></Field>
      <Field label="Reset">
        <Select value={f.reset_frequency} onValueChange={(v) => setF({ ...f, reset_frequency: v })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{["Never","Yearly","Monthly","Project-wise"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="flex flex-col gap-1">
        <div className="text-[10px] text-muted-foreground">Preview</div>
        <div className="text-xs font-mono px-2 py-1 bg-muted rounded-sm truncate">{preview}</div>
      </div>
      <div className="md:col-span-6 flex flex-wrap items-center gap-3 mt-1">
        <label className="flex items-center gap-1 text-xs"><Switch checked={f.include_year} onCheckedChange={(v) => setF({ ...f, include_year: v })} /> Year</label>
        <label className="flex items-center gap-1 text-xs"><Switch checked={f.include_month} onCheckedChange={(v) => setF({ ...f, include_month: v })} /> Month</label>
        <label className="flex items-center gap-1 text-xs"><Switch checked={f.include_project_code} onCheckedChange={(v) => setF({ ...f, include_project_code: v })} /> Project</label>
        <label className="flex items-center gap-1 text-xs"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /> Active</label>
        <Field label="Sep"><Input className="h-7 w-14" value={f.separator} onChange={(e) => setF({ ...f, separator: e.target.value })} /></Field>
        <div className="ml-auto flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" size="sm"><RotateCcw className="size-3" /> Reset seq</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Reset sequence?</AlertDialogTitle>
                <AlertDialogDescription>The next number for {row.module_name} will restart at 1. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onReset}>Reset</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" className="bg-accent text-white hover:bg-accent/90" onClick={() => onSave({
            prefix: f.prefix, format_pattern: f.format_pattern, sequence_padding: f.sequence_padding,
            reset_frequency: f.reset_frequency, include_project_code: f.include_project_code,
            include_year: f.include_year, include_month: f.include_month,
            separator: f.separator, is_active: f.is_active,
          })}><Save className="size-3" /> Save</Button>
        </div>
      </div>
    </div>
  );
}

function ApprovalsTab({ approvals }: { approvals: any[] }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertApprovalSetting);
  const byMod = useMemo(() => Object.fromEntries(approvals.map((a) => [a.module_name, a])), [approvals]);
  const mut = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => { toast.success("Approval saved"); qc.invalidateQueries({ queryKey: ["settings:all"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  return (
    <Section title="Approval Defaults" desc="Default approval rules per module. Used as defaults for new records.">
      <div className="space-y-2">
        {APPROVAL_MODULES.map((m) => <ApprovalRow key={m} module={m} row={byMod[m]} onSave={(d) => mut.mutate({ module_name: m, ...d })} />)}
      </div>
    </Section>
  );
}

function ApprovalRow({ module, row, onSave }: { module: string; row: any; onSave: (d: any) => void }) {
  const [f, setF] = useState({
    approval_required: row?.approval_required ?? false,
    approval_mode: row?.approval_mode ?? "Single",
    default_approver_role: row?.default_approver_role ?? "",
    escalation_enabled: row?.escalation_enabled ?? false,
    escalation_days: row?.escalation_days ?? 3,
  });
  return (
    <div className="border border-border rounded-sm p-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-end text-xs">
      <div className="font-medium text-sm">{module}</div>
      <label className="flex items-center gap-2"><Switch checked={f.approval_required} onCheckedChange={(v) => setF({ ...f, approval_required: v })} /> Required</label>
      <Field label="Mode">
        <Select value={f.approval_mode} onValueChange={(v) => setF({ ...f, approval_mode: v })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{["Single","Sequential","Parallel"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Approver role"><Input className="h-8" placeholder="e.g. project_manager" value={f.default_approver_role} onChange={(e) => setF({ ...f, default_approver_role: e.target.value })} /></Field>
      <label className="flex items-center gap-2"><Switch checked={f.escalation_enabled} onCheckedChange={(v) => setF({ ...f, escalation_enabled: v })} /> Escalate</label>
      <div className="flex items-end gap-2">
        <Field label="After (days)"><Input className="h-8" type="number" min={0} value={f.escalation_days} onChange={(e) => setF({ ...f, escalation_days: Number(e.target.value) })} /></Field>
        <Button size="sm" className="bg-accent text-white hover:bg-accent/90" onClick={() => onSave({ ...f, default_approver_role: f.default_approver_role || null })}><Save className="size-3" /></Button>
      </div>
    </div>
  );
}

function PortalTab({ portal }: { portal: any }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateClientPortalSettings);
  const [f, setF] = useState(portal);
  useEffect(() => setF(portal), [portal]);
  const mut = useMutation({
    mutationFn: () => updateFn({ data: {
      portal_enabled: !!f.portal_enabled, default_client_visibility: !!f.default_client_visibility,
      allow_client_comments: !!f.allow_client_comments, allow_client_downloads: !!f.allow_client_downloads,
      show_project_progress: !!f.show_project_progress, show_documents: !!f.show_documents,
      show_drawings: !!f.show_drawings, show_reports: !!f.show_reports, show_rfis: !!f.show_rfis,
      show_submittals: !!f.show_submittals, show_meetings: !!f.show_meetings,
      hide_internal_cost: !!f.hide_internal_cost, hide_supplier_pricing: !!f.hide_supplier_pricing,
      hide_payroll_data: !!f.hide_payroll_data,
    }}),
    onSuccess: () => { toast.success("Client portal saved"); qc.invalidateQueries({ queryKey: ["settings:all"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const toggle = (k: keyof typeof f) => (v: boolean) => setF({ ...f, [k]: v });
  return (
    <Section title="Client Portal" desc="Controls what client users can see and do.">
      {f.default_client_visibility && (
        <div className="flex items-start gap-2 text-xs p-3 border border-amber-300 bg-amber-50 rounded-sm">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5" />
          <div>Default client visibility is ON. New records may be visible to client users unless overridden.</div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Row label="Portal enabled" value={f.portal_enabled} onChange={toggle("portal_enabled")} />
        <Row label="Default client visibility" value={f.default_client_visibility} onChange={toggle("default_client_visibility")} />
        <Row label="Allow comments" value={f.allow_client_comments} onChange={toggle("allow_client_comments")} />
        <Row label="Allow downloads" value={f.allow_client_downloads} onChange={toggle("allow_client_downloads")} />
        <Row label="Show progress" value={f.show_project_progress} onChange={toggle("show_project_progress")} />
        <Row label="Show documents" value={f.show_documents} onChange={toggle("show_documents")} />
        <Row label="Show drawings" value={f.show_drawings} onChange={toggle("show_drawings")} />
        <Row label="Show reports" value={f.show_reports} onChange={toggle("show_reports")} />
        <Row label="Show RFIs" value={f.show_rfis} onChange={toggle("show_rfis")} />
        <Row label="Show submittals" value={f.show_submittals} onChange={toggle("show_submittals")} />
        <Row label="Show meetings" value={f.show_meetings} onChange={toggle("show_meetings")} />
        <Row label="Hide internal cost" value={f.hide_internal_cost} onChange={toggle("hide_internal_cost")} />
        <Row label="Hide supplier pricing" value={f.hide_supplier_pricing} onChange={toggle("hide_supplier_pricing")} />
        <Row label="Hide payroll data" value={f.hide_payroll_data} onChange={toggle("hide_payroll_data")} />
      </div>
      <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90"><Save className="size-4" /> {mut.isPending ? "Saving…" : "Save"}</Button>
    </Section>
  );
}

function IntegrationsTab({ integrations }: { integrations: any[] }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertIntegrationSetting);
  const byName = useMemo(() => Object.fromEntries(integrations.map((i) => [i.integration_name, i])), [integrations]);
  const mut = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => { toast.success("Integration saved"); qc.invalidateQueries({ queryKey: ["settings:all"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  return (
    <Section title="Integrations" desc="Toggle integrations. Secrets and API keys must be configured server-side and never stored here.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INTEGRATIONS_LIST.map((i) => {
          const cur = byName[i.name];
          const enabled = cur?.is_enabled ?? false;
          return (
            <div key={i.name} className="border border-border rounded-sm p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm">{i.name}</div>
                <div className="text-xs text-muted-foreground">{i.type} · {cur?.status ?? "Not configured"}</div>
              </div>
              <Switch checked={enabled} onCheckedChange={(v) => mut.mutate({
                integration_name: i.name, integration_type: i.type, is_enabled: v,
                status: v ? "Enabled (setup required)" : "Disabled",
              })} />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Note: Many integrations require backend configuration. Enabling here marks the integration as requested.</p>
    </Section>
  );
}

function AuditTab() {
  const fn = useServerFn(listSettingsAuditLogs);
  const { data = [], isLoading } = useQuery({ queryKey: ["settings:audit"], queryFn: () => fn() });
  return (
    <Section title="Settings Audit Log" desc="Last 200 settings changes for this company.">
      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
       data.length === 0 ? <div className="text-sm text-muted-foreground">No changes yet.</div> :
       <div className="overflow-x-auto">
         <table className="w-full text-xs">
           <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
             <tr><th className="text-left py-2">When</th><th className="text-left py-2">Area</th><th className="text-left py-2">Key</th></tr>
           </thead>
           <tbody>
             {data.map((l: any) => (
               <tr key={l.id} className="border-t border-border">
                 <td className="py-2">{new Date(l.created_at).toLocaleString()}</td>
                 <td className="py-2 capitalize">{l.setting_area}</td>
                 <td className="py-2 font-mono">{l.setting_key ?? "—"}</td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
      }
    </Section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-2 border border-border rounded-sm">
      <div className="text-sm">{label}</div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

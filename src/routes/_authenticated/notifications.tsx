import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Archive, ArchiveRestore, Bell, BellOff, Check, CheckCheck, ExternalLink, RefreshCw, Search, Settings, FileText, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  listNotifications, notificationSummary, markNotificationRead, archiveNotification,
  getMyPreferences, updateMyPreferences, listNotificationTemplates, upsertNotificationTemplate, deleteNotificationTemplate,
  MODULE_ROUTES,
} from "@/lib/notifications.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { resolveNotificationLink } from "@/components/notifications-bell";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — ProjectCore" }] }),
  component: NotificationsPage,
});

const PRIO_STYLE: Record<string, string> = {
  Critical: "bg-rose-600 text-white",
  Urgent: "bg-rose-500 text-white",
  High: "bg-amber-500 text-white",
  Medium: "bg-blue-500 text-white",
  Low: "bg-zinc-400 text-white",
};

const MODULES = Object.keys(MODULE_ROUTES);
const TYPES = ["General","Assignment","Approval Request","Approval Approved","Approval Rejected","Revision Requested","Comment","Mention","Due Soon","Overdue","Escalation","Status Change","Reminder","Warning","Critical Alert","Document Expiry","Payment Reminder","Procurement Alert","Delivery Alert","Quality Alert","Safety Alert","NCR Alert","Risk Alert","AI Alert","Report Generated","System"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent", "Critical"];

function NotificationsPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [project, setProject] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const qc = useQueryClient();
  const list = useServerFn(listNotifications);
  const summary = useServerFn(notificationSummary);
  const markFn = useServerFn(markNotificationRead);
  const archFn = useServerFn(archiveNotification);
  const navigate = useNavigate();

  const filters = useMemo(() => ({
    scope: tab as any,
    project_id: project !== "all" ? project : null,
    module_name: moduleFilter !== "all" ? moduleFilter : null,
    notification_type: typeFilter !== "all" ? typeFilter : null,
    priority: priorityFilter !== "all" ? priorityFilter : null,
    search: search || null,
  }), [tab, project, moduleFilter, typeFilter, priorityFilter, search]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications", "list", filters],
    queryFn: () => list({ data: filters }),
  });
  const { data: sum } = useQuery({ queryKey: ["notification-summary"], queryFn: () => summary() });

  const items = (data?.items ?? []) as any[];

  const mark = useMutation({
    mutationFn: (v: { id?: string; all?: boolean; unread?: boolean }) => markFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["notification-summary"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const archive = useMutation({
    mutationFn: (v: any) => archFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["notification-summary"] }); toast.success("Archived"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  function openItem(n: any) {
    if (!n.read_at) mark.mutate({ id: n.id });
    const url = resolveNotificationLink(n);
    if (url) navigate({ to: url as any }).catch(() => toast.info("Linked page is not available yet."));
    else toast.info("Linked page is not available yet.");
  }

  const cards = [
    { label: "Unread", value: sum?.unread ?? 0, tone: "text-accent" },
    { label: "Critical", value: sum?.critical ?? 0, tone: "text-rose-600" },
    { label: "High", value: sum?.high ?? 0, tone: "text-amber-600" },
    { label: "Approvals", value: sum?.approvals ?? 0 },
    { label: "Assignments", value: sum?.assignments ?? 0 },
    { label: "Overdue", value: sum?.overdue ?? 0, tone: "text-rose-500" },
    { label: "Today", value: sum?.today ?? 0 },
    { label: "Archived", value: sum?.archived ?? 0, tone: "text-muted-foreground" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Notification Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Alerts, reminders, approvals, and workflow notifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="size-4 mr-1" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => mark.mutate({ all: true })} disabled={!sum?.unread}><CheckCheck className="size-4 mr-1" /> Mark all read</Button>
          <Button variant="outline" size="sm" onClick={() => archive.mutate({ all_read: true })}><Archive className="size-4 mr-1" /> Archive read</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-sm p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className={cn("font-display text-2xl font-bold mt-1", c.tone)}>{c.value}</div>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="assignments">Assignments / Mentions</TabsTrigger>
          <TabsTrigger value="overdue">Overdue / Reminders</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
          <TabsTrigger value="preferences"><Settings className="size-3 mr-1" /> Preferences</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="size-3 mr-1" /> Templates</TabsTrigger>
        </TabsList>

        {tab !== "preferences" && tab !== "templates" && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, message, #" className="pl-9 w-64" />
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Module" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All modules</SelectItem>{MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All types</SelectItem>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All priorities</SelectItem>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setProject("all"); setModuleFilter("all"); setTypeFilter("all"); setPriorityFilter("all"); }}>Clear</Button>
          </div>
        )}

        <TabsContent value={tab} className="mt-4">
          {tab === "preferences" ? <PreferencesTab /> :
           tab === "templates" ? <TemplatesTab /> :
           isLoading ? <p className="text-sm text-muted-foreground p-8">Loading…</p> :
           items.length === 0 ? <EmptyState /> :
           <div className="bg-card border border-border rounded-sm divide-y divide-border">
             {items.map((n) => (
               <div key={n.id} className={cn("p-4 flex items-start gap-3 group", !n.read_at && "bg-accent/5")}>
                 <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-0.5", PRIO_STYLE[n.priority] ?? "bg-zinc-200 text-zinc-700")}>{n.priority ?? "Medium"}</span>
                 <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openItem(n)}>
                   <div className="flex items-center gap-2">
                     {!n.read_at && <span className="size-2 rounded-full bg-accent" />}
                     <div className="font-medium text-sm">{n.title}</div>
                     {n.notification_type && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{n.notification_type}</span>}
                     {n.module_name && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{n.module_name}</span>}
                     {n.record_number && <span className="text-[10px] text-muted-foreground">#{n.record_number}</span>}
                   </div>
                   {(n.message || n.body) && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{n.message ?? n.body}</div>}
                   <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                 </div>
                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                   {resolveNotificationLink(n) && (
                     <button onClick={() => openItem(n)} className="p-1.5 hover:bg-muted rounded" title="Open"><ExternalLink className="size-4" /></button>
                   )}
                   {n.read_at ? (
                     <button onClick={() => mark.mutate({ id: n.id, unread: true })} className="p-1.5 hover:bg-muted rounded" title="Mark unread"><BellOff className="size-4" /></button>
                   ) : (
                     <button onClick={() => mark.mutate({ id: n.id })} className="p-1.5 hover:bg-muted rounded text-emerald-700" title="Mark read"><Check className="size-4" /></button>
                   )}
                   {n.is_archived ? (
                     <button onClick={() => archive.mutate({ id: n.id, restore: true })} className="p-1.5 hover:bg-muted rounded" title="Restore"><ArchiveRestore className="size-4" /></button>
                   ) : (
                     <button onClick={() => archive.mutate({ id: n.id })} className="p-1.5 hover:bg-muted rounded" title="Archive"><Archive className="size-4" /></button>
                   )}
                 </div>
               </div>
             ))}
           </div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-card border border-border rounded-sm p-12 text-center">
      <Bell className="size-10 mx-auto text-muted-foreground mb-3" />
      <p className="text-sm font-medium">Nothing to show</p>
      <p className="text-xs text-muted-foreground mt-1">You're all caught up.</p>
    </div>
  );
}

function PreferencesTab() {
  const getPrefs = useServerFn(getMyPreferences);
  const updatePrefs = useServerFn(updateMyPreferences);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-prefs"], queryFn: () => getPrefs() });
  const mut = useMutation({
    mutationFn: (v: any) => updatePrefs({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-prefs"] }); toast.success("Preferences saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground p-8">Loading…</p>;
  const p: any = data;
  const modulePrefs: Record<string, boolean> = p.module_preferences ?? {};

  function toggle(field: string, val: boolean) {
    mut.mutate({ [field]: val });
  }
  function toggleModule(m: string, val: boolean) {
    mut.mutate({ module_preferences: { ...modulePrefs, [m]: val } });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-card border border-border rounded-sm p-6 space-y-4">
        <h3 className="font-display font-bold uppercase tracking-tight text-sm">Delivery Channels</h3>
        <PrefRow label="In-App" desc="Show notifications inside the application" checked={p.in_app_enabled} onChange={(v) => toggle("in_app_enabled", v)} />
        <PrefRow label="Email" desc="Email delivery (requires email integration)" checked={p.email_enabled} onChange={(v) => toggle("email_enabled", v)} />
        <PrefRow label="WhatsApp" desc="WhatsApp delivery (requires WhatsApp API integration — coming soon)" checked={p.whatsapp_enabled} onChange={(v) => toggle("whatsapp_enabled", v)} />
        <PrefRow label="Push" desc="Browser/mobile push (requires PWA push setup — coming soon)" checked={p.push_enabled} onChange={(v) => toggle("push_enabled", v)} />
      </div>

      <div className="bg-card border border-border rounded-sm p-6 space-y-4">
        <h3 className="font-display font-bold uppercase tracking-tight text-sm">Digest & Quiet Hours</h3>
        <PrefRow label="Digest notifications" desc="Receive a summary instead of individual alerts" checked={p.digest_enabled} onChange={(v) => toggle("digest_enabled", v)} />
        {p.digest_enabled && (
          <div className="flex items-center gap-3">
            <Label className="w-32 text-xs">Frequency</Label>
            <Select value={p.digest_frequency ?? "Daily"} onValueChange={(v) => mut.mutate({ digest_frequency: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Realtime">Realtime</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <PrefRow label="Quiet hours" desc="Pause non-critical notifications during set hours" checked={p.quiet_hours_enabled} onChange={(v) => toggle("quiet_hours_enabled", v)} />
        {p.quiet_hours_enabled && (
          <div className="flex items-center gap-3">
            <Label className="text-xs">From</Label>
            <Input type="time" defaultValue={p.quiet_hours_start ?? "22:00"} onBlur={(e) => mut.mutate({ quiet_hours_start: e.target.value })} className="w-32" />
            <Label className="text-xs">To</Label>
            <Input type="time" defaultValue={p.quiet_hours_end ?? "07:00"} onBlur={(e) => mut.mutate({ quiet_hours_end: e.target.value })} className="w-32" />
          </div>
        )}
        <div className="flex items-center gap-3">
          <Label className="w-32 text-xs">Reminder days</Label>
          <Input type="number" min={0} max={30} defaultValue={p.reminder_days ?? 3} onBlur={(e) => mut.mutate({ reminder_days: Number(e.target.value) })} className="w-24" />
        </div>
        <div className="text-xs text-muted-foreground p-3 bg-muted/40 rounded flex items-start gap-2">
          <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
          <span>Automated email digest, WhatsApp, and push delivery require background jobs and provider integrations. In-app notifications and the daily reminder cron job are active now.</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm p-6 space-y-3">
        <h3 className="font-display font-bold uppercase tracking-tight text-sm">Module Preferences</h3>
        <p className="text-xs text-muted-foreground">Enable or disable in-app notifications per module. Disabled modules will not generate new alerts for you.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 mt-2">
          {MODULES.filter((m) => m !== "comments").map((m) => (
            <PrefRow key={m} compact label={m} checked={modulePrefs[m] !== false} onChange={(v) => toggleModule(m, v)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PrefRow({ label, desc, checked, onChange, compact }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; compact?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4", !compact && "py-1")}>
      <div className="min-w-0">
        <div className={cn("text-sm font-medium", compact && "text-xs")}>{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TemplatesTab() {
  const listFn = useServerFn(listNotificationTemplates);
  const saveFn = useServerFn(upsertNotificationTemplate);
  const delFn = useServerFn(deleteNotificationTemplate);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notif-templates"], queryFn: () => listFn() });
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notif-templates"] }); toast.success("Template saved"); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notif-templates"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e?.message ?? "Insufficient permission"),
  });

  const items = (data?.items ?? []) as any[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Manage notification templates. Editing system templates requires creating a company override. Company Admin role required to manage company templates.</p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-4 mr-1" /> New template</Button>
          </DialogTrigger>
          <TemplateDialog editing={editing} onSave={(v) => save.mutate(v)} saving={save.isPending} />
        </Dialog>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground p-8">Loading…</p> :
       items.length === 0 ? <EmptyState /> :
       <div className="bg-card border border-border rounded-sm divide-y divide-border">
         {items.map((t) => (
           <div key={t.id} className="p-4 flex items-start gap-3">
             <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 flex-wrap">
                 <div className="font-medium text-sm">{t.template_name}</div>
                 {t.is_system_template && <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded">System</span>}
                 {!t.is_active && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">Inactive</span>}
                 {t.module_name && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{t.module_name}</span>}
                 <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{t.notification_type}</span>
                 <span className={cn("text-[10px] px-1.5 py-0.5 rounded", PRIO_STYLE[t.priority] ?? "bg-zinc-200 text-zinc-700")}>{t.priority}</span>
               </div>
               <div className="text-xs text-muted-foreground mt-2"><span className="font-mono">{t.title_template}</span></div>
               <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{t.message_template}</div>
             </div>
             {!t.is_system_template && (
               <div className="flex items-center gap-1">
                 <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setOpen(true); }}>Edit</Button>
                 <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete template?")) del.mutate(t.id); }}><Trash2 className="size-4 text-rose-600" /></Button>
               </div>
             )}
           </div>
         ))}
       </div>}
    </div>
  );
}

function TemplateDialog({ editing, onSave, saving }: { editing: any | null; onSave: (v: any) => void; saving: boolean }) {
  const [form, setForm] = useState(() => editing ?? {
    template_name: "", module_name: "", notification_type: "General", title_template: "", message_template: "",
    priority: "Medium", action_label: "", is_active: true,
  });
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} template</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Input placeholder="Template name" value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select value={form.module_name || "__none"} onValueChange={(v) => setForm({ ...form, module_name: v === "__none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
            <SelectContent><SelectItem value="__none">No module</SelectItem>{MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.notification_type} onValueChange={(v) => setForm({ ...form, notification_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Input placeholder="Title template — supports {{project_name}}, {{record_title}}…" value={form.title_template} onChange={(e) => setForm({ ...form, title_template: e.target.value })} />
        <Textarea placeholder="Message template" rows={4} value={form.message_template} onChange={(e) => setForm({ ...form, message_template: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Action label (optional)" value={form.action_label ?? ""} onChange={(e) => setForm({ ...form, action_label: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          <Label className="text-xs">Active</Label>
        </div>
        <div className="text-xs text-muted-foreground p-3 bg-muted/40 rounded">
          Placeholders: {`{{project_name}} {{record_title}} {{record_number}} {{assigned_to}} {{created_by}} {{due_date}} {{status}} {{priority}} {{amount}} {{supplier_name}}`}
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)} disabled={saving || !form.template_name || !form.title_template || !form.message_template}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}

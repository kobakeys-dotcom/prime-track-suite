import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Plus, Copy, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { listMembers, listInvitations, createInvitation, updateMemberRoles, seedDemoData } from "@/lib/admin.functions";
import { getMyPreferences, updateMyPreferences } from "@/lib/notifications.functions";
import { getCurrentContext } from "@/lib/dashboard.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ROLES = [
  "company_admin", "project_director", "project_manager", "site_engineer",
  "planning_engineer", "quantity_surveyor", "finance_manager", "procurement_officer",
  "safety_officer", "quality_inspector", "client_representative", "consultant",
  "subcontractor", "viewer",
] as const;

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ProjectCore" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const ctxFn = useServerFn(getCurrentContext);
  const membersFn = useServerFn(listMembers);
  const invitesFn = useServerFn(listInvitations);
  const seedFn = useServerFn(seedDemoData);
  const qc = useQueryClient();
  const { data: ctx } = useQuery({ queryKey: ["me"], queryFn: () => ctxFn() });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => membersFn() });
  const { data: invites = [] } = useQuery({ queryKey: ["invites"], queryFn: () => invitesFn() });

  const inviteLink = (token: string) => `${window.location.origin}/auth?mode=signup&invite=${token}`;
  const seedMut = useMutation({
    mutationFn: () => seedFn(),
    onSuccess: () => toast.success("Demo project seeded"),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Company, team, permissions, and notifications.</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="team">Team & Roles</TabsTrigger>
          <TabsTrigger value="invites">Invitations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="data">Demo Data</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <section className="bg-card border border-border rounded-sm p-6 mt-4">
            <h2 className="font-display font-bold uppercase tracking-tight mb-4">Company</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Name" value={ctx?.profile?.company?.name ?? "—"} />
              <Field label="Slug" value={ctx?.profile?.company?.slug ?? "—"} />
              <Field label="Industry" value={ctx?.profile?.company?.industry ?? "—"} />
              <Field label="Created" value={ctx?.profile?.company?.created_at ? new Date(ctx.profile.company.created_at).toLocaleDateString() : "—"} />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="team">
          <section className="bg-card border border-border rounded-sm p-6 mt-4">
            <h2 className="font-display font-bold uppercase tracking-tight mb-4">Team Members ({members.length})</h2>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr><th className="text-left py-2">Name</th><th className="text-left py-2">Email</th><th className="text-left py-2">Roles</th><th className="text-right py-2">Manage</th></tr>
              </thead>
              <tbody>
                {members.map((m: any) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="py-2 font-medium">{m.full_name ?? "—"}</td>
                    <td className="py-2 text-xs">{m.email}</td>
                    <td className="py-2 text-xs">{m.roles.join(", ") || "—"}</td>
                    <td className="py-2 text-right"><EditRolesDialog member={m} onSaved={() => qc.invalidateQueries({ queryKey: ["members"] })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </TabsContent>

        <TabsContent value="invites">
          <section className="bg-card border border-border rounded-sm p-6 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold uppercase tracking-tight">Invitations</h2>
              <InviteDialog onCreated={() => qc.invalidateQueries({ queryKey: ["invites"] })} />
            </div>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invitations sent.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr><th className="text-left py-2">Email</th><th className="text-left py-2">Role</th><th className="text-left py-2">Status</th><th className="text-left py-2">Expires</th><th className="text-left py-2">Link</th></tr>
                </thead>
                <tbody>
                  {invites.map((inv: any) => (
                    <tr key={inv.id} className="border-t border-border">
                      <td className="py-2 text-xs">{inv.email}</td>
                      <td className="py-2 text-xs">{inv.role}</td>
                      <td className="py-2 text-xs">{inv.accepted_at ? <span className="text-emerald-600">Accepted</span> : "Pending"}</td>
                      <td className="py-2 text-xs">{new Date(inv.expires_at).toLocaleDateString()}</td>
                      <td className="py-2">
                        {!inv.accepted_at && (
                          <button
                            onClick={() => { navigator.clipboard.writeText(inviteLink(inv.token)); toast.success("Invite link copied"); }}
                            className="text-accent hover:text-accent/80 inline-flex items-center gap-1 text-xs"
                          >
                            <Copy className="size-3" /> Copy
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationPreferences />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsPanel />
        </TabsContent>



        <TabsContent value="data">
          <section className="bg-card border border-border rounded-sm p-6 mt-4">
            <h2 className="font-display font-bold uppercase tracking-tight mb-2">Demo Data</h2>
            <p className="text-sm text-muted-foreground mb-4">Populate your workspace with a sample project, tasks, BOQ items, an RFI and a daily report so you can explore every module without manual entry.</p>
            <Button onClick={() => seedMut.mutate()} disabled={seedMut.isPending} className="bg-accent text-white hover:bg-accent/90">
              <Sparkles className="size-4" /> {seedMut.isPending ? "Seeding…" : "Seed demo project"}
            </Button>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium mt-1">{value}</div>
    </div>
  );
}

function InviteDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<typeof ROLES[number]>("site_engineer");
  const create = useServerFn(createInvitation);
  const mut = useMutation({
    mutationFn: () => create({ data: { email, role } }),
    onSuccess: () => { toast.success("Invitation created"); onCreated(); setOpen(false); setEmail(""); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="bg-accent text-white hover:bg-accent/90"><Plus className="size-4" /> Invite</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite a team member</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!email) return; mut.mutate(); }}>
          <div><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">After creating, copy the invite link from the table and send it to your teammate.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">{mut.isPending ? "Creating…" : "Create invite"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditRolesDialog({ member, onSaved }: { member: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(member.roles);
  useEffect(() => { if (open) setSelected(member.roles); }, [open, member.roles]);
  const updateFn = useServerFn(updateMemberRoles);
  const mut = useMutation({
    mutationFn: () => updateFn({ data: { user_id: member.id, roles: selected as any } }),
    onSuccess: () => { toast.success("Roles updated"); onSaved(); setOpen(false); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Edit roles</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Roles for {member.full_name ?? member.email}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm py-2">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(r)}
                onChange={(e) => setSelected((cur) => e.target.checked ? [...cur, r] : cur.filter((x) => x !== r))}
              />
              <span className="capitalize">{r.replace(/_/g, " ")}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">
            <Save className="size-4" /> {mut.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotificationPreferences() {
  const getFn = useServerFn(getMyPreferences);
  const updateFn = useServerFn(updateMyPreferences);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["prefs"], queryFn: () => getFn() });
  const [form, setForm] = useState({ email_enabled: true, in_app_enabled: true, whatsapp_enabled: false, reminder_days: 3 });
  useEffect(() => { if (data) setForm({
    email_enabled: data.email_enabled, in_app_enabled: data.in_app_enabled,
    whatsapp_enabled: data.whatsapp_enabled, reminder_days: data.reminder_days,
  }); }, [data]);
  const mut = useMutation({
    mutationFn: () => updateFn({ data: form }),
    onSuccess: () => { toast.success("Preferences saved"); qc.invalidateQueries({ queryKey: ["prefs"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <section className="bg-card border border-border rounded-sm p-6 mt-4 space-y-5 max-w-xl">
      <h2 className="font-display font-bold uppercase tracking-tight">Notification preferences</h2>
      <Row label="In-app notifications" desc="Show the bell badge and live updates">
        <Switch checked={form.in_app_enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, in_app_enabled: v }))} />
      </Row>
      <Row label="Email notifications" desc="Daily digest of approvals, mentions and overdue items">
        <Switch checked={form.email_enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, email_enabled: v }))} />
      </Row>
      <Row label="WhatsApp alerts" desc="Critical-only — requires WhatsApp connector">
        <Switch checked={form.whatsapp_enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, whatsapp_enabled: v }))} />
      </Row>
      <div>
        <Label>Reminder lead time (days)</Label>
        <Input type="number" min={0} max={30} value={form.reminder_days}
          onChange={(e) => setForm((f) => ({ ...f, reminder_days: Number(e.target.value) || 0 }))}
          className="w-32 mt-1" />
        <p className="text-xs text-muted-foreground mt-1">We'll notify you this many days before a due date.</p>
      </div>
      <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="bg-accent text-white hover:bg-accent/90">
        <Save className="size-4" /> {mut.isPending ? "Saving…" : "Save preferences"}
      </Button>
    </section>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {children}
    </div>
  );
}

const INTEGRATIONS = [
  { name: "Lovable AI", desc: "AI Assistant, summaries, drafting and risk analysis.", status: "Connected", color: "emerald" },
  { name: "Email (SMTP)", desc: "Send approval requests, reports and daily digests.", status: "Available", color: "zinc" },
  { name: "WhatsApp", desc: "Critical alerts for site teams and approvers.", status: "Available", color: "zinc" },
  { name: "Google Drive", desc: "Two-way sync for documents and drawings.", status: "Available", color: "zinc" },
  { name: "Microsoft 365 / OneDrive", desc: "Documents, calendar and Teams meeting links.", status: "Available", color: "zinc" },
  { name: "Procore / Aconex", desc: "Sync RFIs, submittals and drawings with external EDMS.", status: "Available", color: "zinc" },
  { name: "Xero / QuickBooks", desc: "Push approved payment claims to accounting.", status: "Available", color: "zinc" },
  { name: "Slack", desc: "Channel notifications for approvals and overdue tasks.", status: "Available", color: "zinc" },
];

function IntegrationsPanel() {
  return (
    <section className="bg-card border border-border rounded-sm p-6 mt-4">
      <h2 className="font-display font-bold uppercase tracking-tight mb-1">Integrations</h2>
      <p className="text-xs text-muted-foreground mb-5">Connect ProjectCore to the tools your team already uses.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="p-4 border border-border rounded-sm flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-sm">{i.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{i.desc}</div>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${i.color === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>{i.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}


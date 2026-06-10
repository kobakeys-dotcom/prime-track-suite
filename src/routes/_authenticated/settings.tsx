import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Copy } from "lucide-react";
import { toast } from "sonner";
import { listMembers, listInvitations, createInvitation } from "@/lib/admin.functions";
import { getCurrentContext } from "@/lib/dashboard.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

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
  const qc = useQueryClient();
  const { data: ctx } = useQuery({ queryKey: ["me"], queryFn: () => ctxFn() });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: () => membersFn() });
  const { data: invites = [] } = useQuery({ queryKey: ["invites"], queryFn: () => invitesFn() });

  const inviteLink = (token: string) => `${window.location.origin}/auth?mode=signup&invite=${token}`;

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Company, team, and invitations.</p>
      </div>

      <section className="bg-card border border-border rounded-sm p-6">
        <h2 className="font-display font-bold uppercase tracking-tight mb-4">Company</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Name" value={ctx?.profile?.company?.name ?? "—"} />
          <Field label="Slug" value={ctx?.profile?.company?.slug ?? "—"} />
          <Field label="Industry" value={ctx?.profile?.company?.industry ?? "—"} />
          <Field label="Created" value={ctx?.profile?.company?.created_at ? new Date(ctx.profile.company.created_at).toLocaleDateString() : "—"} />
        </div>
      </section>

      <section className="bg-card border border-border rounded-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold uppercase tracking-tight">Team Members ({members.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr><th className="text-left py-2">Name</th><th className="text-left py-2">Email</th><th className="text-left py-2">Roles</th><th className="text-left py-2">Joined</th></tr>
          </thead>
          <tbody>
            {members.map((m: any) => (
              <tr key={m.id} className="border-t border-border">
                <td className="py-2 font-medium">{m.full_name ?? "—"}</td>
                <td className="py-2 text-xs">{m.email}</td>
                <td className="py-2 text-xs">{m.roles.join(", ") || "—"}</td>
                <td className="py-2 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-card border border-border rounded-sm p-6">
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

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Search, Plus, Trash2, RotateCcw, Copy, Lock, Users, FolderOpen, History, UserPlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  listRolePermissions, updateRolePermission, bulkUpdateRolePermissions, resetRolePermissions, copyRolePermissions,
  listCompanyUsers, assignRoleToUser, removeRoleFromUser,
  listProjectMembers, upsertProjectMember, removeProjectMember,
  listPermissionAuditLogs, listCompanyProjects,
} from "@/lib/permissions.functions";
import { MATRIX, ROLE_LIST, MODULE_LIST, type AppRole, type Module } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMyPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/permission-gate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/permissions")({
  head: () => ({ meta: [{ title: "Role Permissions — ProjectCore" }] }),
  component: PermissionsPage,
});

const ACTIONS = ["view", "create", "edit", "delete", "approve", "export", "download", "manage"];
const SENSITIVE_KEYS = new Set<string>([
  "budget.view", "budget.export", "cash_flow.view", "payment_claims.view_amounts",
  "manpower.view_cost", "timesheets.view_cost", "timesheets.export_payroll",
  "suppliers.view_payment_terms", "rfqs.view_supplier_pricing",
  "documents.view_confidential", "documents.download_confidential",
  "drawings.view_confidential", "drawings.download_confidential",
  "ai.use_financial_data", "ai.use_payroll_data", "ai.use_supplier_pricing",
  "reports.view_financial", "reports.view_payroll", "audit.view",
  "users.manage", "roles_permissions.manage", "settings.manage",
]);

function PermissionsPage() {
  const me = useMyPermissions();
  if (me.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!me.isCompanyAdmin()) return <AccessDenied permission="roles_permissions.manage" module="roles_permissions" />;
  return <PermissionsAdmin />;
}

function PermissionsAdmin() {
  const [tab, setTab] = useState("matrix");
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Shield className="size-6 text-accent" /> Role Permissions & Access Control</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage roles, permissions, user assignments, and project access. Row-level security enforces these rules server-side.</p>
        </div>
      </div>

      <SummaryCards />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="matrix"><Shield className="size-3 mr-1" /> Permission Matrix</TabsTrigger>
          <TabsTrigger value="users"><Users className="size-3 mr-1" /> User Roles</TabsTrigger>
          <TabsTrigger value="projects"><FolderOpen className="size-3 mr-1" /> Project Access</TabsTrigger>
          <TabsTrigger value="sensitive"><Lock className="size-3 mr-1" /> Sensitive Access</TabsTrigger>
          <TabsTrigger value="audit"><History className="size-3 mr-1" /> Audit Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="matrix" className="mt-4"><PermissionMatrixTab /></TabsContent>
        <TabsContent value="users" className="mt-4"><UserRolesTab /></TabsContent>
        <TabsContent value="projects" className="mt-4"><ProjectAccessTab /></TabsContent>
        <TabsContent value="sensitive" className="mt-4"><SensitiveAccessTab /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditLogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCards() {
  const usersFn = useServerFn(listCompanyUsers);
  const projFn = useServerFn(listCompanyProjects);
  const { data: usersData } = useQuery({ queryKey: ["company-users"], queryFn: () => usersFn() });
  const { data: projData } = useQuery({ queryKey: ["company-projects"], queryFn: () => projFn() });
  const users = (usersData?.items ?? []) as any[];
  const cards = [
    { label: "Total Roles", value: ROLE_LIST.length },
    { label: "Active Users", value: users.length },
    { label: "Admins", value: users.filter((u) => u.roles.includes("company_admin")).length },
    { label: "Client Users", value: users.filter((u) => u.roles.includes("client_representative")).length },
    { label: "Without Role", value: users.filter((u) => u.roles.length === 0).length },
    { label: "Projects", value: (projData?.items ?? []).length },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-card border border-border rounded-sm p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
          <div className="font-display text-2xl font-bold mt-1">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- Permission Matrix ----------
function PermissionMatrixTab() {
  const [selectedRole, setSelectedRole] = useState<AppRole>("project_manager");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [showSensitive, setShowSensitive] = useState(false);

  const listFn = useServerFn(listRolePermissions);
  const updFn = useServerFn(updateRolePermission);
  const resetFn = useServerFn(resetRolePermissions);
  const copyFn = useServerFn(copyRolePermissions);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["role-perms"], queryFn: () => listFn() });
  const overrides: Record<string, Record<string, boolean>> = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    for (const o of (data?.items ?? []) as any[]) {
      (map[o.role] ??= {})[o.permission_key] = o.is_allowed;
    }
    return map;
  }, [data]);

  const upd = useMutation({
    mutationFn: (v: any) => updFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["role-perms"] }); qc.invalidateQueries({ queryKey: ["my-permissions"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const reset = useMutation({
    mutationFn: () => resetFn({ data: { role: selectedRole } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["role-perms"] }); toast.success("Reset to defaults"); },
  });
  const [copyFrom, setCopyFrom] = useState<AppRole>("project_manager");
  const copy = useMutation({
    mutationFn: () => copyFn({ data: { from_role: copyFrom, to_role: selectedRole } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["role-perms"] }); toast.success("Copied"); },
  });

  // Build full permission list = MATRIX default keys + extra sensitive keys
  const allKeys = useMemo(() => {
    const set = new Set<string>();
    for (const role of ROLE_LIST) {
      const mods = (MATRIX as any)[role] ?? {};
      for (const [mod, acts] of Object.entries(mods)) {
        for (const a of acts as string[]) set.add(`${mod}.${a}`);
      }
    }
    for (const k of SENSITIVE_KEYS) set.add(k);
    return Array.from(set).sort();
  }, []);

  const grouped: Record<string, string[]> = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const k of allKeys) {
      const [mod] = k.split(".");
      if (moduleFilter !== "all" && mod !== moduleFilter) continue;
      if (search && !k.toLowerCase().includes(search.toLowerCase())) continue;
      if (showSensitive && !SENSITIVE_KEYS.has(k)) continue;
      (out[mod] ??= []).push(k);
    }
    return out;
  }, [allKeys, moduleFilter, search, showSensitive]);

  function isAllowed(key: string): boolean {
    if (overrides[selectedRole] && key in overrides[selectedRole]) return overrides[selectedRole][key];
    const [mod, action] = key.split(".");
    const m = (MATRIX as any)[selectedRole]?.[mod];
    return !!m && m.includes(action);
  }

  function toggle(key: string) {
    const next = !isAllowed(key);
    if (SENSITIVE_KEYS.has(key) && next) {
      if (!confirm(`Grant SENSITIVE permission "${key}" to role "${selectedRole}"?`)) return;
    }
    if (selectedRole === "company_admin" && ["roles_permissions.manage", "users.manage"].includes(key) && !next) {
      if (!confirm("Removing this from company_admin can lock you out of admin features. Continue?")) return;
    }
    upd.mutate({ role: selectedRole, permission_key: key, is_allowed: next });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Role</Label>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{ROLE_LIST.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search permission…" className="pl-9 w-56" />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Module" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All modules</SelectItem>{MODULE_LIST.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs"><Switch checked={showSensitive} onCheckedChange={setShowSensitive} /> Sensitive only</label>
        <div className="ml-auto flex items-center gap-2">
          <Select value={copyFrom} onValueChange={(v) => setCopyFrom(v as AppRole)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Copy from…" /></SelectTrigger>
            <SelectContent>{ROLE_LIST.filter((r) => r !== selectedRole).map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => copy.mutate()}><Copy className="size-4 mr-1" /> Copy</Button>
          <Button variant="outline" size="sm" onClick={() => { if (confirm("Reset this role to defaults?")) reset.mutate(); }}><RotateCcw className="size-4 mr-1" /> Reset</Button>
        </div>
      </div>

      <div className="space-y-3">
        {Object.keys(grouped).length === 0 && <p className="text-sm text-muted-foreground p-6">No permissions match.</p>}
        {Object.entries(grouped).map(([mod, keys]) => (
          <div key={mod} className="bg-card border border-border rounded-sm">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border">
              <div className="font-display font-bold uppercase tracking-tight text-sm">{mod.replace(/_/g, " ")}</div>
              <div className="text-xs text-muted-foreground">{keys.filter(isAllowed).length} / {keys.length} allowed</div>
            </div>
            <div className="divide-y divide-border">
              {keys.map((k) => {
                const [, action] = k.split(".");
                const sensitive = SENSITIVE_KEYS.has(k);
                const overridden = overrides[selectedRole] && k in overrides[selectedRole];
                return (
                  <div key={k} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="text-xs font-mono">{k}</code>
                      <span className="text-xs text-muted-foreground">{action}</span>
                      {sensitive && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">Sensitive</span>}
                      {overridden && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Override</span>}
                    </div>
                    <Switch checked={isAllowed(k)} onCheckedChange={() => toggle(k)} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- User Roles ----------
function UserRolesTab() {
  const listFn = useServerFn(listCompanyUsers);
  const assignFn = useServerFn(assignRoleToUser);
  const removeFn = useServerFn(removeRoleFromUser);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["company-users"], queryFn: () => listFn() });
  const [search, setSearch] = useState("");

  const assign = useMutation({
    mutationFn: (v: { user_id: string; role: string }) => assignFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company-users"] }); toast.success("Role assigned"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const remove = useMutation({
    mutationFn: (v: { user_id: string; role: string }) => removeFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company-users"] }); toast.success("Role removed"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const users = ((data?.items ?? []) as any[]).filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${u.full_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="pl-9 w-72" />
        </div>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground p-6">Loading…</p> :
       users.length === 0 ? <EmptyState text="No users found." /> :
       <div className="bg-card border border-border rounded-sm overflow-x-auto">
         <table className="w-full text-sm">
           <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
             <tr><th className="text-left p-3">User</th><th className="text-left p-3">Email</th><th className="text-left p-3">Roles</th><th className="text-left p-3">Actions</th></tr>
           </thead>
           <tbody>
             {users.map((u) => (
               <tr key={u.id} className="border-t border-border">
                 <td className="p-3 font-medium">{u.full_name ?? "Unnamed"}</td>
                 <td className="p-3 text-muted-foreground">{u.email}</td>
                 <td className="p-3">
                   <div className="flex flex-wrap gap-1">
                     {u.roles.length === 0 && <span className="text-xs text-muted-foreground">No role</span>}
                     {u.roles.map((r: string) => (
                       <span key={r} className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded inline-flex items-center gap-1">
                         {r}
                         <button onClick={() => { if (confirm(`Remove "${r}" from this user?`)) remove.mutate({ user_id: u.id, role: r }); }} className="hover:text-rose-600">×</button>
                       </span>
                     ))}
                   </div>
                 </td>
                 <td className="p-3">
                   <Select onValueChange={(v) => assign.mutate({ user_id: u.id, role: v })}>
                     <SelectTrigger className="w-44 h-8"><SelectValue placeholder="+ Assign role" /></SelectTrigger>
                     <SelectContent>{ROLE_LIST.filter((r) => !u.roles.includes(r)).map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                   </Select>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>}
    </div>
  );
}

// ---------- Project Access ----------
function ProjectAccessTab() {
  const projFn = useServerFn(listCompanyProjects);
  const membersFn = useServerFn(listProjectMembers);
  const usersFn = useServerFn(listCompanyUsers);
  const saveFn = useServerFn(upsertProjectMember);
  const delFn = useServerFn(removeProjectMember);
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string>("");
  const [open, setOpen] = useState(false);

  const { data: projects } = useQuery({ queryKey: ["company-projects"], queryFn: () => projFn() });
  const { data: users } = useQuery({ queryKey: ["company-users"], queryFn: () => usersFn() });
  const { data: members } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => membersFn({ data: { project_id: projectId || undefined } }),
  });

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project-members"] }); toast.success("Saved"); setOpen(false); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project-members"] }); toast.success("Removed"); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={projectId || "all"} onValueChange={(v) => setProjectId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-72"><SelectValue placeholder="All projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {(projects?.items ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!projectId}><UserPlus className="size-4 mr-1" /> Add member</Button>
          </DialogTrigger>
          <AddMemberDialog projectId={projectId} users={(users?.items ?? []) as any[]} onSave={(v) => save.mutate(v)} saving={save.isPending} />
        </Dialog>
      </div>
      {!projectId && <p className="text-xs text-muted-foreground">Showing all project memberships. Select a project to add members.</p>}
      <div className="bg-card border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left p-3">Project</th><th className="text-left p-3">User</th><th className="text-left p-3">Role</th>
              <th className="text-left p-3">Access</th><th className="text-center p-3">Edit</th><th className="text-center p-3">Approve</th>
              <th className="text-center p-3">Export</th><th className="text-center p-3">Cost</th><th></th>
            </tr>
          </thead>
          <tbody>
            {((members?.items ?? []) as any[]).length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No members</td></tr>}
            {((members?.items ?? []) as any[]).map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="p-3 text-xs">{m.projects?.name ?? m.project_id.slice(0, 8)}</td>
                <td className="p-3 font-medium">{m.profiles?.full_name ?? m.profiles?.email}</td>
                <td className="p-3 text-xs">{m.role}</td>
                <td className="p-3 text-xs">{m.access_level}</td>
                <td className="p-3 text-center"><Switch checked={!!m.can_edit} onCheckedChange={(v) => save.mutate({ ...m, can_edit: v })} /></td>
                <td className="p-3 text-center"><Switch checked={!!m.can_approve} onCheckedChange={(v) => save.mutate({ ...m, can_approve: v })} /></td>
                <td className="p-3 text-center"><Switch checked={!!m.can_export} onCheckedChange={(v) => save.mutate({ ...m, can_export: v })} /></td>
                <td className="p-3 text-center"><Switch checked={!!m.can_view_cost} onCheckedChange={(v) => { if (v && !confirm("Grant cost visibility on this project?")) return; save.mutate({ ...m, can_view_cost: v }); }} /></td>
                <td className="p-3"><button onClick={() => { if (confirm("Remove member?")) del.mutate(m.id); }} className="text-rose-600 hover:bg-muted rounded p-1"><Trash2 className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddMemberDialog({ projectId, users, onSave, saving }: { projectId: string; users: any[]; onSave: (v: any) => void; saving: boolean }) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("viewer");
  const [accessLevel, setAccessLevel] = useState("Member");
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add project member</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">User</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
            <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLE_LIST.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Access level</Label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Owner","Manager","Member","Reviewer","Viewer","Client","Subcontractor"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave({ project_id: projectId, user_id: userId, role, access_level: accessLevel })} disabled={!userId || saving}>Add member</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---------- Sensitive Access ----------
function SensitiveAccessTab() {
  const listFn = useServerFn(listRolePermissions);
  const { data } = useQuery({ queryKey: ["role-perms"], queryFn: () => listFn() });
  const sensitive = ((data?.items ?? []) as any[]).filter((o) => SENSITIVE_KEYS.has(o.permission_key));

  // Also compute default sensitive grants from MATRIX
  const defaults: { role: string; permission_key: string }[] = [];
  for (const role of ROLE_LIST) {
    const m = (MATRIX as any)[role] ?? {};
    for (const [mod, acts] of Object.entries(m)) {
      for (const a of acts as string[]) {
        const k = `${mod}.${a}`;
        if (SENSITIVE_KEYS.has(k)) defaults.push({ role, permission_key: k });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-sm p-3 text-xs flex items-start gap-2">
        <AlertTriangle className="size-4 mt-0.5 shrink-0" />
        <span>Sensitive permissions grant access to cost, payroll, supplier pricing, confidential documents, AI financial context, and admin controls. Audit logs are kept for all changes.</span>
      </div>
      <div className="bg-card border border-border rounded-sm">
        <div className="px-4 py-3 border-b border-border font-display font-bold uppercase tracking-tight text-sm">Sensitive Permission Overrides</div>
        {sensitive.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No sensitive overrides in your company. Defaults shown below.</p> :
         <div className="divide-y divide-border">
           {sensitive.map((o) => (
             <div key={o.id} className="px-4 py-2 text-sm flex items-center justify-between">
               <div><code className="font-mono text-xs">{o.permission_key}</code> <span className="ml-2 text-xs text-muted-foreground">{o.role}</span></div>
               <span className={cn("text-[10px] px-1.5 py-0.5 rounded", o.is_allowed ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-700")}>{o.is_allowed ? "ALLOWED" : "DENIED"}</span>
             </div>
           ))}
         </div>}
      </div>
      <div className="bg-card border border-border rounded-sm">
        <div className="px-4 py-3 border-b border-border font-display font-bold uppercase tracking-tight text-sm">Default Sensitive Grants</div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {defaults.map((d, i) => (
            <div key={i} className="px-4 py-2 text-sm flex items-center justify-between">
              <code className="font-mono text-xs">{d.permission_key}</code>
              <span className="text-xs text-muted-foreground">{d.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Audit Logs ----------
function AuditLogsTab() {
  const listFn = useServerFn(listPermissionAuditLogs);
  const { data, isLoading } = useQuery({ queryKey: ["perm-audit"], queryFn: () => listFn() });
  const items = (data?.items ?? []) as any[];
  if (isLoading) return <p className="text-sm text-muted-foreground p-6">Loading…</p>;
  if (items.length === 0) return <EmptyState text="No permission changes yet." />;
  return (
    <div className="bg-card border border-border rounded-sm divide-y divide-border">
      {items.map((l) => (
        <div key={l.id} className="p-3 text-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium">{l.action.replace(/_/g, " ")}</div>
            <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2">
              {l.changed_by_profile?.full_name && <span>by {l.changed_by_profile.full_name}</span>}
              {l.target_user_profile?.full_name && <span>→ {l.target_user_profile.full_name}</span>}
              {l.target_role && <span className="px-1.5 py-0.5 bg-muted rounded">{l.target_role}</span>}
              {l.permission_key && <code className="font-mono">{l.permission_key}</code>}
              {l.new_value && <span>= {l.new_value}</span>}
              {l.remarks && <span className="italic">{l.remarks}</span>}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground shrink-0">{new Date(l.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-card border border-border rounded-sm p-12 text-center">
      <Plus className="size-8 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

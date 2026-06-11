import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { MATRIX, type AppRole } from "@/lib/permissions";

async function assertCompanyAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const isAdmin = (data ?? []).some((r: any) => r.role === "company_admin");
  if (!isAdmin) throw new Error("Forbidden: company admin required");
}

async function getCompanyId(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  if (!data?.company_id) throw new Error("No company");
  return data.company_id;
}

// --- My effective permissions ---
export const getMyEffectivePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRows } = await context.supabase.from("user_roles")
      .select("role, company_id").eq("user_id", context.userId);
    const roles: string[] = (roleRows ?? []).map((r: any) => r.role);
    const companyId = roleRows?.[0]?.company_id ?? null;
    // overrides
    let overrides: Record<string, boolean> = {};
    if (companyId) {
      const { data: ov } = await context.supabase.from("role_permissions")
        .select("role, permission_key, is_allowed")
        .eq("company_id", companyId)
        .in("role", (roles.length ? roles : ["__none__"]) as any);
      for (const o of ov ?? []) overrides[o.permission_key] = !!o.is_allowed;
    }
    return { roles, companyId, overrides };
  });

// --- Role permissions matrix ---
export const listRolePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("role_permissions")
      .select("*").eq("company_id", companyId);
    if (error) throw error;
    return { items: data ?? [], companyId };
  });

export const updateRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    role: z.string(),
    permission_key: z.string().min(1),
    is_allowed: z.boolean(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertCompanyAdmin(context.supabase, context.userId);
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { error } = await context.supabase.from("role_permissions").upsert(
      { company_id: companyId, role: data.role as any, permission_key: data.permission_key, is_allowed: data.is_allowed, created_by: context.userId },
      { onConflict: "company_id,role,permission_key" }
    );
    if (error) throw error;
    await context.supabase.from("permission_audit_logs").insert({
      company_id: companyId, changed_by: context.userId, target_role: data.role as any,
      action: data.is_allowed ? "permission_granted" : "permission_revoked",
      permission_key: data.permission_key, new_value: String(data.is_allowed),
    });
    return { ok: true };
  });

export const bulkUpdateRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    role: z.string(),
    permissions: z.record(z.string(), z.boolean()),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertCompanyAdmin(context.supabase, context.userId);
    const companyId = await getCompanyId(context.supabase, context.userId);
    const rows = Object.entries(data.permissions).map(([k, v]) => ({
      company_id: companyId, role: data.role as any, permission_key: k, is_allowed: v, created_by: context.userId,
    }));
    if (rows.length === 0) return { ok: true };
    const { error } = await context.supabase.from("role_permissions").upsert(rows, { onConflict: "company_id,role,permission_key" });
    if (error) throw error;
    await context.supabase.from("permission_audit_logs").insert({
      company_id: companyId, changed_by: context.userId, target_role: data.role as any,
      action: "bulk_permissions_updated", remarks: `${rows.length} keys updated`,
    });
    return { ok: true };
  });

export const resetRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ role: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertCompanyAdmin(context.supabase, context.userId);
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { error } = await context.supabase.from("role_permissions").delete()
      .eq("company_id", companyId).eq("role", data.role as any);
    if (error) throw error;
    await context.supabase.from("permission_audit_logs").insert({
      company_id: companyId, changed_by: context.userId, target_role: data.role as any,
      action: "role_reset_to_default",
    });
    return { ok: true };
  });

export const copyRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ from_role: z.string(), to_role: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertCompanyAdmin(context.supabase, context.userId);
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { data: src } = await context.supabase.from("role_permissions")
      .select("permission_key, is_allowed").eq("company_id", companyId).eq("role", data.from_role as any);
    // also include defaults from matrix for the source role
    const defaults: Record<string, boolean> = {};
    const m = (MATRIX as any)[data.from_role] ?? {};
    for (const [mod, acts] of Object.entries(m)) {
      for (const a of acts as string[]) defaults[`${mod}.${a}`] = true;
    }
    for (const o of src ?? []) defaults[o.permission_key] = o.is_allowed;
    const rows = Object.entries(defaults).map(([k, v]) => ({
      company_id: companyId, role: data.to_role as any, permission_key: k, is_allowed: v, created_by: context.userId,
    }));
    if (rows.length) {
      const { error } = await context.supabase.from("role_permissions").upsert(rows, { onConflict: "company_id,role,permission_key" });
      if (error) throw error;
    }
    await context.supabase.from("permission_audit_logs").insert({
      company_id: companyId, changed_by: context.userId, target_role: data.to_role as any,
      action: "copy_permissions", remarks: `from ${data.from_role}`,
    });
    return { ok: true, count: rows.length };
  });

// --- Users + role assignment ---
export const listCompanyUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompanyId(context.supabase, context.userId);
    const { data: profiles, error } = await context.supabase.from("profiles")
      .select("id, full_name, email, job_title, phone, avatar_url, company_id")
      .eq("company_id", companyId).order("full_name");
    if (error) throw error;
    const { data: roles } = await context.supabase.from("user_roles")
      .select("user_id, role, company_id").eq("company_id", companyId);
    const byUser: Record<string, string[]> = {};
    for (const r of roles ?? []) (byUser[r.user_id] ??= []).push(r.role);
    const items = (profiles ?? []).map((p: any) => ({ ...p, roles: byUser[p.id] ?? [] }));
    return { items };
  });

export const assignRoleToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), role: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertCompanyAdmin(context.supabase, context.userId);
    const companyId = await getCompanyId(context.supabase, context.userId);
    // verify target user belongs to company
    const { data: tgt } = await context.supabase.from("profiles").select("company_id").eq("id", data.user_id).maybeSingle();
    if (!tgt || tgt.company_id !== companyId) throw new Error("User not in your company");
    const { error } = await context.supabase.from("user_roles").upsert(
      { user_id: data.user_id, company_id: companyId, role: data.role as any },
      { onConflict: "user_id,role,company_id" }
    );
    if (error) throw error;
    await context.supabase.from("permission_audit_logs").insert({
      company_id: companyId, changed_by: context.userId, target_user_id: data.user_id,
      target_role: data.role as any, action: "role_assigned",
    });
    await context.supabase.from("notifications").insert({
      user_id: data.user_id, company_id: companyId, sender_id: context.userId,
      title: "Role assigned", message: `You have been assigned the role: ${data.role}`,
      body: `You have been assigned the role: ${data.role}`,
      notification_type: "System", priority: "Medium", module_name: "roles_permissions",
    });
    return { ok: true };
  });

export const removeRoleFromUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), role: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertCompanyAdmin(context.supabase, context.userId);
    const companyId = await getCompanyId(context.supabase, context.userId);
    if (data.role === "company_admin") {
      const { data: admins } = await context.supabase.from("user_roles")
        .select("user_id").eq("company_id", companyId).eq("role", "company_admin");
      if ((admins ?? []).length <= 1) throw new Error("Cannot remove the last Company Admin");
    }
    const { error } = await context.supabase.from("user_roles").delete()
      .eq("user_id", data.user_id).eq("company_id", companyId).eq("role", data.role as any);
    if (error) throw error;
    await context.supabase.from("permission_audit_logs").insert({
      company_id: companyId, changed_by: context.userId, target_user_id: data.user_id,
      target_role: data.role as any, action: "role_removed",
    });
    return { ok: true };
  });

// --- Project members ---
export const listProjectMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("project_members")
      .select("id, project_id, user_id, role, access_level, can_edit, can_approve, can_export, can_view_cost, status, is_archived, created_at, projects(name, code), profiles:user_id(full_name, email, avatar_url)")
      .order("created_at", { ascending: false });
    if (data.project_id) q = q.eq("project_id", data.project_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { items: rows ?? [] };
  });

const PMInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.string().default("viewer"),
  access_level: z.string().default("Member"),
  can_edit: z.boolean().default(false),
  can_approve: z.boolean().default(false),
  can_export: z.boolean().default(false),
  can_view_cost: z.boolean().default(false),
  status: z.string().default("Active"),
});

export const upsertProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PMInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertCompanyAdmin(context.supabase, context.userId);
    const row = { ...data, added_by: context.userId } as any;
    const res = data.id
      ? await context.supabase.from("project_members").update(row).eq("id", data.id).select().single()
      : await context.supabase.from("project_members").upsert(row, { onConflict: "project_id,user_id" }).select().single();
    if (res.error) throw res.error;
    const companyId = await getCompanyId(context.supabase, context.userId);
    await context.supabase.from("permission_audit_logs").insert({
      company_id: companyId, changed_by: context.userId, target_user_id: data.user_id,
      project_id: data.project_id, action: data.id ? "project_access_updated" : "project_access_granted",
    });
    return res.data;
  });

export const removeProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertCompanyAdmin(context.supabase, context.userId);
    const { data: pm } = await context.supabase.from("project_members").select("project_id, user_id").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("project_members").delete().eq("id", data.id);
    if (error) throw error;
    const companyId = await getCompanyId(context.supabase, context.userId);
    await context.supabase.from("permission_audit_logs").insert({
      company_id: companyId, changed_by: context.userId,
      target_user_id: pm?.user_id, project_id: pm?.project_id, action: "project_access_removed",
    });
    return { ok: true };
  });

// --- Audit logs ---
export const listPermissionAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    limit: z.number().int().min(1).max(500).optional(),
    user_id: z.string().uuid().optional(),
    target_role: z.string().optional(),
  }).partial().parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("permission_audit_logs")
      .select("*, changed_by_profile:changed_by(full_name, email), target_user_profile:target_user_id(full_name, email)")
      .order("created_at", { ascending: false }).limit(data.limit ?? 200);
    if (data.user_id) q = q.eq("target_user_id", data.user_id);
    if (data.target_role) q = q.eq("target_role", data.target_role);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { items: rows ?? [] };
  });

// --- Projects list (admins only) ---
export const listCompanyProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("projects")
      .select("id, name, code, status").order("name");
    if (error) throw error;
    return { items: data ?? [] };
  });

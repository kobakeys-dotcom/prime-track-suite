import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SENSITIVE_KEYS = /(password|token|secret|api[_-]?key|private[_-]?key|authorization|bearer|access[_-]?token|refresh[_-]?token)/i;

function maskSensitive(values: any): any {
  if (!values || typeof values !== "object") return values;
  const out: any = Array.isArray(values) ? [] : {};
  for (const k of Object.keys(values)) {
    if (SENSITIVE_KEYS.test(k)) out[k] = "***REDACTED***";
    else if (typeof values[k] === "object" && values[k] !== null) out[k] = maskSensitive(values[k]);
    else out[k] = values[k];
  }
  return out;
}

const FilterSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  module_name: z.string().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  action_type: z.string().optional().nullable(),
  severity: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  sensitive_only: z.boolean().optional(),
  failed_only: z.boolean().optional(),
  date_from: z.string().optional().nullable(),
  date_to: z.string().optional().nullable(),
  record_id: z.string().uuid().optional().nullable(),
  entity_type: z.string().optional().nullable(),
  entity_id: z.string().uuid().optional().nullable(),
  search: z.string().optional().nullable(),
  limit: z.number().int().min(1).max(2000).optional(),
}).partial();

async function attachActors(supabase: any, rows: any[]) {
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
  if (!actorIds.length) return rows;
  const { data: actors } = await supabase.from("profiles").select("id, full_name, email").in("id", actorIds);
  const map = new Map((actors ?? []).map((a: any) => [a.id, a]));
  return rows.map((r) => ({
    ...r,
    actor_name: r.user_name ?? (r.actor_id ? ((map.get(r.actor_id) as any)?.full_name ?? (map.get(r.actor_id) as any)?.email ?? "—") : "system"),
    actor_email: r.user_email ?? (r.actor_id ? (map.get(r.actor_id) as any)?.email ?? null : null),
  }));
}

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => (d ? FilterSchema.parse(d) : {}))
  .handler(async ({ context, data }) => {
    const f = data ?? {};
    let q = context.supabase
      .from("audit_logs")
      .select("id, action, action_type, module_name, entity_type, entity_id, record_id, record_number, record_title, description, actor_id, user_name, user_email, project_id, severity, status, source, is_sensitive, error_message, old_values, new_values, changed_fields, metadata, ip_address, user_agent, created_at, company_id")
      .order("created_at", { ascending: false })
      .limit(f.limit ?? 500);
    if (f.project_id) q = q.eq("project_id", f.project_id);
    if (f.module_name) q = q.eq("module_name", f.module_name);
    if (f.user_id) q = q.eq("actor_id", f.user_id);
    if (f.action_type) q = q.eq("action_type", f.action_type);
    if (f.severity) q = q.eq("severity", f.severity);
    if (f.status) q = q.eq("status", f.status);
    if (f.source) q = q.eq("source", f.source);
    if (f.sensitive_only) q = q.eq("is_sensitive", true);
    if (f.failed_only) q = q.eq("status", "Failed");
    if (f.date_from) q = q.gte("created_at", f.date_from);
    if (f.date_to) q = q.lte("created_at", f.date_to);
    if (f.record_id) q = q.eq("record_id", f.record_id);
    if (f.entity_type) q = q.eq("entity_type", f.entity_type);
    if (f.entity_id) q = q.eq("entity_id", f.entity_id);
    if (f.search) {
      const s = f.search.replace(/[%_]/g, "\\$&");
      q = q.or(`action.ilike.%${s}%,description.ilike.%${s}%,record_number.ilike.%${s}%,record_title.ilike.%${s}%,user_name.ilike.%${s}%,user_email.ilike.%${s}%,error_message.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw error;

    // Permission: sensitive viewing
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "company_admin" });
    const canViewSensitive = !!isAdmin;

    let withActors = await attachActors(context.supabase, rows ?? []);
    // Mask sensitive payloads for those without permission
    withActors = withActors.map((r: any) => {
      if (r.is_sensitive && !canViewSensitive) {
        return { ...r, old_values: null, new_values: null, changed_fields: null, metadata: null, description: "[Sensitive — restricted]" };
      }
      return { ...r, old_values: maskSensitive(r.old_values), new_values: maskSensitive(r.new_values), metadata: maskSensitive(r.metadata) };
    });

    // Project names
    const projectIds = Array.from(new Set(withActors.map((r: any) => r.project_id).filter(Boolean))) as string[];
    if (projectIds.length) {
      const { data: projects } = await context.supabase.from("projects").select("id, name").in("id", projectIds);
      const pmap = new Map((projects ?? []).map((p: any) => [p.id, p.name]));
      withActors = withActors.map((r: any) => ({ ...r, project_name: r.project_id ? pmap.get(r.project_id) ?? null : null }));
    }
    return withActors;
  });

export const getAuditLogById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("audit_logs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "company_admin" });
    const canViewSensitive = !!isAdmin;
    let result = { ...row } as any;
    if (result.is_sensitive && !canViewSensitive) {
      result = { ...result, old_values: null, new_values: null, changed_fields: null, metadata: null, description: "[Sensitive — restricted]" };
    } else {
      result.old_values = maskSensitive(result.old_values);
      result.new_values = maskSensitive(result.new_values);
      result.metadata = maskSensitive(result.metadata);
    }
    if (result.actor_id) {
      const { data: prof } = await context.supabase.from("profiles").select("full_name, email").eq("id", result.actor_id).maybeSingle();
      result.actor_name = prof?.full_name ?? prof?.email ?? "—";
      result.actor_email = prof?.email ?? null;
    }
    if (result.project_id) {
      const { data: proj } = await context.supabase.from("projects").select("name").eq("id", result.project_id).maybeSingle();
      result.project_name = proj?.name ?? null;
    }
    return result;
  });

export const listEntityActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    entity_type: z.string().min(1).max(80).regex(/^[a-z][a-z0-9_]*$/, "invalid entity_type"),
    entity_id: z.string().uuid(),
  }).parse(d))

  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("audit_logs")
      .select("id, action, action_type, actor_id, user_name, description, severity, status, metadata, created_at")
      .or(`and(entity_type.eq.${data.entity_type},entity_id.eq.${data.entity_id}),and(module_name.eq.${data.entity_type},record_id.eq.${data.entity_id})`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return await attachActors(context.supabase, rows ?? []);
  });

export const auditLogStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("id, severity, status, is_sensitive, action_type, module_name, source, created_at, actor_id")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw error;
    const rows = data ?? [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todays = rows.filter((r: any) => new Date(r.created_at) >= today);
    const byModule: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const r of rows as any[]) {
      if (r.module_name) byModule[r.module_name] = (byModule[r.module_name] ?? 0) + 1;
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + 1;
      if (r.action_type) byAction[r.action_type] = (byAction[r.action_type] ?? 0) + 1;
      if (r.severity) bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1;
    }
    const isPermAction = (r: any) => r.action_type === "Permission Change" || r.action_type === "Role Change" || r.module_name === "roles_permissions";
    const isExport = (r: any) => r.action_type === "Export" || r.action_type === "Download";
    const isAi = (r: any) => r.module_name === "ai_assistant" || r.action_type === "AI Prompt" || r.action_type === "AI Output Saved";
    return {
      total: rows.length,
      today: todays.length,
      critical: rows.filter((r: any) => r.severity === "Critical").length,
      failed: rows.filter((r: any) => r.status === "Failed").length,
      sensitive: rows.filter((r: any) => r.is_sensitive).length,
      permission: rows.filter(isPermAction).length,
      exports: rows.filter(isExport).length,
      ai: rows.filter(isAi).length,
      activeUsersToday: new Set(todays.map((r: any) => r.actor_id).filter(Boolean)).size,
      byModule, byDay, byAction, bySeverity,
    };
  });

export const listSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "company_admin" });
    if (!isAdmin) return { allowed: false, items: [] as any[] };
    const { data, error } = await context.supabase
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return { allowed: true, items: data ?? [] };
  });

export const listAuditExports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_log_exports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const recordAuditExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    export_name: z.string().max(255).optional(),
    date_from: z.string().optional().nullable(),
    date_to: z.string().optional().nullable(),
    filters: z.any().optional(),
    total_records: z.number().int().min(0).optional(),
    file_name: z.string().max(255).optional(),
    project_id: z.string().uuid().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: prof } = await context.supabase.from("profiles").select("company_id, full_name, email").eq("id", context.userId).maybeSingle();
    if (!prof?.company_id) throw new Error("Profile not found");
    // permission check: company_admin or audit_logs.export override
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "company_admin" });
    const { data: hasOverride } = await context.supabase.rpc("has_permission_override", { _user_id: context.userId, _permission_key: "audit_logs.export" });
    if (!isAdmin && !hasOverride) throw new Error("Forbidden: audit_logs.export permission required");

    const { data: exp, error } = await context.supabase
      .from("audit_log_exports")
      .insert({
        company_id: prof.company_id as string,
        project_id: data.project_id ?? null,
        exported_by: context.userId,
        export_name: data.export_name ?? "Audit Log Export",
        export_type: "CSV",
        date_from: data.date_from ?? null,
        date_to: data.date_to ?? null,
        filters: data.filters ?? null,
        total_records: data.total_records ?? 0,
        file_name: data.file_name ?? null,
        status: "Completed",
      })
      .select()
      .single();
    if (error) throw error;
    // Log the export itself as an audit entry
    await context.supabase.from("audit_logs").insert({
      company_id: prof.company_id,
      project_id: data.project_id ?? null,
      actor_id: context.userId,
      user_name: prof.full_name ?? prof.email,
      user_email: prof.email,
      action: "Audit log export",
      action_type: "Export",
      module_name: "audit_logs",
      description: `Exported ${data.total_records ?? 0} audit log entries`,
      severity: "Medium",
      status: "Success",
      source: "Web App",
      is_sensitive: true,
      metadata: { filters: data.filters ?? null, file_name: data.file_name ?? null },
    });
    return exp;
  });

export const createAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    action: z.string().min(1).max(255),
    module_name: z.string().min(1).max(80),
    action_type: z.string().max(60).optional(),
    project_id: z.string().uuid().optional().nullable(),
    record_id: z.string().uuid().optional().nullable(),
    entity_type: z.string().max(80).optional().nullable(),
    entity_id: z.string().uuid().optional().nullable(),
    record_number: z.string().max(120).optional().nullable(),
    record_title: z.string().max(255).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    old_values: z.any().optional(),
    new_values: z.any().optional(),
    severity: z.enum(["Info", "Low", "Medium", "High", "Critical"]).optional(),
    status: z.enum(["Success", "Failed", "Warning", "Pending"]).optional(),
    source: z.string().max(40).optional(),
    error_message: z.string().max(2000).optional().nullable(),
    metadata: z.any().optional(),
    is_sensitive: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    try {
      const { data: prof } = await context.supabase.from("profiles").select("company_id, full_name, email").eq("id", context.userId).maybeSingle();
      const old = maskSensitive(data.old_values);
      const neu = maskSensitive(data.new_values);
      let changed: string[] | null = null;
      if (old && neu && typeof old === "object" && typeof neu === "object") {
        changed = Object.keys(neu).filter((k) => JSON.stringify((old as any)[k]) !== JSON.stringify((neu as any)[k]));
      }
      const { error } = await context.supabase.from("audit_logs").insert({
        company_id: prof?.company_id ?? null,
        project_id: data.project_id ?? null,
        actor_id: context.userId,
        user_name: prof?.full_name ?? prof?.email ?? null,
        user_email: prof?.email ?? null,
        action: data.action,
        action_type: data.action_type ?? "General",
        module_name: data.module_name,
        entity_type: data.entity_type ?? data.module_name,
        entity_id: data.entity_id ?? data.record_id ?? null,
        record_id: data.record_id ?? data.entity_id ?? null,
        record_number: data.record_number ?? null,
        record_title: data.record_title ?? null,
        description: data.description ?? null,
        old_values: old,
        new_values: neu,
        changed_fields: changed,
        severity: data.severity ?? "Info",
        status: data.status ?? "Success",
        source: data.source ?? "Web App",
        error_message: data.error_message ?? null,
        metadata: maskSensitive(data.metadata),
        is_sensitive: data.is_sensitive ?? false,
      });
      if (error) {
        console.warn("[audit] insert failed:", error.message);
        return { ok: false };
      }
      return { ok: true };
    } catch (e: any) {
      console.warn("[audit] exception:", e?.message);
      return { ok: false };
    }
  });

export const listAuditUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (!prof?.company_id) return [];
    const { data } = await context.supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", prof.company_id)
      .order("full_name");
    return data ?? [];
  });

export const listAuditProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("projects")
      .select("id, name")
      .order("name");
    return data ?? [];
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const NotificationFilters = z.object({
  scope: z.enum(["all", "unread", "archived", "approvals", "assignments", "overdue", "critical", "mentions"]).optional(),
  project_id: z.string().uuid().optional().nullable(),
  module_name: z.string().optional().nullable(),
  notification_type: z.string().optional().nullable(),
  priority: z.string().optional().nullable(),
  delivery_channel: z.string().optional().nullable(),
  search: z.string().optional().nullable(),
  date_from: z.string().optional().nullable(),
  date_to: z.string().optional().nullable(),
  limit: z.number().int().min(1).max(500).optional(),
}).partial();

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NotificationFilters.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("notifications")
      .select("id, title, body, message, severity, link, read_at, created_at, notification_type, priority, module_name, project_id, record_id, record_number, action_url, action_label, is_archived, archived_at, delivery_channel, delivery_status, sender_id, metadata")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);

    if (data.scope === "archived") q = q.eq("is_archived", true);
    else q = q.eq("is_archived", false);

    if (data.scope === "unread") q = q.is("read_at", null);
    if (data.scope === "approvals") q = q.in("notification_type", ["Approval Request", "Approval Approved", "Approval Rejected", "Revision Requested"]);
    if (data.scope === "assignments") q = q.in("notification_type", ["Assignment", "Mention"]);
    if (data.scope === "overdue") q = q.in("notification_type", ["Overdue", "Due Soon", "Reminder", "Escalation"]);
    if (data.scope === "critical") q = q.in("priority", ["Critical", "Urgent"]);
    if (data.scope === "mentions") q = q.eq("notification_type", "Mention");

    if (data.project_id) q = q.eq("project_id", data.project_id);
    if (data.module_name) q = q.eq("module_name", data.module_name);
    if (data.notification_type) q = q.eq("notification_type", data.notification_type);
    if (data.priority) q = q.eq("priority", data.priority);
    if (data.delivery_channel) q = q.eq("delivery_channel", data.delivery_channel);
    if (data.date_from) q = q.gte("created_at", data.date_from);
    if (data.date_to) q = q.lte("created_at", data.date_to);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, " ").trim();
      if (s) q = q.or(`title.ilike.%${s}%,message.ilike.%${s}%,record_number.ilike.%${s}%`);
    }

    const { data: rows, error } = await q;
    if (error) throw error;
    return { items: rows ?? [] };
  });

export const notificationSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, read_at, is_archived, priority, notification_type, created_at, module_name")
      .eq("user_id", context.userId);
    if (error) throw error;
    const rows = data ?? [];
    const active = rows.filter((r: any) => !r.is_archived);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    return {
      total: active.length,
      unread: active.filter((r: any) => !r.read_at).length,
      critical: active.filter((r: any) => ["Critical", "Urgent"].includes(r.priority) && !r.read_at).length,
      high: active.filter((r: any) => r.priority === "High" && !r.read_at).length,
      approvals: active.filter((r: any) => String(r.notification_type ?? "").startsWith("Approval") || r.notification_type === "Revision Requested").length,
      assignments: active.filter((r: any) => ["Assignment", "Mention"].includes(r.notification_type)).length,
      overdue: active.filter((r: any) => ["Overdue", "Due Soon", "Reminder", "Escalation"].includes(r.notification_type)).length,
      reminders: active.filter((r: any) => r.notification_type === "Reminder").length,
      archived: rows.filter((r: any) => r.is_archived).length,
      today: active.filter((r: any) => r.created_at >= todayIso).length,
      byModule: countBy(active, "module_name"),
      byType: countBy(active, "notification_type"),
      byPriority: countBy(active, "priority"),
    };
  });

function countBy<T extends Record<string, any>>(rows: T[], key: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = r[key] ?? "Other";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    ids: z.array(z.string().uuid()).optional(),
    all: z.boolean().optional(),
    unread: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const value = data.unread ? null : new Date().toISOString();
    let q = context.supabase.from("notifications").update({ read_at: value }).eq("user_id", context.userId);
    if (data.id) q = q.eq("id", data.id);
    else if (data.ids?.length) q = q.in("id", data.ids);
    else if (data.all) q = q.is("read_at", null);
    else throw new Error("No selection");
    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });

export const archiveNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    ids: z.array(z.string().uuid()).optional(),
    all_read: z.boolean().optional(),
    restore: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const patch = data.restore
      ? { is_archived: false, archived_at: null as any }
      : { is_archived: true, archived_at: new Date().toISOString(), read_at: new Date().toISOString() };
    let q = context.supabase.from("notifications").update(patch).eq("user_id", context.userId);
    if (data.id) q = q.eq("id", data.id);
    else if (data.ids?.length) q = q.in("id", data.ids);
    else if (data.all_read) q = q.not("read_at", "is", null).eq("is_archived", false);
    else throw new Error("No selection");
    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("notifications").delete().eq("user_id", context.userId).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const createNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    user_id: z.string().uuid(),
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(2000),
    notification_type: z.string().default("General"),
    priority: z.string().default("Medium"),
    module_name: z.string().optional().nullable(),
    project_id: z.string().uuid().optional().nullable(),
    record_id: z.string().uuid().optional().nullable(),
    record_number: z.string().optional().nullable(),
    action_url: z.string().optional().nullable(),
    action_label: z.string().optional().nullable(),
    severity: z.string().optional(),
    link: z.string().optional().nullable(),
    metadata: z.any().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    // Same-company check
    const { data: tgt } = await context.supabase.from("profiles").select("company_id").eq("id", data.user_id).maybeSingle();
    const { data: me } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (!tgt || tgt.company_id !== me?.company_id) throw new Error("Recipient not in your company");
    const severity = data.severity ?? (
      data.priority === "Critical" || data.priority === "Urgent" ? "error" :
      data.priority === "High" ? "warning" :
      data.priority === "Low" ? "info" : "info"
    );
    const { error } = await context.supabase.from("notifications").insert({
      user_id: data.user_id,
      company_id: me?.company_id ?? null,
      sender_id: context.userId,
      title: data.title,
      message: data.message,
      body: data.message,
      notification_type: data.notification_type,
      priority: data.priority,
      module_name: data.module_name ?? null,
      project_id: data.project_id ?? null,
      record_id: data.record_id ?? null,
      record_number: data.record_number ?? null,
      action_url: data.action_url ?? data.link ?? null,
      action_label: data.action_label ?? null,
      link: data.link ?? data.action_url ?? null,
      severity,
      metadata: data.metadata ?? null,
      delivery_status: "Sent",
    });
    if (error) throw error;
    return { ok: true };
  });

// ====== Preferences ======
export const getMyPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("notification_preferences").select("*").eq("user_id", context.userId).maybeSingle();
    return data ?? {
      user_id: context.userId,
      email_enabled: true,
      in_app_enabled: true,
      whatsapp_enabled: false,
      push_enabled: false,
      digest_enabled: false,
      digest_frequency: "Daily",
      quiet_hours_enabled: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
      reminder_days: 3,
      module_preferences: {},
      type_preferences: {},
    };
  });

export const updateMyPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    email_enabled: z.boolean().optional(),
    in_app_enabled: z.boolean().optional(),
    whatsapp_enabled: z.boolean().optional(),
    push_enabled: z.boolean().optional(),
    digest_enabled: z.boolean().optional(),
    digest_frequency: z.string().optional(),
    quiet_hours_enabled: z.boolean().optional(),
    quiet_hours_start: z.string().nullable().optional(),
    quiet_hours_end: z.string().nullable().optional(),
    reminder_days: z.number().int().min(0).max(30).optional(),
    module_preferences: z.record(z.string(), z.boolean()).optional(),
    type_preferences: z.record(z.string(), z.boolean()).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("notification_preferences")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });

// ====== Templates ======
export const listNotificationTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("notification_templates")
      .select("*").order("is_system_template", { ascending: false }).order("template_name");
    if (error) throw error;
    return { items: data ?? [] };
  });

const TemplateInput = z.object({
  id: z.string().uuid().optional(),
  template_name: z.string().min(1).max(120),
  module_name: z.string().optional().nullable(),
  notification_type: z.string().default("General"),
  title_template: z.string().min(1).max(200),
  message_template: z.string().min(1).max(2000),
  priority: z.string().default("Medium"),
  action_label: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const upsertNotificationTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TemplateInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: me } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    const row = { ...data, company_id: me?.company_id, created_by: context.userId, is_system_template: false };
    const res = data.id
      ? await context.supabase.from("notification_templates").update(row).eq("id", data.id).select().single()
      : await context.supabase.from("notification_templates").insert(row).select().single();
    if (res.error) throw res.error;
    return res.data;
  });

export const deleteNotificationTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("notification_templates").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ====== Rules ======
export const listNotificationRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("notification_rules").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return { items: data ?? [] };
  });

const RuleInput = z.object({
  id: z.string().uuid().optional(),
  rule_name: z.string().min(1).max(120),
  module_name: z.string().min(1),
  event_name: z.string().min(1),
  notification_type: z.string().default("General"),
  priority: z.string().default("Medium"),
  recipient_roles: z.array(z.string()).optional().nullable(),
  recipient_users: z.array(z.string().uuid()).optional().nullable(),
  trigger_condition: z.any().optional().nullable(),
  delay_minutes: z.number().int().min(0).max(10080).default(0),
  is_active: z.boolean().default(true),
});

export const upsertNotificationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RuleInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: me } = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (!me?.company_id) throw new Error("No company");
    const row = { ...data, company_id: me.company_id, created_by: context.userId };
    const res = data.id
      ? await context.supabase.from("notification_rules").update(row).eq("id", data.id).select().single()
      : await context.supabase.from("notification_rules").insert(row).select().single();
    if (res.error) throw res.error;
    return res.data;
  });

export const deleteNotificationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("notification_rules").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ====== Module link resolver (used client-side too) ======
export const MODULE_ROUTES: Record<string, string> = {
  projects: "/projects",
  tasks: "/tasks",
  milestones: "/milestones",
  daily_reports: "/daily-reports",
  issues: "/issues",
  snags: "/snags",
  meetings: "/meetings",
  meeting_action_items: "/action-items",
  approvals: "/approvals",
  rfis: "/rfis",
  submittals: "/submittals",
  variations: "/variations",
  payment_claims: "/payment-claims",
  material_requests: "/procurement",
  rfqs: "/rfqs",
  purchase_orders: "/purchase-orders",
  deliveries: "/deliveries",
  suppliers: "/suppliers",
  quality_inspections: "/quality",
  safety_inspections: "/safety",
  ncrs: "/ncrs",
  risks: "/risks",
  manpower: "/resources",
  equipment: "/equipment",
  timesheets: "/timesheets",
  documents: "/documents",
  drawings: "/drawings",
  reports: "/reports",
  ai_assistant: "/ai",
  comments: "/notifications",
};

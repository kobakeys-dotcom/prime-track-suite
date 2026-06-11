import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MODULES = [
  "Dashboard","Projects","Client Portal","WBS","Tasks","Gantt Timeline","Milestones",
  "Daily Reports","Issues","Snag List","Meetings","Approvals","RFIs","Submittals",
  "BOQ","Cost Codes","Variations","Payment Claims","Budget vs Actual","Cash Flow",
  "Material Requests","RFQs","Purchase Orders","Deliveries","Suppliers",
  "Quality Inspections","Safety Inspections","NCR","Risk Register",
  "Manpower","Equipment","Timesheets","Document Manager","Drawing Register",
  "Reports","Custom Report Builder AI","AI Assistant","Notifications",
  "Role Permissions","Audit Log","Functional Audit Summary","Settings",
] as const;

const CORE_MODULES = new Set(["Dashboard","Settings","Role Permissions","Audit Log"]);

const NUMBERING_DEFAULTS: Array<{ module: string; prefix: string }> = [
  { module: "Projects", prefix: "PRJ" },{ module: "Tasks", prefix: "TSK" },
  { module: "RFIs", prefix: "RFI" },{ module: "Submittals", prefix: "SUB" },
  { module: "Variations", prefix: "VAR" },{ module: "Payment Claims", prefix: "IPC" },
  { module: "Purchase Orders", prefix: "PO" },{ module: "RFQs", prefix: "RFQ" },
  { module: "Material Requests", prefix: "MR" },{ module: "Deliveries", prefix: "GRN" },
  { module: "NCR", prefix: "NCR" },{ module: "Quality Inspections", prefix: "QI" },
  { module: "Safety Inspections", prefix: "SI" },{ module: "Risk Register", prefix: "RSK" },
  { module: "Daily Reports", prefix: "DR" },{ module: "Issues", prefix: "ISS" },
  { module: "Documents", prefix: "DOC" },{ module: "Drawings", prefix: "DRG" },
  { module: "Meetings", prefix: "MTG" },{ module: "Timesheets", prefix: "TS" },
];

async function getCompanyId(ctx: any): Promise<string> {
  const { data } = await ctx.supabase.from("profiles").select("company_id").eq("id", ctx.userId).maybeSingle();
  if (!data?.company_id) throw new Error("No company");
  return data.company_id as string;
}

async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "company_admin" });
  if (!data) throw new Error("Forbidden");
}

async function logChange(ctx: any, company_id: string, area: string, key: string | null, oldV: any, newV: any) {
  try {
    await ctx.supabase.from("settings_audit_logs").insert({
      company_id, changed_by: ctx.userId, setting_area: area, setting_key: key,
      old_value: oldV, new_value: newV,
    });
  } catch {}
}

export const getAllSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const company_id = await getCompanyId(context);
    const sb = context.supabase;

    // Seed company_settings if missing
    let { data: company } = await sb.from("company_settings").select("*").eq("company_id", company_id).maybeSingle();
    if (!company) {
      const { data: co } = await sb.from("companies").select("name").eq("id", company_id).maybeSingle();
      const ins = await sb.from("company_settings").insert({
        company_id, company_name: co?.name ?? "My Company", created_by: context.userId,
      }).select().single();
      company = ins.data;
    }

    // Seed module_settings
    const { data: mods } = await sb.from("module_settings").select("*").eq("company_id", company_id);
    if (!mods || mods.length === 0) {
      await sb.from("module_settings").insert(MODULES.map((m, i) => ({
        company_id, module_name: m, is_enabled: true, module_label: m, module_order: i,
      })));
    }

    // Seed numbering defaults
    const { data: numbering } = await sb.from("numbering_settings").select("*").eq("company_id", company_id);
    if (!numbering || numbering.length === 0) {
      await sb.from("numbering_settings").insert(NUMBERING_DEFAULTS.map((n) => ({
        company_id, module_name: n.module, prefix: n.prefix,
        format_pattern: `${n.prefix}-[PROJECT]-[YEAR]-[###]`,
        sample_output: `${n.prefix}-PRJ001-${new Date().getFullYear()}-001`,
      })));
    }

    // Seed client portal
    let { data: portal } = await sb.from("client_portal_settings").select("*").eq("company_id", company_id).maybeSingle();
    if (!portal) {
      const ins = await sb.from("client_portal_settings").insert({ company_id }).select().single();
      portal = ins.data;
    }

    const [modulesQ, numQ, apprQ, integQ, sysQ] = await Promise.all([
      sb.from("module_settings").select("*").eq("company_id", company_id).order("module_order"),
      sb.from("numbering_settings").select("*").eq("company_id", company_id).order("module_name"),
      sb.from("approval_settings").select("*").eq("company_id", company_id).order("module_name"),
      sb.from("integration_settings").select("*").eq("company_id", company_id).order("integration_name"),
      sb.from("system_settings").select("*").eq("company_id", company_id),
    ]);

    return {
      company, modules: modulesQ.data ?? [], numbering: numQ.data ?? [],
      approvals: apprQ.data ?? [], integrations: integQ.data ?? [],
      system: sysQ.data ?? [], portal,
    };
  });

const companySchema = z.object({
  company_name: z.string().trim().min(1).max(200),
  legal_name: z.string().max(200).nullable().optional(),
  registration_number: z.string().max(100).nullable().optional(),
  tax_number: z.string().max(100).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().max(200).nullable().optional().or(z.literal("")),
  website: z.string().max(300).nullable().optional(),
  logo_url: z.string().max(1000).nullable().optional(),
  default_currency: z.string().max(10),
  default_timezone: z.string().max(100),
  date_format: z.string().max(30),
  time_format: z.string().max(10),
  number_format: z.string().max(30),
  financial_year_start_month: z.number().int().min(1).max(12),
  working_days: z.array(z.string()).nullable().optional(),
  working_hours_start: z.string().nullable().optional(),
  working_hours_end: z.string().nullable().optional(),
});

export const updateCompanySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => companySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const company_id = await getCompanyId(context);
    const { data: old } = await context.supabase.from("company_settings").select("*").eq("company_id", company_id).maybeSingle();
    const payload = { ...data, email: data.email || null, updated_by: context.userId };
    const { data: row, error } = await context.supabase.from("company_settings")
      .update(payload).eq("company_id", company_id).select().single();
    if (error) throw new Error(error.message);
    await logChange(context, company_id, "company_profile", null, old, row);
    return row;
  });

export const updateModuleSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid(),
    is_enabled: z.boolean().optional(),
    module_label: z.string().max(100).nullable().optional(),
    module_order: z.number().int().min(0).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const company_id = await getCompanyId(context);
    const { id, ...rest } = data;
    const { data: old } = await context.supabase.from("module_settings").select("*").eq("id", id).eq("company_id", company_id).maybeSingle();
    if (!old) throw new Error("Not found");
    if (CORE_MODULES.has(old.module_name) && rest.is_enabled === false) throw new Error("Core modules cannot be disabled");
    const { data: row, error } = await context.supabase.from("module_settings")
      .update({ ...rest, updated_by: context.userId }).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    await logChange(context, company_id, "module", old.module_name, old, row);
    return row;
  });

function buildSample(s: { prefix: string; format_pattern: string; sequence_padding: number; next_sequence: number; separator: string; include_year: boolean; include_month: boolean; }) {
  const seq = String(s.next_sequence).padStart(s.sequence_padding, "0");
  const yr = String(new Date().getFullYear());
  const mo = String(new Date().getMonth() + 1).padStart(2, "0");
  return s.format_pattern
    .replace("[PROJECT]", "PRJ001")
    .replace("[YEAR]", yr).replace("[YYYY]", yr)
    .replace("[MONTH]", mo).replace("[MM]", mo)
    .replace("[YYYYMMDD]", yr + mo + "01")
    .replace("[DISCIPLINE]", "ARCH")
    .replace(/\[#+\]/, seq)
    .replace("[SEQ]", seq);
}

export const updateNumberingSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid(),
    prefix: z.string().trim().min(1).max(20),
    format_pattern: z.string().trim().min(1).max(200),
    sequence_padding: z.number().int().min(1).max(10),
    reset_frequency: z.enum(["Never","Yearly","Monthly","Project-wise"]),
    include_project_code: z.boolean(),
    include_year: z.boolean(),
    include_month: z.boolean(),
    separator: z.string().max(5),
    is_active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const company_id = await getCompanyId(context);
    const { id, ...rest } = data;
    const { data: old } = await context.supabase.from("numbering_settings").select("*").eq("id", id).eq("company_id", company_id).maybeSingle();
    if (!old) throw new Error("Not found");
    const sample = buildSample({ ...old, ...rest });
    const { data: row, error } = await context.supabase.from("numbering_settings")
      .update({ ...rest, sample_output: sample, updated_by: context.userId }).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    await logChange(context, company_id, "numbering", old.module_name, old, row);
    return row;
  });

export const resetNumberingSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const company_id = await getCompanyId(context);
    const { data: old } = await context.supabase.from("numbering_settings").select("*").eq("id", data.id).eq("company_id", company_id).maybeSingle();
    if (!old) throw new Error("Not found");
    const { data: row, error } = await context.supabase.from("numbering_settings")
      .update({ next_sequence: 1, updated_by: context.userId }).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    await logChange(context, company_id, "numbering_reset", old.module_name, { next_sequence: old.next_sequence }, { next_sequence: 1 });
    return row;
  });

export const upsertApprovalSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    module_name: z.string().min(1).max(100),
    approval_required: z.boolean(),
    approval_mode: z.enum(["Single","Sequential","Parallel"]),
    default_approver_role: z.string().max(50).nullable().optional(),
    escalation_enabled: z.boolean(),
    escalation_days: z.number().int().min(0).max(365),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const company_id = await getCompanyId(context);
    const { data: old } = await context.supabase.from("approval_settings").select("*")
      .eq("company_id", company_id).eq("module_name", data.module_name).maybeSingle();
    const { data: row, error } = await context.supabase.from("approval_settings")
      .upsert({ company_id, ...data, updated_by: context.userId }, { onConflict: "company_id,module_name" })
      .select().single();
    if (error) throw new Error(error.message);
    await logChange(context, company_id, "approval", data.module_name, old, row);
    return row;
  });

export const updateClientPortalSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    portal_enabled: z.boolean(),
    default_client_visibility: z.boolean(),
    allow_client_comments: z.boolean(),
    allow_client_downloads: z.boolean(),
    show_project_progress: z.boolean(),
    show_documents: z.boolean(), show_drawings: z.boolean(), show_reports: z.boolean(),
    show_rfis: z.boolean(), show_submittals: z.boolean(), show_meetings: z.boolean(),
    hide_internal_cost: z.boolean(), hide_supplier_pricing: z.boolean(), hide_payroll_data: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const company_id = await getCompanyId(context);
    const { data: old } = await context.supabase.from("client_portal_settings").select("*").eq("company_id", company_id).maybeSingle();
    const { data: row, error } = await context.supabase.from("client_portal_settings")
      .update({ ...data, updated_by: context.userId }).eq("company_id", company_id).select().single();
    if (error) throw new Error(error.message);
    await logChange(context, company_id, "client_portal", null, old, row);
    return row;
  });

export const upsertSystemSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    setting_key: z.string().min(1).max(100),
    setting_value: z.any(),
    setting_type: z.string().max(50).optional(),
    module_name: z.string().max(100).nullable().optional(),
    is_sensitive: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const company_id = await getCompanyId(context);
    const { data: old } = await context.supabase.from("system_settings").select("*")
      .eq("company_id", company_id).eq("setting_key", data.setting_key).maybeSingle();
    const { data: row, error } = await context.supabase.from("system_settings")
      .upsert({ company_id, ...data, updated_by: context.userId }, { onConflict: "company_id,setting_key" })
      .select().single();
    if (error) throw new Error(error.message);
    await logChange(context, company_id, "system", data.setting_key,
      old?.is_sensitive ? "***" : old, data.is_sensitive ? "***" : row);
    return row;
  });

export const upsertIntegrationSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    integration_name: z.string().min(1).max(100),
    integration_type: z.string().max(50),
    is_enabled: z.boolean(),
    status: z.string().max(50),
    masked_config: z.any().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const company_id = await getCompanyId(context);
    const { data: old } = await context.supabase.from("integration_settings").select("*")
      .eq("company_id", company_id).eq("integration_name", data.integration_name).maybeSingle();
    const { data: row, error } = await context.supabase.from("integration_settings")
      .upsert({ company_id, ...data, updated_by: context.userId }, { onConflict: "company_id,integration_name" })
      .select().single();
    if (error) throw new Error(error.message);
    await logChange(context, company_id, "integration", data.integration_name, old, row);
    return row;
  });

export const listSettingsAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const company_id = await getCompanyId(context);
    const { data, error } = await context.supabase
      .from("settings_audit_logs").select("*")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const previewNumbering = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    prefix: z.string(), format_pattern: z.string(),
    sequence_padding: z.number().int().min(1).max(10),
    next_sequence: z.number().int().min(0),
    separator: z.string(), include_year: z.boolean(), include_month: z.boolean(),
  }).parse(d))
  .handler(async ({ data }) => ({ sample: buildSample(data) }));

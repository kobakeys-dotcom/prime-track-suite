import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const projectStatuses = ["planning", "active", "on_hold", "completed", "cancelled"] as const;
const priorities = ["low", "medium", "high", "critical"] as const;
const riskLevels = ["low", "medium", "high"] as const;

const PROJECT_COLUMNS =
  "id, name, code, client, consultant_name, contractor_name, location, project_type, contract_number, contract_value, currency, status, start_date, end_date, planned_end_date, revised_end_date, project_manager_id, description, progress, budget_amount, priority, risk_level, is_archived, created_at, updated_at";

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        includeArchived: z.boolean().optional().default(false),
        onlyArchived: z.boolean().optional().default(false),
      })
      .partial()
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("projects").select(PROJECT_COLUMNS).order("created_at", { ascending: false });
    if (data?.onlyArchived) q = q.eq("is_archived", true);
    else if (!data?.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: project, error } = await context.supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project) throw new Error("Project not found");

    let manager: { id: string; full_name: string | null; email: string | null } | null = null;
    if (project.project_manager_id) {
      const { data: m } = await context.supabase
        .from("profiles").select("id, full_name, email").eq("id", project.project_manager_id).maybeSingle();
      manager = m ?? null;
    }

    const [{ count: taskCount }, { count: doneCount }, { count: reportCount }] = await Promise.all([
      context.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", data.projectId),
      context.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", data.projectId).eq("status", "done"),
      context.supabase.from("daily_reports").select("id", { count: "exact", head: true }).eq("project_id", data.projectId),
    ]);

    return {
      project,
      stats: { tasks: taskCount ?? 0, tasksDone: doneCount ?? 0, reports: reportCount ?? 0 },
    };
  });

const baseSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional().nullable(),
  client: z.string().max(200).optional().nullable(),
  consultant_name: z.string().max(200).optional().nullable(),
  contractor_name: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  project_type: z.string().max(100).optional().nullable(),
  contract_number: z.string().max(100).optional().nullable(),
  status: z.enum(projectStatuses).default("planning"),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  planned_end_date: z.string().optional().nullable(),
  revised_end_date: z.string().optional().nullable(),
  contract_value: z.number().optional().nullable(),
  budget_amount: z.number().optional().nullable(),
  currency: z.string().max(8).optional().default("USD"),
  project_manager_id: z.string().uuid().optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  priority: z.enum(priorities).optional().default("medium"),
  risk_level: z.enum(riskLevels).optional().default("low"),
  progress: z.number().min(0).max(100).optional(),
});

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => baseSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (!profile?.company_id) throw new Error("Company not found");

    const { data: project, error } = await context.supabase
      .from("projects")
      .insert({ ...data, company_id: profile.company_id, created_by: context.userId })
      .select()
      .single();
    if (error) throw error;
    return project;
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid(), patch: baseSchema.partial() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: project, error } = await context.supabase
      .from("projects").update(data.patch).eq("id", data.projectId).select().single();
    if (error) throw error;
    return project;
  });

export const updateProjectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid(), status: z.enum(projectStatuses) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("projects").update({ status: data.status }).eq("id", data.projectId);
    if (error) throw error;
    return { ok: true };
  });

export const archiveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid(), archived: z.boolean().default(true) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("projects").update({ is_archived: data.archived }).eq("id", data.projectId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.projectId);
    if (error) throw error;
    return { ok: true };
  });

export const listCompanyMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles").select("id, full_name, email").order("full_name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

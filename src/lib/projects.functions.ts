import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const projectStatuses = ["planning", "active", "on_hold", "completed", "cancelled"] as const;

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, name, code, client, location, status, progress, start_date, end_date, contract_value, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: project, error } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project) throw new Error("Project not found");

    const [{ count: taskCount }, { count: doneCount }, { count: reportCount }] = await Promise.all([
      context.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", data.projectId),
      context.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", data.projectId).eq("status", "done"),
      context.supabase.from("daily_reports").select("id", { count: "exact", head: true }).eq("project_id", data.projectId),
    ]);

    return {
      project,
      stats: {
        tasks: taskCount ?? 0,
        tasksDone: doneCount ?? 0,
        reports: reportCount ?? 0,
      },
    };
  });

const createSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional().nullable(),
  client: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  status: z.enum(projectStatuses).default("planning"),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  contract_value: z.number().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
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

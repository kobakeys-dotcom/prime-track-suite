import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const statuses = ["todo", "in_progress", "blocked", "done", "cancelled"] as const;
const priorities = ["low", "medium", "high", "critical"] as const;

export const TASK_STATUSES = statuses;
export const TASK_PRIORITIES = priorities;

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string; includeArchived?: boolean } | undefined) =>
    z.object({
      projectId: z.string().uuid().optional(),
      includeArchived: z.boolean().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("tasks")
      .select("id, title, description, status, priority, progress, start_date, due_date, actual_start, actual_finish, project_id, assignee_id, wbs_id, milestone_id, parent_task_id, discipline, location, remarks, is_archived, created_at, projects(name)")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).map((r: any) => ({ ...r, project_name: r.projects?.name ?? "—" }));
  });

export const getTask = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("tasks")
      .select("*, projects(name), milestones(name)")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return row;
  });

const createSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  priority: z.enum(priorities).default("medium"),
  status: z.enum(statuses).default("todo"),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  wbs_id: z.string().uuid().optional().nullable(),
  milestone_id: z.string().uuid().optional().nullable(),
  parent_task_id: z.string().uuid().optional().nullable(),
  discipline: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  remarks: z.string().max(2000).optional().nullable(),
  progress: z.number().min(0).max(100).optional(),
});

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ context, data }) => {
    if (data.start_date && data.due_date && data.due_date < data.start_date) {
      throw new Error("Due date cannot be before start date");
    }
    const { data: row, error } = await context.supabase
      .from("tasks")
      .insert({ ...data, created_by: context.userId })
      .select()
      .single();
    if (error) throw error;
    if (data.assignee_id && data.assignee_id !== context.userId) {
      await context.supabase.from("notifications").insert({
        user_id: data.assignee_id,
        title: "Task assigned",
        message: `You were assigned: ${data.title}`,
        body: `You were assigned: ${data.title}`,
        notification_type: "Assignment",
        module_name: "tasks",
        link: `/tasks`,
      });
    }
    return row;
  });

const updateSchema = createSchema.partial().extend({ id: z.string().uuid() });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data as any;
    if (patch.status === "done" && !patch.actual_finish) patch.actual_finish = new Date().toISOString().slice(0, 10);
    if (patch.status === "in_progress" && !patch.actual_start) patch.actual_start = new Date().toISOString().slice(0, 10);
    if (patch.status === "done") patch.progress = 100;
    const { error } = await context.supabase.from("tasks").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(statuses) }).parse(d))
  .handler(async ({ context, data }) => {
    const patch: any = { status: data.status };
    if (data.status === "done") { patch.completed_at = new Date().toISOString(); patch.progress = 100; patch.actual_finish = new Date().toISOString().slice(0, 10); }
    if (data.status === "in_progress") patch.actual_start = new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase.from("tasks").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const updateTaskProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), progress: z.number().min(0).max(100) }).parse(d))
  .handler(async ({ context, data }) => {
    const patch: any = { progress: data.progress };
    if (data.progress >= 100) { patch.status = "done"; patch.actual_finish = new Date().toISOString().slice(0, 10); patch.completed_at = new Date().toISOString(); }
    const { error } = await context.supabase.from("tasks").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const archiveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), archived: z.boolean().default(true) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("tasks").update({ is_archived: data.archived }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- WBS ----------
const wbsSchema = z.object({
  project_id: z.string().uuid(),
  parent_wbs_id: z.string().uuid().optional().nullable(),
  wbs_code: z.string().max(50).optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  planned_start: z.string().optional().nullable(),
  planned_finish: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  status: z.string().max(50).optional(),
  progress: z.number().min(0).max(100).optional(),
});

export const listWbs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("wbs_items").select("*").eq("is_archived", false).order("sort_order").order("wbs_code");
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const createWbs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => wbsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("wbs_items").insert({ ...data, created_by: context.userId }).select().single();
    if (error) throw error;
    return row;
  });

export const updateWbs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => wbsSchema.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data as any;
    const { error } = await context.supabase.from("wbs_items").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const archiveWbs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("wbs_items").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Milestones ----------
const milestoneSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  due_date: z.string().optional().nullable(),
  status: z.string().max(50).optional(),
  progress: z.number().min(0).max(100).optional(),
});

export const listMilestones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("milestones").select("*, projects(name)").eq("is_archived", false).order("due_date", { ascending: true, nullsFirst: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).map((r: any) => ({ ...r, project_name: r.projects?.name ?? "—" }));
  });

export const createMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => milestoneSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("milestones").insert(data).select().single();
    if (error) throw error;
    return row;
  });

export const updateMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => milestoneSchema.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data as any;
    if (patch.status === "completed" && !patch.completed_at) patch.completed_at = new Date().toISOString();
    const { error } = await context.supabase.from("milestones").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const archiveMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("milestones").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Project members for assignee picker ----------
export const listProjectMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const company = await context.supabase.from("profiles").select("company_id").eq("id", context.userId).single();
    const companyId = company.data?.company_id;
    if (!companyId) return [];
    const { data: rows } = await context.supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", companyId)
      .order("full_name");
    return rows ?? [];
  });

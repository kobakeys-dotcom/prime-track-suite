import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const statuses = ["todo", "in_progress", "blocked", "done", "cancelled"] as const;
const priorities = ["low", "medium", "high", "critical"] as const;

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("tasks")
      .select("id, title, status, priority, progress, start_date, due_date, project_id, assignee_id, projects(name)")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).map((r: any) => ({ ...r, project_name: r.projects?.name ?? "—" }));
  });

const createSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  priority: z.enum(priorities).default("medium"),
  status: z.enum(statuses).default("todo"),
  due_date: z.string().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
});

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("tasks")
      .insert({ ...data, created_by: context.userId })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(statuses) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const patch =
      data.status === "done"
        ? { status: data.status, completed_at: new Date().toISOString(), progress: 100 }
        : { status: data.status };
    const { error } = await context.supabase.from("tasks").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

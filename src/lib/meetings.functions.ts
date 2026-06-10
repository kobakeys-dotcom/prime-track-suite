import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listActionItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("meeting_action_items")
      .select("id, description, due_date, status, project_id, meeting_id, responsible_person, meetings(title, meeting_date)")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).map((r: any) => ({
      ...r,
      meeting_title: r.meetings?.title ?? "—",
      assignee_name: r.responsible_person ?? "—",
    }));
  });

export const promoteActionItemToTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: item, error: e1 } = await context.supabase
      .from("meeting_action_items")
      .select("description, due_date, responsible_person, project_id, status")
      .eq("id", data.id).maybeSingle();
    if (e1) throw e1;
    if (!item) throw new Error("Action item not found");
    if (!item.project_id) throw new Error("Action item missing project");

    const { data: task, error: e2 } = await context.supabase.from("tasks").insert({
      project_id: item.project_id,
      title: (item.description ?? "Action item").slice(0, 200),
      description: item.description,
      due_date: item.due_date,
      status: "todo",
      created_by: context.userId,
    }).select("id").single();
    if (e2) throw e2;

    await context.supabase
      .from("meeting_action_items")
      .update({ status: "in_progress" })
      .eq("id", data.id);

    return { ok: true, taskId: task.id };
  });

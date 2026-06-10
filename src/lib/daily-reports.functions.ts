import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listDailyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("daily_reports")
      .select("id, report_date, weather, temperature_c, work_completed, status, project_id, author_id, projects(name)")
      .order("report_date", { ascending: false })
      .limit(100);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    const authorIds = Array.from(new Set((rows ?? []).map((r: any) => r.author_id).filter(Boolean)));
    const { data: authors } = authorIds.length
      ? await context.supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] as { id: string; full_name: string | null }[] };
    const map = new Map((authors ?? []).map((a) => [a.id, a.full_name]));
    return (rows ?? []).map((r: any) => ({
      ...r,
      project_name: r.projects?.name ?? "—",
      author_name: map.get(r.author_id) ?? "—",
    }));
  });

const createSchema = z.object({
  project_id: z.string().uuid(),
  report_date: z.string().min(1),
  weather: z.string().max(100).optional().nullable(),
  temperature_c: z.number().optional().nullable(),
  work_completed: z.string().max(5000).optional().nullable(),
  issues: z.string().max(5000).optional().nullable(),
  next_day_plan: z.string().max(5000).optional().nullable(),
  manpower_count: z.number().int().min(0).optional().nullable(),
  status: z.enum(["draft", "submitted", "approved"]).default("submitted"),
});

export const createDailyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { manpower_count, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("daily_reports")
      .insert({
        ...rest,
        author_id: context.userId,
        manpower: manpower_count != null ? { total: manpower_count } : {},
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

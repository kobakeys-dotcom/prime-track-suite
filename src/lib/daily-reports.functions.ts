import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SELECT =
  "id, report_number, report_date, weather, temperature_c, site_condition, shift, working_hours, location, " +
  "work_completed, issues, next_day_plan, safety_notes, quality_notes, visitors, instructions_received, " +
  "manpower, equipment, materials_used, photos, status, project_id, author_id, " +
  "reviewed_by, approved_by, submitted_at, reviewed_at, approved_at, rejection_reason, revision_notes, " +
  "is_client_visible, is_archived, created_at, updated_at, projects(name)";

async function attachAuthors(supabase: any, rows: any[]) {
  const ids = Array.from(
    new Set(
      rows
        .flatMap((r) => [r.author_id, r.reviewed_by, r.approved_by])
        .filter(Boolean),
    ),
  );
  if (!ids.length) return rows;
  const { data: authors } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  const map = new Map((authors ?? []).map((a: any) => [a.id, a.full_name]));
  return rows.map((r) => ({
    ...r,
    project_name: r.projects?.name ?? "—",
    author_name: map.get(r.author_id) ?? "—",
    reviewer_name: map.get(r.reviewed_by) ?? null,
    approver_name: map.get(r.approved_by) ?? null,
  }));
}

export const listDailyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string; includeArchived?: boolean } | undefined) =>
    z
      .object({
        projectId: z.string().uuid().optional(),
        includeArchived: z.boolean().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("daily_reports")
      .select(SELECT)
      .order("report_date", { ascending: false })
      .limit(200);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    return attachAuthors(context.supabase, rows ?? []);
  });

export const getDailyReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("daily_reports")
      .select(SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    const [enriched] = await attachAuthors(context.supabase, [row]);
    return enriched;
  });

const STATUS = z.enum([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "revision_requested",
  "archived",
]);

const baseSchema = z.object({
  project_id: z.string().uuid(),
  report_number: z.string().max(80).optional().nullable(),
  report_date: z.string().min(1),
  weather: z.string().max(100).optional().nullable(),
  temperature_c: z.number().optional().nullable(),
  site_condition: z.string().max(500).optional().nullable(),
  shift: z.string().max(50).optional().nullable(),
  working_hours: z.string().max(50).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  work_completed: z.string().max(5000).optional().nullable(),
  issues: z.string().max(5000).optional().nullable(),
  next_day_plan: z.string().max(5000).optional().nullable(),
  safety_notes: z.string().max(2000).optional().nullable(),
  quality_notes: z.string().max(2000).optional().nullable(),
  visitors: z.string().max(1000).optional().nullable(),
  instructions_received: z.string().max(2000).optional().nullable(),
  manpower_count: z.number().int().min(0).optional().nullable(),
  equipment: z.string().max(2000).optional().nullable(),
  materials_used: z.string().max(2000).optional().nullable(),
  photo_paths: z.array(z.string().min(1).max(500)).max(20).optional(),
  is_client_visible: z.boolean().optional(),
  status: STATUS.default("submitted"),
});

function toRow(input: z.infer<typeof baseSchema>) {
  const { manpower_count, equipment, materials_used, photo_paths, ...rest } = input;
  return {
    ...rest,
    manpower: manpower_count != null ? { total: manpower_count } : {},
    equipment: equipment ? { notes: equipment } : {},
    materials_used: materials_used ? { notes: materials_used } : {},
    photos: photo_paths ?? [],
  };
}

export const createDailyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => baseSchema.parse(d))
  .handler(async ({ context, data }) => {
    const row = toRow(data);
    const payload: any = { ...row, author_id: context.userId };
    if (data.status === "submitted") payload.submitted_at = new Date().toISOString();
    const { data: ins, error } = await context.supabase
      .from("daily_reports")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return ins;
  });

const updateSchema = baseSchema.partial().extend({ id: z.string().uuid() });

export const updateDailyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { id, manpower_count, equipment, materials_used, photo_paths, ...rest } = data as any;
    const patch: any = { ...rest };
    if (manpower_count !== undefined)
      patch.manpower = manpower_count != null ? { total: manpower_count } : {};
    if (equipment !== undefined) patch.equipment = equipment ? { notes: equipment } : {};
    if (materials_used !== undefined)
      patch.materials_used = materials_used ? { notes: materials_used } : {};
    if (photo_paths !== undefined) patch.photos = photo_paths;
    const { data: row, error } = await context.supabase
      .from("daily_reports")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const submitDailyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("daily_reports")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), rejection_reason: null, revision_notes: null })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const approveDailyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; client_visible?: boolean }) =>
    z.object({ id: z.string().uuid(), client_visible: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const patch: any = {
      status: "approved",
      approved_by: context.userId,
      approved_at: new Date().toISOString(),
    };
    if (data.client_visible !== undefined) patch.is_client_visible = data.client_visible;
    const { error } = await context.supabase.from("daily_reports").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const rejectDailyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason: string }) =>
    z.object({ id: z.string().uuid(), reason: z.string().min(3).max(1000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("daily_reports")
      .update({
        status: "rejected",
        rejection_reason: data.reason,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const requestDailyReportRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; notes: string }) =>
    z.object({ id: z.string().uuid(), notes: z.string().min(3).max(1000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("daily_reports")
      .update({
        status: "revision_requested",
        revision_notes: data.notes,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const markDailyReportUnderReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("daily_reports")
      .update({
        status: "under_review",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const archiveDailyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("daily_reports")
      .update({ is_archived: true })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

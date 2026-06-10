import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const COLS =
  "id, project_id, issue_number, title, description, issue_type, category, priority, severity, status, " +
  "location, discipline, assigned_to, due_date, target_resolution_date, resolved_date, " +
  "root_cause, corrective_action, resolution_notes, escalation_level, is_escalated, is_client_visible, " +
  "is_archived, linked_task_id, linked_daily_report_id, linked_risk_id, photos, created_by, created_at, updated_at";

const issueInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  issue_number: z.string().max(60).optional().nullable(),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  issue_type: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  priority: z.string().max(20).optional().nullable(),
  severity: z.string().max(20).optional().nullable(),
  status: z.string().max(30).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  discipline: z.string().max(100).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  target_resolution_date: z.string().optional().nullable(),
  resolved_date: z.string().optional().nullable(),
  root_cause: z.string().max(2000).optional().nullable(),
  corrective_action: z.string().max(2000).optional().nullable(),
  resolution_notes: z.string().max(2000).optional().nullable(),
  is_client_visible: z.boolean().optional(),
  linked_task_id: z.string().uuid().optional().nullable(),
  linked_daily_report_id: z.string().uuid().optional().nullable(),
  linked_risk_id: z.string().uuid().optional().nullable(),
  photos: z.array(z.object({ url: z.string().url(), caption: z.string().max(200).optional().nullable() })).optional(),
});

async function projectCode(sb: any, projectId: string): Promise<string> {
  const { data } = await sb.from("projects").select("code, name").eq("id", projectId).maybeSingle();
  return (data?.code || data?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
}

async function nextIssueNumber(sb: any, projectId: string): Promise<string> {
  const code = await projectCode(sb, projectId);
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const prefix = `ISS-${code}-${ymd}-`;
  const { data } = await sb.from("issues").select("issue_number").eq("project_id", projectId).like("issue_number", `${prefix}%`);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const n = parseInt(String(r.issue_number ?? "").split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export const listIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid().optional(), includeArchived: z.boolean().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("issues").select(COLS).order("created_at", { ascending: false }).limit(1000);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    const list = (rows ?? []) as any[];
    const pids = Array.from(new Set(list.map((r) => r.project_id).filter(Boolean)));
    const aids = Array.from(new Set(list.map((r) => r.assigned_to).filter(Boolean)));
    const [{ data: projs }, { data: profs }] = await Promise.all([
      pids.length ? sb.from("projects").select("id, name, code").in("id", pids) : Promise.resolve({ data: [] }),
      aids.length ? sb.from("profiles").select("id, full_name").in("id", aids) : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((projs ?? []).map((p: any) => [p.id, p]));
    const aMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    return list.map((r) => ({
      ...r,
      project_name: (pMap.get(r.project_id) as any)?.name ?? null,
      assigned_name: r.assigned_to ? aMap.get(r.assigned_to) ?? null : null,
    }));
  });

export const getIssue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any).from("issues").select(COLS).eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });

export const upsertIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => issueInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { id, ...rest } = data;
    const values: Record<string, any> = { ...rest };
    for (const k of Object.keys(values)) if (values[k] === "") values[k] = null;
    if (!values.priority) values.priority = "Medium";
    if (!values.severity) values.severity = "Medium";
    if (!values.status) values.status = "Open";
    if (!values.issue_type) values.issue_type = "General";

    if (id) {
      // status transitions
      if (values.status === "Resolved" && !values.resolved_date) values.resolved_date = new Date().toISOString().slice(0, 10);
      const { error } = await sb.from("issues").update(values).eq("id", id);
      if (error) throw error;
      return { ok: true, id };
    }
    if (!values.issue_number) values.issue_number = await nextIssueNumber(sb, values.project_id);
    values.created_by = context.userId;
    const { data: ins, error } = await sb.from("issues").insert(values).select("id").single();
    if (error) throw error;

    // notify assignee
    if (values.assigned_to && values.assigned_to !== context.userId) {
      await sb.from("notifications").insert({
        user_id: values.assigned_to,
        title: `Issue assigned: ${values.title}`,
        body: `You were assigned issue ${values.issue_number}.`,
        severity: values.priority === "Critical" ? "critical" : "info",
        link: `/issues?id=${ins.id}`,
      });
    }
    return { ok: true, id: ins.id };
  });

export const updateIssueStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.string().min(1).max(30),
    resolution_notes: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const patch: any = { status: data.status };
    if (data.status === "Resolved") {
      patch.resolved_date = new Date().toISOString().slice(0, 10);
      if (data.resolution_notes) patch.resolution_notes = data.resolution_notes;
    }
    if (data.status === "Reopened") patch.resolved_date = null;
    const { error } = await sb.from("issues").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const assignIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), assigned_to: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const patch: any = { assigned_to: data.assigned_to };
    if (data.assigned_to) patch.status = "Assigned";
    const { data: row, error } = await sb.from("issues").update(patch).eq("id", data.id).select("title, issue_number, priority").single();
    if (error) throw error;
    if (data.assigned_to && data.assigned_to !== context.userId) {
      await sb.from("notifications").insert({
        user_id: data.assigned_to,
        title: `Issue assigned: ${row.title}`,
        body: `You were assigned issue ${row.issue_number}.`,
        severity: row.priority === "Critical" ? "critical" : "info",
        link: `/issues?id=${data.id}`,
      });
    }
    return { ok: true };
  });

export const escalateIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), remarks: z.string().max(1000).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: cur } = await sb.from("issues").select("escalation_level, title, issue_number, project_id").eq("id", data.id).maybeSingle();
    const lvl = (cur?.escalation_level ?? 0) + 1;
    const { error } = await sb.from("issues").update({ is_escalated: true, escalation_level: lvl, status: "Escalated" }).eq("id", data.id);
    if (error) throw error;
    if (data.remarks) {
      await sb.from("comments").insert({
        entity_type: "issues", entity_id: data.id, body: `Escalated (L${lvl}): ${data.remarks}`, author_id: context.userId,
      });
    }
    return { ok: true, level: lvl };
  });

export const archiveIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("issues").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const addIssuePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(), url: z.string().url(), caption: z.string().max(200).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: cur } = await sb.from("issues").select("photos").eq("id", data.id).maybeSingle();
    const photos = Array.isArray(cur?.photos) ? cur.photos : [];
    photos.push({ url: data.url, caption: data.caption ?? null, added_at: new Date().toISOString() });
    const { error } = await sb.from("issues").update({ photos }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const removeIssuePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), index: z.number().int().min(0) }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: cur } = await sb.from("issues").select("photos").eq("id", data.id).maybeSingle();
    const photos = Array.isArray(cur?.photos) ? [...cur.photos] : [];
    photos.splice(data.index, 1);
    const { error } = await sb.from("issues").update({ photos }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

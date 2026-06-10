import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MEETING_COLS =
  "id, project_id, meeting_number, title, meeting_type, meeting_date, end_time, status, " +
  "location, meeting_mode, meeting_link, chairperson_id, prepared_by, summary, agenda, " +
  "discussion_points, decisions, next_meeting_date, is_client_visible, is_archived, " +
  "attendees, attachments, created_by, created_at, updated_at";

const ACTION_COLS =
  "id, meeting_id, project_id, action_number, title, description, responsible_person, " +
  "assigned_to:responsible_person, due_date, priority, status, progress_percentage, " +
  "completed_date, completion_notes, linked_task_id, is_archived, created_by, created_at, updated_at";

const attendeeSchema = z.object({
  user_id: z.string().uuid().nullable().optional(),
  name: z.string().max(200),
  email: z.string().max(200).nullable().optional(),
  organization: z.string().max(200).nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  status: z.string().max(30).nullable().optional(),
});

const attachmentSchema = z.object({
  file_name: z.string().max(300),
  file_url: z.string().url(),
  description: z.string().max(500).nullable().optional(),
  is_client_visible: z.boolean().optional(),
});

const meetingInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  meeting_number: z.string().max(60).nullable().optional(),
  title: z.string().min(1).max(300),
  meeting_type: z.string().max(60).nullable().optional(),
  meeting_date: z.string(),
  end_time: z.string().nullable().optional(),
  status: z.string().max(40).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  meeting_mode: z.string().max(40).nullable().optional(),
  meeting_link: z.string().max(500).nullable().optional(),
  chairperson_id: z.string().uuid().nullable().optional(),
  prepared_by: z.string().uuid().nullable().optional(),
  summary: z.string().max(8000).nullable().optional(),
  agenda: z.string().max(8000).nullable().optional(),
  discussion_points: z.string().max(20000).nullable().optional(),
  decisions: z.string().max(8000).nullable().optional(),
  next_meeting_date: z.string().nullable().optional(),
  is_client_visible: z.boolean().optional(),
  attendees: z.array(attendeeSchema).optional(),
  attachments: z.array(attachmentSchema).optional(),
});

async function projectCode(sb: any, projectId: string): Promise<string> {
  const { data } = await sb.from("projects").select("code, name").eq("id", projectId).maybeSingle();
  return (data?.code || data?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
}

async function nextMeetingNumber(sb: any, projectId: string, dateIso: string): Promise<string> {
  const code = await projectCode(sb, projectId);
  const d = new Date(dateIso);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const prefix = `MTG-${code}-${ymd}-`;
  const { data } = await sb.from("meetings").select("meeting_number").eq("project_id", projectId).like("meeting_number", `${prefix}%`);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const n = parseInt(String(r.meeting_number ?? "").split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function nextActionNumber(sb: any, projectId: string): Promise<string> {
  const code = await projectCode(sb, projectId);
  const prefix = `ACT-${code}-`;
  const { data } = await sb.from("meeting_action_items").select("action_number").eq("project_id", projectId).like("action_number", `${prefix}%`);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const n = parseInt(String(r.action_number ?? "").split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export const listMeetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid().optional(), includeArchived: z.boolean().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("meetings").select(MEETING_COLS).order("meeting_date", { ascending: false }).limit(500);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    const list = (rows ?? []) as any[];
    const ids = list.map((r) => r.id);
    const pids = Array.from(new Set(list.map((r) => r.project_id).filter(Boolean)));
    const uids = Array.from(new Set(list.flatMap((r) => [r.chairperson_id, r.prepared_by, r.created_by]).filter(Boolean)));
    const [{ data: projs }, { data: profs }, { data: actions }] = await Promise.all([
      pids.length ? sb.from("projects").select("id, name, code").in("id", pids) : Promise.resolve({ data: [] }),
      uids.length ? sb.from("profiles").select("id, full_name").in("id", uids) : Promise.resolve({ data: [] }),
      ids.length ? sb.from("meeting_action_items").select("meeting_id, status, due_date").in("meeting_id", ids).eq("is_archived", false) : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((projs ?? []).map((p: any) => [p.id, p]));
    const uMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    const today = new Date(new Date().toDateString());
    const aMap = new Map<string, { open: number; overdue: number; total: number }>();
    for (const a of (actions ?? []) as any[]) {
      const s = aMap.get(a.meeting_id) ?? { open: 0, overdue: 0, total: 0 };
      s.total += 1;
      const done = ["Completed", "Cancelled"].includes(a.status);
      if (!done) s.open += 1;
      if (!done && a.due_date && new Date(a.due_date) < today) s.overdue += 1;
      aMap.set(a.meeting_id, s);
    }
    return list.map((r) => ({
      ...r,
      project_name: (pMap.get(r.project_id) as any)?.name ?? null,
      chairperson_name: r.chairperson_id ? uMap.get(r.chairperson_id) ?? null : null,
      prepared_by_name: r.prepared_by ? uMap.get(r.prepared_by) ?? null : null,
      action_stats: aMap.get(r.id) ?? { open: 0, overdue: 0, total: 0 },
    }));
  });

export const getMeeting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("meetings").select(MEETING_COLS).eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });

export const upsertMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => meetingInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { id, ...rest } = data;
    const values: Record<string, any> = { ...rest };
    for (const k of Object.keys(values)) if (values[k] === "") values[k] = null;
    if (!values.status) values.status = "Scheduled";
    if (!values.meeting_type) values.meeting_type = "Project Meeting";
    if (!values.meeting_mode) values.meeting_mode = "In Person";
    if (values.attendees) values.attendees = values.attendees;
    if (values.attachments) values.attachments = values.attachments;

    if (id) {
      const { error } = await sb.from("meetings").update(values).eq("id", id);
      if (error) throw error;
      return { ok: true, id };
    }
    if (!values.meeting_number) values.meeting_number = await nextMeetingNumber(sb, values.project_id, values.meeting_date);
    values.created_by = context.userId;
    if (!values.prepared_by) values.prepared_by = context.userId;
    const { data: ins, error } = await sb.from("meetings").insert(values).select("id").single();
    if (error) throw error;

    // notify attendees with user_id
    const attendees: any[] = Array.isArray(values.attendees) ? values.attendees : [];
    const notify = attendees.map((a) => a.user_id).filter((u) => u && u !== context.userId);
    if (notify.length) {
      try {
        await sb.from("notifications").insert(
          notify.map((u: string) => ({
            user_id: u,
            title: `Meeting scheduled: ${values.title}`,
            body: `You were invited to ${values.meeting_number}.`,
            severity: "info",
            link: `/meetings?id=${ins.id}`,
          })),
        );
      } catch { /* notifications best-effort */ }
    }
    return { ok: true, id: ins.id };
  });

export const archiveMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("meetings").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const updateMeetingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("meetings").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ ACTION ITEMS ============

const actionInput = z.object({
  id: z.string().uuid().optional(),
  meeting_id: z.string().uuid(),
  project_id: z.string().uuid(),
  action_number: z.string().max(60).nullable().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(4000).nullable().optional(),
  responsible_person: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.string().max(20).nullable().optional(),
  status: z.string().max(30).nullable().optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
  completed_date: z.string().nullable().optional(),
  completion_notes: z.string().max(2000).nullable().optional(),
  linked_task_id: z.string().uuid().nullable().optional(),
});

export const listActionItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      projectId: z.string().uuid().optional(),
      meetingId: z.string().uuid().optional(),
      includeArchived: z.boolean().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb
      .from("meeting_action_items")
      .select(ACTION_COLS + ", meetings(title, meeting_date)")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(1000);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.meetingId) q = q.eq("meeting_id", data.meetingId);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    const list = (rows ?? []) as any[];
    const uids = Array.from(new Set(list.map((r) => r.responsible_person).filter(Boolean)));
    const { data: profs } = uids.length
      ? await sb.from("profiles").select("id, full_name").in("id", uids)
      : { data: [] as any[] };
    const uMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    return list.map((r) => ({
      ...r,
      assignee_name: r.responsible_person ? uMap.get(r.responsible_person) ?? null : null,
      meeting_title: r.meetings?.title ?? null,
      meeting_date: r.meetings?.meeting_date ?? null,
    }));
  });

export const upsertActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => actionInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { id, ...rest } = data;
    const values: Record<string, any> = { ...rest };
    for (const k of Object.keys(values)) if (values[k] === "") values[k] = null;
    if (!values.status) values.status = "Open";
    if (!values.priority) values.priority = "Medium";
    if (!values.description && values.title) values.description = values.title;

    if (values.progress_percentage === 100 && values.status !== "Completed") values.status = "Completed";
    if (values.status === "Completed" && !values.completed_date) values.completed_date = new Date().toISOString().slice(0, 10);

    if (id) {
      const { error } = await sb.from("meeting_action_items").update(values).eq("id", id);
      if (error) throw error;
      return { ok: true, id };
    }
    if (!values.action_number) values.action_number = await nextActionNumber(sb, values.project_id);
    values.created_by = context.userId;
    const { data: ins, error } = await sb.from("meeting_action_items").insert(values).select("id").single();
    if (error) throw error;

    if (values.responsible_person && values.responsible_person !== context.userId) {
      try {
        await sb.from("notifications").insert({
          user_id: values.responsible_person,
          title: `Action assigned: ${values.title}`,
          body: `You were assigned action ${values.action_number}${values.due_date ? ` (due ${values.due_date})` : ""}.`,
          severity: values.priority === "Critical" || values.priority === "High" ? "warning" : "info",
          link: `/action-items`,
        });
      } catch { /* best-effort */ }
    }
    return { ok: true, id: ins.id };
  });

export const archiveActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("meeting_action_items").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const updateActionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.string().min(1).max(30),
    progress_percentage: z.number().min(0).max(100).optional(),
    completion_notes: z.string().max(2000).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const patch: any = { status: data.status };
    if (data.progress_percentage !== undefined) patch.progress_percentage = data.progress_percentage;
    if (data.completion_notes !== undefined) patch.completion_notes = data.completion_notes;
    if (data.status === "Completed") {
      patch.completed_date = new Date().toISOString().slice(0, 10);
      if (data.progress_percentage === undefined) patch.progress_percentage = 100;
    }
    const { error } = await sb.from("meeting_action_items").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const promoteActionItemToTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: item, error: e1 } = await sb
      .from("meeting_action_items")
      .select("title, description, due_date, responsible_person, project_id, status, linked_task_id")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw e1;
    if (!item) throw new Error("Action item not found");
    if (item.linked_task_id) return { ok: true, taskId: item.linked_task_id, existed: true };

    const { data: task, error: e2 } = await sb
      .from("tasks")
      .insert({
        project_id: item.project_id,
        title: (item.title ?? item.description ?? "Action item").slice(0, 200),
        description: item.description,
        due_date: item.due_date,
        status: "todo",
        assignee_id: item.responsible_person,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (e2) throw e2;

    await sb.from("meeting_action_items").update({ linked_task_id: task.id, status: "In Progress" }).eq("id", data.id);
    return { ok: true, taskId: task.id };
  });

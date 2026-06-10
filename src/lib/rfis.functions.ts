import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const COLS =
  "id, project_id, number, rfi_number, subject, description, question, response, answer, " +
  "status, priority, category, discipline, location, due_date, " +
  "raised_by, assigned_to, reviewer_id, responded_by, created_by, " +
  "submitted_at, responded_at, closed_at, " +
  "cost_impact, cost_impact_description, time_impact, time_impact_days, time_impact_description, " +
  "reference_drawing, linked_drawing_id, linked_task_id, linked_document_id, linked_submittal_id, linked_issue_id, " +
  "is_client_visible, is_archived, created_at, updated_at";

const STATUSES = ["draft", "submitted", "under_review", "approved", "rejected", "revise_resubmit", "closed", "reopened", "cancelled"] as const;

const rfiInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  rfi_number: z.string().max(80).optional().nullable(),
  subject: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  question: z.string().max(5000).optional().nullable(),
  response: z.string().max(5000).optional().nullable(),
  status: z.enum(STATUSES).optional(),
  priority: z.string().max(20).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  discipline: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  due_date: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  reviewer_id: z.string().uuid().optional().nullable(),
  reference_drawing: z.string().max(200).optional().nullable(),
  linked_drawing_id: z.string().uuid().optional().nullable(),
  linked_task_id: z.string().uuid().optional().nullable(),
  linked_document_id: z.string().uuid().optional().nullable(),
  linked_submittal_id: z.string().uuid().optional().nullable(),
  linked_issue_id: z.string().uuid().optional().nullable(),
  cost_impact: z.boolean().optional(),
  cost_impact_description: z.string().max(2000).optional().nullable(),
  time_impact: z.boolean().optional(),
  time_impact_days: z.number().min(0).optional(),
  time_impact_description: z.string().max(2000).optional().nullable(),
  is_client_visible: z.boolean().optional(),
});

async function nextRfiNumber(sb: any, projectId: string): Promise<string> {
  const { data: p } = await sb.from("projects").select("code, name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const prefix = `RFI-${code}-`;
  const { data } = await sb.from("rfis").select("rfi_number, number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.rfi_number ?? r.number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export const listRfisFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid().optional(), includeArchived: z.boolean().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("rfis").select(COLS).order("created_at", { ascending: false }).limit(1000);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    const list = (rows ?? []) as any[];
    const pids = Array.from(new Set(list.map((r) => r.project_id).filter(Boolean)));
    const uids = Array.from(new Set(list.flatMap((r) => [r.assigned_to, r.reviewer_id, r.raised_by, r.created_by, r.responded_by]).filter(Boolean)));
    const [{ data: projs }, { data: profs }] = await Promise.all([
      pids.length ? sb.from("projects").select("id, name, code").in("id", pids) : Promise.resolve({ data: [] }),
      uids.length ? sb.from("profiles").select("id, full_name, email").in("id", uids) : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((projs ?? []).map((p: any) => [p.id, p]));
    const uMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || p.email]));
    return list.map((r) => ({
      ...r,
      rfi_number: r.rfi_number ?? r.number ?? null,
      project_name: (pMap.get(r.project_id) as any)?.name ?? null,
      project_code: (pMap.get(r.project_id) as any)?.code ?? null,
      assigned_name: r.assigned_to ? uMap.get(r.assigned_to) ?? null : null,
      reviewer_name: r.reviewer_id ? uMap.get(r.reviewer_id) ?? null : null,
      raised_name: r.raised_by ? uMap.get(r.raised_by) ?? null : null,
      responded_name: r.responded_by ? uMap.get(r.responded_by) ?? null : null,
    }));
  });

export const getRfi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any).from("rfis").select(COLS).eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });

export const upsertRfi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rfiInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { id, ...rest } = data;
    const values: Record<string, any> = { ...rest };
    for (const k of Object.keys(values)) if (values[k] === "") values[k] = null;
    if (!values.priority) values.priority = "Medium";
    if (!values.category) values.category = "General";
    if (!values.status) values.status = "draft";

    if (id) {
      const { error } = await sb.from("rfis").update(values).eq("id", id);
      if (error) throw error;
      return { ok: true, id };
    }
    if (!values.rfi_number) values.rfi_number = await nextRfiNumber(sb, values.project_id);
    values.number = values.rfi_number;
    values.created_by = context.userId;
    values.raised_by = context.userId;
    const { data: ins, error } = await sb.from("rfis").insert(values).select("id, rfi_number, subject, assigned_to, reviewer_id, priority").single();
    if (error) throw error;

    const notifyId = ins.assigned_to ?? ins.reviewer_id;
    if (notifyId && notifyId !== context.userId) {
      await sb.from("notifications").insert({
        user_id: notifyId,
        title: `RFI assigned: ${ins.subject}`,
        body: `You were assigned RFI ${ins.rfi_number}.`,
        severity: ins.priority === "Critical" ? "critical" : "info",
        link: `/rfis?id=${ins.id}`,
      });
    }
    return { ok: true, id: ins.id };
  });

export const submitRfi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from("rfis").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const respondRfi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    response: z.string().min(1).max(5000),
    mark_answered: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const patch: any = {
      response: data.response,
      answer: data.response,
      responded_by: context.userId,
      responded_at: new Date().toISOString(),
    };
    if (data.mark_answered !== false) patch.status = "approved";
    const { data: row, error } = await sb.from("rfis").update(patch).eq("id", data.id).select("subject, rfi_number, raised_by").single();
    if (error) throw error;
    if (row?.raised_by && row.raised_by !== context.userId) {
      await sb.from("notifications").insert({
        user_id: row.raised_by,
        title: `RFI answered: ${row.subject}`,
        body: `${row.rfi_number} has been answered.`,
        severity: "info",
        link: `/rfis?id=${data.id}`,
      });
    }
    return { ok: true };
  });

export const setRfiStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(STATUSES),
    note: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const patch: any = { status: data.status };
    if (data.status === "closed") patch.closed_at = new Date().toISOString();
    if (data.status === "reopened" || data.status === "under_review") patch.closed_at = null;
    const { data: row, error } = await sb.from("rfis").update(patch).eq("id", data.id).select("subject, rfi_number, raised_by, assigned_to").single();
    if (error) throw error;

    if (data.note) {
      await sb.from("comments").insert({
        entity_type: "rfis", entity_id: data.id,
        body: `[${data.status.replace(/_/g, " ")}] ${data.note}`,
        author_id: context.userId,
      });
    }
    const targets = new Set<string>();
    if (row.raised_by && row.raised_by !== context.userId) targets.add(row.raised_by);
    if (row.assigned_to && row.assigned_to !== context.userId) targets.add(row.assigned_to);
    for (const u of targets) {
      await sb.from("notifications").insert({
        user_id: u,
        title: `RFI ${data.status.replace(/_/g, " ")}: ${row.subject}`,
        body: `${row.rfi_number} status changed.`,
        severity: data.status === "rejected" ? "warning" : "info",
        link: `/rfis?id=${data.id}`,
      });
    }
    return { ok: true };
  });

export const assignRfi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    assigned_to: z.string().uuid().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("rfis").update({ assigned_to: data.assigned_to }).eq("id", data.id).select("subject, rfi_number, priority").single();
    if (error) throw error;
    if (data.assigned_to && data.assigned_to !== context.userId) {
      await sb.from("notifications").insert({
        user_id: data.assigned_to,
        title: `RFI assigned: ${row.subject}`,
        body: `You were assigned RFI ${row.rfi_number}.`,
        severity: row.priority === "Critical" ? "critical" : "info",
        link: `/rfis?id=${data.id}`,
      });
    }
    return { ok: true };
  });

export const archiveRfi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("rfis").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listRfiAttachments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rfi_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("rfi_attachments").select("*").eq("rfi_id", data.rfi_id).order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const addRfiAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    rfi_id: z.string().uuid(),
    project_id: z.string().uuid(),
    file_name: z.string().min(1).max(255),
    file_url: z.string().url().max(1000),
    file_type: z.string().max(80).optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    is_client_visible: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("rfi_attachments").insert({
      ...data, uploaded_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteRfiAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("rfi_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

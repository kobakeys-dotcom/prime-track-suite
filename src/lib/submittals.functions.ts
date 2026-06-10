import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const COLS =
  "id, project_id, number, title, description, submittal_type, discipline, category, revision, " +
  "status, priority, spec_section, " +
  "submitted_by, assigned_to, reviewer_id, approved_by, created_by, " +
  "due_date, submitted_at, reviewed_at, approved_at, rejected_at, closed_at, " +
  "review_comments, rejection_reason, revision_notes, " +
  "boq_item_id, material_id, linked_drawing_id, linked_document_id, linked_task_id, linked_rfi_id, linked_issue_id, " +
  "previous_revision_id, superseded_by, is_current_revision, " +
  "is_client_visible, is_archived, created_at, updated_at";

const STATUSES = [
  "draft", "submitted", "under_review", "approved", "approved_with_comments",
  "rejected", "revise_resubmit", "superseded", "closed", "reopened", "cancelled",
] as const;

const subInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  number: z.string().max(80).optional().nullable(),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  submittal_type: z.string().max(100).optional().nullable(),
  discipline: z.string().max(100).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  revision: z.string().max(40).optional().nullable(),
  status: z.enum(STATUSES).optional(),
  priority: z.string().max(20).optional().nullable(),
  spec_section: z.string().max(200).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  reviewer_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  review_comments: z.string().max(5000).optional().nullable(),
  rejection_reason: z.string().max(2000).optional().nullable(),
  revision_notes: z.string().max(2000).optional().nullable(),
  boq_item_id: z.string().uuid().optional().nullable(),
  material_id: z.string().uuid().optional().nullable(),
  linked_drawing_id: z.string().uuid().optional().nullable(),
  linked_document_id: z.string().uuid().optional().nullable(),
  linked_task_id: z.string().uuid().optional().nullable(),
  linked_rfi_id: z.string().uuid().optional().nullable(),
  linked_issue_id: z.string().uuid().optional().nullable(),
  is_client_visible: z.boolean().optional(),
});

async function nextSubmittalNumber(sb: any, projectId: string): Promise<string> {
  const { data: p } = await sb.from("projects").select("code, name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const prefix = `SUB-${code}-`;
  const { data } = await sb.from("submittals").select("number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export const listSubmittalsFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      projectId: z.string().uuid().optional(),
      includeArchived: z.boolean().optional(),
      currentOnly: z.boolean().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    let q = sb.from("submittals").select(COLS).order("created_at", { ascending: false }).limit(1000);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    if (data.currentOnly) q = q.eq("is_current_revision", true);
    const { data: rows, error } = await q;
    if (error) throw error;
    const list = (rows ?? []) as any[];
    const pids = Array.from(new Set(list.map((r) => r.project_id).filter(Boolean)));
    const uids = Array.from(new Set(list.flatMap((r) => [r.assigned_to, r.reviewer_id, r.submitted_by, r.approved_by, r.created_by]).filter(Boolean)));
    const [{ data: projs }, { data: profs }] = await Promise.all([
      pids.length ? sb.from("projects").select("id, name, code").in("id", pids) : Promise.resolve({ data: [] }),
      uids.length ? sb.from("profiles").select("id, full_name, email").in("id", uids) : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((projs ?? []).map((p: any) => [p.id, p]));
    const uMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || p.email]));
    return list.map((r) => ({
      ...r,
      project_name: (pMap.get(r.project_id) as any)?.name ?? null,
      project_code: (pMap.get(r.project_id) as any)?.code ?? null,
      assigned_name: r.assigned_to ? uMap.get(r.assigned_to) ?? null : null,
      reviewer_name: r.reviewer_id ? uMap.get(r.reviewer_id) ?? null : null,
      submitted_name: r.submitted_by ? uMap.get(r.submitted_by) ?? null : null,
      approved_name: r.approved_by ? uMap.get(r.approved_by) ?? null : null,
    }));
  });

export const getSubmittal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any).from("submittals").select(COLS).eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });

export const upsertSubmittal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => subInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { id, ...rest } = data;
    const values: Record<string, any> = { ...rest };
    for (const k of Object.keys(values)) if (values[k] === "") values[k] = null;
    if (!values.priority) values.priority = "Medium";
    if (!values.submittal_type) values.submittal_type = "General";
    if (!values.revision) values.revision = "Rev 0";
    if (!values.status) values.status = "draft";

    if (id) {
      const { error } = await sb.from("submittals").update(values).eq("id", id);
      if (error) throw error;
      return { ok: true, id };
    }
    if (!values.number) values.number = await nextSubmittalNumber(sb, values.project_id);
    values.created_by = context.userId;
    const { data: ins, error } = await sb.from("submittals").insert(values).select("id, number, title, assigned_to, reviewer_id, priority").single();
    if (error) throw error;

    const notifyId = ins.assigned_to ?? ins.reviewer_id;
    if (notifyId && notifyId !== context.userId) {
      await sb.from("notifications").insert({
        user_id: notifyId,
        title: `Submittal assigned: ${ins.title}`,
        body: `You were assigned submittal ${ins.number}.`,
        severity: ins.priority === "Critical" ? "critical" : "info",
        link: `/submittals?id=${ins.id}`,
      });
    }
    return { ok: true, id: ins.id };
  });

export const submitSubmittal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from("submittals").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      submitted_by: context.userId,
    }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const setSubmittalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(STATUSES),
    note: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const now = new Date().toISOString();
    const patch: any = { status: data.status };

    if (data.status === "under_review") patch.reviewed_at = now;
    if (data.status === "approved" || data.status === "approved_with_comments") {
      patch.approved_at = now;
      patch.approved_by = context.userId;
      if (data.note) patch.review_comments = data.note;
    }
    if (data.status === "rejected") {
      patch.rejected_at = now;
      if (data.note) patch.rejection_reason = data.note;
    }
    if (data.status === "revise_resubmit" && data.note) patch.revision_notes = data.note;
    if (data.status === "closed") patch.closed_at = now;
    if (data.status === "reopened") { patch.closed_at = null; patch.rejected_at = null; }

    const { data: row, error } = await sb.from("submittals").update(patch).eq("id", data.id)
      .select("title, number, submitted_by, assigned_to, created_by").single();
    if (error) throw error;

    if (data.note) {
      await sb.from("comments").insert({
        entity_type: "submittals", entity_id: data.id,
        body: `[${data.status.replace(/_/g, " ")}] ${data.note}`,
        author_id: context.userId,
      });
    }
    const targets = new Set<string>();
    for (const u of [row.submitted_by, row.created_by, row.assigned_to]) {
      if (u && u !== context.userId) targets.add(u);
    }
    for (const u of targets) {
      await sb.from("notifications").insert({
        user_id: u,
        title: `Submittal ${data.status.replace(/_/g, " ")}: ${row.title}`,
        body: `${row.number} status changed.`,
        severity: data.status === "rejected" ? "warning" : "info",
        link: `/submittals?id=${data.id}`,
      });
    }
    return { ok: true };
  });

export const assignSubmittal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    assigned_to: z.string().uuid().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("submittals").update({ assigned_to: data.assigned_to }).eq("id", data.id)
      .select("title, number, priority").single();
    if (error) throw error;
    if (data.assigned_to && data.assigned_to !== context.userId) {
      await sb.from("notifications").insert({
        user_id: data.assigned_to,
        title: `Submittal assigned: ${row.title}`,
        body: `You were assigned submittal ${row.number}.`,
        severity: row.priority === "Critical" ? "critical" : "info",
        link: `/submittals?id=${data.id}`,
      });
    }
    return { ok: true };
  });

export const createSubmittalRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    revision: z.string().min(1).max(40),
    revision_notes: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: src, error: e1 } = await sb.from("submittals").select(COLS).eq("id", data.id).single();
    if (e1) throw e1;

    // Mark previous as not current + superseded
    await sb.from("submittals").update({
      is_current_revision: false,
      status: "superseded",
    }).eq("id", data.id);

    const newRow: any = {
      project_id: src.project_id,
      number: src.number,
      title: src.title,
      description: src.description,
      submittal_type: src.submittal_type,
      discipline: src.discipline,
      category: src.category,
      revision: data.revision,
      status: "draft",
      priority: src.priority,
      spec_section: src.spec_section,
      assigned_to: src.assigned_to,
      reviewer_id: src.reviewer_id,
      due_date: src.due_date,
      revision_notes: data.revision_notes ?? null,
      boq_item_id: src.boq_item_id,
      material_id: src.material_id,
      linked_drawing_id: src.linked_drawing_id,
      linked_document_id: src.linked_document_id,
      linked_task_id: src.linked_task_id,
      linked_rfi_id: src.linked_rfi_id,
      linked_issue_id: src.linked_issue_id,
      previous_revision_id: data.id,
      is_current_revision: true,
      is_client_visible: src.is_client_visible,
      created_by: context.userId,
    };
    const { data: ins, error: e2 } = await sb.from("submittals").insert(newRow).select("id").single();
    if (e2) throw e2;

    await sb.from("submittals").update({ superseded_by: ins.id }).eq("id", data.id);
    return { ok: true, id: ins.id };
  });

export const archiveSubmittal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("submittals").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listSubmittalAttachments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ submittal_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("submittal_attachments").select("*").eq("submittal_id", data.submittal_id).order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const addSubmittalAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    submittal_id: z.string().uuid(),
    project_id: z.string().uuid(),
    file_name: z.string().min(1).max(255),
    file_url: z.string().url().max(1000),
    file_type: z.string().max(80).optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    attachment_type: z.string().max(80).optional().nullable(),
    is_client_visible: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("submittal_attachments").insert({
      ...data, uploaded_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteSubmittalAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as any).from("submittal_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

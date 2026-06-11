import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const DOCUMENT_TYPES = [
  "General Document","Contract Document","Technical Document","Method Statement",
  "Material Certificate","Test Report","Inspection Report","Safety Document",
  "Quality Document","Drawing","Submittal","RFI Attachment","Variation Backup",
  "Payment Claim Backup","Purchase Order","Delivery Note","Meeting Record",
  "Correspondence","Letter","Manual","Warranty","Handover Document","As-Built Document",
] as const;
export const DOCUMENT_CATEGORIES = [
  "Contract","Design","Construction","QA/QC","HSE","Procurement","Commercial",
  "Finance","Correspondence","Authority Approval","Client Approval","Consultant Approval",
  "Handover","Operation & Maintenance","General",
] as const;
export const DISCIPLINES = [
  "Civil","Structural","Architectural","MEP","Electrical","Plumbing","HVAC",
  "Fire","Elevator","Finishing","External Works","Safety","Quality","Commercial","Procurement","General",
] as const;
export const DOCUMENT_STATUSES = [
  "Draft","Submitted","Under Review","Approved","Published","Active",
  "Superseded","Expired","Rejected","Revision Requested","Cancelled","Archived",
] as const;
export const APPROVAL_STATUSES = [
  "Not Submitted","Submitted","Under Review","Approved","Rejected","Revision Requested",
] as const;

const STORAGE_BUCKET = "project-files";

async function profile(ctx: any) {
  const { data } = await ctx.supabase
    .from("profiles").select("company_id").eq("id", ctx.userId).maybeSingle();
  return data;
}

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string; includeArchived?: boolean } | undefined) =>
    z.object({
      projectId: z.string().uuid().optional(),
      includeArchived: z.boolean().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("documents")
      .select("*, projects(name, code)")
      .order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (!data.includeArchived) q = q.or("is_archived.is.null,is_archived.eq.false");
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).map((r: any) => ({
      ...r,
      document_title: r.document_title ?? r.name,
      project_name: r.projects?.name ?? "—",
      project_code: r.projects?.code ?? null,
    }));
  });

export const getDocument = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: doc, error } = await context.supabase
      .from("documents").select("*, projects(name, code)").eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!doc) throw new Error("Not found");
    const [{ data: revs }, { data: comments }, { data: history }] = await Promise.all([
      context.supabase.from("document_revisions").select("*").eq("document_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("document_comments").select("*").eq("document_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("document_status_history").select("*").eq("document_id", data.id).order("created_at", { ascending: false }),
    ]);
    return { doc, revisions: revs ?? [], comments: comments ?? [], history: history ?? [] };
  });

async function nextDocNumber(supabase: any, companyId: string, projectId: string | null, projectCode: string | null) {
  const prefix = projectCode
    ? `DOC-${projectCode}-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-`
    : `DOC-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-`;
  const { data } = await supabase
    .from("documents").select("document_number").eq("company_id", companyId)
    .like("document_number", `${prefix}%`);
  const n = (data ?? []).length + 1;
  return `${prefix}${String(n).padStart(3, "0")}`;
}

const docInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid().nullable().optional(),
  document_number: z.string().max(100).optional().nullable(),
  document_title: z.string().min(1).max(300),
  document_description: z.string().max(4000).optional().nullable(),
  document_type: z.string().max(100).optional(),
  document_category: z.string().max(100).optional(),
  discipline: z.string().max(100).optional().nullable(),
  folder_path: z.string().max(300).optional().nullable(),
  document_status: z.string().max(50).optional(),
  approval_status: z.string().max(50).optional(),
  revision: z.string().max(20).optional(),
  document_owner_id: z.string().uuid().optional().nullable(),
  prepared_by: z.string().uuid().optional().nullable(),
  issue_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  is_confidential: z.boolean().optional(),
  is_client_visible: z.boolean().optional(),
  is_downloadable: z.boolean().optional(),
  tags: z.array(z.string()).optional().nullable(),
  remarks: z.string().max(2000).optional().nullable(),
  file_name: z.string().max(300).optional().nullable(),
  file_url: z.string().max(1000).optional().nullable(),
  file_path: z.string().max(1000).optional().nullable(),
  file_type: z.string().max(100).optional().nullable(),
  file_size: z.number().optional().nullable(),
  storage_bucket: z.string().max(100).optional().nullable(),
  storage_path: z.string().max(1000).optional().nullable(),
  linked_module: z.string().max(100).optional().nullable(),
  linked_record_id: z.string().uuid().optional().nullable(),
});

export const saveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => docInput.parse(d))
  .handler(async ({ context, data }) => {
    const p = await profile(context);
    if (!p?.company_id) throw new Error("Company missing");
    const { id, ...rest } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("documents").update(rest).eq("id", id).select().single();
      if (error) throw error;
      return row;
    }
    // create
    let projectCode: string | null = null;
    if (rest.project_id) {
      const { data: pr } = await context.supabase.from("projects").select("code").eq("id", rest.project_id).maybeSingle();
      projectCode = pr?.code ?? null;
    }
    const docNumber = rest.document_number || await nextDocNumber(context.supabase, p.company_id, rest.project_id ?? null, projectCode);
    const insert = {
      ...rest,
      company_id: p.company_id,
      name: rest.document_title,
      document_number: docNumber,
      created_by: context.userId,
      document_owner_id: rest.document_owner_id ?? context.userId,
      uploaded_by: context.userId,
    };
    const { data: row, error } = await context.supabase.from("documents").insert(insert).select().single();
    if (error) throw error;
    // initial revision
    if (row.file_url || row.storage_path || row.file_name) {
      await context.supabase.from("document_revisions").insert({
        company_id: p.company_id,
        project_id: row.project_id,
        document_id: row.id,
        revision: row.revision ?? "Rev 0",
        revision_status: "Current",
        is_current: true,
        uploaded_by: context.userId,
        file_name: row.file_name,
        file_url: row.file_url,
        file_path: row.file_path,
        file_type: row.file_type,
        file_size: row.file_size,
        storage_bucket: row.storage_bucket,
        storage_path: row.storage_path,
      });
    }
    return row;
  });

export const setDocumentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    document_status: z.string(),
    approval_status: z.string().optional(),
    remarks: z.string().optional().nullable(),
    rejection_reason: z.string().optional().nullable(),
    revision_notes: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const p = await profile(context);
    const { data: cur } = await context.supabase.from("documents").select("*").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Not found");
    const updates: any = { document_status: data.document_status };
    if (data.approval_status) updates.approval_status = data.approval_status;
    if (data.rejection_reason) updates.rejection_reason = data.rejection_reason;
    if (data.revision_notes) updates.revision_notes = data.revision_notes;
    const now = new Date().toISOString();
    if (data.document_status === "Submitted") { updates.submitted_by = context.userId; updates.submitted_at = now; }
    if (data.document_status === "Under Review") { updates.reviewed_by = context.userId; updates.reviewed_at = now; }
    if (data.document_status === "Approved" || data.document_status === "Published") {
      updates.approved_by = context.userId; updates.approved_at = now;
    }
    const { error } = await context.supabase.from("documents").update(updates).eq("id", data.id);
    if (error) throw error;
    await context.supabase.from("document_status_history").insert({
      company_id: p?.company_id, project_id: cur.project_id, document_id: data.id,
      old_status: cur.document_status, new_status: data.document_status,
      changed_by: context.userId, remarks: data.remarks ?? null,
    });
    return { ok: true };
  });

export const archiveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("documents").update({ is_archived: true, document_status: "Archived" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const addDocumentRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    document_id: z.string().uuid(),
    revision: z.string().min(1).max(20),
    revision_title: z.string().optional().nullable(),
    change_summary: z.string().optional().nullable(),
    file_name: z.string().optional().nullable(),
    file_url: z.string().optional().nullable(),
    file_path: z.string().optional().nullable(),
    file_type: z.string().optional().nullable(),
    file_size: z.number().optional().nullable(),
    storage_bucket: z.string().optional().nullable(),
    storage_path: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const p = await profile(context);
    const { data: doc } = await context.supabase.from("documents").select("*").eq("id", data.document_id).maybeSingle();
    if (!doc) throw new Error("Document not found");
    // supersede previous current
    await context.supabase.from("document_revisions").update({
      is_current: false, revision_status: "Superseded",
    }).eq("document_id", data.document_id).eq("is_current", true);
    const { data: rev, error } = await context.supabase.from("document_revisions").insert({
      company_id: p?.company_id, project_id: doc.project_id, document_id: data.document_id,
      revision: data.revision, revision_title: data.revision_title ?? null,
      change_summary: data.change_summary ?? null, revision_status: "Current", is_current: true,
      uploaded_by: context.userId,
      file_name: data.file_name, file_url: data.file_url, file_path: data.file_path,
      file_type: data.file_type, file_size: data.file_size,
      storage_bucket: data.storage_bucket, storage_path: data.storage_path,
    }).select().single();
    if (error) throw error;
    // update parent doc
    await context.supabase.from("documents").update({
      revision: data.revision, current_revision_id: rev.id,
      file_name: data.file_name ?? doc.file_name,
      file_url: data.file_url ?? doc.file_url,
      file_path: data.file_path ?? doc.file_path,
      file_type: data.file_type ?? doc.file_type,
      file_size: data.file_size ?? doc.file_size,
      storage_bucket: data.storage_bucket ?? doc.storage_bucket,
      storage_path: data.storage_path ?? doc.storage_path,
      is_latest_revision: true,
    }).eq("id", data.document_id);
    return rev;
  });

export const addDocumentComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    document_id: z.string().uuid(),
    comment: z.string().min(1).max(4000),
    visibility: z.enum(["internal", "client_visible"]).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const p = await profile(context);
    const { data: doc } = await context.supabase.from("documents").select("project_id").eq("id", data.document_id).maybeSingle();
    const { data: row, error } = await context.supabase.from("document_comments").insert({
      company_id: p?.company_id, project_id: doc?.project_id, document_id: data.document_id,
      user_id: context.userId, comment: data.comment, visibility: data.visibility ?? "internal",
    }).select().single();
    if (error) throw error;
    return row;
  });

export const documentStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("documents").select("document_status, approval_status, expiry_date, is_confidential, is_client_visible, is_archived");
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    const list = (rows ?? []).filter((r: any) => !r.is_archived);
    const now = Date.now();
    const soon = now + 30 * 86400000;
    const s = { total: list.length, draft: 0, under_review: 0, approved: 0, published: 0, expired: 0, expiring: 0, client_visible: 0, confidential: 0 };
    for (const r of list as any[]) {
      const st = r.document_status;
      if (st === "Draft") s.draft++;
      if (st === "Under Review" || st === "Submitted") s.under_review++;
      if (st === "Approved") s.approved++;
      if (st === "Published" || st === "Active") s.published++;
      if (r.expiry_date) {
        const t = new Date(r.expiry_date).getTime();
        if (t < now) s.expired++; else if (t < soon) s.expiring++;
      }
      if (r.is_client_visible) s.client_visible++;
      if (r.is_confidential) s.confidential++;
    }
    return s;
  });

// Storage
export const getUploadSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    filename: z.string().min(1).max(300),
    content_type: z.string().max(150).optional(),
    project_id: z.string().uuid().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const p = await profile(context);
    if (!p?.company_id) throw new Error("Company missing");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${p.company_id}/${data.project_id ?? "shared"}/${Date.now()}-${safe}`;
    const { data: signed, error } = await context.supabase.storage
      .from(STORAGE_BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, signedUrl: signed.signedUrl, bucket: STORAGE_BUCKET };
  });

export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1), bucket: z.string().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: signed, error } = await context.supabase.storage
      .from(data.bucket ?? STORAGE_BUCKET).createSignedUrl(data.path, 600);
    if (error) throw error;
    return { url: signed.signedUrl };
  });

// Drawings unchanged
export const listDrawings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("drawings")
      .select("id, number, title, discipline, revision, issued_date, file_url, project_id, created_at, projects(name)")
      .order("number", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ ...r, project_name: r.projects?.name ?? "—" }));
  });

export const createDrawing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    project_id: z.string().uuid(),
    number: z.string().min(1).max(50),
    title: z.string().max(200).optional().nullable(),
    discipline: z.string().max(50).optional().nullable(),
    revision: z.string().max(20).optional().nullable(),
    issued_date: z.string().optional().nullable(),
    file_url: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("drawings").insert(data).select().single();
    if (error) throw error;
    return row;
  });

// kept for backward compat with existing UI
export const createDocument = saveDocument;

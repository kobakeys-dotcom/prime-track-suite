import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const DRAWING_TYPES = [
  "General Arrangement","Architectural Drawing","Structural Drawing","Civil Drawing",
  "MEP Drawing","Electrical Drawing","Plumbing Drawing","HVAC Drawing","Fire System Drawing",
  "Elevator Drawing","Shop Drawing","As-Built Drawing","Coordination Drawing","Detail Drawing",
  "Section Drawing","Plan Drawing","Elevation Drawing","Layout Drawing","Schematic Drawing",
  "Fabrication Drawing","Installation Drawing","Method Drawing","Authority Drawing",
] as const;
export const DRAWING_CATEGORIES = [
  "Design","Tender","Construction","Shop Drawing","Coordination","Authority Approval",
  "Consultant Approval","Client Approval","Procurement","Fabrication","Installation",
  "As-Built","Handover","General",
] as const;
export const DRAWING_DISCIPLINES = [
  "Civil","Structural","Architectural","MEP","Electrical","Plumbing","HVAC",
  "Fire","ELV","Elevator","Landscape","External Works","General",
] as const;
export const DRAWING_STATUSES = [
  "Draft","Submitted","Under Review","Approved","Issued","Active","For Construction",
  "For Information","As-Built","Superseded","Rejected","Revision Requested","Cancelled","Archived",
] as const;
export const DRAWING_APPROVAL_STATUSES = [
  "Not Submitted","Submitted","Under Review","Approved","Rejected","Revision Requested",
  "Consultant Approved","Client Approved",
] as const;
export const DRAWING_ISSUE_PURPOSES = [
  "For Information","For Review","For Approval","For Construction","For Tender",
  "For Procurement","For Coordination","As-Built","Superseded",
] as const;
export const DRAWING_SHEET_SIZES = ["A0","A1","A2","A3","A4","Custom"] as const;
export const DISCIPLINE_CODES: Record<string, string> = {
  Civil: "CIV", Structural: "STR", Architectural: "ARC", MEP: "MEP",
  Electrical: "ELE", Plumbing: "PLB", HVAC: "HVAC", Fire: "FIRE", ELV: "ELV",
  Elevator: "LIFT", Landscape: "LAN", "External Works": "EXT", General: "GEN",
};

const STORAGE_BUCKET = "project-files";

async function profile(ctx: any) {
  const { data } = await ctx.supabase.from("profiles").select("company_id").eq("id", ctx.userId).maybeSingle();
  return data;
}

export const listDrawings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string; includeArchived?: boolean } | undefined) =>
    z.object({
      projectId: z.string().uuid().optional(),
      includeArchived: z.boolean().optional(),
    }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("drawings")
      .select("*, projects(name, code)")
      .order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (!data.includeArchived) q = q.or("is_archived.is.null,is_archived.eq.false");
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).map((r: any) => ({
      ...r,
      drawing_number: r.drawing_number ?? r.number,
      drawing_title: r.drawing_title ?? r.title,
      project_name: r.projects?.name ?? "—",
      project_code: r.projects?.code ?? null,
    }));
  });

export const getDrawing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: drw, error } = await context.supabase
      .from("drawings").select("*, projects(name, code)").eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!drw) throw new Error("Not found");
    const [{ data: revs }, { data: comments }, { data: history }, { data: distribs }] = await Promise.all([
      context.supabase.from("drawing_revisions").select("*").eq("drawing_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("drawing_comments").select("*").eq("drawing_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("drawing_status_history").select("*").eq("drawing_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("drawing_distribution_logs").select("*").eq("drawing_id", data.id).order("distributed_at", { ascending: false }),
    ]);
    return { drawing: drw, revisions: revs ?? [], comments: comments ?? [], history: history ?? [], distributions: distribs ?? [] };
  });

async function nextDrawingNumber(supabase: any, companyId: string, projectId: string, projectCode: string | null, discipline: string | null) {
  const disc = (discipline && DISCIPLINE_CODES[discipline]) || "GEN";
  const prefix = `DRG-${projectCode || "PRJ"}-${disc}-`;
  const { data } = await supabase
    .from("drawings").select("drawing_number").eq("company_id", companyId).eq("project_id", projectId)
    .like("drawing_number", `${prefix}%`);
  const n = (data ?? []).length + 1;
  return `${prefix}${String(n).padStart(3, "0")}`;
}

const drawingInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  drawing_number: z.string().max(100).optional().nullable(),
  drawing_title: z.string().min(1).max(300),
  drawing_description: z.string().max(4000).optional().nullable(),
  drawing_type: z.string().max(100).optional(),
  drawing_category: z.string().max(100).optional(),
  discipline: z.string().max(100).optional().nullable(),
  zone_area: z.string().max(200).optional().nullable(),
  floor_level: z.string().max(100).optional().nullable(),
  block_section: z.string().max(100).optional().nullable(),
  drawing_status: z.string().max(50).optional(),
  approval_status: z.string().max(50).optional(),
  issue_purpose: z.string().max(100).optional(),
  revision: z.string().max(20).optional(),
  prepared_by: z.string().uuid().optional().nullable(),
  checked_by: z.string().uuid().optional().nullable(),
  reviewed_by: z.string().uuid().optional().nullable(),
  approved_by: z.string().uuid().optional().nullable(),
  received_from: z.string().max(300).optional().nullable(),
  issued_to: z.string().max(300).optional().nullable(),
  issue_date: z.string().optional().nullable(),
  received_date: z.string().optional().nullable(),
  scale: z.string().max(50).optional().nullable(),
  sheet_size: z.string().max(20).optional().nullable(),
  drawing_origin: z.string().max(50).optional().nullable(),
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
  wbs_id: z.string().uuid().optional().nullable(),
  task_id: z.string().uuid().optional().nullable(),
  boq_item_id: z.string().uuid().optional().nullable(),
  rfi_id: z.string().uuid().optional().nullable(),
  submittal_id: z.string().uuid().optional().nullable(),
  variation_id: z.string().uuid().optional().nullable(),
  quality_inspection_id: z.string().uuid().optional().nullable(),
  safety_inspection_id: z.string().uuid().optional().nullable(),
  ncr_id: z.string().uuid().optional().nullable(),
  document_id: z.string().uuid().optional().nullable(),
});

export const saveDrawing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => drawingInput.parse(d))
  .handler(async ({ context, data }) => {
    const p = await profile(context);
    if (!p?.company_id) throw new Error("Company missing");
    const { id, ...rest } = data;
    if (id) {
      const upd: any = { ...rest };
      if (upd.drawing_title) upd.title = upd.drawing_title;
      if (upd.drawing_number) upd.number = upd.drawing_number;
      const { data: row, error } = await context.supabase
        .from("drawings").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return row;
    }
    let projectCode: string | null = null;
    const { data: pr } = await context.supabase.from("projects").select("code").eq("id", rest.project_id).maybeSingle();
    projectCode = pr?.code ?? null;
    const drawingNumber = rest.drawing_number || await nextDrawingNumber(context.supabase, p.company_id, rest.project_id, projectCode, rest.discipline ?? null);
    const revision = rest.revision || "Rev 0";
    const insert: any = {
      ...rest,
      company_id: p.company_id,
      number: drawingNumber,
      title: rest.drawing_title,
      drawing_number: drawingNumber,
      revision,
      created_by: context.userId,
      prepared_by: rest.prepared_by ?? context.userId,
      issued_date: rest.issue_date ?? null,
      is_latest_revision: true,
    };
    const { data: row, error } = await context.supabase.from("drawings").insert(insert).select().single();
    if (error) throw error;
    if (row.file_url || row.storage_path || row.file_name) {
      const { data: rev } = await context.supabase.from("drawing_revisions").insert({
        company_id: p.company_id, project_id: row.project_id, drawing_id: row.id,
        revision: row.revision ?? "Rev 0", revision_status: "Current", is_current: true,
        issue_purpose: row.issue_purpose, uploaded_by: context.userId,
        file_name: row.file_name, file_url: row.file_url, file_path: row.file_path,
        file_type: row.file_type, file_size: row.file_size,
        storage_bucket: row.storage_bucket, storage_path: row.storage_path,
      }).select().single();
      if (rev) await context.supabase.from("drawings").update({ current_revision_id: rev.id }).eq("id", row.id);
    }
    return row;
  });

export const setDrawingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    drawing_status: z.string(),
    approval_status: z.string().optional(),
    remarks: z.string().optional().nullable(),
    rejection_reason: z.string().optional().nullable(),
    revision_notes: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const p = await profile(context);
    const { data: cur } = await context.supabase.from("drawings").select("*").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Not found");
    const updates: any = { drawing_status: data.drawing_status };
    if (data.approval_status) updates.approval_status = data.approval_status;
    if (data.rejection_reason) updates.rejection_reason = data.rejection_reason;
    if (data.revision_notes) updates.revision_notes = data.revision_notes;
    const today = new Date().toISOString().slice(0, 10);
    if (["Approved", "Issued", "For Construction", "Active"].includes(data.drawing_status)) {
      updates.approved_by = context.userId;
      updates.approved_date = today;
    }
    const { error } = await context.supabase.from("drawings").update(updates).eq("id", data.id);
    if (error) throw error;
    await context.supabase.from("drawing_status_history").insert({
      company_id: p?.company_id, project_id: cur.project_id, drawing_id: data.id,
      old_status: cur.drawing_status, new_status: data.drawing_status,
      changed_by: context.userId, remarks: data.remarks ?? null,
    });
    return { ok: true };
  });

export const archiveDrawing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("drawings").update({ is_archived: true, drawing_status: "Archived" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const addDrawingRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    drawing_id: z.string().uuid(),
    revision: z.string().min(1).max(20),
    revision_title: z.string().optional().nullable(),
    change_summary: z.string().optional().nullable(),
    issue_purpose: z.string().optional().nullable(),
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
    const { data: drw } = await context.supabase.from("drawings").select("*").eq("id", data.drawing_id).maybeSingle();
    if (!drw) throw new Error("Drawing not found");
    const today = new Date().toISOString().slice(0, 10);
    await context.supabase.from("drawing_revisions").update({
      is_current: false, revision_status: "Superseded",
    }).eq("drawing_id", data.drawing_id).eq("is_current", true);
    const { data: rev, error } = await context.supabase.from("drawing_revisions").insert({
      company_id: p?.company_id, project_id: drw.project_id, drawing_id: data.drawing_id,
      revision: data.revision, revision_title: data.revision_title ?? null,
      change_summary: data.change_summary ?? null, revision_status: "Current", is_current: true,
      issue_purpose: data.issue_purpose ?? drw.issue_purpose, uploaded_by: context.userId,
      file_name: data.file_name, file_url: data.file_url, file_path: data.file_path,
      file_type: data.file_type, file_size: data.file_size,
      storage_bucket: data.storage_bucket, storage_path: data.storage_path,
    }).select().single();
    if (error) throw error;
    await context.supabase.from("drawings").update({
      revision: data.revision, current_revision_id: rev.id, superseded_date: today,
      file_name: data.file_name ?? drw.file_name,
      file_url: data.file_url ?? drw.file_url,
      file_path: data.file_path ?? drw.file_path,
      file_type: data.file_type ?? drw.file_type,
      file_size: data.file_size ?? drw.file_size,
      storage_bucket: data.storage_bucket ?? drw.storage_bucket,
      storage_path: data.storage_path ?? drw.storage_path,
      is_latest_revision: true,
    }).eq("id", data.drawing_id);
    return rev;
  });

export const addDrawingComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    drawing_id: z.string().uuid(),
    comment: z.string().min(1).max(4000),
    visibility: z.enum(["internal", "client_visible"]).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const p = await profile(context);
    const { data: drw } = await context.supabase.from("drawings").select("project_id").eq("id", data.drawing_id).maybeSingle();
    const { data: row, error } = await context.supabase.from("drawing_comments").insert({
      company_id: p?.company_id, project_id: drw?.project_id, drawing_id: data.drawing_id,
      user_id: context.userId, comment: data.comment, visibility: data.visibility ?? "internal",
    }).select().single();
    if (error) throw error;
    return row;
  });

export const distributeDrawing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    drawing_id: z.string().uuid(),
    revision_id: z.string().uuid().optional().nullable(),
    distributed_to_name: z.string().max(200).optional().nullable(),
    distributed_to_email: z.string().max(200).optional().nullable(),
    distribution_method: z.string().max(50).optional(),
    remarks: z.string().max(1000).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const p = await profile(context);
    const { data: drw } = await context.supabase.from("drawings").select("project_id").eq("id", data.drawing_id).maybeSingle();
    const { data: row, error } = await context.supabase.from("drawing_distribution_logs").insert({
      company_id: p?.company_id, project_id: drw?.project_id, drawing_id: data.drawing_id,
      revision_id: data.revision_id ?? null,
      distributed_to_name: data.distributed_to_name ?? null,
      distributed_to_email: data.distributed_to_email ?? null,
      distribution_method: data.distribution_method ?? "System",
      distributed_by: context.userId, remarks: data.remarks ?? null,
    }).select().single();
    if (error) throw error;
    return row;
  });

export const logDrawingAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    drawing_id: z.string().uuid(),
    action: z.string().max(50),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const p = await profile(context);
    const { data: drw } = await context.supabase.from("drawings").select("project_id").eq("id", data.drawing_id).maybeSingle();
    if (!drw) return { ok: false };
    await context.supabase.from("drawing_access_logs").insert({
      company_id: p?.company_id, project_id: drw.project_id, drawing_id: data.drawing_id,
      user_id: context.userId, action: data.action,
    });
    return { ok: true };
  });

export const drawingStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("drawings")
      .select("drawing_status, approval_status, is_confidential, is_client_visible, is_archived");
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    const list = (rows ?? []).filter((r: any) => !r.is_archived);
    const s = { total: list.length, draft: 0, submitted: 0, under_review: 0, approved: 0, issued: 0, for_construction: 0, rejected: 0, revision_requested: 0, superseded: 0, client_visible: 0, confidential: 0 };
    for (const r of list as any[]) {
      const st = r.drawing_status;
      if (st === "Draft") s.draft++;
      if (st === "Submitted") s.submitted++;
      if (st === "Under Review") s.under_review++;
      if (st === "Approved") s.approved++;
      if (st === "Issued" || st === "Active") s.issued++;
      if (st === "For Construction") s.for_construction++;
      if (st === "Rejected") s.rejected++;
      if (st === "Revision Requested") s.revision_requested++;
      if (st === "Superseded") s.superseded++;
      if (r.is_client_visible) s.client_visible++;
      if (r.is_confidential) s.confidential++;
    }
    return s;
  });

// Storage
export const getDrawingUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    filename: z.string().min(1).max(300),
    content_type: z.string().max(150).optional(),
    project_id: z.string().uuid().optional().nullable(),
    drawing_id: z.string().uuid().optional().nullable(),
    revision: z.string().max(20).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const p = await profile(context);
    if (!p?.company_id) throw new Error("Company missing");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const seg = [p.company_id, data.project_id ?? "shared", "drawings", data.drawing_id ?? "new", data.revision ?? "rev0", `${Date.now()}-${safe}`].join("/");
    const { data: signed, error } = await context.supabase.storage
      .from(STORAGE_BUCKET).createSignedUploadUrl(seg);
    if (error) throw error;
    return { path: seg, token: signed.token, signedUrl: signed.signedUrl, bucket: STORAGE_BUCKET };
  });

export const getDrawingDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1), bucket: z.string().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: signed, error } = await context.supabase.storage
      .from(data.bucket ?? STORAGE_BUCKET).createSignedUrl(data.path, 600);
    if (error) throw error;
    return { url: signed.signedUrl };
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MR_COLS =
  "id, project_id, company_id, request_number, request_title, department, site_location, " +
  "required_date, priority, status, procurement_status, delivery_status, reason, remarks, " +
  "requested_by, reviewed_by, approved_by, rejected_by, submitted_at, reviewed_at, approved_at, rejected_at, " +
  "rejection_reason, revision_notes, converted_to_rfq, converted_to_po, rfq_id, purchase_order_id, " +
  "is_client_visible, is_archived, created_by, created_at, updated_at, cost_code_id, notes, " +
  "material_name, unit, quantity";

const STATUSES = [
  "draft","submitted","under_review","approved","rejected","revision_requested",
  "procurement_processing","rfq_created","po_created","ordered","partially_delivered","delivered","closed","cancelled","archived",
] as const;

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  boq_item_id: z.string().uuid().nullable().optional(),
  cost_code_id: z.string().uuid().nullable().optional(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  item_code: z.string().max(80).nullable().optional(),
  material_name: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  specification: z.string().max(2000).nullable().optional(),
  unit: z.string().min(1).max(40).default("Nos"),
  requested_quantity: z.number().min(0).default(0),
  approved_quantity: z.number().min(0).optional(),
  ordered_quantity: z.number().min(0).optional(),
  delivered_quantity: z.number().min(0).optional(),
  estimated_rate: z.number().min(0).default(0),
  approved_rate: z.number().min(0).optional(),
  supplier_suggestion: z.string().max(300).nullable().optional(),
  required_date: z.string().nullable().optional(),
  priority: z.string().max(40).optional(),
  status: z.string().max(40).optional(),
  remarks: z.string().max(2000).nullable().optional(),
});

const mrInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  request_number: z.string().max(80).nullable().optional(),
  request_title: z.string().max(300).nullable().optional(),
  department: z.string().max(120).nullable().optional(),
  site_location: z.string().max(300).nullable().optional(),
  required_date: z.string().nullable().optional(),
  priority: z.enum(["low","normal","medium","high","urgent","critical"]).optional(),
  status: z.enum(STATUSES).optional(),
  reason: z.string().max(2000).nullable().optional(),
  remarks: z.string().max(2000).nullable().optional(),
  is_client_visible: z.boolean().optional(),
  items: z.array(itemSchema).optional(),
});

async function nextMrNumber(sb: any, projectId: string): Promise<string> {
  const { data: p } = await sb.from("projects").select("code,name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `MR-${code}-${ymd}-`;
  const { data } = await sb.from("procurement_requests").select("request_number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.request_number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function recalcItem(it: any) {
  const req = Number(it.requested_quantity ?? 0);
  const app = Number(it.approved_quantity ?? 0);
  const del = Number(it.delivered_quantity ?? 0);
  const est = +(req * Number(it.estimated_rate ?? 0)).toFixed(2);
  const approved = +(app * Number(it.approved_rate ?? 0)).toFixed(2);
  const bal = +Math.max(0, app - del).toFixed(3);
  return { ...it, estimated_amount: est, approved_amount: approved, balance_quantity: bal };
}

export const listMaterialRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid().optional(),
    status: z.string().optional(),
    includeArchived: z.boolean().optional(),
  }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("procurement_requests").select(MR_COLS).order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.status) q = q.eq("status", data.status);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getMaterialRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: mr, error } = await sb.from("procurement_requests").select(MR_COLS).eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!mr) return null;
    const [items, atts, hist] = await Promise.all([
      sb.from("material_request_items").select("*").eq("material_request_id", data.id).eq("is_archived", false).order("created_at"),
      sb.from("material_request_attachments").select("*").eq("material_request_id", data.id).order("created_at", { ascending: false }),
      sb.from("material_request_status_history").select("*").eq("material_request_id", data.id).order("created_at", { ascending: false }),
    ]);
    return { ...mr, items: items.data ?? [], attachments: atts.data ?? [], history: hist.data ?? [] };
  });

export const saveMaterialRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => mrInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { items, id, ...rest } = data;
    const { data: proj } = await sb.from("projects").select("company_id").eq("id", rest.project_id).maybeSingle();
    if (!proj) throw new Error("Project not found");

    let recordId = id;
    if (id) {
      const { error } = await sb.from("procurement_requests").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    } else {
      const request_number = rest.request_number || (await nextMrNumber(sb, rest.project_id));
      // Provide legacy NOT NULL columns sensibly
      const firstItem = items?.[0];
      const payload: any = {
        ...rest,
        request_number,
        company_id: proj.company_id,
        created_by: context.userId,
        requested_by: context.userId,
        material_name: firstItem?.material_name ?? rest.request_title ?? "Material Request",
        unit: firstItem?.unit ?? "Nos",
        quantity: Number(firstItem?.requested_quantity ?? 0),
        status: rest.status ?? "draft",
      };
      const { data: ins, error } = await sb.from("procurement_requests").insert(payload).select("id").single();
      if (error) throw error;
      recordId = ins.id;
    }

    if (items && recordId) {
      // delete missing items
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      const { data: existing } = await sb.from("material_request_items").select("id").eq("material_request_id", recordId);
      const toDelete = (existing ?? []).map((e: any) => e.id).filter((eid: string) => !keepIds.includes(eid));
      if (toDelete.length) await sb.from("material_request_items").delete().in("id", toDelete);
      for (const raw of items) {
        const it = recalcItem(raw);
        const base: any = {
          ...it,
          material_request_id: recordId,
          project_id: rest.project_id,
          company_id: proj.company_id,
          created_by: context.userId,
        };
        if (it.id) {
          await sb.from("material_request_items").update({ ...base, updated_at: new Date().toISOString() }).eq("id", it.id);
        } else {
          delete base.id;
          await sb.from("material_request_items").insert(base);
        }
      }
    }
    return { id: recordId };
  });

async function logStatus(sb: any, mrId: string, projectId: string, oldS: string | null, newS: string, userId: string, remarks?: string | null) {
  const { data: proj } = await sb.from("projects").select("company_id").eq("id", projectId).maybeSingle();
  await sb.from("material_request_status_history").insert({
    material_request_id: mrId, project_id: projectId, company_id: proj?.company_id,
    old_status: oldS, new_status: newS, changed_by: userId, remarks: remarks ?? null,
  });
}

export const setMaterialRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(STATUSES),
    rejection_reason: z.string().max(2000).optional(),
    revision_notes: z.string().max(2000).optional(),
    approvedItems: z.array(z.object({ id: z.string().uuid(), approved_quantity: z.number().min(0), approved_rate: z.number().min(0).optional() })).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: cur, error: e1 } = await sb.from("procurement_requests").select("id, status, project_id").eq("id", data.id).maybeSingle();
    if (e1) throw e1;
    if (!cur) throw new Error("Not found");
    const now = new Date().toISOString();
    const patch: any = { status: data.status, updated_at: now };
    if (data.status === "submitted") patch.submitted_at = now;
    if (data.status === "under_review") { patch.reviewed_at = now; patch.reviewed_by = context.userId; }
    if (data.status === "approved") { patch.approved_at = now; patch.approved_by = context.userId; }
    if (data.status === "rejected") {
      if (!data.rejection_reason) throw new Error("Rejection reason required");
      patch.rejected_at = now; patch.rejected_by = context.userId; patch.rejection_reason = data.rejection_reason;
    }
    if (data.status === "revision_requested") {
      if (!data.revision_notes) throw new Error("Revision notes required");
      patch.revision_notes = data.revision_notes;
    }
    const { error } = await sb.from("procurement_requests").update(patch).eq("id", data.id);
    if (error) throw error;
    if (data.status === "approved" && data.approvedItems?.length) {
      for (const ai of data.approvedItems) {
        const { data: it } = await sb.from("material_request_items").select("*").eq("id", ai.id).maybeSingle();
        if (!it) continue;
        const merged = recalcItem({ ...it, approved_quantity: ai.approved_quantity, approved_rate: ai.approved_rate ?? it.approved_rate });
        await sb.from("material_request_items").update({
          approved_quantity: merged.approved_quantity, approved_rate: merged.approved_rate,
          approved_amount: merged.approved_amount, balance_quantity: merged.balance_quantity, status: "approved",
        }).eq("id", ai.id);
      }
    }
    await logStatus(sb, data.id, cur.project_id, cur.status, data.status, context.userId, data.rejection_reason || data.revision_notes);
    return { ok: true };
  });

export const archiveMaterialRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("procurement_requests")
      .update({ is_archived: true, status: "archived", updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const updateMrItemDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    ordered_quantity: z.number().min(0).optional(),
    delivered_quantity: z.number().min(0).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: it } = await sb.from("material_request_items").select("*").eq("id", data.id).maybeSingle();
    if (!it) throw new Error("Item not found");
    const merged = recalcItem({ ...it, ordered_quantity: data.ordered_quantity ?? it.ordered_quantity, delivered_quantity: data.delivered_quantity ?? it.delivered_quantity });
    await sb.from("material_request_items").update({
      ordered_quantity: merged.ordered_quantity, delivered_quantity: merged.delivered_quantity, balance_quantity: merged.balance_quantity,
    }).eq("id", data.id);
    // refresh parent delivery_status
    const { data: items } = await sb.from("material_request_items").select("approved_quantity, delivered_quantity").eq("material_request_id", it.material_request_id);
    const totalApp = (items ?? []).reduce((s: number, r: any) => s + Number(r.approved_quantity ?? 0), 0);
    const totalDel = (items ?? []).reduce((s: number, r: any) => s + Number(r.delivered_quantity ?? 0), 0);
    let ds = "pending"; let st: string | null = null;
    if (totalDel <= 0) ds = "pending";
    else if (totalApp > 0 && totalDel >= totalApp) { ds = "delivered"; st = "delivered"; }
    else ds = "partially_delivered";
    const patch: any = { delivery_status: ds, updated_at: new Date().toISOString() };
    if (st) patch.status = st;
    await sb.from("procurement_requests").update(patch).eq("id", it.material_request_id);
    return { ok: true };
  });

export const convertMrToRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), due_date: z.string().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: mr } = await sb.from("procurement_requests").select("*").eq("id", data.id).maybeSingle();
    if (!mr) throw new Error("Not found");
    if (mr.status !== "approved" && mr.status !== "procurement_processing") throw new Error("Request must be approved");
    const ymd = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const rfq_number = `RFQ-${ymd}-${mr.request_number?.split("-").pop() ?? "001"}`;
    const { data: rfq, error } = await sb.from("rfqs").insert({
      project_id: mr.project_id, rfq_number, procurement_request_id: mr.id,
      due_date: data.due_date ?? null, status: "draft", created_by: context.userId,
      notes: `Generated from Material Request ${mr.request_number}`,
    }).select("id").single();
    if (error) throw error;
    await sb.from("procurement_requests").update({
      converted_to_rfq: true, rfq_id: rfq.id, status: "rfq_created", procurement_status: "rfq_created",
      updated_at: new Date().toISOString(),
    }).eq("id", mr.id);
    await logStatus(sb, mr.id, mr.project_id, mr.status, "rfq_created", context.userId, `RFQ ${rfq_number} created`);
    return { rfq_id: rfq.id, rfq_number };
  });

export const convertMrToPo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), supplier_id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: mr } = await sb.from("procurement_requests").select("*").eq("id", data.id).maybeSingle();
    if (!mr) throw new Error("Not found");
    if (!["approved","procurement_processing","rfq_created"].includes(mr.status)) throw new Error("Request must be approved");
    const { data: items } = await sb.from("material_request_items").select("*").eq("material_request_id", mr.id);
    const lines = (items ?? []).map((i: any) => ({
      material_name: i.material_name, description: i.description, unit: i.unit,
      quantity: Number(i.approved_quantity || i.requested_quantity || 0),
      rate: Number(i.approved_rate || i.estimated_rate || 0),
      amount: Number(i.approved_amount || i.estimated_amount || 0),
    }));
    const total = lines.reduce((s, l) => s + Number(l.amount || 0), 0);
    const ymd = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const po_number = `PO-${ymd}-${mr.request_number?.split("-").pop() ?? "001"}`;
    const { data: po, error } = await sb.from("purchase_orders").insert({
      project_id: mr.project_id, po_number, procurement_request_id: mr.id, supplier_id: data.supplier_id ?? null,
      items: lines, total_amount: total, status: "draft", created_by: context.userId,
      notes: `Generated from Material Request ${mr.request_number}`,
    }).select("id").single();
    if (error) throw error;
    await sb.from("procurement_requests").update({
      converted_to_po: true, purchase_order_id: po.id, status: "po_created", procurement_status: "po_created",
      updated_at: new Date().toISOString(),
    }).eq("id", mr.id);
    await logStatus(sb, mr.id, mr.project_id, mr.status, "po_created", context.userId, `PO ${po_number} created`);
    return { po_id: po.id, po_number };
  });

export const materialRequestStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("procurement_requests").select("id,status,procurement_status,delivery_status,required_date,is_archived,priority").eq("is_archived", false);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows = [] } = await q;
    const today = new Date().toISOString().slice(0,10);
    const by = (k: string, v: string) => rows.filter((r: any) => r[k] === v).length;
    const overdue = rows.filter((r: any) => r.required_date && r.required_date < today && !["delivered","closed","rejected","cancelled","archived"].includes(r.status)).length;
    return {
      total: rows.length,
      draft: by("status","draft"),
      pending: by("status","submitted") + by("status","under_review"),
      approved: by("status","approved"),
      rejected: by("status","rejected"),
      rfq: by("status","rfq_created"),
      po: by("status","po_created"),
      ordered: by("status","ordered"),
      partial: by("delivery_status","partially_delivered"),
      delivered: by("delivery_status","delivered"),
      overdue,
    };
  });

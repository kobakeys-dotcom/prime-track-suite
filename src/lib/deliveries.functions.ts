import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DEL_COLS =
  "id, company_id, project_id, delivery_number, delivery_title, purchase_order_id, material_request_id, " +
  "rfq_id, supplier_id, supplier_name, supplier_contact, delivery_note_number, invoice_number, " +
  "vehicle_number, driver_name, driver_phone, delivery_date, delivery_time, received_by, inspected_by, " +
  "approved_by, delivery_location, storage_location, status, inspection_status, delivery_condition, " +
  "remarks, rejection_reason, confirmed_at, inspected_at, approved_at, created_by, is_archived, " +
  "total_amount, created_at, updated_at, notes";

const STATUSES = [
  "draft","received","inspected","accepted","partially_accepted","rejected",
  "partially_rejected","approved","closed","cancelled","archived",
] as const;

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  purchase_order_item_id: z.string().uuid().nullable().optional(),
  material_request_item_id: z.string().uuid().nullable().optional(),
  material_id: z.string().uuid().nullable().optional(),
  boq_item_id: z.string().uuid().nullable().optional(),
  cost_code_id: z.string().uuid().nullable().optional(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  item_code: z.string().max(80).nullable().optional(),
  item_name: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  specification: z.string().max(2000).nullable().optional(),
  unit: z.string().min(1).max(40).default("Nos"),
  ordered_quantity: z.number().min(0).default(0),
  previously_delivered_quantity: z.number().min(0).default(0),
  delivered_quantity: z.number().min(0).default(0),
  accepted_quantity: z.number().min(0).default(0),
  rejected_quantity: z.number().min(0).default(0),
  damaged_quantity: z.number().min(0).default(0),
  unit_rate: z.number().min(0).default(0),
  batch_number: z.string().max(120).nullable().optional(),
  serial_number: z.string().max(120).nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  condition: z.string().max(40).default("good"),
  inspection_result: z.string().max(40).default("pending"),
  storage_location: z.string().max(200).nullable().optional(),
  remarks: z.string().max(2000).nullable().optional(),
});

const delInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  delivery_number: z.string().max(80).nullable().optional(),
  delivery_title: z.string().max(300).nullable().optional(),
  purchase_order_id: z.string().uuid().nullable().optional(),
  material_request_id: z.string().uuid().nullable().optional(),
  rfq_id: z.string().uuid().nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  supplier_name: z.string().max(300).nullable().optional(),
  supplier_contact: z.string().max(300).nullable().optional(),
  delivery_note_number: z.string().max(120).nullable().optional(),
  invoice_number: z.string().max(120).nullable().optional(),
  vehicle_number: z.string().max(80).nullable().optional(),
  driver_name: z.string().max(120).nullable().optional(),
  driver_phone: z.string().max(60).nullable().optional(),
  delivery_date: z.string(),
  delivery_time: z.string().nullable().optional(),
  received_by: z.string().uuid().nullable().optional(),
  delivery_location: z.string().max(300).nullable().optional(),
  storage_location: z.string().max(300).nullable().optional(),
  delivery_condition: z.string().max(40).optional(),
  inspection_status: z.string().max(40).optional(),
  status: z.enum(STATUSES).optional(),
  remarks: z.string().max(2000).nullable().optional(),
  items: z.array(itemSchema).optional(),
});

function recalcItem(it: any) {
  const ord = Number(it.ordered_quantity ?? 0);
  const prev = Number(it.previously_delivered_quantity ?? 0);
  const acc = Number(it.accepted_quantity ?? 0);
  const rate = Number(it.unit_rate ?? 0);
  const delivered_amount = +(acc * rate).toFixed(2);
  const balance_quantity = +Math.max(0, ord - prev - acc).toFixed(3);
  return { ...it, delivered_amount, balance_quantity };
}

async function nextDeliveryNumber(sb: any, projectId: string): Promise<string> {
  const { data: p } = await sb.from("projects").select("code,name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `DLV-${code}-${ymd}-`;
  const { data } = await sb.from("deliveries").select("delivery_number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.delivery_number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function logStatus(sb: any, deliveryId: string, projectId: string, companyId: string, oldS: string | null, newS: string, userId: string, remarks?: string | null) {
  await sb.from("delivery_status_history").insert({
    delivery_id: deliveryId, project_id: projectId, company_id: companyId,
    old_status: oldS, new_status: newS, changed_by: userId, remarks: remarks ?? null,
  });
}

async function rollupPo(sb: any, poId: string) {
  const { data: items } = await sb.from("purchase_order_items").select("id, ordered_quantity").eq("purchase_order_id", poId);
  if (!items?.length) return;
  // Sum accepted from delivery_items per po_item
  const ids = items.map((i: any) => i.id);
  const { data: del } = await sb.from("delivery_items")
    .select("purchase_order_item_id, accepted_quantity")
    .in("purchase_order_item_id", ids);
  const sum = new Map<string, number>();
  for (const d of del ?? []) {
    sum.set(d.purchase_order_item_id, (sum.get(d.purchase_order_item_id) ?? 0) + Number(d.accepted_quantity ?? 0));
  }
  let totalOrd = 0, totalDel = 0;
  for (const it of items) {
    const ord = Number(it.ordered_quantity ?? 0);
    const del = sum.get(it.id) ?? 0;
    const balance = +Math.max(0, ord - del).toFixed(3);
    let st = "pending";
    if (del > 0 && del < ord) st = "partially_delivered";
    else if (ord > 0 && del >= ord) st = "delivered";
    await sb.from("purchase_order_items").update({
      delivered_quantity: del, received_quantity: del,
      balance_quantity: balance, delivery_status: st,
    }).eq("id", it.id);
    totalOrd += ord; totalDel += del;
  }
  let st = "pending";
  if (totalDel > 0 && totalDel < totalOrd) st = "partially_delivered";
  else if (totalOrd > 0 && totalDel >= totalOrd) st = "delivered";
  const patch: any = { delivery_status: st };
  if (st === "delivered") patch.status = "delivered";
  else if (st === "partially_delivered") patch.status = "partially_delivered";
  await sb.from("purchase_orders").update(patch).eq("id", poId);
}

async function rollupMr(sb: any, mrId: string) {
  const { data: items } = await sb.from("material_request_items").select("id, approved_quantity, requested_quantity").eq("material_request_id", mrId);
  if (!items?.length) return;
  const ids = items.map((i: any) => i.id);
  const { data: del } = await sb.from("delivery_items")
    .select("material_request_item_id, accepted_quantity")
    .in("material_request_item_id", ids);
  const sum = new Map<string, number>();
  for (const d of del ?? []) {
    sum.set(d.material_request_item_id, (sum.get(d.material_request_item_id) ?? 0) + Number(d.accepted_quantity ?? 0));
  }
  let totalApp = 0, totalDel = 0;
  for (const it of items) {
    const app = Number(it.approved_quantity ?? it.requested_quantity ?? 0);
    const del = sum.get(it.id) ?? 0;
    const balance = +Math.max(0, app - del).toFixed(3);
    await sb.from("material_request_items").update({ delivered_quantity: del, balance_quantity: balance }).eq("id", it.id);
    totalApp += app; totalDel += del;
  }
  let ds = "pending";
  if (totalDel <= 0) ds = "pending";
  else if (totalApp > 0 && totalDel >= totalApp) ds = "delivered";
  else ds = "partially_delivered";
  await sb.from("procurement_requests").update({ delivery_status: ds }).eq("id", mrId);
}

export const listDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid().optional(),
    status: z.string().optional(),
    includeArchived: z.boolean().optional(),
  }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("deliveries").select(DEL_COLS).order("delivery_date", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getDelivery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: del, error } = await sb.from("deliveries").select(DEL_COLS).eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!del) return null;
    const [items, atts, hist] = await Promise.all([
      sb.from("delivery_items").select("*").eq("delivery_id", data.id).eq("is_archived", false).order("created_at"),
      sb.from("delivery_attachments").select("*").eq("delivery_id", data.id).order("created_at", { ascending: false }),
      sb.from("delivery_status_history").select("*").eq("delivery_id", data.id).order("created_at", { ascending: false }),
    ]);
    return { ...(del as any), items: items.data ?? [], attachments: atts.data ?? [], history: hist.data ?? [] };
  });

export const saveDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => delInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { items, id, ...rest } = data;
    const { data: proj } = await sb.from("projects").select("company_id").eq("id", rest.project_id).maybeSingle();
    if (!proj) throw new Error("Project not found");
    const companyId = proj.company_id;

    const total = (items ?? []).reduce((s, it) => s + Number(it.accepted_quantity ?? 0) * Number(it.unit_rate ?? 0), 0);

    let recordId: string | undefined = id;
    if (id) {
      const { error } = await sb.from("deliveries").update({
        ...(rest as any), total_amount: +total.toFixed(2), updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    } else {
      const delivery_number = rest.delivery_number || (await nextDeliveryNumber(sb, rest.project_id));
      const payload: any = {
        ...rest,
        delivery_number,
        company_id: companyId,
        created_by: context.userId,
        received_by: rest.received_by ?? context.userId,
        status: rest.status ?? "draft",
        inspection_status: rest.inspection_status ?? "pending",
        delivery_condition: rest.delivery_condition ?? "good",
        delivered_quantity: (items ?? []).reduce((s, it) => s + Number(it.delivered_quantity ?? 0), 0),
        total_amount: +total.toFixed(2),
      };
      const { data: ins, error } = await sb.from("deliveries").insert(payload).select("id").single();
      if (error) throw error;
      recordId = ins.id;
    }

    if (items && recordId) {
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);
      const { data: existing } = await sb.from("delivery_items").select("id").eq("delivery_id", recordId);
      const toDelete = (existing ?? []).map((e: any) => e.id).filter((eid: string) => !keepIds.includes(eid));
      if (toDelete.length) await sb.from("delivery_items").delete().in("id", toDelete);
      for (const raw of items) {
        const it = recalcItem(raw);
        const base: any = {
          ...it,
          delivery_id: recordId,
          project_id: rest.project_id,
          company_id: companyId,
          created_by: context.userId,
        };
        if (it.id) {
          await sb.from("delivery_items").update({ ...base, updated_at: new Date().toISOString() }).eq("id", it.id);
        } else {
          delete base.id;
          await sb.from("delivery_items").insert(base);
        }
      }
    }
    return { id: recordId };
  });

export const setDeliveryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(STATUSES),
    rejection_reason: z.string().max(2000).optional(),
    remarks: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: cur } = await sb.from("deliveries").select("id, status, project_id, company_id, purchase_order_id, material_request_id").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Not found");
    const now = new Date().toISOString();
    const patch: any = { status: data.status, updated_at: now };
    if (data.status === "received") { patch.confirmed_at = now; }
    if (data.status === "inspected") { patch.inspected_at = now; patch.inspected_by = context.userId; }
    if (data.status === "accepted" || data.status === "partially_accepted") {
      patch.confirmed_at = patch.confirmed_at ?? now;
    }
    if (data.status === "approved") { patch.approved_at = now; patch.approved_by = context.userId; }
    if (data.status === "rejected" || data.status === "partially_rejected") {
      if (!data.rejection_reason) throw new Error("Rejection reason required");
      patch.rejection_reason = data.rejection_reason;
    }
    const { error } = await sb.from("deliveries").update(patch).eq("id", data.id);
    if (error) throw error;

    // Roll up to PO/MR when accepted-class statuses
    if (["accepted","partially_accepted","approved","received","closed"].includes(data.status)) {
      if (cur.purchase_order_id) await rollupPo(sb, cur.purchase_order_id);
      if (cur.material_request_id) await rollupMr(sb, cur.material_request_id);

      // Stock movements (one row per item with accepted_qty > 0) - idempotency by reference
      const { data: dItems } = await sb.from("delivery_items").select("*").eq("delivery_id", data.id);
      const { data: existingMv } = await sb.from("stock_movements").select("id").eq("delivery_id", data.id);
      if (!existingMv?.length) {
        for (const it of dItems ?? []) {
          if (Number(it.accepted_quantity ?? 0) > 0) {
            await sb.from("stock_movements").insert({
              company_id: cur.company_id, project_id: cur.project_id, material_id: it.material_id ?? null,
              delivery_id: data.id, movement_type: "IN", quantity: Number(it.accepted_quantity),
              unit: it.unit, reference_number: it.item_code ?? null,
              remarks: `Delivery ${data.id} - ${it.item_name}`, created_by: context.userId,
            });
          }
        }
      }
    }

    await logStatus(sb, data.id, cur.project_id, cur.company_id, cur.status, data.status, context.userId, data.rejection_reason || data.remarks);
    return { ok: true };
  });

export const archiveDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("deliveries")
      .update({ is_archived: true, status: "archived", updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const inspectDeliveryItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    delivery_id: z.string().uuid(),
    items: z.array(z.object({
      id: z.string().uuid(),
      accepted_quantity: z.number().min(0),
      rejected_quantity: z.number().min(0).default(0),
      damaged_quantity: z.number().min(0).default(0),
      inspection_result: z.string().max(40).optional(),
      condition: z.string().max(40).optional(),
      remarks: z.string().max(2000).nullable().optional(),
    })),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    for (const it of data.items) {
      const { data: row } = await sb.from("delivery_items").select("*").eq("id", it.id).maybeSingle();
      if (!row) continue;
      const merged = recalcItem({ ...row, ...it });
      await sb.from("delivery_items").update({
        accepted_quantity: merged.accepted_quantity,
        rejected_quantity: merged.rejected_quantity,
        damaged_quantity: merged.damaged_quantity,
        delivered_amount: merged.delivered_amount,
        balance_quantity: merged.balance_quantity,
        inspection_result: merged.inspection_result ?? row.inspection_result,
        condition: merged.condition ?? row.condition,
        remarks: it.remarks ?? row.remarks,
        updated_at: new Date().toISOString(),
      }).eq("id", it.id);
    }
    const { data: items } = await sb.from("delivery_items").select("delivered_quantity, accepted_quantity, rejected_quantity, damaged_quantity, inspection_result").eq("delivery_id", data.delivery_id);
    const totDel = (items ?? []).reduce((s: number, r: any) => s + Number(r.delivered_quantity ?? 0), 0);
    const totAcc = (items ?? []).reduce((s: number, r: any) => s + Number(r.accepted_quantity ?? 0), 0);
    const totRej = (items ?? []).reduce((s: number, r: any) => s + Number(r.rejected_quantity ?? 0) + Number(r.damaged_quantity ?? 0), 0);
    let insp = "pending";
    if (totDel > 0 && totRej === 0) insp = "passed";
    else if (totAcc > 0 && totRej > 0) insp = "partially_passed";
    else if (totDel > 0 && totAcc === 0 && totRej > 0) insp = "failed";
    await sb.from("deliveries").update({
      inspection_status: insp, inspected_at: new Date().toISOString(),
      inspected_by: context.userId, updated_at: new Date().toISOString(),
    }).eq("id", data.delivery_id);
    return { ok: true, inspection_status: insp };
  });

export const addDeliveryAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    delivery_id: z.string().uuid(),
    file_name: z.string().min(1).max(300),
    file_url: z.string().url().max(2000),
    file_type: z.string().max(80).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    attachment_type: z.string().max(80).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: del } = await sb.from("deliveries").select("project_id, company_id").eq("id", data.delivery_id).maybeSingle();
    if (!del) throw new Error("Not found");
    const { error } = await sb.from("delivery_attachments").insert({
      ...data, project_id: del.project_id, company_id: del.company_id, uploaded_by: context.userId,
      attachment_type: data.attachment_type ?? "Delivery Document",
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteDeliveryAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("delivery_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const createDeliveryFromPo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ purchase_order_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: po } = await sb.from("purchase_orders").select("*").eq("id", data.purchase_order_id).maybeSingle();
    if (!po) throw new Error("Purchase order not found");
    if (!["approved","issued","partially_delivered"].includes(po.status)) {
      throw new Error("Only approved/issued POs can generate deliveries");
    }
    const { data: poItems } = await sb.from("purchase_order_items").select("*").eq("purchase_order_id", po.id);
    const { data: proj } = await sb.from("projects").select("company_id").eq("id", po.project_id).maybeSingle();
    if (!proj) throw new Error("Project not found");

    const delivery_number = await nextDeliveryNumber(sb, po.project_id);
    const { data: ins, error } = await sb.from("deliveries").insert({
      project_id: po.project_id, company_id: proj.company_id, delivery_number,
      purchase_order_id: po.id, supplier_id: po.supplier_id ?? null, supplier_name: po.supplier_name ?? null,
      delivery_date: new Date().toISOString().slice(0,10),
      delivery_location: po.delivery_location ?? null,
      status: "draft", inspection_status: "pending", delivery_condition: "good",
      received_by: context.userId, created_by: context.userId,
    }).select("id").single();
    if (error) throw error;

    const rows = (poItems ?? []).map((i: any) => {
      const ord = Number(i.ordered_quantity ?? 0);
      const prev = Number(i.delivered_quantity ?? 0);
      const remaining = Math.max(0, ord - prev);
      return {
        delivery_id: ins.id, company_id: proj.company_id, project_id: po.project_id,
        purchase_order_item_id: i.id, material_id: i.material_id ?? null, boq_item_id: i.boq_item_id ?? null,
        cost_code_id: i.cost_code_id ?? null, item_code: i.item_code ?? null,
        item_name: i.item_name ?? i.material_name ?? "Item", description: i.description ?? null,
        specification: i.specification ?? null, unit: i.unit ?? "Nos",
        ordered_quantity: ord, previously_delivered_quantity: prev,
        delivered_quantity: remaining, accepted_quantity: remaining,
        rejected_quantity: 0, damaged_quantity: 0,
        balance_quantity: 0, unit_rate: Number(i.unit_rate ?? i.rate ?? 0),
        delivered_amount: +(remaining * Number(i.unit_rate ?? i.rate ?? 0)).toFixed(2),
        condition: "good", inspection_result: "pending", created_by: context.userId,
      };
    });
    if (rows.length) await sb.from("delivery_items").insert(rows);
    return { id: ins.id, delivery_number };
  });

export const deliveryStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("deliveries")
      .select("id,status,inspection_status,delivery_condition,delivery_date,total_amount,is_archived")
      .eq("is_archived", false);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rowsD } = await q;
    const rows: any[] = rowsD ?? [];
    const by = (k: string, v: string) => rows.filter((r) => r[k] === v).length;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    return {
      total: rows.length,
      draft: by("status", "draft"),
      received: by("status", "received"),
      pending_inspection: rows.filter((r) => r.inspection_status === "pending" && r.status !== "draft" && r.status !== "archived").length,
      accepted: by("status", "accepted"),
      partially_accepted: by("status", "partially_accepted"),
      rejected: by("status", "rejected") + by("status", "partially_rejected"),
      approved: by("status", "approved"),
      this_week: rows.filter((r) => r.delivery_date && r.delivery_date >= weekAgo).length,
      damaged: rows.filter((r) => ["damaged","partially_damaged"].includes(r.delivery_condition)).length,
      value: +rows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0).toFixed(2),
    };
  });

export const listSuppliersLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("suppliers").select("id, name, contact_person, phone, email").order("name");
    return data ?? [];
  });

export const listPosForDelivery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("purchase_orders")
      .select("id, po_number, project_id, supplier_id, supplier_name, status, delivery_status, total_amount")
      .in("status", ["approved","issued","partially_delivered"])
      .order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    return rows ?? [];
  });

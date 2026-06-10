import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  material_request_item_id: z.string().uuid().nullable().optional(),
  rfq_item_id: z.string().uuid().nullable().optional(),
  supplier_quotation_item_id: z.string().uuid().nullable().optional(),
  boq_item_id: z.string().uuid().nullable().optional(),
  cost_code_id: z.string().uuid().nullable().optional(),
  budget_line_id: z.string().uuid().nullable().optional(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  item_code: z.string().max(80).nullable().optional(),
  item_name: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  specification: z.string().max(2000).nullable().optional(),
  unit: z.string().min(1).max(40).default("Nos"),
  ordered_quantity: z.number().min(0).default(0),
  delivered_quantity: z.number().min(0).default(0),
  received_quantity: z.number().min(0).default(0),
  unit_rate: z.number().min(0).default(0),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  remarks: z.string().max(2000).nullable().optional(),
});

const poInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  po_number: z.string().max(80).nullable().optional(),
  po_title: z.string().max(300).nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  supplier_name: z.string().max(300).nullable().optional(),
  supplier_email: z.string().max(300).nullable().optional(),
  supplier_phone: z.string().max(80).nullable().optional(),
  contact_person: z.string().max(200).nullable().optional(),
  material_request_id: z.string().uuid().nullable().optional(),
  rfq_id: z.string().uuid().nullable().optional(),
  supplier_quotation_id: z.string().uuid().nullable().optional(),
  po_date: z.string().nullable().optional(),
  required_delivery_date: z.string().nullable().optional(),
  expected_delivery_date: z.string().nullable().optional(),
  delivery_location: z.string().max(300).nullable().optional(),
  currency: z.string().max(10).optional(),
  discount_amount: z.number().min(0).default(0),
  tax_percentage: z.number().min(0).max(100).default(0),
  shipping_amount: z.number().min(0).default(0),
  other_charges: z.number().min(0).default(0),
  payment_terms: z.string().max(500).nullable().optional(),
  delivery_terms: z.string().max(500).nullable().optional(),
  warranty_terms: z.string().max(500).nullable().optional(),
  terms_and_conditions: z.string().max(8000).nullable().optional(),
  priority: z.string().max(40).optional(),
  remarks: z.string().max(4000).nullable().optional(),
  items: z.array(itemSchema).optional(),
});

async function nextPoNumber(sb: any, projectId: string): Promise<string> {
  const { data: p } = await sb.from("projects").select("code,name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `PO-${code}-${ymd}-`;
  const { data } = await sb.from("purchase_orders").select("po_number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.po_number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function calcItem(it: any) {
  const qty = Number(it.ordered_quantity ?? 0);
  const rate = Number(it.unit_rate ?? 0);
  const disc = Number(it.discount_amount ?? 0);
  const tax = Number(it.tax_amount ?? 0);
  const amount = +(qty * rate).toFixed(2);
  const total_amount = +(amount - disc + tax).toFixed(2);
  const delivered = Number(it.delivered_quantity ?? 0);
  const balance_quantity = +Math.max(0, qty - delivered).toFixed(3);
  let delivery_status = "pending";
  if (delivered > 0 && delivered < qty) delivery_status = "partially_delivered";
  else if (qty > 0 && delivered >= qty) delivery_status = "delivered";
  return { ...it, amount, total_amount, balance_quantity, delivery_status };
}

function rollupTotals(items: any[], head: any) {
  const subtotal = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);
  const itemTax = items.reduce((s, it) => s + Number(it.tax_amount ?? 0), 0);
  const headerTax = +(subtotal * Number(head.tax_percentage ?? 0) / 100).toFixed(2);
  const tax_amount = +Math.max(itemTax, headerTax).toFixed(2);
  const total = +(subtotal - Number(head.discount_amount ?? 0) + tax_amount + Number(head.shipping_amount ?? 0) + Number(head.other_charges ?? 0)).toFixed(2);
  return {
    subtotal_amount: +subtotal.toFixed(2),
    tax_amount,
    total_amount: total,
  };
}

export const listPurchaseOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid().optional(),
    status: z.string().optional(),
    includeArchived: z.boolean().optional(),
  }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("purchase_orders").select("*").order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.status) q = q.eq("status", data.status);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getPurchaseOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const [{ data: po }, { data: items }, { data: attachments }, { data: history }, { data: deliveries }] = await Promise.all([
      sb.from("purchase_orders").select("*").eq("id", data.id).maybeSingle(),
      sb.from("purchase_order_items").select("*").eq("purchase_order_id", data.id).eq("is_archived", false).order("created_at"),
      sb.from("purchase_order_attachments").select("*").eq("purchase_order_id", data.id).order("created_at", { ascending: false }),
      sb.from("purchase_order_status_history").select("*").eq("purchase_order_id", data.id).order("created_at", { ascending: false }),
      sb.from("deliveries").select("*").eq("purchase_order_id", data.id).order("created_at", { ascending: false }),
    ]);
    return {
      po, items: items ?? [], attachments: attachments ?? [],
      history: history ?? [], deliveries: deliveries ?? [],
    };
  });

export const savePurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => poInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const userId = context.userId;
    const { data: prof } = await sb.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    const companyId = prof?.company_id;
    if (!companyId) throw new Error("No company");

    const items = (data.items ?? []).map(calcItem);
    const totals = rollupTotals(items, data);

    const head: any = {
      project_id: data.project_id,
      company_id: companyId,
      po_number: data.po_number?.trim() || await nextPoNumber(sb, data.project_id),
      po_title: data.po_title ?? null,
      supplier_id: data.supplier_id ?? null,
      supplier_name: data.supplier_name ?? null,
      supplier_email: data.supplier_email ?? null,
      supplier_phone: data.supplier_phone ?? null,
      contact_person: data.contact_person ?? null,
      material_request_id: data.material_request_id ?? null,
      rfq_id: data.rfq_id ?? null,
      supplier_quotation_id: data.supplier_quotation_id ?? null,
      po_date: data.po_date || new Date().toISOString().slice(0, 10),
      required_delivery_date: data.required_delivery_date || null,
      expected_delivery_date: data.expected_delivery_date || null,
      delivery_location: data.delivery_location ?? null,
      currency: data.currency || "MVR",
      discount_amount: Number(data.discount_amount ?? 0),
      tax_percentage: Number(data.tax_percentage ?? 0),
      shipping_amount: Number(data.shipping_amount ?? 0),
      other_charges: Number(data.other_charges ?? 0),
      subtotal_amount: totals.subtotal_amount,
      tax_amount: totals.tax_amount,
      total_amount: totals.total_amount,
      outstanding_amount: +(totals.total_amount).toFixed(2),
      payment_terms: data.payment_terms ?? null,
      delivery_terms: data.delivery_terms ?? null,
      warranty_terms: data.warranty_terms ?? null,
      terms_and_conditions: data.terms_and_conditions ?? null,
      priority: data.priority || "medium",
      remarks: data.remarks ?? null,
      items: items.map((it: any) => ({
        item_name: it.item_name, description: it.description, unit: it.unit,
        quantity: it.ordered_quantity, rate: it.unit_rate, amount: it.amount,
      })),
    };

    let poId = data.id;
    if (poId) {
      const { error } = await sb.from("purchase_orders").update(head).eq("id", poId);
      if (error) throw error;
    } else {
      head.created_by = userId;
      head.prepared_by = userId;
      head.status = "draft";
      head.approval_status = "not_submitted";
      head.delivery_status = "pending";
      head.payment_status = "unpaid";
      const { data: ins, error } = await sb.from("purchase_orders").insert(head).select("id").maybeSingle();
      if (error) throw error;
      poId = ins!.id;
    }

    // items: simple delete + re-insert
    await sb.from("purchase_order_items").delete().eq("purchase_order_id", poId);
    if (items.length) {
      const rows = items.map((it: any) => ({
        company_id: companyId,
        project_id: data.project_id,
        purchase_order_id: poId,
        material_request_item_id: it.material_request_item_id ?? null,
        rfq_item_id: it.rfq_item_id ?? null,
        supplier_quotation_item_id: it.supplier_quotation_item_id ?? null,
        boq_item_id: it.boq_item_id ?? null,
        cost_code_id: it.cost_code_id ?? null,
        budget_line_id: it.budget_line_id ?? null,
        wbs_id: it.wbs_id ?? null,
        task_id: it.task_id ?? null,
        item_code: it.item_code ?? null,
        item_name: it.item_name,
        description: it.description ?? null,
        specification: it.specification ?? null,
        unit: it.unit || "Nos",
        ordered_quantity: Number(it.ordered_quantity ?? 0),
        delivered_quantity: Number(it.delivered_quantity ?? 0),
        received_quantity: Number(it.received_quantity ?? 0),
        balance_quantity: it.balance_quantity,
        unit_rate: Number(it.unit_rate ?? 0),
        amount: it.amount,
        discount_amount: Number(it.discount_amount ?? 0),
        tax_amount: Number(it.tax_amount ?? 0),
        total_amount: it.total_amount,
        delivery_status: it.delivery_status,
        remarks: it.remarks ?? null,
        created_by: userId,
      }));
      const { error } = await sb.from("purchase_order_items").insert(rows);
      if (error) throw error;
    }
    return { id: poId };
  });

export const setPurchaseOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.string(),
    remarks: z.string().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: cur } = await sb.from("purchase_orders").select("*").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("PO not found");
    const now = new Date().toISOString();
    const patch: any = { status: data.status };

    if (data.status === "submitted") {
      patch.approval_status = "submitted";
      patch.submitted_at = now;
      patch.submitted_by = context.userId;
    } else if (data.status === "approved") {
      patch.approval_status = "approved";
      patch.approved_at = now;
      patch.approved_by = context.userId;
    } else if (data.status === "rejected") {
      patch.approval_status = "rejected";
      patch.rejection_reason = data.remarks ?? null;
    } else if (data.status === "revision_requested") {
      patch.approval_status = "revision_requested";
      patch.revision_notes = data.remarks ?? null;
    } else if (data.status === "issued") {
      patch.issued_at = now;
      patch.issued_by = context.userId;
    } else if (data.status === "closed") {
      patch.closed_at = now;
    }
    const { error } = await sb.from("purchase_orders").update(patch).eq("id", data.id);
    if (error) throw error;
    await sb.from("purchase_order_status_history").insert({
      company_id: cur.company_id as string, project_id: cur.project_id, purchase_order_id: data.id,
      old_status: cur.status, new_status: data.status, changed_by: context.userId, remarks: data.remarks ?? null,
    });
    return { ok: true };
  });

export const archivePurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("purchase_orders")
      .update({ is_archived: true, status: "archived" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const updatePoDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    purchase_order_id: z.string().uuid(),
    items: z.array(z.object({
      id: z.string().uuid(),
      delivered_quantity: z.number().min(0),
      received_quantity: z.number().min(0).optional(),
      remarks: z.string().nullable().optional(),
    })),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    for (const it of data.items) {
      const { data: row } = await sb.from("purchase_order_items").select("*").eq("id", it.id).maybeSingle();
      if (!row) continue;
      const qty = Number(row.ordered_quantity ?? 0);
      const del = Number(it.delivered_quantity);
      const recv = it.received_quantity != null ? Number(it.received_quantity) : del;
      const balance = +Math.max(0, qty - del).toFixed(3);
      let st = "pending";
      if (del > 0 && del < qty) st = "partially_delivered";
      else if (qty > 0 && del >= qty) st = "delivered";
      await sb.from("purchase_order_items").update({
        delivered_quantity: del, received_quantity: recv,
        balance_quantity: balance, delivery_status: st,
        remarks: it.remarks ?? row.remarks,
      }).eq("id", it.id);
    }
    // rollup PO delivery status
    const { data: items } = await sb.from("purchase_order_items").select("ordered_quantity,delivered_quantity")
      .eq("purchase_order_id", data.purchase_order_id);
    const rows = items ?? [];
    const totalOrd = rows.reduce((s: number, r: any) => s + Number(r.ordered_quantity ?? 0), 0);
    const totalDel = rows.reduce((s: number, r: any) => s + Number(r.delivered_quantity ?? 0), 0);
    let st = "pending";
    if (totalDel > 0 && totalDel < totalOrd) st = "partially_delivered";
    else if (totalOrd > 0 && totalDel >= totalOrd) st = "delivered";
    const patch: any = { delivery_status: st };
    if (st === "delivered") patch.status = "delivered";
    else if (st === "partially_delivered") patch.status = "partially_delivered";
    await sb.from("purchase_orders").update(patch).eq("id", data.purchase_order_id);
    return { ok: true, delivery_status: st };
  });

export const updatePoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    invoiced_amount: z.number().min(0).optional(),
    paid_amount: z.number().min(0).optional(),
    payment_reference: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: cur } = await sb.from("purchase_orders").select("total_amount,invoiced_amount,paid_amount").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("PO not found");
    const inv = data.invoiced_amount != null ? Number(data.invoiced_amount) : Number(cur.invoiced_amount ?? 0);
    const paid = data.paid_amount != null ? Number(data.paid_amount) : Number(cur.paid_amount ?? 0);
    const total = Number(cur.total_amount ?? 0);
    const outstanding = +(total - paid).toFixed(2);
    let ps = "unpaid";
    if (paid > 0 && paid < total) ps = "partially_paid";
    else if (total > 0 && paid >= total) ps = "paid";
    const { error } = await sb.from("purchase_orders").update({
      invoiced_amount: inv, paid_amount: paid, outstanding_amount: outstanding,
      payment_status: ps, payment_reference: data.payment_reference ?? null,
    }).eq("id", data.id);
    if (error) throw error;
    return { ok: true, payment_status: ps, outstanding_amount: outstanding };
  });

export const createPoFromRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rfq_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: rfq } = await sb.from("rfqs").select("*").eq("id", data.rfq_id).maybeSingle();
    if (!rfq) throw new Error("RFQ not found");
    if (!rfq.selected_quotation_id) throw new Error("No selected quotation");
    const { data: q } = await sb.from("supplier_quotations").select("*").eq("id", rfq.selected_quotation_id).maybeSingle();
    const { data: qItems } = await sb.from("supplier_quotation_items").select("*").eq("supplier_quotation_id", rfq.selected_quotation_id);
    const { data: sup } = rfq.selected_supplier_id ? await sb.from("suppliers").select("*").eq("id", rfq.selected_supplier_id).maybeSingle() : { data: null };
    const userId = context.userId;
    const items = (qItems ?? []).map((it: any) => calcItem({
      rfq_item_id: it.rfq_item_id, supplier_quotation_item_id: it.id,
      item_name: it.item_name, description: it.description, unit: it.unit || "Nos",
      ordered_quantity: Number(it.quantity ?? 0), unit_rate: Number(it.quoted_rate ?? 0),
    }));
    const totals = rollupTotals(items, { discount_amount: Number(q?.discount_amount ?? 0), tax_percentage: 0, shipping_amount: 0, other_charges: 0 });
    const totalsWithTax = { ...totals, tax_amount: Number(q?.tax_amount ?? 0), total_amount: +(totals.subtotal_amount - Number(q?.discount_amount ?? 0) + Number(q?.tax_amount ?? 0)).toFixed(2) };
    const poNumber = await nextPoNumber(sb, rfq.project_id);
    const { data: po, error } = await sb.from("purchase_orders").insert({
      company_id: rfq.company_id as string, project_id: rfq.project_id,
      po_number: poNumber, po_title: rfq.rfq_title,
      supplier_id: rfq.selected_supplier_id,
      supplier_name: sup?.name ?? null, supplier_email: sup?.email ?? null,
      supplier_phone: sup?.phone ?? null, contact_person: sup?.contact_person ?? null,
      rfq_id: rfq.id, supplier_quotation_id: rfq.selected_quotation_id,
      material_request_id: rfq.material_request_id,
      po_date: new Date().toISOString().slice(0, 10),
      required_delivery_date: rfq.required_delivery_date,
      currency: rfq.currency || "MVR",
      payment_terms: q?.payment_terms, warranty_terms: q?.warranty_terms,
      delivery_location: rfq.delivery_location, terms_and_conditions: rfq.terms_and_conditions,
      discount_amount: Number(q?.discount_amount ?? 0),
      subtotal_amount: totalsWithTax.subtotal_amount,
      tax_amount: totalsWithTax.tax_amount,
      total_amount: totalsWithTax.total_amount,
      outstanding_amount: totalsWithTax.total_amount,
      status: "draft", approval_status: "not_submitted",
      delivery_status: "pending", payment_status: "unpaid",
      created_by: userId, prepared_by: userId,
      items: items.map((it: any) => ({ item_name: it.item_name, unit: it.unit, quantity: it.ordered_quantity, rate: it.unit_rate, amount: it.amount })),
      notes: `Generated from RFQ ${rfq.rfq_number}`,
    }).select("id").maybeSingle();
    if (error) throw error;
    if (items.length) {
      await sb.from("purchase_order_items").insert(items.map((it: any) => ({
        company_id: rfq.company_id as string, project_id: rfq.project_id, purchase_order_id: po!.id,
        rfq_item_id: it.rfq_item_id, supplier_quotation_item_id: it.supplier_quotation_item_id,
        item_name: it.item_name, description: it.description, unit: it.unit,
        ordered_quantity: it.ordered_quantity, unit_rate: it.unit_rate,
        amount: it.amount, total_amount: it.total_amount,
        balance_quantity: it.balance_quantity, delivery_status: "pending",
        created_by: userId,
      })));
    }
    await sb.from("rfqs").update({
      converted_to_po: true, purchase_order_id: po!.id,
      status: "converted_to_po", award_status: "converted_to_po",
    }).eq("id", rfq.id);
    return { po_id: po!.id, po_number: poNumber };
  });

export const createPoFromMaterialRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    material_request_id: z.string().uuid(),
    supplier_id: z.string().uuid().nullable().optional(),
    supplier_name: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: mr } = await sb.from("procurement_requests").select("*").eq("id", data.material_request_id).maybeSingle();
    if (!mr) throw new Error("Material Request not found");
    const { data: mrItems } = await sb.from("material_request_items").select("*").eq("material_request_id", data.material_request_id).eq("is_archived", false);
    const userId = context.userId;
    const items = (mrItems ?? []).map((it: any) => calcItem({
      material_request_item_id: it.id, boq_item_id: it.boq_item_id, cost_code_id: it.cost_code_id,
      wbs_id: it.wbs_id, task_id: it.task_id,
      item_name: it.material_name, description: it.description, specification: it.specification,
      unit: it.unit || "Nos",
      ordered_quantity: Number(it.approved_quantity ?? it.requested_quantity ?? 0),
      unit_rate: Number(it.approved_rate ?? it.estimated_rate ?? 0),
    }));
    const totals = rollupTotals(items, { discount_amount: 0, tax_percentage: 0, shipping_amount: 0, other_charges: 0 });
    const poNumber = await nextPoNumber(sb, mr.project_id);
    const { data: po, error } = await sb.from("purchase_orders").insert({
      company_id: mr.company_id as string, project_id: mr.project_id,
      po_number: poNumber, po_title: mr.request_title,
      supplier_id: data.supplier_id ?? null,
      supplier_name: data.supplier_name ?? null,
      material_request_id: mr.id,
      po_date: new Date().toISOString().slice(0, 10),
      required_delivery_date: mr.required_date,
      currency: "MVR",
      subtotal_amount: totals.subtotal_amount, tax_amount: totals.tax_amount, total_amount: totals.total_amount,
      outstanding_amount: totals.total_amount,
      status: "draft", approval_status: "not_submitted",
      delivery_status: "pending", payment_status: "unpaid",
      created_by: userId, prepared_by: userId,
      items: items.map((it: any) => ({ item_name: it.item_name, unit: it.unit, quantity: it.ordered_quantity, rate: it.unit_rate, amount: it.amount })),
      notes: `Generated from Material Request ${mr.request_number}`,
    }).select("id").maybeSingle();
    if (error) throw error;
    if (items.length) {
      await sb.from("purchase_order_items").insert(items.map((it: any) => ({
        company_id: mr.company_id as string, project_id: mr.project_id, purchase_order_id: po!.id,
        material_request_item_id: it.material_request_item_id, boq_item_id: it.boq_item_id,
        cost_code_id: it.cost_code_id, wbs_id: it.wbs_id, task_id: it.task_id,
        item_name: it.item_name, description: it.description, specification: it.specification,
        unit: it.unit, ordered_quantity: it.ordered_quantity, unit_rate: it.unit_rate,
        amount: it.amount, total_amount: it.total_amount, balance_quantity: it.balance_quantity,
        delivery_status: "pending", created_by: userId,
      })));
    }
    await sb.from("procurement_requests").update({
      converted_to_po: true, purchase_order_id: po!.id, status: "po_created",
    }).eq("id", mr.id);
    return { po_id: po!.id, po_number: poNumber };
  });

export const addPoAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    purchase_order_id: z.string().uuid(),
    file_name: z.string().min(1).max(300),
    file_url: z.string().url().max(1000),
    file_type: z.string().max(100).nullable().optional(),
    attachment_type: z.string().max(60).optional(),
    description: z.string().max(1000).nullable().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: po } = await sb.from("purchase_orders").select("company_id,project_id").eq("id", data.purchase_order_id).maybeSingle();
    if (!po) throw new Error("PO not found");
    const { error } = await sb.from("purchase_order_attachments").insert({
      company_id: po.company_id as string, project_id: po.project_id,
      purchase_order_id: data.purchase_order_id,
      uploaded_by: context.userId,
      file_name: data.file_name, file_url: data.file_url,
      file_type: data.file_type ?? null, description: data.description ?? null,
      attachment_type: data.attachment_type ?? "po_document",
    });
    if (error) throw error;
    return { ok: true };
  });

export const deletePoAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("purchase_order_attachments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listSuppliersForPo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("suppliers").select("id,name,email,phone,contact_person").order("name");
    if (error) throw error;
    return data ?? [];
  });

export const listMaterialRequestsForPo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: mrs } = await context.supabase.from("procurement_requests")
      .select("id,request_number,request_title,status,converted_to_po")
      .eq("project_id", data.projectId).eq("is_archived", false)
      .in("status", ["approved", "procurement_processing", "rfq_created"])
      .order("created_at", { ascending: false });
    return mrs ?? [];
  });

export const listRfqsForPo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows } = await context.supabase.from("rfqs")
      .select("id,rfq_number,rfq_title,status,award_status,converted_to_po,selected_quotation_id")
      .eq("project_id", data.projectId).eq("is_archived", false)
      .in("award_status", ["recommended", "approved"])
      .order("created_at", { ascending: false });
    return rows ?? [];
  });

export const poStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("purchase_orders")
      .select("status,approval_status,delivery_status,payment_status,total_amount,paid_amount,outstanding_amount,required_delivery_date")
      .eq("is_archived", false);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    const r = rows ?? [];
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: r.length,
      draft: r.filter((x: any) => x.status === "draft").length,
      pending_approval: r.filter((x: any) => x.approval_status === "submitted").length,
      approved: r.filter((x: any) => x.approval_status === "approved").length,
      issued: r.filter((x: any) => x.status === "issued").length,
      partial: r.filter((x: any) => x.delivery_status === "partially_delivered").length,
      delivered: r.filter((x: any) => x.delivery_status === "delivered").length,
      unpaid: r.filter((x: any) => x.payment_status === "unpaid").length,
      partial_paid: r.filter((x: any) => x.payment_status === "partially_paid").length,
      paid: r.filter((x: any) => x.payment_status === "paid").length,
      overdue_delivery: r.filter((x: any) =>
        x.required_delivery_date && x.required_delivery_date < today &&
        !["delivered", "closed", "cancelled"].includes(x.delivery_status)
      ).length,
      total_value: r.reduce((s: number, x: any) => s + Number(x.total_amount ?? 0), 0),
      paid_value: r.reduce((s: number, x: any) => s + Number(x.paid_amount ?? 0), 0),
      outstanding_value: r.reduce((s: number, x: any) => s + Number(x.outstanding_amount ?? 0), 0),
    };
  });

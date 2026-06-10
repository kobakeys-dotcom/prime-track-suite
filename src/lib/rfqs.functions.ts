import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RFQ_COLS = "*";

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  material_request_item_id: z.string().uuid().nullable().optional(),
  boq_item_id: z.string().uuid().nullable().optional(),
  cost_code_id: z.string().uuid().nullable().optional(),
  wbs_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  item_code: z.string().max(80).nullable().optional(),
  item_name: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  specification: z.string().max(2000).nullable().optional(),
  unit: z.string().min(1).max(40).default("Nos"),
  quantity: z.number().min(0).default(0),
  estimated_rate: z.number().min(0).default(0),
  required_delivery_date: z.string().nullable().optional(),
  remarks: z.string().max(2000).nullable().optional(),
});

const supplierSchema = z.object({
  id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  supplier_name: z.string().max(300).nullable().optional(),
  supplier_email: z.string().max(300).nullable().optional(),
  supplier_phone: z.string().max(80).nullable().optional(),
  contact_person: z.string().max(200).nullable().optional(),
  remarks: z.string().max(1000).nullable().optional(),
});

const rfqInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  material_request_id: z.string().uuid().nullable().optional(),
  rfq_number: z.string().max(80).nullable().optional(),
  rfq_title: z.string().min(1).max(300),
  description: z.string().max(4000).nullable().optional(),
  quotation_deadline: z.string().nullable().optional(),
  required_delivery_date: z.string().nullable().optional(),
  delivery_location: z.string().max(300).nullable().optional(),
  priority: z.string().max(40).optional(),
  currency: z.string().max(10).optional(),
  terms_and_conditions: z.string().max(8000).nullable().optional(),
  remarks: z.string().max(4000).nullable().optional(),
  items: z.array(itemSchema).optional(),
  suppliers: z.array(supplierSchema).optional(),
});

async function nextRfqNumber(sb: any, projectId: string): Promise<string> {
  const { data: p } = await sb.from("projects").select("code,name").eq("id", projectId).maybeSingle();
  const code = (p?.code || p?.name || "PRJ").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ";
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `RFQ-${code}-${ymd}-`;
  const { data } = await sb.from("rfqs").select("rfq_number").eq("project_id", projectId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.rfq_number ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export const listRfqs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid().optional(),
    status: z.string().optional(),
    includeArchived: z.boolean().optional(),
  }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("rfqs").select(RFQ_COLS).order("created_at", { ascending: false });
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.status) q = q.eq("status", data.status);
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getRfq = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const [{ data: rfq, error: e1 }, { data: items, error: e2 }, { data: suppliers, error: e3 }, { data: quotations, error: e4 }, { data: qItems, error: e5 }, { data: attachments }, { data: history }] = await Promise.all([
      sb.from("rfqs").select("*").eq("id", data.id).maybeSingle(),
      sb.from("rfq_items").select("*").eq("rfq_id", data.id).eq("is_archived", false).order("created_at"),
      sb.from("rfq_suppliers").select("*").eq("rfq_id", data.id).order("created_at"),
      sb.from("supplier_quotations").select("*").eq("rfq_id", data.id).eq("is_archived", false).order("created_at"),
      sb.from("supplier_quotation_items").select("*").eq("project_id", "00000000-0000-0000-0000-000000000000"),
      sb.from("rfq_attachments").select("*").eq("rfq_id", data.id).order("created_at", { ascending: false }),
      sb.from("rfq_status_history").select("*").eq("rfq_id", data.id).order("created_at", { ascending: false }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;
    if (e4) throw e4;
    // fetch quotation items for all quotations
    let allQItems: any[] = [];
    if ((quotations ?? []).length) {
      const qIds = (quotations ?? []).map((q: any) => q.id);
      const { data: rows } = await sb.from("supplier_quotation_items").select("*").in("supplier_quotation_id", qIds);
      allQItems = rows ?? [];
    }
    return {
      rfq, items: items ?? [], suppliers: suppliers ?? [],
      quotations: quotations ?? [], quotationItems: allQItems,
      attachments: attachments ?? [], history: history ?? [],
    };
  });

export const saveRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rfqInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const userId = context.userId;
    const { data: prof } = await sb.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    const companyId = prof?.company_id;
    if (!companyId) throw new Error("No company");

    let rfqId = data.id;
    const rfqNumber = data.rfq_number?.trim() || await nextRfqNumber(sb, data.project_id);
    const head: any = {
      project_id: data.project_id,
      company_id: companyId,
      material_request_id: data.material_request_id ?? null,
      rfq_number: rfqNumber,
      rfq_title: data.rfq_title,
      description: data.description ?? null,
      quotation_deadline: data.quotation_deadline || null,
      required_delivery_date: data.required_delivery_date || null,
      delivery_location: data.delivery_location ?? null,
      priority: data.priority || "medium",
      currency: data.currency || "MVR",
      terms_and_conditions: data.terms_and_conditions ?? null,
      remarks: data.remarks ?? null,
    };

    if (rfqId) {
      const { error } = await sb.from("rfqs").update(head).eq("id", rfqId);
      if (error) throw error;
    } else {
      head.created_by = userId;
      head.prepared_by = userId;
      head.requested_by = userId;
      head.status = "draft";
      head.award_status = "not_awarded";
      const { data: ins, error } = await sb.from("rfqs").insert(head).select("id").maybeSingle();
      if (error) throw error;
      rfqId = ins!.id;
    }

    // Items: delete then re-insert (simple)
    if (data.items) {
      await sb.from("rfq_items").delete().eq("rfq_id", rfqId);
      const rows = data.items.map((it) => ({
        company_id: companyId,
        project_id: data.project_id,
        rfq_id: rfqId,
        material_request_item_id: it.material_request_item_id ?? null,
        boq_item_id: it.boq_item_id ?? null,
        cost_code_id: it.cost_code_id ?? null,
        wbs_id: it.wbs_id ?? null,
        task_id: it.task_id ?? null,
        item_code: it.item_code ?? null,
        item_name: it.item_name,
        description: it.description ?? null,
        specification: it.specification ?? null,
        unit: it.unit || "Nos",
        quantity: Number(it.quantity ?? 0),
        estimated_rate: Number(it.estimated_rate ?? 0),
        estimated_amount: +(Number(it.quantity ?? 0) * Number(it.estimated_rate ?? 0)).toFixed(2),
        required_delivery_date: it.required_delivery_date || null,
        remarks: it.remarks ?? null,
        created_by: userId,
      }));
      if (rows.length) {
        const { error } = await sb.from("rfq_items").insert(rows);
        if (error) throw error;
      }
    }

    // Suppliers
    if (data.suppliers) {
      // delete suppliers that have no quotations linked
      const { data: existing } = await sb.from("rfq_suppliers").select("id").eq("rfq_id", rfqId);
      const existingIds = (existing ?? []).map((r: any) => r.id);
      const keepIds = data.suppliers.filter((s) => s.id).map((s) => s.id!);
      const toDelete = existingIds.filter((id) => !keepIds.includes(id));
      if (toDelete.length) await sb.from("rfq_suppliers").delete().in("id", toDelete);
      for (const s of data.suppliers) {
        const row: any = {
          company_id: companyId,
          project_id: data.project_id,
          rfq_id: rfqId,
          supplier_id: s.supplier_id ?? null,
          supplier_name: s.supplier_name ?? null,
          supplier_email: s.supplier_email ?? null,
          supplier_phone: s.supplier_phone ?? null,
          contact_person: s.contact_person ?? null,
          remarks: s.remarks ?? null,
        };
        if (s.id) {
          await sb.from("rfq_suppliers").update(row).eq("id", s.id);
        } else {
          await sb.from("rfq_suppliers").insert(row);
        }
      }
    }

    return { id: rfqId };
  });

export const setRfqStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.string(),
    remarks: z.string().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: cur } = await sb.from("rfqs").select("*").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("RFQ not found");
    const patch: any = { status: data.status };
    const now = new Date().toISOString();
    if (data.status === "issued") {
      patch.issued_at = now;
      patch.issued_by = context.userId;
      // mark all suppliers invited
      await sb.from("rfq_suppliers").update({ invitation_status: "invited", invited_at: now }).eq("rfq_id", data.id);
    }
    if (data.status === "award_approved") {
      patch.approved_at = now;
      patch.approved_by = context.userId;
      patch.award_status = "approved";
    }
    if (data.status === "rejected") {
      patch.rejected_at = now;
      patch.rejection_reason = data.remarks ?? null;
      patch.award_status = "rejected";
    }
    const { error } = await sb.from("rfqs").update(patch).eq("id", data.id);
    if (error) throw error;
    await sb.from("rfq_status_history").insert({
      company_id: cur.company_id, project_id: cur.project_id, rfq_id: data.id,
      old_status: cur.status, new_status: data.status, changed_by: context.userId, remarks: data.remarks ?? null,
    });
    return { ok: true };
  });

export const archiveRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("rfqs").update({ is_archived: true, status: "archived" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Supplier quotation
const quotationItemSchema = z.object({
  id: z.string().uuid().optional(),
  rfq_item_id: z.string().uuid().nullable().optional(),
  item_name: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  unit: z.string().max(40).nullable().optional(),
  quantity: z.number().min(0).default(0),
  quoted_rate: z.number().min(0).default(0),
  remarks: z.string().max(1000).nullable().optional(),
});
const quotationInput = z.object({
  id: z.string().uuid().optional(),
  rfq_id: z.string().uuid(),
  rfq_supplier_id: z.string().uuid(),
  supplier_id: z.string().uuid().nullable().optional(),
  quotation_number: z.string().max(80).nullable().optional(),
  quotation_date: z.string().nullable().optional(),
  quotation_valid_until: z.string().nullable().optional(),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  currency: z.string().max(10).optional(),
  delivery_days: z.number().int().nullable().optional(),
  payment_terms: z.string().max(500).nullable().optional(),
  warranty_terms: z.string().max(500).nullable().optional(),
  evaluation_score: z.number().min(0).default(0),
  evaluation_notes: z.string().max(2000).nullable().optional(),
  items: z.array(quotationItemSchema).optional(),
});

export const saveSupplierQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => quotationInput.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: rfq } = await sb.from("rfqs").select("company_id,project_id").eq("id", data.rfq_id).maybeSingle();
    if (!rfq) throw new Error("RFQ not found");
    const items = data.items ?? [];
    const total = items.reduce((s, it) => s + Number(it.quantity ?? 0) * Number(it.quoted_rate ?? 0), 0);
    const net = total - Number(data.discount_amount ?? 0) + Number(data.tax_amount ?? 0);
    const head: any = {
      company_id: rfq.company_id,
      project_id: rfq.project_id,
      rfq_id: data.rfq_id,
      rfq_supplier_id: data.rfq_supplier_id,
      supplier_id: data.supplier_id ?? null,
      quotation_number: data.quotation_number ?? null,
      quotation_date: data.quotation_date || null,
      quotation_valid_until: data.quotation_valid_until || null,
      total_amount: +total.toFixed(2),
      discount_amount: Number(data.discount_amount ?? 0),
      tax_amount: Number(data.tax_amount ?? 0),
      net_amount: +net.toFixed(2),
      currency: data.currency || "MVR",
      delivery_days: data.delivery_days ?? null,
      payment_terms: data.payment_terms ?? null,
      warranty_terms: data.warranty_terms ?? null,
      evaluation_score: Number(data.evaluation_score ?? 0),
      evaluation_notes: data.evaluation_notes ?? null,
      status: "received",
    };
    let qId = data.id;
    if (qId) {
      const { error } = await sb.from("supplier_quotations").update(head).eq("id", qId);
      if (error) throw error;
    } else {
      head.created_by = context.userId;
      const { data: ins, error } = await sb.from("supplier_quotations").insert(head).select("id").maybeSingle();
      if (error) throw error;
      qId = ins!.id;
    }

    await sb.from("supplier_quotation_items").delete().eq("supplier_quotation_id", qId!);
    if (items.length && rfq.company_id) {
      const rows = items.map((it) => ({
        company_id: rfq.company_id as string, project_id: rfq.project_id,
        supplier_quotation_id: qId as string, rfq_item_id: it.rfq_item_id ?? null,
        item_name: it.item_name, description: it.description ?? null,
        unit: it.unit ?? null, quantity: Number(it.quantity ?? 0),
        quoted_rate: Number(it.quoted_rate ?? 0),
        quoted_amount: +(Number(it.quantity ?? 0) * Number(it.quoted_rate ?? 0)).toFixed(2),
        remarks: it.remarks ?? null,
      }));
      const { error } = await sb.from("supplier_quotation_items").insert(rows);
      if (error) throw error;
    }

    // update rfq_supplier totals + status
    await sb.from("rfq_suppliers").update({
      total_quoted_amount: +net.toFixed(2),
      quotation_status: "received",
      responded_at: new Date().toISOString(),
      currency: data.currency || "MVR",
      delivery_days: data.delivery_days ?? null,
      payment_terms: data.payment_terms ?? null,
    }).eq("id", data.rfq_supplier_id);

    // bump rfq status from issued -> quotation_received
    await sb.from("rfqs").update({ status: "quotation_received" })
      .eq("id", data.rfq_id).in("status", ["issued", "draft"]);

    return { id: qId };
  });

export const deleteSupplierQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: q } = await sb.from("supplier_quotations").select("rfq_supplier_id").eq("id", data.id).maybeSingle();
    const { error } = await sb.from("supplier_quotations").update({ is_archived: true }).eq("id", data.id);
    if (error) throw error;
    if (q?.rfq_supplier_id) {
      await sb.from("rfq_suppliers").update({ quotation_status: "not_received", total_quoted_amount: 0 }).eq("id", q.rfq_supplier_id);
    }
    return { ok: true };
  });

export const selectSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    rfq_id: z.string().uuid(),
    rfq_supplier_id: z.string().uuid(),
    quotation_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: q } = await sb.from("supplier_quotations").select("*").eq("id", data.quotation_id).maybeSingle();
    if (!q) throw new Error("Quotation not found");
    await sb.from("rfq_suppliers").update({ is_selected: false, is_recommended: false }).eq("rfq_id", data.rfq_id);
    await sb.from("rfq_suppliers").update({ is_selected: true, is_recommended: true }).eq("id", data.rfq_supplier_id);
    await sb.from("supplier_quotations").update({ is_selected: false }).eq("rfq_id", data.rfq_id);
    await sb.from("supplier_quotations").update({ is_selected: true }).eq("id", data.quotation_id);
    await sb.from("rfqs").update({
      selected_supplier_id: q.supplier_id,
      selected_quotation_id: data.quotation_id,
      selected_amount: q.net_amount,
      recommended_supplier_id: q.supplier_id,
      status: "supplier_selected",
      award_status: "recommended",
    }).eq("id", data.rfq_id);
    return { ok: true };
  });

export const convertRfqToPo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: rfq } = await sb.from("rfqs").select("*").eq("id", data.id).maybeSingle();
    if (!rfq) throw new Error("RFQ not found");
    if (rfq.award_status !== "approved") throw new Error("Award not approved");
    if (!rfq.selected_quotation_id) throw new Error("No selected quotation");
    const { data: qItems } = await sb.from("supplier_quotation_items").select("*").eq("supplier_quotation_id", rfq.selected_quotation_id);
    const itemsJson = (qItems ?? []).map((it: any) => ({
      item_name: it.item_name, description: it.description, unit: it.unit,
      quantity: Number(it.quantity), rate: Number(it.quoted_rate), amount: Number(it.quoted_amount),
    }));
    const { data: existing } = await sb.from("purchase_orders").select("po_number").eq("project_id", rfq.project_id);
    const seq = ((existing ?? []).length + 1).toString().padStart(3, "0");
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const poNumber = `PO-${ymd}-${seq}`;
    const { data: po, error } = await sb.from("purchase_orders").insert({
      project_id: rfq.project_id,
      po_number: poNumber,
      supplier_id: rfq.selected_supplier_id,
      items: itemsJson,
      total_amount: Number(rfq.selected_amount ?? 0),
      currency: rfq.currency ?? "MVR",
      delivery_date: rfq.required_delivery_date,
      status: "draft",
      notes: `Generated from RFQ ${rfq.rfq_number}`,
      created_by: context.userId,
    }).select("id").maybeSingle();
    if (error) throw error;
    await sb.from("rfqs").update({
      converted_to_po: true,
      purchase_order_id: po!.id,
      status: "converted_to_po",
      award_status: "converted_to_po",
    }).eq("id", data.id);
    return { po_id: po!.id, po_number: poNumber };
  });

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("suppliers").select("id,name,email,phone,contact_person").order("name");
    if (error) throw error;
    return data ?? [];
  });

export const listMaterialRequestsForRfq = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: mrs } = await context.supabase.from("procurement_requests")
      .select("id,request_number,request_title,status").eq("project_id", data.projectId)
      .eq("is_archived", false).in("status", ["approved", "procurement_processing"]).order("created_at", { ascending: false });
    return mrs ?? [];
  });

export const rfqStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("rfqs").select("status,award_status,quotation_deadline,selected_amount,converted_to_po").eq("is_archived", false);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows } = await q;
    const today = new Date().toISOString().slice(0, 10);
    const r = rows ?? [];
    return {
      total: r.length,
      draft: r.filter((x: any) => x.status === "draft").length,
      issued: r.filter((x: any) => x.status === "issued").length,
      received: r.filter((x: any) => x.status === "quotation_received").length,
      under_eval: r.filter((x: any) => x.status === "under_evaluation").length,
      approved: r.filter((x: any) => x.award_status === "approved").length,
      converted: r.filter((x: any) => x.converted_to_po).length,
      expired: r.filter((x: any) => x.quotation_deadline && x.quotation_deadline < today && !["converted_to_po","closed","supplier_selected","award_approved"].includes(x.status)).length,
      selected_value: r.reduce((s: number, x: any) => s + Number(x.selected_amount ?? 0), 0),
    };
  });

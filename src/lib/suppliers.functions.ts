import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SUP_COLS =
  "id, company_id, supplier_code, supplier_name, name, legal_name, supplier_type, category, trade, discipline, " +
  "country, city, address, email, phone, website, tax_number, registration_number, " +
  "contact_person, contact_designation, contact_email, contact_phone, " +
  "payment_terms, delivery_terms, currency, credit_limit, rating, " +
  "performance_score, quality_score, delivery_score, price_score, response_score, " +
  "is_prequalified, is_preferred, is_blacklisted, blacklist_reason, status, remarks, notes, " +
  "is_archived, created_by, created_at, updated_at";

const supplierInput = z.object({
  id: z.string().uuid().optional(),
  supplier_code: z.string().max(80).nullable().optional(),
  supplier_name: z.string().min(1).max(300),
  legal_name: z.string().max(300).nullable().optional(),
  supplier_type: z.string().max(80).optional(),
  category: z.string().max(120).optional(),
  trade: z.string().max(120).nullable().optional(),
  discipline: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
  email: z.string().max(200).nullable().optional().or(z.literal("")),
  phone: z.string().max(80).nullable().optional(),
  website: z.string().max(300).nullable().optional(),
  tax_number: z.string().max(120).nullable().optional(),
  registration_number: z.string().max(120).nullable().optional(),
  contact_person: z.string().max(200).nullable().optional(),
  contact_designation: z.string().max(200).nullable().optional(),
  contact_email: z.string().max(200).nullable().optional(),
  contact_phone: z.string().max(80).nullable().optional(),
  payment_terms: z.string().max(500).nullable().optional(),
  delivery_terms: z.string().max(500).nullable().optional(),
  currency: z.string().max(10).optional(),
  credit_limit: z.number().min(0).optional(),
  status: z.string().max(40).optional(),
  remarks: z.string().max(4000).nullable().optional(),
});

async function nextSupplierCode(sb: any, companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SUP-${year}-`;
  const { data } = await sb.from("suppliers").select("supplier_code").eq("company_id", companyId);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const raw = String(r.supplier_code ?? "");
    if (!raw.startsWith(prefix)) return m;
    const n = parseInt(raw.split("-").pop() ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { includeArchived?: boolean } = {}) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("suppliers").select(SUP_COLS).order("created_at", { ascending: false });
    if (!data.includeArchived) q = q.eq("is_archived", false);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { suppliers: rows ?? [] };
  });

export const getSupplier = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [s, contacts, docs, reviews, atts, comments, history, pos, rfqs, deliveries] = await Promise.all([
      supabase.from("suppliers").select(SUP_COLS).eq("id", data.id).maybeSingle(),
      supabase.from("supplier_contacts").select("*").eq("supplier_id", data.id).eq("is_archived", false).order("is_primary", { ascending: false }),
      supabase.from("supplier_documents").select("*").eq("supplier_id", data.id).eq("is_archived", false).order("created_at", { ascending: false }),
      supabase.from("supplier_performance_reviews").select("*").eq("supplier_id", data.id).order("review_date", { ascending: false }),
      supabase.from("supplier_attachments").select("*").eq("supplier_id", data.id).order("created_at", { ascending: false }),
      supabase.from("supplier_comments").select("*").eq("supplier_id", data.id).order("created_at", { ascending: false }),
      supabase.from("supplier_status_history").select("*").eq("supplier_id", data.id).order("created_at", { ascending: false }),
      supabase.from("purchase_orders").select("id, po_number, po_title, status, total_amount, currency, po_date, project_id").eq("supplier_id", data.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("rfq_suppliers").select("id, rfq_id, invitation_status, quotation_status, total_quoted_amount, currency, invited_at, project_id").eq("supplier_id", data.id).order("invited_at", { ascending: false }).limit(50),
      supabase.from("deliveries").select("id, delivery_date, status, total_amount, project_id, purchase_order_id").eq("supplier_id", data.id).order("delivery_date", { ascending: false }).limit(50),
    ]);
    if (s.error) throw new Error(s.error.message);
    return {
      supplier: s.data,
      contacts: contacts.data ?? [],
      documents: docs.data ?? [],
      reviews: reviews.data ?? [],
      attachments: atts.data ?? [],
      comments: comments.data ?? [],
      history: history.data ?? [],
      purchase_orders: pos.data ?? [],
      rfqs: rfqs.data ?? [],
      deliveries: deliveries.data ?? [],
    };
  });

export const saveSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => supplierInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const companyId = (claims as any)?.company_id || (await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle()).data?.company_id;
    if (!companyId) throw new Error("No company");
    const isUpdate = !!data.id;
    let oldStatus: string | null = null;
    if (isUpdate) {
      const { data: cur } = await supabase.from("suppliers").select("status").eq("id", data.id!).maybeSingle();
      oldStatus = cur?.status ?? null;
    }
    const code = data.supplier_code?.trim() || (isUpdate ? undefined : await nextSupplierCode(supabase, companyId));
    const payload: any = {
      company_id: companyId,
      supplier_code: code,
      supplier_name: data.supplier_name,
      name: data.supplier_name,
      legal_name: data.legal_name ?? null,
      supplier_type: data.supplier_type ?? "Material Supplier",
      category: data.category ?? "General",
      trade: data.trade ?? null,
      discipline: data.discipline ?? null,
      country: data.country ?? null,
      city: data.city ?? null,
      address: data.address ?? null,
      email: data.email || null,
      phone: data.phone ?? null,
      website: data.website ?? null,
      tax_number: data.tax_number ?? null,
      registration_number: data.registration_number ?? null,
      contact_person: data.contact_person ?? null,
      contact_designation: data.contact_designation ?? null,
      contact_email: data.contact_email ?? null,
      contact_phone: data.contact_phone ?? null,
      payment_terms: data.payment_terms ?? null,
      delivery_terms: data.delivery_terms ?? null,
      currency: data.currency ?? "MVR",
      credit_limit: data.credit_limit ?? 0,
      status: data.status ?? "Active",
      remarks: data.remarks ?? null,
    };
    let row: any;
    if (isUpdate) {
      const { data: u, error } = await supabase.from("suppliers").update(payload).eq("id", data.id!).select(SUP_COLS).maybeSingle();
      if (error) throw new Error(error.message);
      row = u;
    } else {
      payload.created_by = userId;
      const { data: c, error } = await supabase.from("suppliers").insert(payload).select(SUP_COLS).maybeSingle();
      if (error) throw new Error(error.message);
      row = c;
    }
    if (isUpdate && oldStatus && oldStatus !== row.status) {
      await supabase.from("supplier_status_history").insert({
        company_id: companyId, supplier_id: row.id, old_status: oldStatus, new_status: row.status, changed_by: userId,
      });
    }
    return { supplier: row };
  });

export const archiveSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; archive?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("suppliers").update({ is_archived: data.archive !== false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setSupplierFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    is_preferred?: boolean;
    is_prequalified?: boolean;
    is_blacklisted?: boolean;
    blacklist_reason?: string | null;
    status?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const companyId = (claims as any)?.company_id || (await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle()).data?.company_id;
    const { data: cur } = await supabase.from("suppliers").select("status").eq("id", data.id).maybeSingle();
    const oldStatus = cur?.status ?? null;
    const payload: any = {};
    if (data.is_preferred !== undefined) payload.is_preferred = data.is_preferred;
    if (data.is_prequalified !== undefined) payload.is_prequalified = data.is_prequalified;
    if (data.is_blacklisted !== undefined) {
      payload.is_blacklisted = data.is_blacklisted;
      payload.blacklist_reason = data.is_blacklisted ? (data.blacklist_reason || "") : null;
      payload.status = data.is_blacklisted ? "Blacklisted" : "Active";
    }
    if (data.status) payload.status = data.status;
    const { data: row, error } = await supabase.from("suppliers").update(payload).eq("id", data.id).select(SUP_COLS).maybeSingle();
    if (error) throw new Error(error.message);
    if (row && oldStatus && row.status && oldStatus !== row.status) {
      await supabase.from("supplier_status_history").insert({
        company_id: companyId, supplier_id: data.id, old_status: oldStatus, new_status: row.status, changed_by: userId,
      });
    }
    return { supplier: row };
  });

// Contacts
const contactInput = z.object({
  id: z.string().uuid().optional(),
  supplier_id: z.string().uuid(),
  contact_name: z.string().min(1).max(200),
  designation: z.string().max(200).nullable().optional(),
  department: z.string().max(200).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  phone: z.string().max(80).nullable().optional(),
  mobile: z.string().max(80).nullable().optional(),
  is_primary: z.boolean().optional(),
  remarks: z.string().max(2000).nullable().optional(),
});

export const saveSupplierContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contactInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const companyId = (claims as any)?.company_id || (await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle()).data?.company_id;
    if (data.is_primary) {
      await supabase.from("supplier_contacts").update({ is_primary: false }).eq("supplier_id", data.supplier_id);
    }
    const payload: any = {
      company_id: companyId,
      supplier_id: data.supplier_id,
      contact_name: data.contact_name,
      designation: data.designation ?? null,
      department: data.department ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      mobile: data.mobile ?? null,
      is_primary: !!data.is_primary,
      remarks: data.remarks ?? null,
    };
    if (data.id) {
      const { data: r, error } = await supabase.from("supplier_contacts").update(payload).eq("id", data.id).select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return { contact: r };
    }
    payload.created_by = userId;
    const { data: r, error } = await supabase.from("supplier_contacts").insert(payload).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    return { contact: r };
  });

export const deleteSupplierContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("supplier_contacts").update({ is_archived: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Documents
const docInput = z.object({
  id: z.string().uuid().optional(),
  supplier_id: z.string().uuid(),
  document_name: z.string().min(1).max(300),
  document_type: z.string().max(80).optional(),
  document_number: z.string().max(120).nullable().optional(),
  issue_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  file_name: z.string().max(300).nullable().optional(),
  file_url: z.string().max(2000).nullable().optional(),
  file_type: z.string().max(80).nullable().optional(),
  status: z.string().max(40).optional(),
  remarks: z.string().max(2000).nullable().optional(),
});

function docStatus(expiry?: string | null) {
  if (!expiry) return "Valid";
  const d = new Date(expiry).getTime();
  const now = Date.now();
  if (d < now) return "Expired";
  if (d - now < 30 * 24 * 60 * 60 * 1000) return "Expiring Soon";
  return "Valid";
}

export const saveSupplierDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => docInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const companyId = (claims as any)?.company_id || (await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle()).data?.company_id;
    if (data.issue_date && data.expiry_date && new Date(data.expiry_date) < new Date(data.issue_date)) {
      throw new Error("Expiry date cannot be before issue date");
    }
    const payload: any = {
      company_id: companyId,
      supplier_id: data.supplier_id,
      document_name: data.document_name,
      document_type: data.document_type ?? "General",
      document_number: data.document_number ?? null,
      issue_date: data.issue_date || null,
      expiry_date: data.expiry_date || null,
      file_name: data.file_name ?? null,
      file_url: data.file_url ?? null,
      file_type: data.file_type ?? null,
      status: data.status ?? docStatus(data.expiry_date),
      remarks: data.remarks ?? null,
    };
    if (data.id) {
      const { data: r, error } = await supabase.from("supplier_documents").update(payload).eq("id", data.id).select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return { document: r };
    }
    payload.uploaded_by = userId;
    const { data: r, error } = await supabase.from("supplier_documents").insert(payload).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    return { document: r };
  });

export const deleteSupplierDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("supplier_documents").update({ is_archived: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Performance reviews
const reviewInput = z.object({
  supplier_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  review_date: z.string().optional(),
  quality_score: z.number().min(0).max(5).default(0),
  delivery_score: z.number().min(0).max(5).default(0),
  price_score: z.number().min(0).max(5).default(0),
  response_score: z.number().min(0).max(5).default(0),
  comments: z.string().max(4000).nullable().optional(),
  recommendation: z.string().max(500).nullable().optional(),
});

export const addSupplierReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const companyId = (claims as any)?.company_id || (await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle()).data?.company_id;
    const overall = +((data.quality_score + data.delivery_score + data.price_score + data.response_score) / 4).toFixed(2);
    const { data: row, error } = await supabase.from("supplier_performance_reviews").insert({
      company_id: companyId,
      supplier_id: data.supplier_id,
      project_id: data.project_id || null,
      review_date: data.review_date || new Date().toISOString().slice(0, 10),
      reviewed_by: userId,
      quality_score: data.quality_score,
      delivery_score: data.delivery_score,
      price_score: data.price_score,
      response_score: data.response_score,
      overall_score: overall,
      comments: data.comments ?? null,
      recommendation: data.recommendation ?? null,
    }).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    // Recompute average
    const { data: all } = await supabase.from("supplier_performance_reviews").select("quality_score, delivery_score, price_score, response_score, overall_score").eq("supplier_id", data.supplier_id);
    const list = all ?? [];
    const avg = (k: string) => list.length ? +(list.reduce((s: number, r: any) => s + Number(r[k] ?? 0), 0) / list.length).toFixed(2) : 0;
    await supabase.from("suppliers").update({
      quality_score: avg("quality_score"),
      delivery_score: avg("delivery_score"),
      price_score: avg("price_score"),
      response_score: avg("response_score"),
      performance_score: avg("overall_score"),
      rating: Math.round(avg("overall_score") * 10) / 10,
    }).eq("id", data.supplier_id);
    return { review: row };
  });

// Attachments
export const addSupplierAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    supplier_id: string;
    file_name?: string | null;
    file_url: string;
    file_type?: string | null;
    description?: string | null;
    attachment_type?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const companyId = (claims as any)?.company_id || (await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle()).data?.company_id;
    const { data: r, error } = await supabase.from("supplier_attachments").insert({
      company_id: companyId,
      supplier_id: data.supplier_id,
      uploaded_by: userId,
      file_name: data.file_name ?? null,
      file_url: data.file_url,
      file_type: data.file_type ?? null,
      description: data.description ?? null,
      attachment_type: data.attachment_type ?? "Supplier File",
    }).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    return { attachment: r };
  });

export const deleteSupplierAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("supplier_attachments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Comments
export const addSupplierComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { supplier_id: string; comment: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const companyId = (claims as any)?.company_id || (await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle()).data?.company_id;
    const { data: r, error } = await supabase.from("supplier_comments").insert({
      company_id: companyId,
      supplier_id: data.supplier_id,
      user_id: userId,
      comment: data.comment,
      visibility: "internal",
    }).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    return { comment: r };
  });

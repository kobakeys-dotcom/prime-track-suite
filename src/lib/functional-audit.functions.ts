import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// =========================
// Default module registry & checklist seeds
// =========================

type DefaultModule = {
  module_key: string;
  module_name: string;
  module_category: string;
  route_path: string | null;
  sidebar_path: string | null;
  primary_table: string | null;
  related_tables?: string[];
  is_core_module?: boolean;
  is_client_visible_module?: boolean;
};

const DEFAULT_MODULES: DefaultModule[] = [
  // Core
  { module_key: "dashboard", module_name: "Dashboard", module_category: "Core", route_path: "/dashboard", sidebar_path: "/dashboard", primary_table: null, is_core_module: true },
  { module_key: "projects", module_name: "Projects", module_category: "Core", route_path: "/projects", sidebar_path: "/projects", primary_table: "projects", is_core_module: true },
  { module_key: "client_portal", module_name: "Client Portal", module_category: "Core", route_path: "/client-portal", sidebar_path: "/client-portal", primary_table: "projects", is_client_visible_module: true },
  { module_key: "wbs", module_name: "WBS", module_category: "Core", route_path: "/wbs", sidebar_path: "/wbs", primary_table: "wbs_items", is_core_module: true },
  { module_key: "tasks", module_name: "Tasks", module_category: "Core", route_path: "/tasks", sidebar_path: "/tasks", primary_table: "tasks", is_core_module: true },
  { module_key: "gantt", module_name: "Gantt Timeline", module_category: "Core", route_path: "/gantt", sidebar_path: "/gantt", primary_table: "tasks" },
  { module_key: "milestones", module_name: "Milestones", module_category: "Core", route_path: "/milestones", sidebar_path: "/milestones", primary_table: "milestones" },
  { module_key: "daily_reports", module_name: "Daily Reports", module_category: "Core", route_path: "/daily-reports", sidebar_path: "/daily-reports", primary_table: "daily_reports" },
  // Coordination
  { module_key: "issues", module_name: "Issues", module_category: "Coordination", route_path: "/issues", sidebar_path: "/issues", primary_table: "issues" },
  { module_key: "snags", module_name: "Snag List", module_category: "Coordination", route_path: "/snags", sidebar_path: "/snags", primary_table: "snags" },
  { module_key: "meetings", module_name: "Meetings", module_category: "Coordination", route_path: "/meetings", sidebar_path: "/meetings", primary_table: "meetings" },
  { module_key: "action_items", module_name: "Meeting Action Items", module_category: "Coordination", route_path: "/action-items", sidebar_path: "/action-items", primary_table: "meeting_action_items" },
  { module_key: "approvals", module_name: "Approvals Inbox", module_category: "Coordination", route_path: "/approvals", sidebar_path: "/approvals", primary_table: "approvals" },
  { module_key: "rfis", module_name: "RFIs", module_category: "Coordination", route_path: "/rfis", sidebar_path: "/rfis", primary_table: "rfis" },
  { module_key: "submittals", module_name: "Submittals", module_category: "Coordination", route_path: "/submittals", sidebar_path: "/submittals", primary_table: "submittals" },
  // Commercial
  { module_key: "boq", module_name: "BOQ", module_category: "Commercial", route_path: "/boq", sidebar_path: "/boq", primary_table: "boq_items" },
  { module_key: "cost_codes", module_name: "Cost Codes", module_category: "Commercial", route_path: "/cost-codes", sidebar_path: "/cost-codes", primary_table: "cost_codes" },
  { module_key: "variations", module_name: "Variations", module_category: "Commercial", route_path: "/variations", sidebar_path: "/variations", primary_table: "variations" },
  { module_key: "payment_claims", module_name: "Payment Claims / IPC", module_category: "Commercial", route_path: "/payment-claims", sidebar_path: "/payment-claims", primary_table: "payment_claims" },
  { module_key: "budget", module_name: "Budget vs Actual", module_category: "Commercial", route_path: "/budget", sidebar_path: "/budget", primary_table: "project_budgets" },
  { module_key: "cash_flow", module_name: "Cash Flow", module_category: "Commercial", route_path: "/cash-flow", sidebar_path: "/cash-flow", primary_table: "cash_flow_entries" },
  // Procurement
  { module_key: "procurement", module_name: "Material Requests", module_category: "Procurement", route_path: "/procurement", sidebar_path: "/procurement", primary_table: "procurement_requests" },
  { module_key: "rfqs", module_name: "RFQs", module_category: "Procurement", route_path: "/rfqs", sidebar_path: "/rfqs", primary_table: "rfqs" },
  { module_key: "purchase_orders", module_name: "Purchase Orders", module_category: "Procurement", route_path: "/purchase-orders", sidebar_path: "/purchase-orders", primary_table: "purchase_orders" },
  { module_key: "deliveries", module_name: "Deliveries / GRN", module_category: "Procurement", route_path: "/deliveries", sidebar_path: "/deliveries", primary_table: "deliveries" },
  { module_key: "suppliers", module_name: "Suppliers", module_category: "Procurement", route_path: "/suppliers", sidebar_path: "/suppliers", primary_table: "suppliers" },
  // QHSE / Risk
  { module_key: "quality", module_name: "Quality Inspections", module_category: "Quality/Safety", route_path: "/quality", sidebar_path: "/quality", primary_table: "quality_inspections" },
  { module_key: "safety", module_name: "Safety Inspections", module_category: "Quality/Safety", route_path: "/safety", sidebar_path: "/safety", primary_table: "safety_inspections" },
  { module_key: "ncrs", module_name: "Non-Conformance / NCR", module_category: "Quality/Safety", route_path: "/ncrs", sidebar_path: "/ncrs", primary_table: "ncrs" },
  { module_key: "risks", module_name: "Risk Register", module_category: "Quality/Safety", route_path: "/risks", sidebar_path: "/risks", primary_table: "risks" },
  // Resources
  { module_key: "manpower", module_name: "Manpower", module_category: "Resources", route_path: "/resources", sidebar_path: "/resources", primary_table: "manpower_records" },
  { module_key: "equipment", module_name: "Equipment", module_category: "Resources", route_path: "/equipment", sidebar_path: "/equipment", primary_table: "equipment" },
  { module_key: "timesheets", module_name: "Timesheets", module_category: "Resources", route_path: "/timesheets", sidebar_path: "/timesheets", primary_table: "timesheets" },
  // Documents / Reports / AI
  { module_key: "documents", module_name: "Document Manager", module_category: "Documents/AI", route_path: "/documents", sidebar_path: "/documents", primary_table: "documents" },
  { module_key: "drawings", module_name: "Drawing Register", module_category: "Documents/AI", route_path: "/drawings", sidebar_path: "/drawings", primary_table: "drawings" },
  { module_key: "reports", module_name: "Reports", module_category: "Documents/AI", route_path: "/reports", sidebar_path: "/reports", primary_table: "report_templates" },
  { module_key: "report_builder", module_name: "Custom Report Builder AI", module_category: "Documents/AI", route_path: "/report-builder", sidebar_path: "/report-builder", primary_table: "custom_report_ai_prompts" },
  { module_key: "ai_assistant", module_name: "AI Assistant", module_category: "Documents/AI", route_path: "/ai", sidebar_path: "/ai", primary_table: "ai_conversations" },
  // System / Admin
  { module_key: "notifications", module_name: "Notifications", module_category: "System", route_path: "/notifications", sidebar_path: "/notifications", primary_table: "notifications" },
  { module_key: "roles_permissions", module_name: "Role Permissions", module_category: "System", route_path: "/permissions", sidebar_path: "/permissions", primary_table: "role_permissions" },
  { module_key: "audit_logs", module_name: "Audit Log", module_category: "System", route_path: "/audit", sidebar_path: "/audit", primary_table: "audit_logs" },
  { module_key: "functional_audit", module_name: "Functional Audit Summary", module_category: "System", route_path: "/audit-summary", sidebar_path: "/audit-summary", primary_table: "functional_audit_modules" },
  { module_key: "users", module_name: "User Management", module_category: "System", route_path: "/users", sidebar_path: "/users", primary_table: "profiles" },
  { module_key: "settings", module_name: "Settings", module_category: "System", route_path: "/settings", sidebar_path: "/settings", primary_table: null },
];

const CHECKLIST_TEMPLATE: { category: string; items: { item: string; expected?: string; severity?: string }[] }[] = [
  { category: "Route and Navigation", items: [
    { item: "Page route exists", expected: "Route file present in /src/routes", severity: "Critical" },
    { item: "Sidebar link exists", expected: "Module accessible from sidebar", severity: "High" },
    { item: "Page loads without error", expected: "No console/runtime errors", severity: "Critical" },
    { item: "Access denied works for unauthorized users", expected: "Permission gate blocks unauthorized", severity: "High" },
  ]},
  { category: "UI/UX", items: [
    { item: "Professional title and layout", severity: "Medium" },
    { item: "Summary cards present", severity: "Low" },
    { item: "Table/list view exists", severity: "Medium" },
    { item: "Detail view/drawer exists", severity: "Medium" },
    { item: "Loading, empty, error states present", severity: "Medium" },
    { item: "Toast messages for actions", severity: "Low" },
    { item: "Mobile responsive layout", severity: "Medium" },
  ]},
  { category: "Supabase Database", items: [
    { item: "Primary table exists", severity: "Critical" },
    { item: "Data saves correctly", severity: "Critical" },
    { item: "Data fetches correctly", severity: "Critical" },
    { item: "Company/project filtering works", severity: "High" },
  ]},
  { category: "CRUD Operations", items: [
    { item: "Create works", severity: "Critical" },
    { item: "Read/list works", severity: "Critical" },
    { item: "Edit/update works", severity: "High" },
    { item: "Archive/delete works", severity: "High" },
    { item: "Search/filter/sort works", severity: "Medium" },
  ]},
  { category: "Workflow", items: [
    { item: "Status workflow works", severity: "Medium" },
    { item: "Submit/approve/reject works if applicable", severity: "Medium" },
    { item: "Linked records work", severity: "Medium" },
  ]},
  { category: "Permissions and Security", items: [
    { item: "RLS policies enforced", severity: "Critical" },
    { item: "Role permissions enforced in UI", severity: "High" },
    { item: "Cross-company data blocked", severity: "Critical" },
    { item: "Sensitive cost/confidential data hidden", severity: "High" },
  ]},
  { category: "Reports / Export", items: [
    { item: "CSV export works", severity: "Medium" },
    { item: "Print works", severity: "Low" },
    { item: "Export respects permissions", severity: "High" },
  ]},
  { category: "Notifications and Audit Logs", items: [
    { item: "Notifications created for key events", severity: "Medium" },
    { item: "Audit logs created for key events", severity: "High" },
  ]},
  { category: "Integration", items: [
    { item: "Project detail tab works", severity: "Low" },
    { item: "Dashboard integration works", severity: "Low" },
  ]},
  { category: "Testing Result", items: [
    { item: "No TypeScript errors", severity: "Critical" },
    { item: "No console errors", severity: "High" },
    { item: "Ready for client demo", severity: "Medium" },
    { item: "Ready for production use", severity: "Medium" },
  ]},
];

// =========================
// Helpers
// =========================

async function requireCompanyAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "company_admin" });
  if (!isAdmin) throw new Error("Forbidden: Company Admin role required");
  const { data: prof } = await context.supabase.from("profiles").select("company_id, full_name, email").eq("id", context.userId).maybeSingle();
  if (!prof?.company_id) throw new Error("Company not found for user");
  return { companyId: prof.company_id as string, profile: prof };
}

function severityWeight(s: string | null | undefined): number {
  switch (s) {
    case "Critical": return 8;
    case "High": return 5;
    case "Medium": return 3;
    case "Low": return 1;
    default: return 3;
  }
}

function statusScore(status: string): number {
  switch (status) {
    case "Passed":
    case "Resolved":
      return 1;
    case "Warning":
    case "In Progress":
      return 0.5;
    default:
      return 0;
  }
}

function isApplicable(status: string) {
  return status !== "Not Applicable";
}

function calcModule(items: any[]): { completion: number; status: string; criticalFails: number } {
  const applicable = items.filter((i) => isApplicable(i.status));
  if (applicable.length === 0) return { completion: 0, status: "Not Checked", criticalFails: 0 };
  let earned = 0, possible = 0;
  let criticalFails = 0;
  for (const it of applicable) {
    const w = severityWeight(it.severity);
    possible += w;
    earned += w * statusScore(it.status);
    if (it.status === "Failed" && it.severity === "Critical") criticalFails++;
  }
  const pct = possible > 0 ? (earned / possible) * 100 : 0;
  let status: string;
  if (criticalFails > 0) status = "Broken";
  else if (pct >= 95) status = "Ready for Production";
  else if (pct >= 85) status = "Ready for Client Demo";
  else if (pct >= 70) status = "Mostly Complete";
  else if (pct >= 50) status = "Partially Complete";
  else if (pct > 0) status = "Incomplete";
  else if (applicable.every((i) => i.status === "Not Checked")) status = "Not Checked";
  else status = "Not Started";
  return { completion: Math.round(pct * 10) / 10, status, criticalFails };
}

function readinessFromCompletion(pct: number, criticalFails: number): string {
  if (criticalFails > 0) return "Critical Issues";
  if (pct >= 95) return "Ready for Production";
  if (pct >= 85) return "Ready for Client Demo";
  if (pct >= 70) return "Needs Minor Fixes";
  if (pct >= 50) return "Needs Major Fixes";
  return "Not Ready";
}

// =========================
// Server functions
// =========================

export const listAuditModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireCompanyAdmin(context);
    const { data, error } = await context.supabase
      .from("functional_audit_modules")
      .select("*")
      .eq("is_archived", false)
      .order("module_category")
      .order("module_name");
    if (error) throw error;
    return data ?? [];
  });

export const listAuditItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ module_id: z.string().uuid().optional() }).partial().parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await requireCompanyAdmin(context);
    let q = context.supabase.from("functional_audit_items").select("*").order("audit_category").order("created_at");
    if (data?.module_id) q = q.eq("audit_module_id", data.module_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const functionalAuditStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireCompanyAdmin(context);
    const [{ data: modules }, { data: items }] = await Promise.all([
      context.supabase.from("functional_audit_modules").select("*").eq("is_archived", false),
      context.supabase.from("functional_audit_items").select("audit_module_id, status, severity"),
    ]);
    const mods = modules ?? [];
    const its = items ?? [];
    const byModule = new Map<string, any[]>();
    for (const it of its) {
      const arr = byModule.get(it.audit_module_id) ?? [];
      arr.push(it);
      byModule.set(it.audit_module_id, arr);
    }
    let totalApplicable = 0, totalEarned = 0;
    let totalCriticalFails = 0;
    const moduleStatuses: { id: string; completion: number; status: string; criticalFails: number; module_category: string; module_name: string; is_core_module: boolean }[] = [];
    for (const m of mods) {
      const mItems = byModule.get(m.id) ?? [];
      const c = calcModule(mItems);
      const weight = m.is_core_module ? 2 : 1;
      totalApplicable += weight * 100;
      totalEarned += weight * c.completion;
      totalCriticalFails += c.criticalFails;
      moduleStatuses.push({ id: m.id, completion: c.completion, status: c.status, criticalFails: c.criticalFails, module_category: m.module_category, module_name: m.module_name, is_core_module: !!m.is_core_module });
    }
    const overall = totalApplicable > 0 ? Math.round((totalEarned / totalApplicable) * 1000) / 10 : 0;
    const readiness = readinessFromCompletion(overall, totalCriticalFails);
    const counts = {
      totalModules: mods.length,
      completeModules: moduleStatuses.filter((m) => m.completion >= 95).length,
      mostlyComplete: moduleStatuses.filter((m) => m.completion >= 70 && m.completion < 95).length,
      incomplete: moduleStatuses.filter((m) => m.completion < 70 && m.status !== "Broken").length,
      broken: moduleStatuses.filter((m) => m.status === "Broken").length,
      readyForDemo: moduleStatuses.filter((m) => m.completion >= 85 && m.criticalFails === 0).length,
      notReady: moduleStatuses.filter((m) => m.completion < 50).length,
      totalItems: its.length,
      passedItems: its.filter((i: any) => i.status === "Passed" || i.status === "Resolved").length,
      failedItems: its.filter((i: any) => i.status === "Failed").length,
      warningItems: its.filter((i: any) => i.status === "Warning").length,
      notCheckedItems: its.filter((i: any) => i.status === "Not Checked").length,
      criticalIssues: its.filter((i: any) => i.status === "Failed" && i.severity === "Critical").length,
    };
    return { overall, readiness, criticalFails: totalCriticalFails, moduleStatuses, ...counts };
  });

export const seedAuditDefaults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { companyId, profile } = await requireCompanyAdmin(context);
    // Modules
    const { data: existing } = await context.supabase
      .from("functional_audit_modules").select("module_key").eq("company_id", companyId);
    const existingKeys = new Set((existing ?? []).map((m: any) => m.module_key));
    const toInsert = DEFAULT_MODULES.filter((m) => !existingKeys.has(m.module_key)).map((m) => ({
      company_id: companyId, ...m, created_by: context.userId,
    }));
    if (toInsert.length) {
      const { error } = await context.supabase.from("functional_audit_modules").insert(toInsert);
      if (error) throw error;
    }
    // Items per module
    const { data: allModules } = await context.supabase
      .from("functional_audit_modules").select("id, module_key").eq("company_id", companyId);
    const { data: itemsExist } = await context.supabase
      .from("functional_audit_items").select("audit_module_id, audit_category, checklist_item")
      .eq("company_id", companyId);
    const existingPairs = new Set((itemsExist ?? []).map((i: any) => `${i.audit_module_id}|${i.audit_category}|${i.checklist_item}`));
    const itemsToInsert: any[] = [];
    for (const m of allModules ?? []) {
      for (const cat of CHECKLIST_TEMPLATE) {
        for (const it of cat.items) {
          const key = `${m.id}|${cat.category}|${it.item}`;
          if (existingPairs.has(key)) continue;
          itemsToInsert.push({
            company_id: companyId,
            audit_module_id: m.id,
            module_key: m.module_key,
            audit_category: cat.category,
            checklist_item: it.item,
            expected_result: it.expected ?? null,
            severity: it.severity ?? "Medium",
            priority: "Medium",
            status: "Not Checked",
            created_by: context.userId,
          });
        }
      }
    }
    if (itemsToInsert.length) {
      // Insert in batches to be safe
      for (let i = 0; i < itemsToInsert.length; i += 500) {
        const batch = itemsToInsert.slice(i, i + 500);
        const { error } = await context.supabase.from("functional_audit_items").insert(batch);
        if (error) throw error;
      }
    }
    await context.supabase.from("audit_logs").insert({
      company_id: companyId, actor_id: context.userId,
      user_name: profile.full_name ?? profile.email, user_email: profile.email,
      action: "Functional audit defaults seeded", action_type: "System",
      module_name: "functional_audit",
      description: `Seeded ${toInsert.length} modules and ${itemsToInsert.length} checklist items`,
      severity: "Info", status: "Success", source: "Web App",
    });
    return { modulesAdded: toInsert.length, itemsAdded: itemsToInsert.length };
  });

export const updateAuditItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["Passed","Failed","Warning","Not Checked","Not Applicable","In Progress","Resolved","Reopened"]).optional(),
    severity: z.enum(["Low","Medium","High","Critical"]).optional(),
    priority: z.enum(["Low","Medium","High","Urgent","Critical"]).optional(),
    actual_result: z.string().max(2000).optional().nullable(),
    resolution_notes: z.string().max(2000).optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
    target_completion_date: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { companyId, profile } = await requireCompanyAdmin(context);
    const patch: any = { updated_by: context.userId };
    for (const k of ["status","severity","priority","actual_result","resolution_notes","assigned_to","target_completion_date"]) {
      if ((data as any)[k] !== undefined) patch[k] = (data as any)[k];
    }
    if (data.status === "Resolved" || data.status === "Passed") {
      patch.resolved_by = context.userId;
      patch.resolved_at = new Date().toISOString();
    }
    if (data.status === "Reopened") {
      patch.resolved_by = null;
      patch.resolved_at = null;
    }
    const { data: updated, error } = await context.supabase
      .from("functional_audit_items").update(patch).eq("id", data.id).eq("company_id", companyId)
      .select("audit_module_id, module_key, checklist_item, status, severity").single();
    if (error) throw error;
    // Recalc module
    const { data: items } = await context.supabase
      .from("functional_audit_items").select("status, severity")
      .eq("audit_module_id", updated.audit_module_id);
    const c = calcModule(items ?? []);
    await context.supabase.from("functional_audit_modules").update({
      completion_percentage: c.completion, status: c.status,
      last_checked_at: new Date().toISOString(), last_checked_by: context.userId,
    }).eq("id", updated.audit_module_id);

    await context.supabase.from("audit_logs").insert({
      company_id: companyId, actor_id: context.userId,
      user_name: profile.full_name ?? profile.email, user_email: profile.email,
      action: `Audit item ${data.status ?? "updated"}`, action_type: "Update",
      module_name: "functional_audit", record_id: data.id,
      record_title: updated.checklist_item,
      description: `Module ${updated.module_key} item marked ${data.status ?? "updated"}`,
      severity: "Info", status: "Success", source: "Web App",
      new_values: { status: updated.status, severity: updated.severity },
    });
    return { ok: true, moduleCompletion: c.completion, moduleStatus: c.status };
  });

export const updateAuditModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    owner_user_id: z.string().uuid().optional().nullable(),
    target_completion_date: z.string().optional().nullable(),
    priority: z.enum(["Low","Medium","High","Urgent","Critical"]).optional(),
    notes: z.string().max(4000).optional().nullable(),
    is_archived: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { companyId } = await requireCompanyAdmin(context);
    const patch: any = {};
    for (const k of ["owner_user_id","target_completion_date","priority","notes","is_archived"]) {
      if ((data as any)[k] !== undefined) patch[k] = (data as any)[k];
    }
    const { error } = await context.supabase
      .from("functional_audit_modules").update(patch).eq("id", data.id).eq("company_id", companyId);
    if (error) throw error;
    return { ok: true };
  });

export const runFunctionalAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ run_name: z.string().max(255).optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const { companyId, profile } = await requireCompanyAdmin(context);
    const { data: modules } = await context.supabase
      .from("functional_audit_modules").select("id, module_key, primary_table").eq("company_id", companyId).eq("is_archived", false);
    const { data: items } = await context.supabase
      .from("functional_audit_items").select("id, audit_module_id, audit_category, checklist_item, severity, status, is_automated")
      .eq("company_id", companyId);

    // Safe automatic checks: table existence + read access
    const tableSet = new Set((modules ?? []).map((m: any) => m.primary_table).filter(Boolean));
    const tableStatus = new Map<string, "ok" | "blocked" | "missing">();
    for (const t of tableSet) {
      try {
        const { error } = await context.supabase.from(t as any).select("id", { count: "exact", head: true }).limit(1);
        if (error) {
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("does not exist") || msg.includes("not found")) tableStatus.set(t as string, "missing");
          else tableStatus.set(t as string, "blocked");
        } else {
          tableStatus.set(t as string, "ok");
        }
      } catch {
        tableStatus.set(t as string, "blocked");
      }
    }

    // Update DB-table items based on table status (only if currently Not Checked or already automated)
    const itemsByMod = new Map<string, any[]>();
    for (const it of items ?? []) {
      const arr = itemsByMod.get(it.audit_module_id) ?? [];
      arr.push(it);
      itemsByMod.set(it.audit_module_id, arr);
    }
    let updates = 0;
    for (const m of modules ?? []) {
      const mItems = itemsByMod.get(m.id) ?? [];
      const tableItem = mItems.find((i: any) => i.audit_category === "Supabase Database" && /Primary table exists/i.test(i.checklist_item));
      if (tableItem && m.primary_table) {
        const ts = tableStatus.get(m.primary_table);
        let newStatus = tableItem.status;
        let actual = "";
        if (ts === "ok") { newStatus = "Passed"; actual = `Table ${m.primary_table} reachable`; }
        else if (ts === "missing") { newStatus = "Failed"; actual = `Table ${m.primary_table} does not exist`; }
        else if (ts === "blocked") { newStatus = "Warning"; actual = `Table ${m.primary_table} reachable but read returned an error`; }
        if (newStatus !== tableItem.status || tableItem.is_automated) {
          await context.supabase.from("functional_audit_items").update({
            status: newStatus, actual_result: actual, is_automated: true, updated_by: context.userId,
          }).eq("id", tableItem.id);
          updates++;
        }
      }
    }

    // Recalculate all module completions
    let totalApplicable = 0, totalEarned = 0, totalCritical = 0;
    let completedModules = 0, failedModules = 0;
    for (const m of modules ?? []) {
      const { data: mItems } = await context.supabase
        .from("functional_audit_items").select("status, severity").eq("audit_module_id", m.id);
      const c = calcModule(mItems ?? []);
      await context.supabase.from("functional_audit_modules").update({
        completion_percentage: c.completion, status: c.status,
        last_checked_at: new Date().toISOString(), last_checked_by: context.userId,
      }).eq("id", m.id);
      const weight = 1;
      totalApplicable += weight * 100;
      totalEarned += weight * c.completion;
      totalCritical += c.criticalFails;
      if (c.completion >= 95) completedModules++;
      if (c.status === "Broken") failedModules++;
    }
    const overall = totalApplicable > 0 ? Math.round((totalEarned / totalApplicable) * 1000) / 10 : 0;
    const readiness = readinessFromCompletion(overall, totalCritical);
    const allItems = items ?? [];

    const { data: run, error } = await context.supabase.from("functional_audit_runs").insert({
      company_id: companyId,
      audit_run_name: data?.run_name ?? `Audit Run — ${new Date().toLocaleString()}`,
      audit_run_type: "Automated",
      total_modules: (modules ?? []).length,
      completed_modules: completedModules,
      failed_modules: failedModules,
      total_items: allItems.length,
      passed_items: allItems.filter((i: any) => i.status === "Passed" || i.status === "Resolved").length,
      failed_items: allItems.filter((i: any) => i.status === "Failed").length,
      warning_items: allItems.filter((i: any) => i.status === "Warning").length,
      not_checked_items: allItems.filter((i: any) => i.status === "Not Checked").length,
      overall_completion_percentage: overall,
      readiness_status: readiness,
      summary_notes: `Automated checks updated ${updates} item(s).`,
      started_by: context.userId,
      completed_at: new Date().toISOString(),
      status: "Completed",
    }).select().single();
    if (error) throw error;

    await context.supabase.from("audit_logs").insert({
      company_id: companyId, actor_id: context.userId,
      user_name: profile.full_name ?? profile.email, user_email: profile.email,
      action: "Functional audit run completed", action_type: "System",
      module_name: "functional_audit", record_id: run.id,
      description: `Overall completion ${overall}% — ${readiness}`,
      severity: totalCritical > 0 ? "High" : "Info", status: "Success", source: "Web App",
      metadata: { updates, overall, readiness },
    });

    return { run, overall, readiness, updates };
  });

export const listAuditRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireCompanyAdmin(context);
    const { data, error } = await context.supabase
      .from("functional_audit_runs").select("*").order("started_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const createAuditSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(255) }).parse(d))
  .handler(async ({ context, data }) => {
    const { companyId, profile } = await requireCompanyAdmin(context);
    const [{ data: modules }, { data: items }] = await Promise.all([
      context.supabase.from("functional_audit_modules").select("*").eq("company_id", companyId),
      context.supabase.from("functional_audit_items").select("*").eq("company_id", companyId),
    ]);
    let totalApplicable = 0, totalEarned = 0, totalCritical = 0;
    const itemsByMod = new Map<string, any[]>();
    for (const it of items ?? []) {
      const arr = itemsByMod.get(it.audit_module_id) ?? [];
      arr.push(it);
      itemsByMod.set(it.audit_module_id, arr);
    }
    for (const m of modules ?? []) {
      const c = calcModule(itemsByMod.get(m.id) ?? []);
      totalApplicable += 100; totalEarned += c.completion; totalCritical += c.criticalFails;
    }
    const overall = totalApplicable > 0 ? Math.round((totalEarned / totalApplicable) * 1000) / 10 : 0;
    const readiness = readinessFromCompletion(overall, totalCritical);

    const { data: snap, error } = await context.supabase.from("functional_audit_snapshots").insert({
      company_id: companyId,
      snapshot_name: data.name,
      snapshot_data: { modules, items },
      overall_completion_percentage: overall,
      readiness_status: readiness,
      created_by: context.userId,
    }).select().single();
    if (error) throw error;
    await context.supabase.from("audit_logs").insert({
      company_id: companyId, actor_id: context.userId,
      user_name: profile.full_name ?? profile.email, user_email: profile.email,
      action: "Audit snapshot created", action_type: "Create",
      module_name: "functional_audit", record_id: snap.id, record_title: data.name,
      severity: "Info", status: "Success", source: "Web App",
    });
    return snap;
  });

export const listAuditSnapshots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireCompanyAdmin(context);
    const { data, error } = await context.supabase
      .from("functional_audit_snapshots")
      .select("id, snapshot_name, overall_completion_percentage, readiness_status, created_at, created_by")
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const listCompanyUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { companyId } = await requireCompanyAdmin(context);
    const { data } = await context.supabase
      .from("profiles").select("id, full_name, email").eq("company_id", companyId).order("full_name");
    return data ?? [];
  });

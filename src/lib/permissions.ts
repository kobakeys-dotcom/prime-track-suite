// Client-side permission helper. Server enforces via RLS; this only hides UI.
export type AppRole =
  | "company_admin" | "project_director" | "project_manager" | "site_engineer"
  | "planning_engineer" | "quantity_surveyor" | "finance_manager" | "procurement_officer"
  | "safety_officer" | "quality_inspector" | "client_representative" | "consultant"
  | "subcontractor" | "viewer";

export type Action = "view" | "create" | "edit" | "delete" | "approve";
export type Module =
  | "projects" | "tasks" | "daily_reports" | "boq" | "rfis" | "submittals" | "drawings"
  | "documents" | "approvals" | "procurement" | "variations" | "payment_claims"
  | "quality" | "safety" | "ncrs" | "snags" | "risks" | "issues" | "meetings"
  | "resources" | "equipment" | "timesheets" | "reports" | "settings" | "audit" | "ai" | "client";

const ALL: Action[] = ["view", "create", "edit", "delete", "approve"];

const MATRIX: Record<AppRole, Partial<Record<Module, Action[]>>> = {
  company_admin: Object.fromEntries((["projects","tasks","daily_reports","boq","rfis","submittals","drawings","documents","approvals","procurement","variations","payment_claims","quality","safety","ncrs","snags","risks","issues","meetings","resources","equipment","timesheets","reports","settings","audit","ai","client"] as Module[]).map((m) => [m, ALL])),
  project_director: { projects: ALL, tasks: ALL, daily_reports: ALL, boq: ALL, rfis: ALL, submittals: ALL, drawings: ALL, documents: ALL, approvals: ALL, procurement: ALL, variations: ALL, payment_claims: ALL, quality: ALL, safety: ALL, ncrs: ALL, snags: ALL, risks: ALL, issues: ALL, meetings: ALL, resources: ALL, equipment: ALL, timesheets: ALL, reports: ALL, ai: ALL },
  project_manager: { projects: ["view","edit"], tasks: ALL, daily_reports: ALL, boq: ["view","edit","approve"], rfis: ALL, submittals: ALL, drawings: ["view","edit"], documents: ALL, approvals: ALL, procurement: ALL, variations: ["view","create","edit","approve"], payment_claims: ["view","create","edit","approve"], quality: ALL, safety: ALL, ncrs: ALL, snags: ALL, risks: ALL, issues: ALL, meetings: ALL, resources: ["view","edit"], equipment: ["view","edit"], timesheets: ["view","approve"], reports: ALL, ai: ALL },
  planning_engineer: { projects: ["view"], tasks: ALL, daily_reports: ["view"], boq: ["view"], drawings: ["view"], documents: ["view"], meetings: ["view","create","edit"], milestones: ALL as any, reports: ALL, ai: ALL },
  quantity_surveyor: { projects: ["view"], boq: ALL, variations: ALL, payment_claims: ALL, procurement: ["view"], documents: ["view"], reports: ALL, ai: ALL },
  finance_manager: { projects: ["view"], boq: ["view"], variations: ["view","approve"], payment_claims: ALL, procurement: ["view","approve"], reports: ALL, ai: ALL },
  procurement_officer: { projects: ["view"], procurement: ALL, suppliers: ALL as any, rfis: ["view"], documents: ["view","create"], reports: ["view"], ai: ALL },
  site_engineer: { projects: ["view"], tasks: ALL, daily_reports: ALL, boq: ["view","edit"], rfis: ALL, submittals: ["view","create"], drawings: ["view"], documents: ["view","create"], quality: ALL, safety: ["view","create"], snags: ALL, issues: ALL, meetings: ["view","create","edit"], ai: ALL },
  safety_officer: { projects: ["view"], safety: ALL, ncrs: ALL, issues: ALL, daily_reports: ["view"], reports: ["view"], ai: ALL },
  quality_inspector: { projects: ["view"], quality: ALL, ncrs: ALL, snags: ALL, documents: ["view"], reports: ["view"], ai: ALL },
  consultant: { projects: ["view"], rfis: ["view","edit","approve"], submittals: ["view","approve"], drawings: ["view"], documents: ["view"], approvals: ["view","approve"], reports: ["view"], ai: ALL },
  subcontractor: { projects: ["view"], tasks: ["view","edit"], daily_reports: ["view","create"], documents: ["view"] },
  client_representative: { client: ALL, projects: ["view"], documents: ["view"], reports: ["view"], approvals: ["view","approve"] },
  viewer: { projects: ["view"], tasks: ["view"], daily_reports: ["view"], boq: ["view"], documents: ["view"], reports: ["view"] },
};

export function can(roles: string[] | undefined, action: Action, mod: Module): boolean {
  if (!roles || roles.length === 0) return false;
  if (roles.includes("company_admin")) return true;
  return roles.some((r) => {
    const m = MATRIX[r as AppRole]?.[mod];
    return !!m && m.includes(action);
  });
}

export function getMatrix() { return MATRIX; }
export const ROLE_LIST: AppRole[] = Object.keys(MATRIX) as AppRole[];
export const MODULE_LIST: Module[] = ["projects","tasks","daily_reports","boq","rfis","submittals","drawings","documents","approvals","procurement","variations","payment_claims","quality","safety","ncrs","snags","risks","issues","meetings","resources","equipment","timesheets","reports","settings","audit","ai","client"];

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listProjectsLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("projects").select("id, name").order("name");
    if (error) throw error;
    return data ?? [];
  });

const ROLE_ENUM = z.enum([
  "company_admin", "project_director", "project_manager", "site_engineer",
  "planning_engineer", "quantity_surveyor", "finance_manager", "procurement_officer",
  "safety_officer", "quality_inspector", "client_representative", "consultant",
  "subcontractor", "viewer",
]);

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profiles, error: e1 } = await context.supabase
      .from("profiles").select("id, full_name, email, created_at").order("created_at");
    if (e1) throw e1;
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = ids.length
      ? await context.supabase.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] };
    const rolesMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const cur = rolesMap.get(r.user_id) ?? [];
      cur.push(r.role);
      rolesMap.set(r.user_id, cur);
    });
    return (profiles ?? []).map((p) => ({ ...p, roles: rolesMap.get(p.id) ?? [] }));
  });

export const updateMemberRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    user_id: z.string().uuid(),
    roles: z.array(ROLE_ENUM).max(14),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "company_admin" });
    if (!isAdmin) throw new Error("Only company admins can edit roles");
    const { data: profile } = await context.supabase.from("profiles").select("company_id").eq("id", data.user_id).maybeSingle();
    if (!profile?.company_id) throw new Error("User not in your company");
    await context.supabase.from("user_roles").delete().eq("user_id", data.user_id);
    if (data.roles.length) {
      const rows = data.roles.map((role) => ({ user_id: data.user_id, role, company_id: profile.company_id }));
      const { error } = await context.supabase.from("user_roles").insert(rows);
      if (error) throw error;
    }
    return { ok: true };
  });

export const listInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("invitations")
      .select("id, email, role, token, accepted_at, expires_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email(), role: ROLE_ENUM }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (!profile?.company_id) throw new Error("Company missing");
    const { data: row, error } = await context.supabase.from("invitations").insert({
      email: data.email,
      role: data.role,
      company_id: profile.company_id,
      invited_by: context.userId,
    }).select().single();
    if (error) throw error;
    return row;
  });

export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (!profile?.company_id) throw new Error("Company missing");
    const companyId = profile.company_id;
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

    const { data: proj, error: e1 } = await context.supabase.from("projects").insert({
      company_id: companyId,
      name: "Demo Tower — Block A",
      code: "DEMO-001",
      client: "Acme Developments",
      location: "Riyadh, KSA",
      status: "active",
      start_date: iso(addDays(-30)),
      end_date: iso(addDays(180)),
      contract_value: 12500000,
      progress: 25,
      created_by: context.userId,
    }).select().single();
    if (e1) throw e1;

    const tasks = [
      { title: "Site mobilization", status: "completed" as const, progress: 100, start_date: iso(addDays(-30)), due_date: iso(addDays(-20)) },
      { title: "Excavation works", status: "in_progress" as const, progress: 60, start_date: iso(addDays(-20)), due_date: iso(addDays(10)) },
      { title: "Foundation rebar", status: "todo" as const, progress: 0, start_date: iso(addDays(5)), due_date: iso(addDays(25)) },
      { title: "Concrete pour - raft", status: "todo" as const, progress: 0, start_date: iso(addDays(25)), due_date: iso(addDays(40)) },
    ];
    await context.supabase.from("tasks").insert(tasks.map((t) => ({
      ...t, project_id: proj.id, created_by: context.userId,
    })));

    await context.supabase.from("boq_items").insert([
      { project_id: proj.id, item_code: "01.01", description: "Site clearance", unit: "m2", quantity: 5000, unit_rate: 12 },
      { project_id: proj.id, item_code: "02.01", description: "Excavation in ordinary soil", unit: "m3", quantity: 3500, unit_rate: 45 },
      { project_id: proj.id, item_code: "03.01", description: "Reinforced concrete C40", unit: "m3", quantity: 1200, unit_rate: 850 },
    ]);

    await context.supabase.from("rfis").insert({
      project_id: proj.id, number: "RFI-001",
      subject: "Confirmation of column locations on Grid C",
      question: "Please confirm column centerlines on Grid C between levels B1 and G.",
      status: "submitted" as const,
      due_date: iso(addDays(7)), raised_by: context.userId,
    });

    await context.supabase.from("daily_reports").insert({
      project_id: proj.id, report_date: iso(today),
      weather: "Sunny, 32°C",
      work_completed: "Continued excavation along Grid 1-5. Rebar prep for raft foundation.",
      status: "submitted" as const,
      author_id: context.userId,
    });

    return { ok: true, projectId: proj.id };
  });

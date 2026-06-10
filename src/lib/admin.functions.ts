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
  .inputValidator((d: unknown) => z.object({
    email: z.string().email(),
    role: z.enum([
      "company_admin", "project_director", "project_manager", "site_engineer",
      "planning_engineer", "quantity_surveyor", "finance_manager", "procurement_officer",
      "safety_officer", "quality_inspector", "client_representative", "consultant",
      "subcontractor", "viewer",
    ]),
  }).parse(d))
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

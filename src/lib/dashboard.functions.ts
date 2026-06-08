import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCurrentContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*, company:companies(*)").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return {
      userId,
      profile,
      roles: (roles ?? []).map((r) => r.role),
    };
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);

    const [
      projectsAll,
      projectsActive,
      tasksDelayed,
      approvalsPending,
      rfisOpen,
      submittalsPending,
      recentReports,
    ] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("tasks").select("id", { count: "exact", head: true }).lt("due_date", today).neq("status", "done"),
      supabase.from("approvals").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
      supabase.from("rfis").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review", "revise_resubmit"]),
      supabase.from("submittals").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
      supabase
        .from("daily_reports")
        .select("id, report_date, work_completed, status, project_id, projects(name), author:profiles!daily_reports_author_id_fkey(full_name)")
        .order("report_date", { ascending: false })
        .limit(5),
    ]);

    return {
      kpis: {
        totalProjects: projectsAll.count ?? 0,
        activeProjects: projectsActive.count ?? 0,
        delayedTasks: tasksDelayed.count ?? 0,
        pendingApprovals: approvalsPending.count ?? 0,
        openRfis: rfisOpen.count ?? 0,
        pendingSubmittals: submittalsPending.count ?? 0,
      },
      recentReports: recentReports.data ?? [],
    };
  });

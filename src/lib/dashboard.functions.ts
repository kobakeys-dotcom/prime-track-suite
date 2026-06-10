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
      tasksForChart,
      criticalRfis,
      criticalTasks,
      criticalDocs,
    ] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("tasks").select("id", { count: "exact", head: true }).lt("due_date", today).neq("status", "done"),
      supabase.from("approvals").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
      supabase.from("rfis").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review", "revise_resubmit"]),
      supabase.from("submittals").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
      supabase
        .from("daily_reports")
        .select("id, report_date, work_completed, status, project_id, author_id, projects(name)")
        .order("report_date", { ascending: false })
        .limit(5),
      supabase.from("tasks").select("due_date, completed_at, status"),
      supabase.from("rfis").select("id, subject, due_date").lt("due_date", today).in("status", ["submitted", "under_review", "revise_resubmit"]).limit(3),
      supabase.from("tasks").select("id, title, due_date").lt("due_date", today).neq("status", "done").neq("status", "cancelled").limit(3),
      supabase.from("documents").select("id, name, expires_at").gte("expires_at", today).lte("expires_at", new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)).limit(3),
    ]);

    const authorIds = Array.from(new Set((recentReports.data ?? []).map((r: any) => r.author_id).filter(Boolean)));
    const { data: authors } = authorIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] as { id: string; full_name: string | null }[] };
    const authorMap = new Map((authors ?? []).map((a) => [a.id, a.full_name]));
    const reports = (recentReports.data ?? []).map((r: any) => ({
      ...r,
      author_name: authorMap.get(r.author_id) ?? "—",
      project_name: r.projects?.name ?? "—",
    }));

    // Build planned vs actual cumulative bar chart over last 6 months
    const months: { key: string; label: string; planned: number; actual: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString(undefined, { month: "short" }).toUpperCase(),
        planned: 0,
        actual: 0,
      });
    }
    const findMonth = (iso?: string | null) => {
      if (!iso) return null;
      const k = iso.slice(0, 7);
      return months.find((m) => m.key === k);
    };
    (tasksForChart.data ?? []).forEach((t: any) => {
      const p = findMonth(t.due_date);
      if (p) p.planned += 1;
      if (t.status === "done") {
        const a = findMonth(t.completed_at);
        if (a) a.actual += 1;
      }
    });

    const alerts: { kind: "task" | "rfi" | "doc"; title: string; body: string; date: string }[] = [];
    (criticalTasks.data ?? []).forEach((t: any) =>
      alerts.push({ kind: "task", title: "Task overdue", body: t.title, date: t.due_date }),
    );
    (criticalRfis.data ?? []).forEach((r: any) =>
      alerts.push({ kind: "rfi", title: "RFI overdue", body: r.subject, date: r.due_date }),
    );
    (criticalDocs.data ?? []).forEach((d: any) =>
      alerts.push({ kind: "doc", title: "Document expiring", body: d.name, date: d.expires_at }),
    );

    return {
      kpis: {
        totalProjects: projectsAll.count ?? 0,
        activeProjects: projectsActive.count ?? 0,
        delayedTasks: tasksDelayed.count ?? 0,
        pendingApprovals: approvalsPending.count ?? 0,
        openRfis: rfisOpen.count ?? 0,
        pendingSubmittals: submittalsPending.count ?? 0,
      },
      recentReports: reports,
      planVsActual: months.map(({ label, planned, actual }) => ({ month: label, planned, actual })),
      alerts: alerts.slice(0, 6),
    };
  });

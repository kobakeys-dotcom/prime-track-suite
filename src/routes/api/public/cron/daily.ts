import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const key = request.headers.get("apikey") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return !!key && key === expected;
}


async function run() {
  const today = new Date().toISOString().slice(0, 10);
  const created: Array<{ kind: string; count: number }> = [];

  // 1) Overdue tasks → notify assignees
  const { data: overdue } = await supabaseAdmin
    .from("tasks")
    .select("id, title, assignee_id, due_date, project_id")
    .lt("due_date", today)
    .neq("status", "done")
    .neq("status", "cancelled")
    .not("assignee_id", "is", null);

  const overdueRows = (overdue ?? []).map((t) => ({
    user_id: t.assignee_id as string,
    title: "Task overdue",
    body: `${t.title} was due ${t.due_date}`,
    message: `${t.title} was due ${t.due_date}`,
    severity: "warning",
    link: `/tasks`,
  }));
  if (overdueRows.length) await supabaseAdmin.from("notifications").insert(overdueRows);
  created.push({ kind: "overdue_tasks", count: overdueRows.length });

  // 2) Missing daily reports — active projects with no report today → notify project creator
  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("id, name, created_by")
    .eq("status", "active")
    .not("created_by", "is", null);

  const { data: reportsToday } = await supabaseAdmin
    .from("daily_reports")
    .select("project_id")
    .eq("report_date", today);
  const reported = new Set((reportsToday ?? []).map((r) => r.project_id));
  const missingRows = (projects ?? [])
    .filter((p) => !reported.has(p.id))
    .map((p) => ({
      user_id: p.created_by as string,
      title: "Missing daily report",
      body: `No daily report submitted today for ${p.name}`,
    message: `No daily report submitted today for ${p.name}`,
      severity: "warning",
      link: `/daily-reports`,
    }));
  if (missingRows.length) await supabaseAdmin.from("notifications").insert(missingRows);
  created.push({ kind: "missing_daily_reports", count: missingRows.length });

  // 3) Document expiry within 14 days → notify uploader
  const horizon = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const { data: expiring } = await supabaseAdmin
    .from("documents")
    .select("id, name, expires_at, uploaded_by")
    .gte("expires_at", today)
    .lte("expires_at", horizon)
    .not("uploaded_by", "is", null);

  const expiryRows = (expiring ?? []).map((d) => ({
    user_id: d.uploaded_by as string,
    title: "Document expiring soon",
    body: `${d.name} expires on ${d.expires_at}`,
    message: `${d.name} expires on ${d.expires_at}`,
    severity: "warning",
    link: `/documents`,
  }));
  if (expiryRows.length) await supabaseAdmin.from("notifications").insert(expiryRows);
  created.push({ kind: "document_expiry", count: expiryRows.length });

  return Response.json({ ok: true, ran_at: new Date().toISOString(), created });
}

export const Route = createFileRoute("/api/public/cron/daily")({
  server: {
    handlers: {
      GET: async ({ request }) => (authorized(request) ? run() : unauthorized()),
      POST: async ({ request }) => (authorized(request) ? run() : unauthorized()),
    },
  },
});

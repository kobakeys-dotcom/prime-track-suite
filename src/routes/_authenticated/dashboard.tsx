import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ProjectCore" }] }),
  component: Dashboard,
});

const planVsActual = [
  { month: "MAY", planned: 20, actual: 18 },
  { month: "JUN", planned: 38, actual: 35 },
  { month: "JUL", planned: 55, actual: 52 },
  { month: "AUG", planned: 72, actual: 70 },
  { month: "SEP", planned: 88, actual: 0 },
];

function Dashboard() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => fetchStats() });
  const k = data?.kpis;

  const kpis = [
    { label: "Total Projects", value: k?.totalProjects ?? 0 },
    { label: "Active", value: k?.activeProjects ?? 0 },
    { label: "Delayed Tasks", value: k?.delayedTasks ?? 0, alert: true },
    { label: "Pending Approvals", value: k?.pendingApprovals ?? 0 },
    { label: "Open RFIs", value: k?.openRfis ?? 0 },
    { label: "Pending Submittals", value: k?.pendingSubmittals ?? 0 },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Field Operations Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Live overview of every active project under your company.</p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-card p-4 rounded-sm shadow-xs ${kpi.alert ? "border-l-4 border-destructive" : "border border-border"}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
            <p className={`text-2xl font-display font-bold ${kpi.alert ? "text-destructive" : ""}`}>
              {String(kpi.value).padStart(2, "0")}
            </p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 bg-card border border-border rounded-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg uppercase tracking-tight">Planned vs. Actual Progress</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-primary" /> Planned</div>
              <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-accent" /> Actual</div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planVsActual}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Legend wrapperStyle={{ display: "none" }} />
                <Bar dataKey="planned" fill="oklch(0.18 0.02 260)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="actual" fill="oklch(0.705 0.187 41.6)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-4 space-y-4">
          <h3 className="font-display font-bold text-lg uppercase tracking-tight">Critical Alerts</h3>
          <div className="space-y-3">
            <AlertCard tone="red" title="Safety Violation" time="14:20" body="Unauthorized entry in Zone B excavation area reported." />
            <AlertCard tone="orange" title="Material Delay" time="11:05" body="Reinforced steel delivery delayed by 48 hours." />
            <AlertCard tone="blue" title="RFI Overdue" time="09:45" body="Structural calc RFI #104 has exceeded response timeframe." />
          </div>
        </section>
      </div>

      <section className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="font-display font-bold text-lg uppercase tracking-tight">Recent Daily Reports</h3>
        </div>
        {data?.recentReports?.length ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-6 py-3 text-[10px] font-bold uppercase text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase text-muted-foreground">Author</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase text-muted-foreground">Project</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase text-muted-foreground">Work Summary</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {data.recentReports.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="px-6 py-4 font-medium">{r.report_date}</td>
                  <td className="px-6 py-4">{r.author_name}</td>
                  <td className="px-6 py-4 font-mono text-xs uppercase">{r.project_name}</td>
                  <td className="px-6 py-4 text-muted-foreground line-clamp-1">{r.work_completed ?? "—"}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No daily reports yet. They'll appear here as site engineers log them.
          </div>
        )}
      </section>
    </div>
  );
}

function AlertCard({ tone, title, time, body }: { tone: "red" | "orange" | "blue"; title: string; time: string; body: string }) {
  const map = {
    red: "bg-red-50 border-red-100 text-red-900",
    orange: "bg-orange-50 border-orange-100 text-orange-900",
    blue: "bg-blue-50 border-blue-100 text-blue-900",
  } as const;
  const head = {
    red: "text-red-800",
    orange: "text-orange-800",
    blue: "text-blue-800",
  } as const;
  return (
    <div className={`p-4 border rounded-sm ${map[tone]}`}>
      <div className="flex justify-between items-start">
        <p className={`text-xs font-bold uppercase ${head[tone]}`}>{title}</p>
        <span className="text-[10px] font-mono opacity-60">{time}</span>
      </div>
      <p className="text-sm mt-1 leading-tight">{body}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "bg-emerald-100 text-emerald-700",
    approved: "bg-emerald-100 text-emerald-700",
    draft: "bg-muted text-muted-foreground",
  };
  return <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}

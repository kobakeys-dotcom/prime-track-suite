import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, FolderKanban, CalendarRange, ListChecks, FileText, Calculator,
  HelpCircle, FileCheck2, Files, PencilRuler, Stamp, BarChart3, Settings, LogOut, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentContext } from "@/lib/dashboard.functions";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/planning", label: "Planning", icon: CalendarRange },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/daily-reports", label: "Daily Reports", icon: FileText },
  { to: "/boq", label: "BOQ Progress", icon: Calculator },
  { to: "/rfis", label: "RFIs", icon: HelpCircle },
  { to: "/submittals", label: "Submittals", icon: FileCheck2 },
  { to: "/documents", label: "Documents", icon: Files },
  { to: "/drawings", label: "Drawing Register", icon: PencilRuler },
  { to: "/approvals", label: "Approvals", icon: Stamp },
  { to: "/reports", label: "Reports", icon: BarChart3 },
] as const;

function AuthedLayout() {
  const navigate = useNavigate();
  const fetchCtx = useServerFn(getCurrentContext);
  const { data: ctx } = useQuery({ queryKey: ["me"], queryFn: () => fetchCtx() });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar companyName={ctx?.profile?.company?.name} />
      <main className="flex-1 flex flex-col min-w-0">
        <Header userName={ctx?.profile?.full_name} />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Sidebar({ companyName }: { companyName?: string | null }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="size-8 bg-accent rounded flex items-center justify-center text-white font-display font-bold">PC</div>
        <div className="min-w-0">
          <div className="text-white font-display font-bold tracking-tight">ProjectCore</div>
          {companyName && <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60 truncate">{companyName}</div>}
        </div>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto text-sm">
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                active ? "bg-sidebar-accent text-white" : "hover:text-white hover:bg-sidebar-accent/50",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-0.5">
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:text-white hover:bg-sidebar-accent/50">
          <Settings className="size-4" /> Settings
        </Link>
        <button
          onClick={async () => { await supabase.auth.signOut(); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:text-white hover:bg-sidebar-accent/50"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}

function Header({ userName }: { userName?: string | null }) {
  const [q, setQ] = useState("");
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded">System Active</span>
        <span className="text-xs text-muted-foreground hidden md:inline">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="bg-muted text-sm rounded-md pl-9 pr-4 py-1.5 w-64 outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium leading-tight">{userName ?? "—"}</div>
          </div>
          <div className="size-9 bg-muted rounded-full border border-border flex items-center justify-center font-display font-bold text-sm">
            {(userName ?? "?").slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

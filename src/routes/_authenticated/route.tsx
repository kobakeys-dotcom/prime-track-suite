import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, FolderKanban, CalendarRange, ListChecks, FileText, Calculator,
  HelpCircle, FileCheck2, Files, PencilRuler, Stamp, BarChart3, Settings, LogOut, Search, History,
  Truck, ShoppingCart, Package, ClipboardList, ShieldCheck, AlertTriangle, AlertOctagon, ListTodo,
  Users, Wrench, Clock, Flag, Sparkles, UserCheck, Building2, Receipt, FileSignature, Tag, Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentContext } from "@/lib/dashboard.functions";
import { useServerFn } from "@tanstack/react-start";
import { NotificationsBell } from "@/components/notifications-bell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    return { user: data.user };
  },

  component: AuthedLayout,
});

const sections: { label: string; items: { to: string; label: string; icon: any }[] }[] = [
  { label: "Overview", items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/client", label: "Client Portal", icon: UserCheck },
  ]},
  { label: "Planning", items: [
    { to: "/planning", label: "Gantt", icon: CalendarRange },
    { to: "/tasks", label: "Tasks", icon: ListChecks },
    { to: "/wbs", label: "WBS", icon: ListChecks },
    { to: "/milestones", label: "Milestones", icon: Flag },
  ]},
  { label: "Execution", items: [
    { to: "/daily-reports", label: "Daily Reports", icon: FileText },
    { to: "/issues", label: "Issues", icon: AlertOctagon },
    { to: "/snags", label: "Snag List", icon: ListTodo },
    { to: "/meetings", label: "Meetings", icon: ClipboardList },
    { to: "/action-items", label: "Action Items", icon: ListTodo },
  ]},
  { label: "Approvals", items: [
    { to: "/approvals", label: "Approval Inbox", icon: Stamp },
    { to: "/rfis", label: "RFIs", icon: HelpCircle },
    { to: "/submittals", label: "Submittals", icon: FileCheck2 },
  ]},
  { label: "Cost Control", items: [
    { to: "/boq", label: "BOQ", icon: Calculator },
    { to: "/cost-codes", label: "Cost Codes", icon: Tag },
    { to: "/variations", label: "Variations", icon: FileSignature },
    { to: "/payment-claims", label: "Payment Claims", icon: Receipt },
    { to: "/budget", label: "Budget vs Actual", icon: BarChart3 },
    { to: "/cash-flow", label: "Cash Flow", icon: BarChart3 },
  ]},
  { label: "Procurement", items: [
    { to: "/procurement", label: "Material Requests", icon: ShoppingCart },
    { to: "/rfqs", label: "RFQs", icon: FileText },
    { to: "/purchase-orders", label: "Purchase Orders", icon: Package },
    { to: "/deliveries", label: "Deliveries", icon: Truck },
    { to: "/suppliers", label: "Suppliers", icon: Building2 },
  ]},
  { label: "Quality & Safety", items: [
    { to: "/quality", label: "Quality Inspections", icon: ShieldCheck },
    { to: "/safety", label: "Safety Inspections", icon: ShieldCheck },
    { to: "/ncrs", label: "NCRs", icon: AlertTriangle },
    { to: "/risks", label: "Risk Register", icon: AlertTriangle },
  ]},
  { label: "Resources", items: [
    { to: "/resources", label: "Manpower", icon: Users },
    { to: "/equipment", label: "Equipment", icon: Wrench },
    { to: "/timesheets", label: "Timesheets", icon: Clock },
  ]},
  { label: "Documents", items: [
    { to: "/documents", label: "Document Manager", icon: Files },
    { to: "/drawings", label: "Drawing Register", icon: PencilRuler },
  ]},
  { label: "Insights", items: [
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/report-builder", label: "Report Builder", icon: BarChart3 },
    { to: "/ai", label: "AI Assistant", icon: Sparkles },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/permissions", label: "Permissions", icon: Stamp },
    { to: "/audit", label: "Audit Log", icon: History },
    { to: "/audit-summary", label: "Audit Summary", icon: History },
  ]},
];

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
  const activeSection = useMemo(() => {
    const found = sections.find((s) =>
      s.items.some((i) => pathname === i.to || pathname.startsWith(i.to + "/")),
    );
    return found?.label ?? sections[0].label;
  }, [pathname]);
  const [openSection, setOpenSection] = useState<string>(activeSection);
  useEffect(() => { setOpenSection(activeSection); }, [activeSection]);

  return (
    <aside
      className="w-[280px] flex flex-col shrink-0 text-sidebar-foreground relative"
      style={{
        background: "linear-gradient(180deg, #072F2D 0%, #062624 100%)",
        borderRight: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Brand */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="size-[42px] rounded-xl flex items-center justify-center font-display font-bold text-[14px] shrink-0"
            style={{
              background: "linear-gradient(135deg, #e6c870 0%, #c9a84c 55%, #a8862f 100%)",
              color: "#0a2420",
              boxShadow: "0 4px 14px -2px rgba(201,168,76,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            PC
          </div>
          <div className="min-w-0">
            <div className="text-white font-display font-semibold tracking-tight text-[17px] leading-tight">
              ProjectCore
            </div>
            {companyName && (
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#7FB3AA] truncate mt-1 font-medium">
                {companyName}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto text-sm">
        {sections.map((section) => {
          const isOpen = openSection === section.label;
          const sectionActive = section.items.some(
            (i) => pathname === i.to || pathname.startsWith(i.to + "/"),
          );
          return (
            <div key={section.label} className="select-none">
              <button
                onClick={() => setOpenSection(isOpen ? "" : section.label)}
                aria-expanded={isOpen}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 h-10 rounded-[10px] text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-150",
                  sectionActive
                    ? "text-white bg-white/[0.035]"
                    : "text-[#94A3B8] hover:text-white hover:bg-white/[0.025]",
                )}
              >
                <span className="truncate">{section.label}</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200 opacity-60",
                    isOpen && "rotate-180 opacity-90",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-200 ease-out",
                  isOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <div className="space-y-0.5 pb-1">
                    {section.items.map((item) => {
                      const active =
                        pathname === item.to || pathname.startsWith(item.to + "/");
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group relative flex items-center gap-3 pl-[34px] pr-3 h-[38px] rounded-[10px] transition-all duration-150 text-[13.5px]",
                            active
                              ? "text-white font-semibold"
                              : "text-[#94A3B8] hover:text-white hover:bg-white/[0.04] font-medium",
                          )}
                          style={
                            active ? { background: "rgba(20,184,166,0.13)" } : undefined
                          }
                        >
                          {active && (
                            <span
                              className="absolute left-1.5 top-2 bottom-2 w-[3px] rounded-full"
                              style={{
                                background: "#14B8A6",
                                boxShadow: "0 0 8px rgba(20,184,166,0.55)",
                              }}
                            />
                          )}
                          <Icon
                            className={cn(
                              "size-[17px] shrink-0 transition-colors",
                              active
                                ? "text-[#5EEAD4]"
                                : "text-[#7FB3AA] group-hover:text-[#A7D8CF]",
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-white/[0.05] space-y-0.5">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3.5 h-10 rounded-[10px] text-[13.5px] font-medium text-[#94A3B8] hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <Settings className="size-[17px] text-[#7FB3AA]" /> Settings
        </Link>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
          }}
          className="w-full flex items-center gap-3 px-3.5 h-10 rounded-[10px] text-[13.5px] font-medium text-[#94A3B8] hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <LogOut className="size-[17px] text-[#7FB3AA]" /> Sign out
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
        <NotificationsBell />
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

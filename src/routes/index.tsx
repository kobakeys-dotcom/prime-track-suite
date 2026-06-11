import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import {
  ArrowRight, CheckCircle2, ShieldCheck, BarChart3, FileCheck2, Calculator,
  Truck, HardHat, FolderKanban, Sparkles, Users, Building2, Wrench, ClipboardCheck,
  TrendingUp, Clock, AlertTriangle, FileText, Layers, Zap,
} from "lucide-react";
import { AuthDialog } from "@/components/auth-dialog";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProjectCore — Project Management Automation for Construction & Engineering" },
      { name: "description", content: "Manage projects, tasks, approvals, RFIs, submittals, BOQ, cost control, procurement, quality, safety, documents and client communication in one premium platform." },
      { property: "og:title", content: "ProjectCore — Project Control Automation" },
      { property: "og:description", content: "Plan, execute, approve, and report across every project in one platform." },
    ],
  }),
  component: Landing,
});

// Emerald Prestige palette
const C = {
  ink: "#0b1f1a",
  forest: "#064e3b",
  emerald: "#0d7a5f",
  gold: "#c9a84c",
  cream: "#f5f0e0",
  paper: "#fbfaf5",
};

function Landing() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const openAuth = (m: "signin" | "signup") => { setAuthMode(m); setAuthOpen(true); };

  return (
    <div
      className="min-h-screen"
      style={{
        background: C.paper,
        color: C.ink,
        fontFamily: '"Manrope", system-ui, sans-serif',
      }}
    >
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />

      <style>{`
        .pc-display { font-family: "Sora", system-ui, sans-serif; letter-spacing: -0.02em; }
        .pc-hero-bg {
          background:
            radial-gradient(1100px 500px at 85% -10%, rgba(201,168,76,0.20), transparent 60%),
            radial-gradient(900px 600px at -10% 20%, rgba(13,122,95,0.18), transparent 60%),
            linear-gradient(180deg, #fbfaf5 0%, #f5f0e0 100%);
        }
        .pc-card { background: #ffffff; border: 1px solid rgba(11,31,26,0.08); border-radius: 14px; }
        .pc-shadow { box-shadow: 0 1px 0 rgba(11,31,26,0.04), 0 24px 48px -28px rgba(6,78,59,0.25); }
        .pc-chip { background: rgba(13,122,95,0.08); color: ${C.forest}; border: 1px solid rgba(13,122,95,0.18); }
        .pc-btn-primary { background: ${C.forest}; color: #fff; }
        .pc-btn-primary:hover { background: ${C.emerald}; }
        .pc-btn-ghost { background: transparent; color: ${C.ink}; border: 1px solid rgba(11,31,26,0.15); }
        .pc-btn-ghost:hover { background: rgba(11,31,26,0.04); }
        .pc-gold { color: ${C.gold}; }
        .pc-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(11,31,26,0.12), transparent); }
      `}</style>

      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur" style={{ background: "rgba(251,250,245,0.85)", borderBottom: "1px solid rgba(11,31,26,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg grid place-items-center" style={{ background: C.forest }}>
              <span className="pc-display font-bold text-white">PC</span>
            </div>
            <span className="pc-display font-bold text-lg">ProjectCore</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: "rgba(11,31,26,0.7)" }}>
            <a href="#features" className="hover:text-emerald-800">Features</a>
            <a href="#workflow" className="hover:text-emerald-800">Workflow</a>
            <a href="#industries" className="hover:text-emerald-800">Industries</a>
            <a href="#ai" className="hover:text-emerald-800">AI</a>
            <a href="#pricing" className="hover:text-emerald-800">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => openAuth("signin")} className="pc-btn-ghost px-4 h-9 rounded-md text-sm font-semibold inline-flex items-center">Sign in</button>
            <button onClick={() => openAuth("signup")} className="pc-btn-primary px-4 h-9 rounded-md text-sm font-semibold inline-flex items-center gap-1.5">
              Start free <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="pc-hero-bg">
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <span className="pc-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="size-3" /> Built for construction & engineering teams
            </span>
            <h1 className="pc-display mt-6 text-5xl md:text-6xl font-bold leading-[1.05]">
              Project control,<br />
              <span style={{ color: C.forest }}>automated end‑to‑end.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed max-w-xl" style={{ color: "rgba(11,31,26,0.72)" }}>
              Manage projects, tasks, approvals, RFIs, submittals, BOQ, cost, procurement, quality,
              safety, documents and client communication — in one premium platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => openAuth("signup")} className="pc-btn-primary px-6 h-12 rounded-md font-semibold inline-flex items-center gap-2 text-sm">
                Start managing projects <ArrowRight className="size-4" />
              </button>
              <Link to="/dashboard" className="pc-btn-ghost px-6 h-12 rounded-md font-semibold inline-flex items-center gap-2 text-sm">
                View live demo
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: "rgba(11,31,26,0.6)" }}>
              {["No credit card", "Role-based access", "Client portal included"].map((t) => (
                <div key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" style={{ color: C.emerald }} /> {t}
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="lg:col-span-6">
            <div className="pc-card pc-shadow overflow-hidden">
              <div className="flex items-center gap-2 px-4 h-9 border-b" style={{ borderColor: "rgba(11,31,26,0.06)" }}>
                <span className="size-2.5 rounded-full bg-red-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-[11px] font-mono" style={{ color: "rgba(11,31,26,0.5)" }}>projectcore.app/dashboard</span>
              </div>
              <div className="p-5 space-y-4" style={{ background: "#fff" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(11,31,26,0.5)" }}>Field Operations</div>
                    <div className="pc-display text-lg font-bold">Riverside Tower — Phase 2</div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(13,122,95,0.12)", color: C.forest }}>On Track</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { l: "Progress", v: "68%", c: C.forest },
                    { l: "Tasks", v: "142", c: C.ink },
                    { l: "RFIs", v: "07", c: C.gold },
                    { l: "Budget", v: "+2.1%", c: C.emerald },
                  ].map((k) => (
                    <div key={k.l} className="rounded-lg p-3" style={{ background: C.paper }}>
                      <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(11,31,26,0.55)" }}>{k.l}</div>
                      <div className="pc-display text-xl font-bold mt-1" style={{ color: k.c }}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg p-4" style={{ background: C.paper }}>
                  <div className="flex items-end gap-1.5 h-24">
                    {[40, 55, 48, 70, 62, 80, 72, 88, 75, 92, 85, 96].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i % 2 ? C.emerald : C.forest, opacity: 0.85 }} />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[9px] font-mono" style={{ color: "rgba(11,31,26,0.5)" }}>
                    <span>JAN</span><span>DEC</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { i: AlertTriangle, t: "NCR-024 awaiting approval", c: "#b45309" },
                    { i: FileCheck2, t: "Submittal SUB-118 approved", c: C.emerald },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-md" style={{ background: C.paper }}>
                      <r.i className="size-4" style={{ color: r.c }} />
                      <span className="text-sm">{r.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y" style={{ borderColor: "rgba(11,31,26,0.08)", background: "#fff" }}>
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
          {[
            { i: Zap, t: "Faster approvals" },
            { i: TrendingUp, t: "Project visibility" },
            { i: Calculator, t: "Cost control" },
            { i: BarChart3, t: "Real-time reports" },
            { i: Users, t: "Client portal" },
            { i: Sparkles, t: "AI insights" },
          ].map((b) => (
            <div key={b.t} className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: "rgba(11,31,26,0.7)" }}>
              <b.i className="size-4" style={{ color: C.gold }} /> {b.t}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Platform</div>
          <h2 className="pc-display text-4xl font-bold mt-2">Everything a project needs — in one system.</h2>
          <p className="mt-3" style={{ color: "rgba(11,31,26,0.65)" }}>
            Modular by design. Each capability is built for the rhythm of real construction, engineering and enterprise projects.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { i: FolderKanban, t: "Project Planning", d: "WBS, milestones, baselines, dependencies." },
            { i: ClipboardCheck, t: "Tasks & Gantt", d: "Schedules, assignments, critical path." },
            { i: FileText, t: "RFIs & Submittals", d: "Track clarifications and approvals end-to-end." },
            { i: Calculator, t: "BOQ & Cost", d: "Budgets, variations, payment claims, cash flow." },
            { i: Truck, t: "Procurement", d: "Material requests, RFQs, POs, deliveries." },
            { i: ShieldCheck, t: "Quality & Safety", d: "Inspections, NCRs, corrective actions." },
            { i: Layers, t: "Document Control", d: "Drawings, revisions, transmittals." },
            { i: Sparkles, t: "AI Assistant", d: "Summaries, delay analysis, report drafting." },
          ].map((f) => (
            <div key={f.t} className="pc-card p-6 hover:pc-shadow transition-all">
              <div className="size-10 rounded-lg grid place-items-center" style={{ background: "rgba(13,122,95,0.10)" }}>
                <f.i className="size-5" style={{ color: C.forest }} />
              </div>
              <div className="pc-display font-bold text-lg mt-4">{f.t}</div>
              <div className="text-sm mt-1" style={{ color: "rgba(11,31,26,0.6)" }}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="py-24" style={{ background: C.cream }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Workflow</div>
            <h2 className="pc-display text-4xl font-bold mt-2">One continuous loop from plan to handover.</h2>
          </div>
          <div className="mt-14 grid grid-cols-2 md:grid-cols-6 gap-3">
            {["Plan", "Execute", "Track", "Approve", "Report", "Handover"].map((s, i) => (
              <div key={s} className="pc-card p-5 text-center relative">
                <div className="pc-display text-3xl font-bold" style={{ color: C.gold }}>0{i + 1}</div>
                <div className="pc-display font-bold mt-2">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section id="industries" className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Industries</div>
            <h2 className="pc-display text-4xl font-bold mt-2">Trusted across every kind of project.</h2>
            <p className="mt-3" style={{ color: "rgba(11,31,26,0.65)" }}>
              From a single contractor team to a government-scale program — ProjectCore adapts to your structure, roles and reporting.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { i: HardHat, t: "Construction" },
              { i: Wrench, t: "Engineering" },
              { i: Building2, t: "Government" },
              { i: Users, t: "Consultants" },
              { i: ClipboardCheck, t: "Contractors" },
              { i: Layers, t: "Maintenance" },
            ].map((x) => (
              <div key={x.t} className="pc-card p-5 flex items-center gap-3">
                <div className="size-9 rounded-md grid place-items-center" style={{ background: C.forest }}>
                  <x.i className="size-4 text-white" />
                </div>
                <span className="pc-display font-bold">{x.t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section id="ai" className="relative overflow-hidden" style={{ background: C.ink, color: "#fff" }}>
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(800px 400px at 80% 20%, rgba(201,168,76,0.4), transparent 60%)" }} />
        <div className="max-w-7xl mx-auto px-6 py-24 relative grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="pc-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider" style={{ background: "rgba(201,168,76,0.15)", color: C.gold, borderColor: "rgba(201,168,76,0.3)" }}>
              <Sparkles className="size-3" /> AI Automation
            </span>
            <h2 className="pc-display text-4xl font-bold mt-5">Less admin. Sharper decisions.</h2>
            <p className="mt-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              The built-in AI assistant summarises projects, flags delays, drafts RFIs and variations, and turns raw site data into readable reports.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Auto project summaries & weekly reports",
                "Delay & risk pattern analysis",
                "Meeting & action item summaries",
                "RFI / variation drafting assistance",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4" style={{ color: C.gold }} /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="pc-card p-6" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}>
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.gold }}>AI Summary — Riverside Tower</div>
            <div className="pc-display font-bold mt-2">Weekly project pulse</div>
            <div className="mt-4 space-y-3 text-sm" style={{ color: "rgba(255,255,255,0.78)" }}>
              <p>• Progress at <b style={{ color: "#fff" }}>68%</b>, tracking <b style={{ color: C.gold }}>2 days ahead</b> of baseline.</p>
              <p>• <b style={{ color: "#fff" }}>3 critical risks</b> detected on MEP coordination — recommend escalation.</p>
              <p>• Cost variance <b style={{ color: C.gold }}>+2.1%</b> driven by steel revisions; mitigation plan attached.</p>
            </div>
            <button className="mt-5 px-4 h-10 rounded-md text-sm font-semibold inline-flex items-center gap-2" style={{ background: C.gold, color: C.ink }}>
              Generate full report <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* CLIENT PORTAL */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div className="pc-card pc-shadow p-8">
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Client Portal Preview</div>
          <div className="pc-display text-2xl font-bold mt-2">Harbour Logistics — Project Progress</div>
          <div className="mt-6">
            <div className="flex justify-between text-xs font-semibold" style={{ color: "rgba(11,31,26,0.6)" }}>
              <span>Overall Progress</span><span>72%</span>
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: C.cream }}>
              <div className="h-full rounded-full" style={{ width: "72%", background: `linear-gradient(90deg, ${C.forest}, ${C.emerald})` }} />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[{ l: "Reports", v: "12" }, { l: "Drawings", v: "48" }, { l: "RFIs", v: "03" }].map((x) => (
              <div key={x.l} className="rounded-lg p-3" style={{ background: C.paper }}>
                <div className="pc-display text-xl font-bold">{x.v}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "rgba(11,31,26,0.55)" }}>{x.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Client Portal</div>
          <h2 className="pc-display text-4xl font-bold mt-2">A polished window for your clients.</h2>
          <p className="mt-3" style={{ color: "rgba(11,31,26,0.65)" }}>
            Share approved reports, drawings and progress with controlled visibility — without exposing internal cost, supplier, or HR data.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {["Branded, role-aware access", "Approved reports & documents only", "Real-time progress dashboards", "Audit-tracked downloads"].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="size-4" style={{ color: C.emerald }} /> {t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section id="pricing" className="py-24" style={{ background: C.cream }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Pricing</div>
          <h2 className="pc-display text-4xl font-bold mt-2">Flexible plans for every project team.</h2>
          <p className="mt-3 max-w-xl mx-auto" style={{ color: "rgba(11,31,26,0.65)" }}>
            From small contractor squads to enterprise consultants — pick the tier that matches your portfolio.
          </p>
          <div className="mt-12 grid md:grid-cols-3 gap-5 text-left">
            {[
              { n: "Starter", p: "For small teams", f: ["Up to 5 users", "3 active projects", "Core modules"] },
              { n: "Professional", p: "Most popular", f: ["Up to 50 users", "Unlimited projects", "AI assistant", "Client portal"], featured: true },
              { n: "Enterprise", p: "For programs", f: ["SSO + advanced roles", "Custom workflows", "Dedicated support"] },
            ].map((tier) => (
              <div
                key={tier.n}
                className="pc-card p-7 relative"
                style={tier.featured ? { borderColor: C.forest, boxShadow: `0 24px 48px -28px ${C.forest}` } : {}}
              >
                {tier.featured && (
                  <span className="absolute -top-3 left-7 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: C.gold, color: C.ink }}>Popular</span>
                )}
                <div className="pc-display font-bold text-xl">{tier.n}</div>
                <div className="text-sm" style={{ color: "rgba(11,31,26,0.6)" }}>{tier.p}</div>
                <ul className="mt-5 space-y-2 text-sm">
                  {tier.f.map((x) => <li key={x} className="flex items-center gap-2"><CheckCircle2 className="size-4" style={{ color: C.emerald }} /> {x}</li>)}
                </ul>
                <button onClick={() => openAuth("signup")} className="mt-6 w-full inline-flex items-center justify-center h-10 rounded-md text-sm font-semibold" style={tier.featured ? { background: C.forest, color: "#fff" } : { background: "transparent", color: C.ink, border: "1px solid rgba(11,31,26,0.15)" }}>
                  Get started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="pc-card pc-shadow p-12 md:p-16 text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.ink})`, color: "#fff", borderColor: "transparent" }}>
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(600px 300px at 80% 0%, rgba(201,168,76,0.6), transparent 60%)" }} />
          <h2 className="pc-display text-4xl md:text-5xl font-bold relative">Bring every project into one platform.</h2>
          <p className="mt-4 max-w-2xl mx-auto relative" style={{ color: "rgba(255,255,255,0.75)" }}>
            Teams, documents, approvals, cost and reporting — unified, automated, and always audit-ready.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 relative">
            <button onClick={() => openAuth("signup")} className="px-6 h-12 rounded-md font-semibold inline-flex items-center gap-2 text-sm" style={{ background: C.gold, color: C.ink }}>
              Start free trial <ArrowRight className="size-4" />
            </button>
            <Link to="/dashboard" className="px-6 h-12 rounded-md font-semibold inline-flex items-center gap-2 text-sm" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
              Explore live demo
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t" style={{ borderColor: "rgba(11,31,26,0.08)" }}>
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg grid place-items-center" style={{ background: C.forest }}>
                <span className="pc-display font-bold text-white text-sm">PC</span>
              </div>
              <span className="pc-display font-bold">ProjectCore</span>
            </div>
            <p className="mt-3" style={{ color: "rgba(11,31,26,0.6)" }}>Project control automation for modern teams.</p>
          </div>
          <div>
            <div className="pc-display font-bold mb-3">Modules</div>
            <ul className="space-y-1.5" style={{ color: "rgba(11,31,26,0.65)" }}>
              <li>Projects & Planning</li><li>RFIs & Submittals</li><li>BOQ & Cost</li><li>Procurement</li>
            </ul>
          </div>
          <div>
            <div className="pc-display font-bold mb-3">Company</div>
            <ul className="space-y-1.5" style={{ color: "rgba(11,31,26,0.65)" }}>
              <li>About</li><li>Customers</li><li>Contact</li>
            </ul>
          </div>
          <div>
            <div className="pc-display font-bold mb-3">Get started</div>
            <button onClick={() => openAuth("signup")} className="pc-btn-primary px-4 h-9 rounded-md text-sm font-semibold inline-flex items-center gap-1.5">
              Sign in <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="border-t" style={{ borderColor: "rgba(11,31,26,0.08)" }}>
          <div className="max-w-7xl mx-auto px-6 py-5 text-xs flex flex-wrap justify-between gap-2" style={{ color: "rgba(11,31,26,0.5)" }}>
            <div>© {new Date().getFullYear()} ProjectCore. All rights reserved.</div>
            <div className="flex gap-5"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Security</a></div>
          </div>
        </div>
      </footer>
    </div>
  );
}

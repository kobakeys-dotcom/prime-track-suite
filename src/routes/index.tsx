import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import {
  ArrowRight, CheckCircle2, ShieldCheck, BarChart3, FileCheck2, Calculator,
  Truck, HardHat, FolderKanban, Sparkles, Users, Building2, Wrench, ClipboardCheck,
  TrendingUp, Clock, AlertTriangle, FileText, Layers, Zap, Star, Quote, Globe,
  Lock, Cpu, Workflow, MessageSquare, Calendar, DollarSign, Activity, ChevronDown,
  PlayCircle, ArrowUpRight, MapPin, Award, Headphones, Plus, Minus,
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

// Animated counter hook
function useCountUp(target: number, duration = 1800, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return val;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

function Stat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, seen } = useInView<HTMLDivElement>();
  const v = useCountUp(value, 1800, seen);
  const display = value >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1);
  return (
    <div ref={ref} className="text-center">
      <div className="pc-display text-5xl md:text-6xl font-extrabold" style={{ color: C.gold }}>
        {display}{suffix}
      </div>
      <div className="mt-2 text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>{label}</div>
    </div>
  );
}

function Landing() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [activeTab, setActiveTab] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const openAuth = (m: "signin" | "signup") => { setAuthMode(m); setAuthOpen(true); };

  const tabs = [
    {
      name: "Planning", icon: FolderKanban,
      title: "Plan with surgical precision",
      desc: "Build WBS, baselines and Gantt schedules with dependencies, milestones and critical-path detection.",
      bullets: ["Drag-and-drop Gantt", "Baseline vs actual variance", "Auto critical path", "Milestone roll-ups"],
    },
    {
      name: "Execution", icon: Activity,
      title: "Run the field, not the paperwork",
      desc: "Daily reports, manpower, equipment, deliveries and inspections — captured on site, synced in real time.",
      bullets: ["Mobile daily reports", "Photo + GPS evidence", "Equipment & manpower logs", "Offline sync"],
    },
    {
      name: "Cost", icon: Calculator,
      title: "Always know where the money is",
      desc: "BOQ progress, variations, payment claims, cost codes and cash flow — all connected to the schedule.",
      bullets: ["Auto IPC calculation", "Variation register", "Budget vs actual", "Cash-flow forecast"],
    },
    {
      name: "Quality", icon: ShieldCheck,
      title: "Compliance built into every step",
      desc: "Inspections, NCRs, snags, safety walks and corrective actions — with full audit trail and sign-off.",
      bullets: ["ITP & checklists", "NCR workflow", "Safety incident log", "Audit-grade history"],
    },
  ];

  const testimonials = [
    { name: "Sara Al‑Mansoori", role: "Project Director", company: "Marsa Construction", quote: "We replaced four tools with ProjectCore. Approvals that took a week now close in a day.", rating: 5 },
    { name: "James O'Connor", role: "Operations Lead", company: "Northline Engineering", quote: "The cost and BOQ link to the schedule is the cleanest I've seen. Our reporting writes itself.", rating: 5 },
    { name: "Ravi Subramanian", role: "Head of PMO", company: "Helix Infrastructure", quote: "Auditors love the trail. Site teams love the mobile reports. Everyone wins.", rating: 5 },
  ];

  const faqs = [
    { q: "How quickly can my team get started?", a: "Most teams are running their first project within a day. Invite users, import your BOQ, and ProjectCore configures the rest." },
    { q: "Does ProjectCore support multiple companies and projects?", a: "Yes. Multi-tenant by design with strict role-based access. Manage unlimited projects under a single workspace on Professional and above." },
    { q: "Can we customise approval workflows?", a: "Approval chains, signatories and notifications are fully configurable per company and per module." },
    { q: "Is my data secure?", a: "Bank-grade encryption in transit and at rest, role-aware row-level security, full audit logging and SOC2-aligned controls." },
    { q: "Do you offer a client portal?", a: "Yes — a branded, read-only portal so clients see only what you publish: approved reports, progress and selected documents." },
    { q: "Can we export our data?", a: "Always. Export to Excel, PDF or via API. Your data is yours." },
  ];

  return (
    <div
      className="min-h-screen overflow-x-hidden"
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
            radial-gradient(1100px 500px at 85% -10%, rgba(201,168,76,0.22), transparent 60%),
            radial-gradient(900px 600px at -10% 20%, rgba(13,122,95,0.20), transparent 60%),
            linear-gradient(180deg, #fbfaf5 0%, #f5f0e0 100%);
        }
        .pc-grid-bg {
          background-image:
            linear-gradient(rgba(11,31,26,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(11,31,26,0.04) 1px, transparent 1px);
          background-size: 56px 56px;
        }
        .pc-card { background: #ffffff; border: 1px solid rgba(11,31,26,0.08); border-radius: 14px; transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease; }
        .pc-card:hover { transform: translateY(-3px); border-color: rgba(13,122,95,0.25); box-shadow: 0 24px 48px -28px rgba(6,78,59,0.30); }
        .pc-shadow { box-shadow: 0 1px 0 rgba(11,31,26,0.04), 0 24px 48px -28px rgba(6,78,59,0.25); }
        .pc-chip { background: rgba(13,122,95,0.08); color: ${C.forest}; border: 1px solid rgba(13,122,95,0.18); }
        .pc-btn-primary { background: ${C.forest}; color: #fff; transition: all .2s; }
        .pc-btn-primary:hover { background: ${C.emerald}; box-shadow: 0 10px 24px -10px ${C.forest}; transform: translateY(-1px); }
        .pc-btn-ghost { background: transparent; color: ${C.ink}; border: 1px solid rgba(11,31,26,0.15); transition: all .2s; }
        .pc-btn-ghost:hover { background: rgba(11,31,26,0.04); border-color: rgba(11,31,26,0.3); }
        .pc-gold { color: ${C.gold}; }
        .pc-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(11,31,26,0.12), transparent); }

        @keyframes pc-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .pc-float { animation: pc-float 6s ease-in-out infinite; }
        @keyframes pc-float-slow { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-14px) rotate(2deg)} }
        .pc-float-slow { animation: pc-float-slow 9s ease-in-out infinite; }

        @keyframes pc-fade-up { from { opacity:0; transform: translateY(24px);} to { opacity:1; transform:none; } }
        .pc-reveal { opacity: 0; animation: pc-fade-up .9s ease-out forwards; }
        .pc-d1 { animation-delay: .05s } .pc-d2 { animation-delay: .15s } .pc-d3 { animation-delay: .25s }
        .pc-d4 { animation-delay: .35s } .pc-d5 { animation-delay: .45s }

        @keyframes pc-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .pc-marquee-track { display:flex; gap:48px; width:max-content; animation: pc-marquee 28s linear infinite; }

        @keyframes pc-pulse-ring { 0%{ box-shadow: 0 0 0 0 rgba(201,168,76,0.6)} 70%{ box-shadow: 0 0 0 18px rgba(201,168,76,0)} 100%{ box-shadow: 0 0 0 0 rgba(201,168,76,0)} }
        .pc-pulse { animation: pc-pulse-ring 2.4s infinite; }

        @keyframes pc-bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .pc-bar { transform-origin: bottom; animation: pc-bar-grow .9s cubic-bezier(.2,.7,.2,1) forwards; }

        @keyframes pc-tick { 0%{ transform: scale(0)} 60%{ transform: scale(1.15)} 100%{ transform: scale(1)} }
        .pc-tick { animation: pc-tick .5s ease-out forwards; }

        .pc-glow { position: relative; }
        .pc-glow::before { content:""; position:absolute; inset:-1px; border-radius: inherit; background: linear-gradient(135deg, ${C.gold}, transparent 40%, ${C.emerald}); opacity:.0; transition: opacity .3s; z-index:-1; filter: blur(8px);}
        .pc-glow:hover::before { opacity:.6 }

        .pc-tab-active { background: ${C.forest}; color:#fff; }
        .pc-tab-active .pc-tab-ic { color: ${C.gold}; }
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
            <a href="#features" className="hover:text-emerald-800 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-emerald-800 transition-colors">Workflow</a>
            <a href="#showcase" className="hover:text-emerald-800 transition-colors">Showcase</a>
            <a href="#industries" className="hover:text-emerald-800 transition-colors">Industries</a>
            <a href="#ai" className="hover:text-emerald-800 transition-colors">AI</a>
            <a href="#pricing" className="hover:text-emerald-800 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-emerald-800 transition-colors">FAQ</a>
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
      <section className="pc-hero-bg relative">
        <div className="absolute inset-0 pc-grid-bg opacity-60 pointer-events-none" />
        {/* floating decorative chips */}
        <div className="hidden lg:block absolute top-28 left-8 pc-float">
          <div className="pc-card pc-shadow px-3 py-2 flex items-center gap-2 text-xs font-semibold" style={{ background: "#fff" }}>
            <div className="size-2 rounded-full pc-pulse" style={{ background: C.gold }} />
            <span>RFI-118 approved</span>
          </div>
        </div>
        <div className="hidden lg:block absolute bottom-24 left-16 pc-float-slow">
          <div className="pc-card pc-shadow px-3 py-2 flex items-center gap-2 text-xs font-semibold" style={{ background: "#fff" }}>
            <TrendingUp className="size-3.5" style={{ color: C.emerald }} /> +12% throughput
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-12 gap-12 items-center relative">
          <div className="lg:col-span-6">
            <span className="pc-chip pc-reveal pc-d1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="size-3" /> Built for construction & engineering teams
            </span>
            <h1 className="pc-display pc-reveal pc-d2 mt-6 text-5xl md:text-7xl font-extrabold leading-[1.02]">
              Project control,<br />
              <span style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                automated end‑to‑end.
              </span>
            </h1>
            <p className="mt-6 pc-reveal pc-d3 text-lg leading-relaxed max-w-xl" style={{ color: "rgba(11,31,26,0.72)" }}>
              Plan, execute and report across every project — tasks, approvals, RFIs, submittals, BOQ, cost,
              procurement, quality, safety and the client portal — in one premium platform.
            </p>
            <div className="mt-8 pc-reveal pc-d4 flex flex-wrap gap-3">
              <button onClick={() => openAuth("signup")} className="pc-btn-primary pc-glow px-6 h-12 rounded-md font-semibold inline-flex items-center gap-2 text-sm">
                Start managing projects <ArrowRight className="size-4" />
              </button>
              <Link to="/dashboard" className="pc-btn-ghost px-6 h-12 rounded-md font-semibold inline-flex items-center gap-2 text-sm">
                <PlayCircle className="size-4" /> Watch live demo
              </Link>
            </div>
            <div className="mt-8 pc-reveal pc-d5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: "rgba(11,31,26,0.6)" }}>
              {["No credit card", "Role-based access", "Client portal included", "SOC2-aligned"].map((t) => (
                <div key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" style={{ color: C.emerald }} /> {t}
                </div>
              ))}
            </div>

            {/* mini badges */}
            <div className="mt-10 flex flex-wrap items-center gap-4 pc-reveal pc-d5">
              <div className="flex items-center gap-1">
                {[0,1,2,3,4].map(i => <Star key={i} className="size-4 fill-current" style={{ color: C.gold }} />)}
              </div>
              <div className="text-sm font-semibold">4.9 / 5 from 240+ project teams</div>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="lg:col-span-6 relative">
            <div className="pc-card pc-shadow overflow-hidden pc-reveal pc-d3 relative">
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
                      <div key={i} className="flex-1 rounded-t pc-bar" style={{ height: `${h}%`, background: i % 2 ? C.emerald : C.forest, opacity: 0.85, animationDelay: `${i * 60}ms` }} />
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

            {/* floating side cards */}
            <div className="hidden md:flex absolute -right-4 -top-6 pc-float">
              <div className="pc-card pc-shadow p-3 w-44" style={{ background: "#fff" }}>
                <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(11,31,26,0.5)" }}>AI Insight</div>
                <div className="text-xs mt-1 font-semibold">2 days ahead of baseline</div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: C.cream }}>
                  <div className="h-full" style={{ width: "68%", background: `linear-gradient(90deg, ${C.forest}, ${C.gold})` }} />
                </div>
              </div>
            </div>
            <div className="hidden md:flex absolute -left-6 bottom-10 pc-float-slow">
              <div className="pc-card pc-shadow p-3 w-44" style={{ background: "#fff" }}>
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-md grid place-items-center" style={{ background: "rgba(13,122,95,0.12)" }}>
                    <ShieldCheck className="size-3.5" style={{ color: C.forest }} />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(11,31,26,0.5)" }}>Inspections</div>
                    <div className="text-xs font-semibold">12 cleared today</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOGO MARQUEE */}
        <div className="relative border-t" style={{ borderColor: "rgba(11,31,26,0.08)", background: "rgba(255,255,255,0.6)" }}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="text-center text-[11px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: "rgba(11,31,26,0.5)" }}>
              Powering project teams across the world
            </div>
            <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
              <div className="pc-marquee-track">
                {[...Array(2)].flatMap((_, k) =>
                  ["Marsa", "Northline", "Helix", "Atlas Build", "Vertex", "Harbour", "Stonebridge", "Apex EPC", "Orion", "Granite Group"]
                    .map((n, i) => (
                      <div key={`${k}-${i}`} className="pc-display font-bold text-2xl opacity-50 hover:opacity-100 transition-opacity" style={{ color: C.ink }}>
                        {n}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="relative" style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.ink})`, color: "#fff" }}>
        <div className="absolute inset-0 opacity-20 pc-grid-bg" />
        <div className="max-w-7xl mx-auto px-6 py-16 relative grid grid-cols-2 md:grid-cols-4 gap-8">
          <Stat value={240} suffix="+" label="Project teams" />
          <Stat value={12} suffix="K+" label="Projects managed" />
          <Stat value={4.9} suffix="/5" label="Customer rating" />
          <Stat value={62} suffix="%" label="Faster approvals" />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Platform</div>
          <h2 className="pc-display text-4xl md:text-5xl font-bold mt-2">Everything a project needs — in one system.</h2>
          <p className="mt-3 text-lg" style={{ color: "rgba(11,31,26,0.65)" }}>
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
            <div key={f.t} className="pc-card p-6 group">
              <div className="size-11 rounded-lg grid place-items-center transition-all group-hover:scale-110" style={{ background: "rgba(13,122,95,0.10)" }}>
                <f.i className="size-5" style={{ color: C.forest }} />
              </div>
              <div className="pc-display font-bold text-lg mt-4">{f.t}</div>
              <div className="text-sm mt-1" style={{ color: "rgba(11,31,26,0.6)" }}>{f.d}</div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.forest }}>
                Learn more <ArrowUpRight className="size-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SHOWCASE TABS */}
      <section id="showcase" className="py-24" style={{ background: "#fff", borderTop: "1px solid rgba(11,31,26,0.06)", borderBottom: "1px solid rgba(11,31,26,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Showcase</div>
            <h2 className="pc-display text-4xl md:text-5xl font-bold mt-2">See ProjectCore in action.</h2>
            <p className="mt-3 text-lg" style={{ color: "rgba(11,31,26,0.65)" }}>
              Switch between the modules your teams use every day.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {tabs.map((t, i) => (
              <button key={t.name} onClick={() => setActiveTab(i)}
                className={`px-4 h-10 rounded-md text-sm font-semibold inline-flex items-center gap-2 transition-all ${activeTab === i ? "pc-tab-active" : "pc-btn-ghost"}`}>
                <t.icon className="size-4 pc-tab-ic" style={activeTab === i ? {} : { color: C.emerald }} />
                {t.name}
              </button>
            ))}
          </div>

          <div className="mt-10 grid lg:grid-cols-2 gap-10 items-center">
            <div key={activeTab} className="pc-reveal">
              <div className="pc-display text-3xl font-bold">{tabs[activeTab].title}</div>
              <p className="mt-3" style={{ color: "rgba(11,31,26,0.7)" }}>{tabs[activeTab].desc}</p>
              <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
                {tabs[activeTab].bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="size-5 grid place-items-center rounded-full mt-0.5 pc-tick" style={{ background: "rgba(13,122,95,0.12)" }}>
                      <CheckCircle2 className="size-3.5" style={{ color: C.forest }} />
                    </span>
                    <span className="font-medium">{b}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => openAuth("signup")} className="mt-7 pc-btn-primary px-5 h-11 rounded-md text-sm font-semibold inline-flex items-center gap-2">
                Try this module <ArrowRight className="size-4" />
              </button>
            </div>

            <div key={`v-${activeTab}`} className="pc-reveal">
              <div className="pc-card pc-shadow overflow-hidden">
                <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: "rgba(11,31,26,0.06)", background: C.paper }}>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: C.forest }}>
                    {(() => { const I = tabs[activeTab].icon; return <I className="size-4" />; })()} {tabs[activeTab].name}
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: "rgba(11,31,26,0.4)" }}>live preview</span>
                </div>
                <div className="p-5">
                  {activeTab === 0 && (
                    <div className="space-y-2">
                      {[
                        { t: "Foundation Works", s: 100, c: C.forest },
                        { t: "Structural Frame", s: 82, c: C.emerald },
                        { t: "MEP Rough-In", s: 56, c: C.gold },
                        { t: "Façade Installation", s: 28, c: "#b45309" },
                        { t: "Interior Fit-Out", s: 8, c: "rgba(11,31,26,0.4)" },
                      ].map((r) => (
                        <div key={r.t}>
                          <div className="flex justify-between text-xs font-semibold mb-1"><span>{r.t}</span><span style={{ color: r.c }}>{r.s}%</span></div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: C.paper }}>
                            <div className="h-full pc-bar" style={{ width: `${r.s}%`, background: r.c }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === 1 && (
                    <div className="grid grid-cols-3 gap-3">
                      {["Manpower", "Equipment", "Deliveries", "Photos", "GPS", "Weather"].map((x, i) => (
                        <div key={x} className="rounded-lg p-3 text-center pc-bar" style={{ background: C.paper, animationDelay: `${i*60}ms` }}>
                          <div className="pc-display text-xl font-bold" style={{ color: C.forest }}>{[124,18,7,89,"✓",27][i]}</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "rgba(11,31,26,0.6)" }}>{x}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === 2 && (
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-2"><span>BOQ Earned</span><span style={{ color: C.forest }}>$3.42M</span></div>
                      <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: C.paper }}>
                        <div className="h-full pc-bar" style={{ width: "62%", background: `linear-gradient(90deg, ${C.forest}, ${C.gold})` }} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[{l:"Budget",v:"$5.5M"},{l:"Earned",v:"$3.4M"},{l:"Variance",v:"+2.1%"}].map(x => (
                          <div key={x.l} className="rounded-lg p-3" style={{ background: C.paper }}>
                            <div className="pc-display text-lg font-bold">{x.v}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(11,31,26,0.55)" }}>{x.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeTab === 3 && (
                    <div className="space-y-2">
                      {[
                        { t: "ITP #042 — Concrete Pour Slab L7", s: "Passed", c: C.emerald },
                        { t: "NCR-024 — Rebar spacing", s: "Open", c: "#b45309" },
                        { t: "Safety Walk — Tower Crane Area", s: "Closed", c: C.forest },
                        { t: "Snag #98 — Door Frame G-12", s: "In Review", c: C.gold },
                      ].map((r) => (
                        <div key={r.t} className="flex items-center justify-between p-3 rounded-md" style={{ background: C.paper }}>
                          <span className="text-sm font-medium">{r.t}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.6)", color: r.c }}>{r.s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="py-24 relative" style={{ background: C.cream }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Workflow</div>
            <h2 className="pc-display text-4xl md:text-5xl font-bold mt-2">One continuous loop from plan to handover.</h2>
            <p className="mt-3 text-lg" style={{ color: "rgba(11,31,26,0.65)" }}>
              Every stage talks to the next — no silos, no double entry.
            </p>
          </div>
          <div className="mt-14 relative grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="hidden md:block absolute left-0 right-0 top-1/2 h-px" style={{ background: `repeating-linear-gradient(90deg, ${C.forest} 0 8px, transparent 8px 16px)`, opacity: .3 }} />
            {[
              { s: "Plan", d: "WBS, baselines, scope" },
              { s: "Execute", d: "Tasks, daily reports" },
              { s: "Track", d: "Progress, costs, KPIs" },
              { s: "Approve", d: "RFIs, submittals, IPC" },
              { s: "Report", d: "Auto reports, PDFs" },
              { s: "Handover", d: "Snags, archive, audit" },
            ].map((x, i) => (
              <div key={x.s} className="pc-card p-5 text-center relative">
                <div className="pc-display text-3xl font-bold" style={{ color: C.gold }}>0{i + 1}</div>
                <div className="pc-display font-bold mt-2">{x.s}</div>
                <div className="text-xs mt-1" style={{ color: "rgba(11,31,26,0.6)" }}>{x.d}</div>
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
            <h2 className="pc-display text-4xl md:text-5xl font-bold mt-2">Trusted across every kind of project.</h2>
            <p className="mt-3 text-lg" style={{ color: "rgba(11,31,26,0.65)" }}>
              From a single contractor team to a government-scale program — ProjectCore adapts to your structure, roles and reporting.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              {[
                { l: "Countries", v: "18" },
                { l: "Projects", v: "12K+" },
                { l: "Uptime", v: "99.99%" },
              ].map((x) => (
                <div key={x.l}>
                  <div className="pc-display text-3xl font-bold" style={{ color: C.forest }}>{x.v}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "rgba(11,31,26,0.55)" }}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { i: HardHat, t: "Construction", d: "Buildings, towers, infra" },
              { i: Wrench, t: "Engineering", d: "Design & EPC firms" },
              { i: Building2, t: "Government", d: "Programs & megaprojects" },
              { i: Users, t: "Consultants", d: "PMC, supervision teams" },
              { i: ClipboardCheck, t: "Contractors", d: "MEP, civil, finishes" },
              { i: Layers, t: "Maintenance", d: "Facilities & O&M" },
            ].map((x) => (
              <div key={x.t} className="pc-card p-5">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-md grid place-items-center" style={{ background: C.forest }}>
                    <x.i className="size-4 text-white" />
                  </div>
                  <span className="pc-display font-bold">{x.t}</span>
                </div>
                <div className="text-xs mt-2" style={{ color: "rgba(11,31,26,0.6)" }}>{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section id="ai" className="relative overflow-hidden" style={{ background: C.ink, color: "#fff" }}>
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(800px 400px at 80% 20%, rgba(201,168,76,0.4), transparent 60%)" }} />
        <div className="absolute inset-0 opacity-20 pc-grid-bg" />
        <div className="max-w-7xl mx-auto px-6 py-24 relative grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="pc-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider" style={{ background: "rgba(201,168,76,0.15)", color: C.gold, borderColor: "rgba(201,168,76,0.3)" }}>
              <Sparkles className="size-3" /> AI Automation
            </span>
            <h2 className="pc-display text-4xl md:text-5xl font-bold mt-5">Less admin. Sharper decisions.</h2>
            <p className="mt-4 text-lg" style={{ color: "rgba(255,255,255,0.75)" }}>
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
          <div className="pc-card p-6 pc-float-slow" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}>
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

      {/* INTEGRATIONS */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Integrations</div>
          <h2 className="pc-display text-4xl md:text-5xl font-bold mt-2">Plays nicely with your stack.</h2>
          <p className="mt-3 text-lg" style={{ color: "rgba(11,31,26,0.65)" }}>
            From spreadsheets to ERPs — keep your existing tools, add ProjectCore on top.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { i: FileText, t: "Excel / CSV" },
            { i: MessageSquare, t: "Teams" },
            { i: MessageSquare, t: "Slack" },
            { i: Calendar, t: "Outlook" },
            { i: DollarSign, t: "QuickBooks" },
            { i: Globe, t: "REST API" },
            { i: Cpu, t: "Power BI" },
            { i: Layers, t: "AutoCAD" },
            { i: Workflow, t: "Zapier" },
            { i: Lock, t: "SSO / SAML" },
            { i: Truck, t: "SAP" },
            { i: BarChart3, t: "Tableau" },
          ].map((x) => (
            <div key={x.t} className="pc-card p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="size-9 rounded-md grid place-items-center" style={{ background: "rgba(13,122,95,0.10)" }}>
                <x.i className="size-4" style={{ color: C.forest }} />
              </div>
              <div className="text-xs font-semibold">{x.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24" style={{ background: C.cream }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Customers</div>
            <h2 className="pc-display text-4xl md:text-5xl font-bold mt-2">Project teams love the calm.</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.name} className="pc-card p-7 relative">
                <Quote className="size-7 absolute top-5 right-5 opacity-15" style={{ color: C.forest }} />
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="size-4 fill-current" style={{ color: C.gold }} />
                  ))}
                </div>
                <p className="mt-4 text-base leading-relaxed">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="size-10 rounded-full grid place-items-center pc-display font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})` }}>
                    {t.name.split(" ").map(s => s[0]).slice(0,2).join("")}
                  </div>
                  <div>
                    <div className="pc-display font-bold text-sm">{t.name}</div>
                    <div className="text-xs" style={{ color: "rgba(11,31,26,0.6)" }}>{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
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
              <div className="h-full rounded-full pc-bar" style={{ width: "72%", background: `linear-gradient(90deg, ${C.forest}, ${C.emerald})` }} />
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
          <h2 className="pc-display text-4xl md:text-5xl font-bold mt-2">A polished window for your clients.</h2>
          <p className="mt-3 text-lg" style={{ color: "rgba(11,31,26,0.65)" }}>
            Share approved reports, drawings and progress with controlled visibility — without exposing internal cost, supplier, or HR data.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {["Branded, role-aware access", "Approved reports & documents only", "Real-time progress dashboards", "Audit-tracked downloads"].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="size-4" style={{ color: C.emerald }} /> {t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* SECURITY */}
      <section className="py-24" style={{ background: "#fff", borderTop: "1px solid rgba(11,31,26,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-3 gap-8">
          {[
            { i: Lock, t: "Enterprise security", d: "Row-level access, SSO, 2FA and audit logs — everywhere." },
            { i: Award, t: "Audit ready", d: "Every action tracked. Export-ready logs for ISO, SOC2 and government audits." },
            { i: Headphones, t: "White-glove onboarding", d: "Dedicated success managers help you migrate templates, users and projects." },
          ].map((x) => (
            <div key={x.t} className="pc-card p-7">
              <div className="size-12 rounded-lg grid place-items-center" style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})` }}>
                <x.i className="size-5 text-white" />
              </div>
              <div className="pc-display font-bold text-lg mt-5">{x.t}</div>
              <div className="text-sm mt-1.5" style={{ color: "rgba(11,31,26,0.65)" }}>{x.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING TEASER */}
      <section id="pricing" className="py-24" style={{ background: C.cream }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Pricing</div>
          <h2 className="pc-display text-4xl md:text-5xl font-bold mt-2">Flexible plans for every project team.</h2>
          <p className="mt-3 max-w-xl mx-auto text-lg" style={{ color: "rgba(11,31,26,0.65)" }}>
            From small contractor squads to enterprise consultants — pick the tier that matches your portfolio.
          </p>
          <div className="mt-12 grid md:grid-cols-3 gap-5 text-left">
            {[
              { n: "Starter", price: "$0", per: "/ forever", p: "For small teams", f: ["Up to 5 users", "3 active projects", "Core modules", "Email support"] },
              { n: "Professional", price: "$29", per: "/ user / month", p: "Most popular", f: ["Up to 50 users", "Unlimited projects", "AI assistant", "Client portal", "Priority support"], featured: true },
              { n: "Enterprise", price: "Custom", per: "annual", p: "For programs", f: ["SSO + advanced roles", "Custom workflows", "Dedicated CSM", "On-prem option"] },
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
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="pc-display text-4xl font-extrabold" style={{ color: C.forest }}>{tier.price}</span>
                  <span className="text-xs" style={{ color: "rgba(11,31,26,0.55)" }}>{tier.per}</span>
                </div>
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

      {/* INTERACTIVE PRICING CALCULATOR */}
      <PricingCalculator openAuth={openAuth} />



      {/* FAQ */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>FAQ</div>
          <h2 className="pc-display text-4xl md:text-5xl font-bold mt-2">Answers, on the record.</h2>
        </div>
        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} className="pc-card overflow-hidden">
                <button onClick={() => setOpenFaq(open ? null : i)} className="w-full flex items-center justify-between px-6 py-5 text-left">
                  <span className="pc-display font-bold">{f.q}</span>
                  {open ? <Minus className="size-4" style={{ color: C.forest }} /> : <Plus className="size-4" style={{ color: C.forest }} />}
                </button>
                <div className="grid transition-all duration-300" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden">
                    <div className="px-6 pb-5 text-sm" style={{ color: "rgba(11,31,26,0.7)" }}>{f.a}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="pc-card pc-shadow p-12 md:p-16 text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.ink})`, color: "#fff", borderColor: "transparent" }}>
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(600px 300px at 80% 0%, rgba(201,168,76,0.6), transparent 60%)" }} />
          <div className="absolute inset-0 opacity-20 pc-grid-bg" />
          <h2 className="pc-display text-4xl md:text-5xl font-bold relative">Bring every project into one platform.</h2>
          <p className="mt-4 max-w-2xl mx-auto relative text-lg" style={{ color: "rgba(255,255,255,0.75)" }}>
            Teams, documents, approvals, cost and reporting — unified, automated, and always audit-ready.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 relative">
            <button onClick={() => openAuth("signup")} className="px-6 h-12 rounded-md font-semibold inline-flex items-center gap-2 text-sm pc-glow" style={{ background: C.gold, color: C.ink }}>
              Start free trial <ArrowRight className="size-4" />
            </button>
            <Link to="/dashboard" className="px-6 h-12 rounded-md font-semibold inline-flex items-center gap-2 text-sm" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
              Explore live demo
            </Link>
          </div>
          <div className="mt-6 text-xs relative" style={{ color: "rgba(255,255,255,0.55)" }}>
            14-day free trial · No credit card · Cancel anytime
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
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs" style={{ color: "rgba(11,31,26,0.55)" }}>
              <MapPin className="size-3.5" /> Available in 18 countries
            </div>
          </div>
          <div>
            <div className="pc-display font-bold mb-3">Modules</div>
            <ul className="space-y-1.5" style={{ color: "rgba(11,31,26,0.65)" }}>
              <li>Projects & Planning</li><li>RFIs & Submittals</li><li>BOQ & Cost</li><li>Procurement</li><li>Quality & Safety</li>
            </ul>
          </div>
          <div>
            <div className="pc-display font-bold mb-3">Company</div>
            <ul className="space-y-1.5" style={{ color: "rgba(11,31,26,0.65)" }}>
              <li>About</li><li>Customers</li><li>Contact</li><li>Careers</li>
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
            <div className="flex gap-5"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Security</a><a href="#">Status</a></div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCalculator({ openAuth }: { openAuth: (m: "signin" | "signup") => void }) {
  const [seats, setSeats] = useState(15);
  const [projects, setProjects] = useState(8);
  const [reports, setReports] = useState(40);
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  // Pricing model — aligned with subscription tiers above
  // Starter: ≤5 users, ≤3 projects → free
  // Professional: 6–50 users → $29/user, project & report add-ons
  // Enterprise: >50 users → custom quote
  const tier = seats <= 5 ? "Starter" : seats <= 50 ? "Professional" : "Enterprise";
  const isEnterprise = tier === "Enterprise";
  const isStarter = tier === "Starter";

  const seatPrice = isStarter ? 0 : 29;
  const projectAddon = isStarter || isEnterprise ? 0 : projects > 10 ? (projects - 10) * 6 : 0;
  const reportsAddon = isStarter || isEnterprise ? 0 : reports > 50 ? Math.ceil((reports - 50) / 10) * 8 : 0;
  const monthly = seats * seatPrice + projectAddon + reportsAddon;
  const annualDiscount = 0.2;
  const effective = billing === "annual" ? monthly * (1 - annualDiscount) : monthly;
  const yearly = effective * 12;

  return (
    <section className="py-24" style={{ background: C.paper }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.emerald }}>Estimate your plan</div>
          <h2 className="pc-display text-4xl md:text-5xl font-bold mt-2">Build your price in seconds.</h2>
          <p className="mt-3 max-w-xl mx-auto text-lg" style={{ color: "rgba(11,31,26,0.65)" }}>
            Move the sliders to match your team, portfolio, and field reporting volume.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-5 gap-6">
          {/* Controls */}
          <div className="lg:col-span-3 pc-card p-8 space-y-8">
            <CalcSlider
              icon={<Users className="size-4" />}
              label="Team seats"
              value={seats}
              min={1} max={250} step={1}
              onChange={setSeats}
              suffix={seats === 1 ? "user" : "users"}
              hint={`$${seatPrice}/user · ${tier} tier`}
            />
            <CalcSlider
              icon={<FolderKanban className="size-4" />}
              label="Active projects"
              value={projects}
              min={1} max={100} step={1}
              onChange={setProjects}
              suffix={projects === 1 ? "project" : "projects"}
              hint={projects > 10 ? `+$6 / project above 10` : `Up to 10 included`}
            />
            <CalcSlider
              icon={<FileCheck2 className="size-4" />}
              label="Daily reports / week"
              value={reports}
              min={0} max={500} step={5}
              onChange={setReports}
              suffix="reports"
              hint={reports > 50 ? `+$8 per extra 10 reports` : `Up to 50 included`}
            />

            <div className="flex items-center gap-3 pt-2">
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(11,31,26,0.55)" }}>Billing</div>
              <div className="inline-flex rounded-md p-0.5" style={{ background: "rgba(11,31,26,0.06)" }}>
                {(["monthly", "annual"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBilling(b)}
                    className="px-3 py-1.5 text-xs font-semibold rounded capitalize transition-all"
                    style={billing === b ? { background: "#fff", color: C.ink, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" } : { color: "rgba(11,31,26,0.6)" }}
                  >
                    {b}{b === "annual" && " · save 20%"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-2 pc-card p-8 flex flex-col" style={{ background: C.forest, color: "#fff", borderColor: C.forest }}>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.gold }}>Your estimate</div>
            <div className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{tier} plan · {billing}</div>
            <div className="mt-6 flex items-baseline gap-2">
              {isEnterprise ? (
                <span className="pc-display text-5xl font-extrabold">Custom</span>
              ) : isStarter ? (
                <>
                  <span className="pc-display text-5xl font-extrabold">Free</span>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>forever</span>
                </>
              ) : (
                <>
                  <span className="pc-display text-5xl font-extrabold">${Math.round(effective).toLocaleString()}</span>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>/ month</span>
                </>
              )}
            </div>
            {!isEnterprise && !isStarter && billing === "annual" && (
              <div className="mt-1 text-xs" style={{ color: C.gold }}>
                ${Math.round(yearly).toLocaleString()} billed annually
              </div>
            )}
            {isStarter && (
              <div className="mt-1 text-xs" style={{ color: C.gold }}>
                Up to 5 users & 3 active projects
              </div>
            )}
            {isEnterprise && (
              <div className="mt-1 text-xs" style={{ color: C.gold }}>
                Volume pricing for 50+ seats — talk to sales
              </div>
            )}

            <div className="mt-6 space-y-2 text-sm border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              {isEnterprise ? (
                <Row label="Pricing" value="Tailored quote" />
              ) : (
                <>
                  <Row label={`${seats} seats × $${seatPrice}`} value={`$${(seats * seatPrice).toLocaleString()}`} />
                  <Row label="Project add-ons" value={projectAddon ? `$${projectAddon.toLocaleString()}` : "Included"} />
                  <Row label="Daily reports" value={reportsAddon ? `$${reportsAddon.toLocaleString()}` : "Included"} />
                  {billing === "annual" && monthly > 0 && <Row label="Annual discount" value={`−$${Math.round(monthly * annualDiscount).toLocaleString()}`} accent />}
                </>
              )}
            </div>

            <button
              onClick={() => openAuth("signup")}
              className="mt-7 w-full inline-flex items-center justify-center gap-2 h-11 rounded-md text-sm font-semibold"
              style={{ background: C.gold, color: C.ink }}
            >
              {isEnterprise ? "Contact sales" : isStarter ? "Get started free" : "Start 14-day trial"} <ArrowRight className="size-4" />
            </button>
            <div className="mt-3 text-[11px] text-center" style={{ color: "rgba(255,255,255,0.55)" }}>
              No credit card required · cancel anytime
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CalcSlider({ icon, label, value, min, max, step, onChange, suffix, hint }: {
  icon: React.ReactNode; label: string; value: number; min: number; max: number; step: number;
  onChange: (n: number) => void; suffix: string; hint: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}>
          <span style={{ color: C.emerald }}>{icon}</span>{label}
        </div>
        <div className="pc-display text-2xl font-bold" style={{ color: C.forest }}>
          {value.toLocaleString()} <span className="text-xs font-medium" style={{ color: "rgba(11,31,26,0.5)" }}>{suffix}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full h-1.5 rounded-full appearance-none cursor-pointer pc-range"
        style={{ background: `linear-gradient(to right, ${C.forest} 0%, ${C.emerald} ${pct}%, rgba(11,31,26,0.1) ${pct}%, rgba(11,31,26,0.1) 100%)` }}
      />
      <div className="mt-1.5 text-xs" style={{ color: "rgba(11,31,26,0.55)" }}>{hint}</div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "rgba(255,255,255,0.7)" }}>{label}</span>
      <span className="font-semibold" style={{ color: accent ? C.gold : "#fff" }}>{value}</span>
    </div>
  );
}

